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

const maintCollection = collection(db, "maintenances");

// 🚀 THE MAGIC BULLET: RAM CACHE
let memoryCache = {
  stats: null,
  logs: null,
  filtersKey: "",
  isDirty: true,
};

const markDirty = () => {
  memoryCache.isDirty = true;
};

const maintenanceService = {
  // 🚀 SYNCHRONOUS GETTERS TO KILL UI FLICKER
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

  getStats: async (forceRefresh = false) => {
    if (!forceRefresh && !memoryCache.isDirty && memoryCache.stats)
      return memoryCache.stats;

    try {
      const q = query(maintCollection);
      const snapshot = await getAggregateFromServer(q, {
        totalCost: sum("cost"),
        serviceCount: count(),
      });
      let totalCost = snapshot.data().totalCost || 0;
      let serviceCount = snapshot.data().serviceCount || 0;

      if (serviceCount > 0 && totalCost === 0)
        throw new Error("String fallback");

      const result = { totalCost, serviceCount };
      memoryCache.stats = result;
      return result;
    } catch (error) {
      try {
        const snap = await getDocs(query(maintCollection));
        let totalCost = 0;
        snap.forEach((doc) => {
          totalCost += Number(doc.data().cost) || 0;
        });
        const result = { totalCost, serviceCount: snap.size };
        memoryCache.stats = result;
        return result;
      } catch (fallbackError) {
        return { totalCost: 0, serviceCount: 0 };
      }
    }
  },

  getLogs: async (
    filters = {},
    lastVisibleDoc = null,
    pageSize = 50,
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

    try {
      let queryConstraints = [];
      let hasInequality = false;

      if (filters.exactDate)
        queryConstraints.push(where("date", "==", filters.exactDate));

      if (filters.search) {
        queryConstraints.push(
          where("vehicleNo", ">=", filters.search),
          where("vehicleNo", "<=", filters.search + "\uf8ff"),
          orderBy("vehicleNo"),
        );
        hasInequality = true;
      } else if (
        filters.amountFilter &&
        filters.amountFilter !== "Any Amount"
      ) {
        if (filters.amountFilter === "Under ₹10k")
          queryConstraints.push(where("cost", "<", 10000));
        else if (filters.amountFilter === "₹10k - ₹50k")
          queryConstraints.push(
            where("cost", ">=", 10000),
            where("cost", "<=", 50000),
          );
        else if (filters.amountFilter === "Over ₹50k")
          queryConstraints.push(where("cost", ">", 50000));
        queryConstraints.push(orderBy("cost", "desc"));
        hasInequality = true;
      } else if (
        filters.dateFilter &&
        filters.dateFilter !== "All" &&
        !filters.exactDate
      ) {
        const today = new Date();
        let targetDate = new Date();
        if (filters.dateFilter === "Today")
          targetDate.setDate(today.getDate() - 1);
        if (filters.dateFilter === "Last7Days")
          targetDate.setDate(today.getDate() - 7);
        if (filters.dateFilter === "ThisMonth") targetDate.setDate(1);
        queryConstraints.push(
          where("date", ">=", targetDate.toISOString().split("T")[0]),
          orderBy("date", "desc"),
        );
        hasInequality = true;
      }

      if (!hasInequality && !filters.exactDate)
        queryConstraints.push(orderBy("date", "desc"));
      queryConstraints.push(limit(pageSize));
      if (lastVisibleDoc) queryConstraints.push(startAfter(lastVisibleDoc));

      const q = query(maintCollection, ...queryConstraints);
      const snapshot = await getDocs(q);

      let fetchedData = snapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }));
      const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

      if (!isLoadMore) {
        memoryCache.logs = fetchedData;
        memoryCache.filtersKey = filterKey;
        memoryCache.isDirty = false;
      }
      return { data: fetchedData, lastVisible: newLastVisible };
    } catch (error) {
      throw error;
    }
  },

  addLog: async (payload, user) => {
    const dataToSave = {
      ...payload,
      cost: Number(payload.cost) || 0,
      meterKm: Number(payload.meterKm) || 0,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
      editHistory: [],
    };
    const docRef = await addDoc(maintCollection, dataToSave);
    markDirty();
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  updateLog: async (id, payload, user) => {
    const docRef = doc(db, "maintenances", id);
    const snapshot = await getDoc(docRef);
    let currentHistory =
      snapshot.exists() && Array.isArray(snapshot.data().editHistory)
        ? snapshot.data().editHistory
        : [];

    const currentEdit = {
      by: user?.email || "Unknown",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    };
    currentHistory.push(currentEdit);

    // 🚀 STRICT MAX 2 EDITS LIMIT
    if (currentHistory.length > 2)
      currentHistory = currentHistory.slice(currentHistory.length - 2);

    const dataToUpdate = {
      ...payload,
      cost: Number(payload.cost) || 0,
      meterKm: Number(payload.meterKm) || 0,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };
    await updateDoc(docRef, dataToUpdate);
    markDirty();
    return { message: "Updated" };
  },

  deleteLog: async (id, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied.");
    await deleteDoc(doc(db, "maintenances", id));
    markDirty();
    return { message: "Deleted" };
  },

  deleteAllLogs: async ({ password, email, user }) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied.");

    const today = new Date().toISOString().split("T")[0];
    let wipeMeta = JSON.parse(
      localStorage.getItem("maintenance_wipe_meta") || '{"date":"","count":0}',
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
      const currentBatchSize = Math.min(500, maxAllowed - totalDeleted);
      const q = query(maintCollection, limit(currentBatchSize));
      const snapshot = await getDocs(q);
      if (snapshot.empty) break;

      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      totalDeleted += snapshot.size;
    }

    wipeMeta.count += totalDeleted;
    localStorage.setItem("maintenance_wipe_meta", JSON.stringify(wipeMeta));
    markDirty();

    if (totalDeleted >= maxAllowed && hasMore)
      return { warning: "10,000 limit reached. Come back tomorrow." };
    return { success: true };
  },
};
export default maintenanceService;
