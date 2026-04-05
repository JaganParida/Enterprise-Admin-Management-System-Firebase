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

// 🚀 BULLETPROOF CACHE: RAM Only for Logs (Prevents 5MB LocalStorage Crash)
let memoryCache = {
  stats: JSON.parse(localStorage.getItem("maint_stats_cache")) || null,
  logs: null, // 🔥 Keep logs strictly in RAM. IndexedDB will handle offline via Firebase.
  filtersKey: localStorage.getItem("maint_filters_cache") || "",
  isDirty: localStorage.getItem("maint_is_dirty") !== "false",
  lastFetchTime: parseInt(localStorage.getItem("maint_last_update") || "0", 10),
};

const updateCacheState = (stats, logs, filtersKey, isDirty) => {
  memoryCache = { stats, logs, filtersKey, isDirty, lastFetchTime: Date.now() };
  if (stats) localStorage.setItem("maint_stats_cache", JSON.stringify(stats));
  if (filtersKey) localStorage.setItem("maint_filters_cache", filtersKey);
  localStorage.setItem("maint_is_dirty", String(isDirty));
  localStorage.setItem("maint_last_update", String(Date.now()));
};

const markDirty = () => {
  memoryCache.isDirty = true;
  localStorage.setItem("maint_is_dirty", "true");
  localStorage.setItem("maint_last_update", Date.now().toString());
};

const maintenanceService = {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,

  getLastFetchTime: () => memoryCache.lastFetchTime,
  // 🔥 FIX: Hamesha optimistic stats return karega (No null fallback on dirty)
  getCachedStats: () => memoryCache.stats,
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
      // 🚀 1 READ ATOMIC BUNCHER FROM SERVER
      const snapshot = await getAggregateFromServer(q, {
        totalCost: sum("cost"),
        serviceCount: count(),
      });
      const result = {
        totalCost: snapshot.data().totalCost || 0,
        serviceCount: snapshot.data().serviceCount || 0,
      };

      updateCacheState(result, memoryCache.logs, memoryCache.filtersKey, false);
      return result;
    } catch (error) {
      console.error("Aggregation failed. Returning cached data:", error);
      return memoryCache.stats || { totalCost: 0, serviceCount: 0 };
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
      let dbFilteredField = null;

      if (filters.exactDate) {
        queryConstraints.push(where("date", "==", filters.exactDate));
      }

      if (
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
        dbFilteredField = "date";
      } else if (filters.search) {
        queryConstraints.push(
          where("vehicleNo", ">=", filters.search.toUpperCase()),
          where("vehicleNo", "<=", filters.search.toUpperCase() + "\uf8ff"),
          orderBy("vehicleNo"),
        );
        dbFilteredField = "search";
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
        dbFilteredField = "amount";
      }

      if (!dbFilteredField && !filters.exactDate) {
        queryConstraints.push(orderBy("date", "desc"));
      }

      queryConstraints.push(limit(pageSize));
      if (lastVisibleDoc) queryConstraints.push(startAfter(lastVisibleDoc));

      const q = query(maintCollection, ...queryConstraints);
      const snapshot = await getDocs(q);

      let fetchedData = snapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }));
      const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

      // CLIENT-SIDE FILTERING FOR THE REMAINDER
      if (dbFilteredField !== "search" && filters.search) {
        const searchStr = filters.search.toUpperCase();
        fetchedData = fetchedData.filter(
          (d) => d.vehicleNo && d.vehicleNo.toUpperCase().includes(searchStr),
        );
      }
      if (
        dbFilteredField !== "amount" &&
        filters.amountFilter &&
        filters.amountFilter !== "Any Amount"
      ) {
        fetchedData = fetchedData.filter((d) => {
          const amt = d.cost || 0;
          if (filters.amountFilter === "Under ₹10k") return amt < 10000;
          if (filters.amountFilter === "₹10k - ₹50k")
            return amt >= 10000 && amt <= 50000;
          if (filters.amountFilter === "Over ₹50k") return amt > 50000;
          return true;
        });
      }

      if (!isLoadMore) {
        // Only saving into memoryCache (RAM), not localStorage
        updateCacheState(memoryCache.stats, fetchedData, filterKey, false);
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

    // 🚀 TRUE OPTIMISTIC UI CACHE UPDATE (Zero extra reads)
    if (!memoryCache.stats)
      memoryCache.stats = { totalCost: 0, serviceCount: 0 };
    memoryCache.stats.totalCost += dataToSave.cost;
    memoryCache.stats.serviceCount += 1;
    localStorage.setItem(
      "maint_stats_cache",
      JSON.stringify(memoryCache.stats),
    );

    markDirty();
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  updateLog: async (id, payload, user, oldCost = 0) => {
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
    if (currentHistory.length > 2)
      currentHistory = currentHistory.slice(currentHistory.length - 2);

    const newCost = Number(payload.cost) || 0;
    const dataToUpdate = {
      ...payload,
      cost: newCost,
      meterKm: Number(payload.meterKm) || 0,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };
    await updateDoc(docRef, dataToUpdate);

    // 🚀 TRUE OPTIMISTIC UI CACHE UPDATE
    if (!memoryCache.stats)
      memoryCache.stats = { totalCost: 0, serviceCount: 0 };
    memoryCache.stats.totalCost += newCost - oldCost;
    localStorage.setItem(
      "maint_stats_cache",
      JSON.stringify(memoryCache.stats),
    );

    markDirty();
    return { message: "Updated" };
  },

  deleteLog: async (logObj, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied.");
    await deleteDoc(doc(db, "maintenances", logObj._id));

    // 🚀 TRUE OPTIMISTIC UI CACHE UPDATE
    if (memoryCache.stats && logObj.cost !== undefined) {
      memoryCache.stats.totalCost -= Number(logObj.cost) || 0;
      memoryCache.stats.serviceCount -= 1;
      localStorage.setItem(
        "maint_stats_cache",
        JSON.stringify(memoryCache.stats),
      );
    }

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
    if (wipeMeta.date === today && wipeMeta.count >= 5000)
      throw new Error("Daily Wipe Limit Reached (5,000 max).");
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
    const maxAllowed = 5000 - wipeMeta.count;

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

    // 🚀 RESET CACHE
    memoryCache.stats = { totalCost: 0, serviceCount: 0 };
    localStorage.setItem(
      "maint_stats_cache",
      JSON.stringify(memoryCache.stats),
    );
    markDirty();

    if (totalDeleted >= maxAllowed && hasMore)
      return {
        warning: "5,000 limit reached. Come back tomorrow to delete the rest.",
      };
    return { success: true };
  },
};
export default maintenanceService;
