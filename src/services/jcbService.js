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

// 🚀 SAFE DATE HELPERS — avoids UTC offset issues for IST (+5:30) and any timezone
const getTodayStr = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const getDateStrDaysAgo = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

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

      // Vehicle filter can combine with others — add first as equality (no inequality)
      if (filters.vehicleFilter && filters.vehicleFilter !== "All") {
        constraints.push(
          where("vehicleNo", "==", filters.vehicleFilter.trim()),
        );
      }

      if (filters.exactDate) {
        // Exact date: equality + orderBy same field for stable pagination
        constraints.push(
          where("date", "==", filters.exactDate),
          orderBy("date", "asc"),
        );
      } else if (filters.search && filters.search.trim()) {
        const searchVal = filters.search.trim();
        constraints.push(
          where("customerName", ">=", searchVal),
          where("customerName", "<=", searchVal + "\uf8ff"),
          orderBy("customerName", "asc"),
        );
      } else if (filters.dateFilter && filters.dateFilter !== "All") {
        const todayStr = getTodayStr();

        if (filters.dateFilter === "Today") {
          // >= AND <= today so only exactly today's records are returned
          constraints.push(
            where("date", ">=", todayStr),
            where("date", "<=", todayStr),
            orderBy("date", "desc"),
          );
        } else if (filters.dateFilter === "Last7Days") {
          // today inclusive going back 6 prior days = 7 days total
          const startStr = getDateStrDaysAgo(6);
          constraints.push(
            where("date", ">=", startStr),
            where("date", "<=", todayStr),
            orderBy("date", "desc"),
          );
        } else if (filters.dateFilter === "ThisMonth") {
          const now = new Date();
          const pad = (n) => String(n).padStart(2, "0");
          const startStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
          constraints.push(
            where("date", ">=", startStr),
            where("date", "<=", todayStr),
            orderBy("date", "desc"),
          );
        }
      } else {
        constraints.push(orderBy("date", "desc"));
      }

      constraints.push(limit(pageSize));
      if (lastVisibleDoc) constraints.push(startAfter(lastVisibleDoc));

      const q = query(jcbCollection, ...constraints);
      const snapshot = await getDocs(q);

      const fetchedData = snapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }));
      const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

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

  deleteAllLogs: async ({ password, email, user }) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied.");

    const MAX_DAILY_WIPE = 2500;
    const LOCK_KEY = "jcb_wipe_lock";
    const META_KEY = "jcb_wipe_meta";

    const lockTime = parseInt(localStorage.getItem(LOCK_KEY) || "0", 10);
    const now = Date.now();

    if (now < lockTime) {
      const remainingHours = Math.ceil((lockTime - now) / (1000 * 60 * 60));
      throw new Error(
        `🚨 BUTTON LOCKED: Daily Limit of ${MAX_DAILY_WIPE} reached. Wipe function will unlock in ${remainingHours} hours.`,
      );
    }

    const today = new Date().toISOString().split("T")[0];
    let wipeMeta = JSON.parse(
      localStorage.getItem(META_KEY) || '{"date":"","count":0}',
    );

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

    wipeMeta.count += totalDeleted;
    localStorage.setItem(META_KEY, JSON.stringify(wipeMeta));
    markDirty();

    if (wipeMeta.count >= MAX_DAILY_WIPE) {
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
