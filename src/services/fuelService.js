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

// 🚀 BULLETPROOF CACHE: Survives F5 Refreshes using LocalStorage
let memoryCache = {
  stats: JSON.parse(localStorage.getItem("fuel_stats_cache")) || null,
  logs: JSON.parse(localStorage.getItem("fuel_logs_cache")) || null,
  filtersKey: localStorage.getItem("fuel_filters_cache") || "",
  isDirty: localStorage.getItem("fuel_is_dirty") !== "false", // Default to true if not set
  lastFetchTime: parseInt(localStorage.getItem("fuel_last_update") || "0", 10),
};

// 🚀 Helper to sync RAM cache with LocalStorage instantly
const updateCacheState = (stats, logs, filtersKey, isDirty) => {
  memoryCache = { stats, logs, filtersKey, isDirty, lastFetchTime: Date.now() };
  if (stats) localStorage.setItem("fuel_stats_cache", JSON.stringify(stats));
  if (logs) localStorage.setItem("fuel_logs_cache", JSON.stringify(logs));
  if (filtersKey) localStorage.setItem("fuel_filters_cache", filtersKey);
  localStorage.setItem("fuel_is_dirty", String(isDirty));
  localStorage.setItem("fuel_last_update", String(Date.now()));
};

const markDirty = () => {
  memoryCache.isDirty = true;
  localStorage.setItem("fuel_is_dirty", "true");
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

  getLastFetchTime: () => memoryCache.lastFetchTime,
  getCachedStats: () => (!memoryCache.isDirty ? memoryCache.stats : null),
  getCachedLogs: (filters) => {
    const key = JSON.stringify(filters);
    if (
      !memoryCache.isDirty &&
      memoryCache.filtersKey === key &&
      memoryCache.logs
    ) {
      return memoryCache.logs; // 0 Reads!
    }
    return null;
  },

  // 🚀 100% SAFE STATS: NO GETDOCS FALLBACK BOMB
  getStats: async (forceRefresh = false) => {
    if (!forceRefresh && !memoryCache.isDirty && memoryCache.stats) {
      return memoryCache.stats; // 0 Reads
    }

    try {
      // Optimized Firebase native counter (Costs exactly 1 Read)
      const q = query(fuelCollection);
      const snapshot = await getAggregateFromServer(q, {
        totalLiters: sum("liters"),
        totalCost: sum("totalCost"),
        refuelCount: count(),
      });

      const result = {
        totalLiters: snapshot.data().totalLiters || 0,
        totalCost: snapshot.data().totalCost || 0,
        refuelCount: snapshot.data().refuelCount || 0,
      };

      updateCacheState(result, memoryCache.logs, memoryCache.filtersKey, false);
      return result;
    } catch (error) {
      console.error(
        "Aggregation failed. Returning cached data to protect Read Limits.",
      );
      // 🚀 THIS IS THE FIX TO REVEAL THE LINK:
      console.error(error);
      return (
        memoryCache.stats || { totalLiters: 0, totalCost: 0, refuelCount: 0 }
      );
    }
  },

  getLogs: async (
    filters = {},
    lastVisibleDoc = null,
    limitCount = 50,
    forceRefresh = false,
  ) => {
    const filterKey = JSON.stringify(filters);
    const isLoadMore = !!lastVisibleDoc;

    // Return LocalStorage cache if available and not dirty (Protects against F5 spam)
    if (
      !forceRefresh &&
      !memoryCache.isDirty &&
      !isLoadMore &&
      memoryCache.logs &&
      memoryCache.filtersKey === filterKey
    ) {
      return { data: memoryCache.logs, lastVisible: null }; // 0 Reads
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

    const q = query(fuelCollection, ...constraints);
    const snapshot = await getDocs(q); // Costs reads up to limitCount
    const data = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
    const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

    if (!isLoadMore) {
      updateCacheState(memoryCache.stats, data, filterKey, false);
    }

    return { data, lastVisible: newLastVisible };
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
    markDirty(); // Flags UI to do a 1-time fetch on next navigation
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
      currentHistory = currentHistory.slice(currentHistory.length - 2);

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

  // 🚀 HARD WIPE LIMIT (500 MAX per day)
  deleteAllLogs: async ({ password, email, user }) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied.");

    const today = new Date().toISOString().split("T")[0];
    let wipeMeta = JSON.parse(
      localStorage.getItem("fuel_wipe_meta") || '{"date":"","count":0}',
    );

    if (wipeMeta.date === today && wipeMeta.count >= 500) {
      throw new Error(
        "Daily UI Delete Limit (500) Reached. Use Firebase Console.",
      );
    }
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
    const maxAllowed = 500 - wipeMeta.count;

    while (hasMore && totalDeleted < maxAllowed) {
      const q = query(
        fuelCollection,
        limit(Math.min(100, maxAllowed - totalDeleted)),
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
      return { warning: "500 records deleted. Daily limit reached." };
    return { success: true };
  },
};

export default fuelService;
