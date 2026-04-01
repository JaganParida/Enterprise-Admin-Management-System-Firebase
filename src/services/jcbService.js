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

const jcbCollection = collection(db, "jcb_logs");

// 🚀 GLOBAL CACHE TO PREVENT TAB-CHANGE READ LIMIT OVERLOAD
let localCache = {
  stats: null,
  logs: null,
  lastVisible: null,
  filtersKey: "",
  isDirty: true,
  lastFetchTime: 0,
};

// Call this whenever data is modified to force tabs to fetch fresh data
const markDirty = () => {
  localCache.isDirty = true;
  localStorage.setItem("jcb_last_update", Date.now().toString());
};

const jcbService = {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,

  getLastFetchTime: () => localCache.lastFetchTime,

  // 🚀 SYNCHRONOUS CACHE GETTERS TO ELIMINATE UI LOADER FLICKER
  getCachedStats: () => (!localCache.isDirty ? localCache.stats : null),
  getCachedLogs: (filters) => {
    const key = JSON.stringify(filters);
    if (
      !localCache.isDirty &&
      localCache.filtersKey === key &&
      localCache.logs
    ) {
      return localCache.logs;
    }
    return null;
  },

  // 1. 🚀 SERVER-SIDE STATS CALCULATION
  getStats: async (force = false) => {
    if (!force && !localCache.isDirty && localCache.stats) {
      return localCache.stats; // 0 Reads (Cached)
    }

    try {
      const q = query(jcbCollection);
      const snapshot = await getAggregateFromServer(q, {
        totalMins: sum("totalMins"),
        logCount: count(),
      });
      const result = {
        totalMins: snapshot.data().totalMins || 0,
        logCount: snapshot.data().logCount || 0,
      };
      localCache.stats = result;
      return result;
    } catch (error) {
      console.warn("Aggregation failed, falling back to client calc:", error);
      const snap = await getDocs(query(jcbCollection));
      let totalMins = 0;
      snap.forEach((doc) => {
        totalMins += Number(doc.data().totalMins) || 0;
      });
      const result = { totalMins, logCount: snap.size };
      localCache.stats = result;
      return result;
    }
  },

  // 🚀 2. PAGINATED & CACHED SEARCH
  getLogs: async (
    filters = {},
    lastVisibleDoc = null,
    pageSize = 50,
    force = false,
  ) => {
    const filterKey = JSON.stringify(filters);
    const isLoadMore = !!lastVisibleDoc;

    if (
      !force &&
      !localCache.isDirty &&
      !isLoadMore &&
      localCache.filtersKey === filterKey &&
      localCache.logs
    ) {
      return { data: localCache.logs, lastVisible: localCache.lastVisible };
    }

    let constraints = [];
    let hasInequality = false;

    if (filters.vehicleFilter && filters.vehicleFilter !== "All") {
      constraints.push(where("vehicleNo", "==", filters.vehicleFilter));
    }
    if (filters.exactDate) {
      constraints.push(where("date", "==", filters.exactDate));
    }

    if (filters.search) {
      constraints.push(where("customerName", ">=", filters.search));
      constraints.push(where("customerName", "<=", filters.search + "\uf8ff"));
      constraints.push(orderBy("customerName"));
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
      else if (filters.dateFilter === "Last7Days")
        targetDate.setDate(today.getDate() - 7);
      else if (filters.dateFilter === "ThisMonth") targetDate.setDate(1);

      const pastDateStr = targetDate.toISOString().split("T")[0];
      constraints.push(where("date", ">=", pastDateStr));
      constraints.push(orderBy("date", "desc"));
      hasInequality = true;
    }

    if (!hasInequality && !filters.exactDate) {
      constraints.push(orderBy("date", "desc"));
    }

    constraints.push(limit(pageSize));
    if (lastVisibleDoc) constraints.push(startAfter(lastVisibleDoc));

    try {
      const q = query(jcbCollection, ...constraints);
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }));
      const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

      if (!isLoadMore) {
        localCache.logs = data;
        localCache.filtersKey = filterKey;
        localCache.isDirty = false;
        localCache.lastFetchTime = Date.now();
      }
      localCache.lastVisible = newLastVisible;

      return { data, lastVisible: newLastVisible };
    } catch (error) {
      console.error("🔥 Firebase Query Error:", error);
      throw error;
    }
  },

  addLog: async (payload, user) => {
    const dataToSave = {
      ...payload,
      totalMins: Number(payload.totalMins) || 0,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
      editHistory: [],
    };
    const docRef = await addDoc(jcbCollection, dataToSave);
    markDirty();
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  updateLog: async (id, payload, user) => {
    const docRef = doc(db, "jcb_logs", id);
    const snapshot = await getDoc(docRef);

    let currentHistory = [];
    if (snapshot.exists() && Array.isArray(snapshot.data().editHistory)) {
      currentHistory = snapshot.data().editHistory;
    }

    const currentEdit = {
      by: user?.email || "Unknown",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    };

    currentHistory.push(currentEdit);
    // 🚀 STRICT MAX 2 EDITS LIMIT TO PRESERVE PAYLOAD SIZE
    if (currentHistory.length > 2) {
      currentHistory = currentHistory.slice(currentHistory.length - 2);
    }

    const dataToUpdate = {
      ...payload,
      totalMins: Number(payload.totalMins) || 0,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };

    await updateDoc(docRef, dataToUpdate);
    markDirty();
    return { message: "Updated" };
  },

  deleteLog: async (id, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager") {
      throw new Error("Action Denied: Managers cannot delete records.");
    }
    await deleteDoc(doc(db, "jcb_logs", id));
    markDirty();
    return { message: "Deleted" };
  },

  // 🚀 BATCH WIPE DATABASE (CHUNK LIMIT: 10,000/DAY)
  deleteAllLogs: async ({ password, email, user }) => {
    if (user?.role === "manager" || user?.data?.role === "manager") {
      throw new Error("Action Denied: Managers cannot wipe the database.");
    }

    const today = new Date().toISOString().split("T")[0];
    let wipeMeta = JSON.parse(
      localStorage.getItem("jcb_wipe_meta") || '{"date":"","count":0}',
    );

    if (wipeMeta.date === today && wipeMeta.count >= 10000) {
      throw new Error(
        "Daily Wipe Limit Reached (10,000 records). Action locked for 24 hours to prevent backend crashes.",
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
      throw new Error("Access Denied: Incorrect Admin Password.");
    }

    let totalDeleted = 0;
    let hasMore = true;
    const maxAllowed = 10000 - wipeMeta.count;

    while (hasMore && totalDeleted < maxAllowed) {
      const currentBatchSize = Math.min(500, maxAllowed - totalDeleted);
      const q = query(jcbCollection, limit(currentBatchSize));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        hasMore = false;
        break;
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      totalDeleted += snapshot.size;
    }

    wipeMeta.count += totalDeleted;
    localStorage.setItem("jcb_wipe_meta", JSON.stringify(wipeMeta));
    markDirty();

    if (totalDeleted >= maxAllowed && hasMore) {
      return {
        warning:
          "10,000 records deleted. Daily limit reached. Come back tomorrow for the remaining records.",
      };
    }
    return { success: true };
  },
};

export default jcbService;
