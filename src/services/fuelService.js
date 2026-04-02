import { db, auth } from "../config/firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  getAggregateFromServer,
  sum,
  count,
  writeBatch,
} from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const fuelCollection = collection(db, "fuels");

// 🚀 THE MAGIC BULLET: In-Memory Cache for ZERO Reads on Navigation
let memoryCache = {
  stats: null,
  logs: null,
  filtersKey: "",
  isDirty: true,
  lastFetchTime: 0,
};

// Trigger this when data is added/edited/deleted
const markDirty = () => {
  memoryCache.isDirty = true;
  localStorage.setItem("fuel_last_update", Date.now().toString());
};

const fuelService = {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,

  // 🚀 SYNCHRONOUS GETTERS TO KILL UI FLICKER
  getLastFetchTime: () => memoryCache.lastFetchTime,
  getCachedStats: () => (!memoryCache.isDirty ? memoryCache.stats : null),
  getCachedLogs: (filters) => {
    const key = JSON.stringify(filters);
    if (
      !memoryCache.isDirty &&
      memoryCache.filtersKey === key &&
      memoryCache.logs
    ) {
      return memoryCache.logs;
    }
    return null;
  },

  // 🚀 STATS: 0 READS ON NAVIGATION
  getStats: async (forceRefresh = false) => {
    if (!forceRefresh && !memoryCache.isDirty && memoryCache.stats) {
      return memoryCache.stats;
    }

    try {
      const q = query(fuelCollection);
      const snapshot = await getAggregateFromServer(q, {
        totalLiters: sum("liters"),
        totalCost: sum("totalCost"),
        refuelCount: count(),
      });

      let totalLiters = snapshot.data().totalLiters || 0;
      let totalCost = snapshot.data().totalCost || 0;
      let refuelCount = snapshot.data().refuelCount || 0;

      if (refuelCount > 0 && totalLiters === 0 && totalCost === 0) {
        throw new Error("String data detected, forcing client fallback");
      }

      const result = { totalLiters, totalCost, refuelCount };
      memoryCache.stats = result;
      return result;
    } catch (error) {
      console.warn(
        "Aggregation failed. Executing fallback manual calculation.",
      );
      try {
        const snap = await getDocs(query(fuelCollection));
        let totalLiters = 0;
        let totalCost = 0;

        snap.forEach((doc) => {
          totalLiters += Number(doc.data().liters) || 0;
          totalCost += Number(doc.data().totalCost) || 0;
        });

        const result = { totalLiters, totalCost, refuelCount: snap.size };
        memoryCache.stats = result;
        return result;
      } catch (fallbackError) {
        console.error("Fallback calculation failed:", fallbackError);
        return { totalLiters: 0, totalCost: 0, refuelCount: 0 };
      }
    }
  },

  // 🚀 LOGS: 0 READS ON NAVIGATION
  getLogs: async (
    filters = {},
    lastVisibleDoc = null,
    limitCount = 50,
    forceRefresh = false,
  ) => {
    const filterKey = JSON.stringify(filters);
    const isLoadMore = !!lastVisibleDoc;

    if (
      !forceRefresh &&
      !memoryCache.isDirty &&
      !isLoadMore &&
      memoryCache.logs &&
      memoryCache.filtersKey === filterKey
    ) {
      return { data: memoryCache.logs, lastVisible: null };
    }

    let constraints = [];
    let hasInequality = false;

    if (filters.exactDate)
      constraints.push(where("date", "==", filters.exactDate));
    if (filters.search) {
      constraints.push(
        where("vehicleNo", ">=", filters.search),
        where("vehicleNo", "<=", filters.search + "\uf8ff"),
        orderBy("vehicleNo"),
      );
      hasInequality = true;
    } else if (filters.amountFilter && filters.amountFilter !== "Any Amount") {
      if (filters.amountFilter === "Under ₹5k")
        constraints.push(where("totalCost", "<", 5000));
      else if (filters.amountFilter === "₹5k - ₹20k")
        constraints.push(
          where("totalCost", ">=", 5000),
          where("totalCost", "<=", 20000),
        );
      else if (filters.amountFilter === "Over ₹20k")
        constraints.push(where("totalCost", ">", 20000));
      constraints.push(orderBy("totalCost", "desc"));
      hasInequality = true;
    } else if (
      filters.dateFilter &&
      filters.dateFilter !== "All" &&
      !filters.exactDate
    ) {
      const today = new Date();
      let pastDate = new Date();
      if (filters.dateFilter === "Today") pastDate.setDate(today.getDate() - 1);
      else if (filters.dateFilter === "Last7Days")
        pastDate.setDate(today.getDate() - 7);
      else if (filters.dateFilter === "ThisMonth") pastDate.setDate(1);
      constraints.push(
        where("date", ">=", pastDate.toISOString().split("T")[0]),
        orderBy("date", "desc"),
      );
      hasInequality = true;
    }

    if (!hasInequality && !filters.exactDate)
      constraints.push(orderBy("date", "desc"));
    constraints.push(limit(limitCount));
    if (lastVisibleDoc) constraints.push(startAfter(lastVisibleDoc));

    try {
      const q = query(fuelCollection, ...constraints);
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
      const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

      if (!isLoadMore) {
        memoryCache.logs = data;
        memoryCache.filtersKey = filterKey;
        memoryCache.isDirty = false;
        memoryCache.lastFetchTime = Date.now();
      }

      return { data, lastVisible: newLastVisible };
    } catch (error) {
      throw error;
    }
  },

  addLog: async (payload, user) => {
    const dataToSave = {
      ...payload,
      liters: Number(payload.liters),
      pricePerLiter: Number(payload.pricePerLiter),
      totalCost: Number(payload.totalCost),
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
      editHistory: [],
    };
    const docRef = await addDoc(fuelCollection, dataToSave);
    markDirty();
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  updateLog: async (id, payload, user) => {
    const docRef = doc(db, "fuels", id);
    const snapshot = await getDoc(docRef);
    let currentHistory =
      snapshot.exists() && Array.isArray(snapshot.data().editHistory)
        ? snapshot.data().editHistory
        : [];

    currentHistory.push({
      by: user?.email || "Unknown",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    });
    if (currentHistory.length > 2)
      currentHistory = currentHistory.slice(currentHistory.length - 2); // Top 2 constraint

    await updateDoc(docRef, {
      ...payload,
      liters: Number(payload.liters),
      pricePerLiter: Number(payload.pricePerLiter),
      totalCost: Number(payload.totalCost),
      lastEditedRole: currentHistory[currentHistory.length - 1].role,
      lastEditedAt: currentHistory[currentHistory.length - 1].at,
      editHistory: currentHistory,
    });

    markDirty();
    return { message: "Updated" };
  },

  deleteLog: async (id, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied.");
    await deleteDoc(doc(db, "fuels", id));
    markDirty();
    return { message: "Deleted" };
  },

  deleteAllLogs: async ({ password, email, user }) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied.");
    const today = new Date().toISOString().split("T")[0];
    let wipeMeta = JSON.parse(
      localStorage.getItem("fuel_wipe_meta") || '{"date":"","count":0}',
    );
    if (wipeMeta.date === today && wipeMeta.count >= 10000)
      throw new Error("Daily Wipe Limit Reached.");
    if (wipeMeta.date !== today) wipeMeta = { date: today, count: 0 };

    const currentUser = auth.currentUser;
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        password,
      );
      await reauthenticateWithCredential(currentUser, credential);
    } catch (error) {
      throw new Error("Incorrect Admin Password.");
    }

    let totalDeleted = 0,
      hasMore = true;
    const maxAllowed = 10000 - wipeMeta.count;

    while (hasMore && totalDeleted < maxAllowed) {
      const q = query(
        fuelCollection,
        limit(Math.min(500, maxAllowed - totalDeleted)),
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) break;
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      totalDeleted += snapshot.size;
    }

    wipeMeta.count += totalDeleted;
    localStorage.setItem("fuel_wipe_meta", JSON.stringify(wipeMeta));
    markDirty();

    if (totalDeleted >= maxAllowed && hasMore)
      return { warning: "10,000 records deleted. Come back tomorrow." };
    return { success: true };
  },
};

export default fuelService;
