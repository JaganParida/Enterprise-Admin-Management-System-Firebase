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

// 🚀 RAM Cache
let memoryCache = {
  stats: null,
  logs: null,
  filtersKey: "",
  isDirty: true,
  lastFetchTime: 0,
};

const markDirty = () => {
  memoryCache.isDirty = true;
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

  getStats: async (forceRefresh = false) => {
    if (!forceRefresh && !memoryCache.isDirty && memoryCache.stats)
      return memoryCache.stats;
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
      memoryCache.stats = result;
      return result;
    } catch (error) {
      console.warn(
        "Aggregation failed. Returning 0 to prevent mass database reads.",
      );
      return { totalMins: 0, logCount: 0, error: true };
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
      let constraints = [];
      let dbFilteredField = null;

      if (filters.vehicleFilter && filters.vehicleFilter !== "All") {
        constraints.push(
          where("vehicleNo", "==", filters.vehicleFilter.trim()),
        );
      }

      if (filters.exactDate) {
        constraints.push(where("date", "==", filters.exactDate));
      }

      const today = new Date();
      const offset = today.getTimezoneOffset() * 60000;
      const localToday = new Date(today.getTime() - offset);
      const todayStr = localToday.toISOString().split("T")[0];

      let startDateStr = null;
      let endDateStr = todayStr;

      if (
        filters.dateFilter &&
        filters.dateFilter !== "All" &&
        !filters.exactDate
      ) {
        if (filters.dateFilter === "Today") {
          startDateStr = todayStr;
        } else if (filters.dateFilter === "Last7Days") {
          const d = new Date(localToday.getTime());
          d.setDate(d.getDate() - 7);
          startDateStr = d.toISOString().split("T")[0];
        } else if (filters.dateFilter === "ThisMonth") {
          const d = new Date(localToday.getTime());
          d.setDate(1);
          startDateStr = d.toISOString().split("T")[0];
          const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0);
          endDateStr = endD.toISOString().split("T")[0];
        }
      }

      if (filters.search) {
        constraints.push(
          where("customerName", ">=", filters.search),
          where("customerName", "<=", filters.search + "\uf8ff"),
          orderBy("customerName"),
        );
        dbFilteredField = "search";
      } else if (startDateStr) {
        if (startDateStr === endDateStr) {
          constraints.push(where("date", "==", startDateStr));
        } else {
          constraints.push(
            where("date", ">=", startDateStr),
            where("date", "<=", endDateStr),
            orderBy("date", "desc"),
          );
          dbFilteredField = "date";
        }
      }

      if (!dbFilteredField && !filters.exactDate) {
        constraints.push(orderBy("date", "desc"));
      }

      constraints.push(limit(pageSize));
      if (lastVisibleDoc) constraints.push(startAfter(lastVisibleDoc));

      const q = query(jcbCollection, ...constraints);
      const snapshot = await getDocs(q);

      let fetchedData = snapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }));
      const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

      if (dbFilteredField !== "search" && filters.search) {
        const searchStr = filters.search.toLowerCase();
        fetchedData = fetchedData.filter(
          (d) =>
            d.customerName && d.customerName.toLowerCase().includes(searchStr),
        );
      }
      if (dbFilteredField === "search" && startDateStr) {
        fetchedData = fetchedData.filter(
          (d) => d.date >= startDateStr && d.date <= endDateStr,
        );
      }

      fetchedData = fetchedData.slice(0, pageSize);

      if (!isLoadMore) {
        memoryCache.logs = fetchedData;
        memoryCache.filtersKey = filterKey;
        memoryCache.isDirty = false;
        memoryCache.lastFetchTime = Date.now();
      }

      return { data: fetchedData, lastVisible: newLastVisible };
    } catch (error) {
      console.error("Firebase Query Failed. Error:", error);
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

    await updateDoc(docRef, {
      ...payload,
      totalMins: Number(payload.totalMins) || 0,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    });
    markDirty();
    return { message: "Updated" };
  },

  deleteLog: async (id, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied.");
    await deleteDoc(doc(db, "jcb_logs", id));
    markDirty();
    return { message: "Deleted" };
  },

  // 🚨 24-HOUR STRICT LOCK WIPE LOGIC
  deleteAllLogs: async ({ password, email, user }) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied.");

    const MAX_DAILY_WIPE = 2500;
    const LOCK_KEY = "jcb_wipe_lock";
    const META_KEY = "jcb_wipe_meta";

    // 1. Check Strict 24-Hour Lock First
    const lockTime = parseInt(localStorage.getItem(LOCK_KEY) || "0", 10);
    const now = Date.now();

    if (now < lockTime) {
      const remainingHours = Math.ceil((lockTime - now) / (1000 * 60 * 60));
      throw new Error(
        `🚨 BUTTON LOCKED: Daily Limit of ${MAX_DAILY_WIPE} reached. Wipe function will unlock in ${remainingHours} hours.`,
      );
    }

    // 2. Regular Daily Count Logic
    const today = new Date().toISOString().split("T")[0];
    let wipeMeta = JSON.parse(
      localStorage.getItem(META_KEY) || '{"date":"","count":0}',
    );

    if (wipeMeta.date !== today) wipeMeta = { date: today, count: 0 };

    // 3. Admin Authentication
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

    // 4. Execute Deletion
    let totalDeleted = 0,
      hasMore = true;
    const maxAllowed = MAX_DAILY_WIPE - wipeMeta.count;

    while (hasMore && totalDeleted < maxAllowed) {
      const q = query(
        jcbCollection,
        limit(Math.min(500, maxAllowed - totalDeleted)),
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) break;

      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      totalDeleted += snapshot.size;
    }

    // 5. Update Meta & Apply 24-Hour Lock if Limit Hit
    wipeMeta.count += totalDeleted;
    localStorage.setItem(META_KEY, JSON.stringify(wipeMeta));
    markDirty();

    if (wipeMeta.count >= MAX_DAILY_WIPE) {
      // Lock exactly for 24 hours
      const unlockTime = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem(LOCK_KEY, unlockTime.toString());
      return {
        warning: `🚨 ${MAX_DAILY_WIPE} records deleted. System LOCKED for exactly 24 hours to protect database limits.`,
      };
    }

    return { success: true };
  },
};

export default jcbService;
