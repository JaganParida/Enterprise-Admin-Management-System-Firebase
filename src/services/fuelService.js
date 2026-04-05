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

// 🚀 FIXED & BULLETPROOF: Helper to generate pure local date strings (YYYY-MM-DD)
const getLocalDateString = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fuelCollection = collection(db, "fuels");

// 🚀 ZERO-READ NAVIGATION: Global Memory Cache
let memoryCache = {
  stats: JSON.parse(localStorage.getItem("fuel_stats_cache")) || null,
  logs: JSON.parse(localStorage.getItem("fuel_logs_cache")) || null,
  filtersKey: localStorage.getItem("fuel_filters_cache") || "",
  statsDirty: localStorage.getItem("fuel_stats_dirty") !== "false",
  logsDirty: localStorage.getItem("fuel_logs_dirty") !== "false",
  lastFetchTime: parseInt(localStorage.getItem("fuel_last_update") || "0", 10),
};

const markDirty = () => {
  memoryCache.statsDirty = true;
  memoryCache.logsDirty = true;
  localStorage.setItem("fuel_stats_dirty", "true");
  localStorage.setItem("fuel_logs_dirty", "true");
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

  getCachedStats: () => (!memoryCache.statsDirty ? memoryCache.stats : null),

  getCachedLogs: (filters) => {
    const key = JSON.stringify(filters);
    if (
      !memoryCache.logsDirty &&
      memoryCache.filtersKey === key &&
      memoryCache.logs
    ) {
      return memoryCache.logs;
    }
    return null;
  },

  updateLocalStats: (newStats) => {
    memoryCache.stats = newStats;
    memoryCache.statsDirty = false;
    localStorage.setItem("fuel_stats_cache", JSON.stringify(newStats));
    localStorage.setItem("fuel_stats_dirty", "false");
  },

  // 🚀 ONE-READ STATS: Uses getAggregateFromServer to save massive reads
  getStats: async (forceRefresh = false) => {
    if (!forceRefresh && !memoryCache.statsDirty && memoryCache.stats) {
      return memoryCache.stats;
    }
    try {
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
      memoryCache.stats = result;
      memoryCache.statsDirty = false;
      localStorage.setItem("fuel_stats_cache", JSON.stringify(result));
      localStorage.setItem("fuel_stats_dirty", "false");
      return result;
    } catch (error) {
      return (
        memoryCache.stats || { totalLiters: 0, totalCost: 0, refuelCount: 0 }
      );
    }
  },

  getLogs: async (
    filters = {},
    lastVisibleDoc = null,
    limitCount = 25,
    forceRefresh = false,
  ) => {
    const filterKey = JSON.stringify(filters);
    const isLoadMore = !!lastVisibleDoc;

    // Return from RAM if not dirty, exact filters match, and not paginating
    if (
      !forceRefresh &&
      !memoryCache.logsDirty &&
      !isLoadMore &&
      memoryCache.logs &&
      memoryCache.filtersKey === filterKey
    ) {
      return { data: memoryCache.logs, lastVisible: null };
    }

    let constraints = [];

    if (filters.exactDate) {
      constraints.push(
        where("date", "==", filters.exactDate),
        orderBy("date", "desc"),
      );
    } else if (filters.search) {
      constraints.push(
        where("vehicleNo", ">=", filters.search.toUpperCase()),
        where("vehicleNo", "<=", filters.search.toUpperCase() + "\uf8ff"),
        orderBy("vehicleNo"),
      );
    } else if (filters.amountFilter && filters.amountFilter !== "Any Amount") {
      if (filters.amountFilter === "Under ₹5k")
        constraints.push(where("totalCost", "<", 5000));
      else if (filters.amountFilter === "₹5k - ₹20k") {
        constraints.push(
          where("totalCost", ">=", 5000),
          where("totalCost", "<=", 20000),
        );
      } else if (filters.amountFilter === "Over ₹20k")
        constraints.push(where("totalCost", ">", 20000));
      constraints.push(orderBy("totalCost", "desc"));
    } else if (filters.dateFilter && filters.dateFilter !== "All") {
      const today = new Date();
      let pastDateStr = "";

      // 🚀 100% FIXED: Last 7 Days and Month calculations will NEVER fail now
      if (filters.dateFilter === "Today") {
        pastDateStr = getLocalDateString(today);
      } else if (filters.dateFilter === "Last7Days") {
        // Subtracts exactly 7 days in milliseconds (Safe across months/years)
        const pastDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        pastDateStr = getLocalDateString(pastDate);
      } else if (filters.dateFilter === "ThisMonth") {
        // Sets to exactly 1st of the current month
        const pastDate = new Date(today.getFullYear(), today.getMonth(), 1);
        pastDateStr = getLocalDateString(pastDate);
      }

      constraints.push(
        where("date", ">=", pastDateStr),
        orderBy("date", "desc"),
      );
    } else {
      constraints.push(orderBy("date", "desc"));
    }

    // 🚀 STRICT LIMITS
    constraints.push(limit(limitCount));
    if (lastVisibleDoc) constraints.push(startAfter(lastVisibleDoc));

    const q = query(fuelCollection, ...constraints);
    const snapshot = await getDocs(q);

    let fetchedData = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));
    const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

    if (!isLoadMore) {
      memoryCache.logs = fetchedData;
      memoryCache.filtersKey = filterKey;
      memoryCache.logsDirty = false;
      localStorage.setItem("fuel_logs_cache", JSON.stringify(fetchedData));
      localStorage.setItem("fuel_filters_cache", filterKey);
      localStorage.setItem("fuel_logs_dirty", "false");
    }

    return { data: fetchedData, lastVisible: newLastVisible };
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

    // STRICT ARRAY LIMIT: Keep only last 2 edits to save payload size
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

  deleteAllLogs: async ({ password, email, user }) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied.");

    const today = new Date().toISOString().split("T")[0];
    let wipeMeta = JSON.parse(
      localStorage.getItem("fuel_wipe_meta") || '{"date":"","count":0}',
    );

    // 🚀 STRICT 5,000 WIPE LIMIT: Protects Firebase 20k Delete Quota completely.
    if (wipeMeta.date === today && wipeMeta.count >= 5000) {
      throw new Error(
        "Daily Security Limit Reached (5,000 records). Try again tomorrow.",
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

    let totalDeleted = 0;
    let hasMore = true;
    const maxAllowed = 5000 - wipeMeta.count;

    // BATcH DELETE in chunks of 500
    while (hasMore && totalDeleted < maxAllowed) {
      const chunkLimit = Math.min(500, maxAllowed - totalDeleted);
      const q = query(fuelCollection, limit(chunkLimit));
      const snapshot = await getDocs(q);

      if (snapshot.empty) break;

      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      totalDeleted += snapshot.size;
    }

    wipeMeta.count += totalDeleted;
    localStorage.setItem("fuel_wipe_meta", JSON.stringify(wipeMeta));

    if (totalDeleted > 0) {
      const qCheck = query(fuelCollection, limit(1));
      const checkSnap = await getDocs(qCheck);
      if (checkSnap.empty) {
        fuelService.updateLocalStats({
          totalLiters: 0,
          totalCost: 0,
          refuelCount: 0,
        });
      } else {
        markDirty();
      }
    } else {
      markDirty();
    }

    if (totalDeleted >= maxAllowed && hasMore)
      return {
        warning:
          "5,000 records deleted. Daily limit reached to protect quotas.",
      };
    return { success: true };
  },
};

export default fuelService;
