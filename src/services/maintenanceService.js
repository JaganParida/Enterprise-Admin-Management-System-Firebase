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

// 🚀 GLOBAL CACHE TO PREVENT TAB-CHANGE READ LIMIT OVERLOAD
let localCache = {
  stats: null,
  logs: null,
  lastVisible: null,
  filtersKey: "",
  isDirty: true,
  lastFetchTime: 0,
};

const markDirty = () => {
  localCache.isDirty = true;
  localStorage.setItem("maintenance_last_update", Date.now().toString());
};

const maintenanceService = {
  getLastFetchTime: () => localCache.lastFetchTime,
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

  // 1. 🚀 SERVER-SIDE STATS CALCULATION WITH CACHING
  getStats: async (force = false) => {
    if (!force && !localCache.isDirty && localCache.stats) {
      return localCache.stats; // 0 Reads!
    }

    try {
      const q = query(maintCollection);
      const snapshot = await getAggregateFromServer(q, {
        totalCost: sum("cost"),
        serviceCount: count(),
      });
      const result = {
        totalCost: snapshot.data().totalCost || 0,
        serviceCount: snapshot.data().serviceCount || 0,
      };
      localCache.stats = result;
      return result;
    } catch (error) {
      console.warn("Aggregation failed, falling back to client calc:", error);
      const snap = await getDocs(query(maintCollection));
      let totalCost = 0;
      snap.forEach((doc) => {
        totalCost += Number(doc.data().cost) || 0;
      });
      const result = { totalCost, serviceCount: snap.size };
      localCache.stats = result;
      return result;
    }
  },

  // 2 & 3. 🚀 PAGINATION & CACHED FETCHING
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

    try {
      let queryConstraints = [];
      let hasInequality = false;

      if (filters.exactDate) {
        queryConstraints.push(where("date", "==", filters.exactDate));
      }

      if (filters.search) {
        queryConstraints.push(where("vehicleNo", ">=", filters.search));
        queryConstraints.push(
          where("vehicleNo", "<=", filters.search + "\uf8ff"),
        );
        queryConstraints.push(orderBy("vehicleNo"));
        hasInequality = true;
      } else if (
        filters.amountFilter &&
        filters.amountFilter !== "Any Amount"
      ) {
        if (filters.amountFilter === "Under ₹10k") {
          queryConstraints.push(where("cost", "<", 10000));
        } else if (filters.amountFilter === "₹10k - ₹50k") {
          queryConstraints.push(
            where("cost", ">=", 10000),
            where("cost", "<=", 50000),
          );
        } else if (filters.amountFilter === "Over ₹50k") {
          queryConstraints.push(where("cost", ">", 50000));
        }
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
        );
        queryConstraints.push(orderBy("date", "desc"));
        hasInequality = true;
      }

      if (!hasInequality && !filters.exactDate) {
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

      if (!isLoadMore) {
        localCache.logs = fetchedData;
        localCache.filtersKey = filterKey;
        localCache.isDirty = false;
        localCache.lastFetchTime = Date.now();
      }
      localCache.lastVisible = newLastVisible;

      return { data: fetchedData, lastVisible: newLastVisible };
    } catch (error) {
      console.error("Fetch Error:", error);
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
      currentHistory = currentHistory.slice(-2);
    }

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
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager") {
      throw new Error("Action Denied: Managers cannot delete records.");
    }
    const docRef = doc(db, "maintenances", id);
    await deleteDoc(docRef);
    markDirty();
    return { message: "Deleted" };
  },

  // 🚀 BATCH WIPE DATABASE (CHUNK LIMIT: 10,000/DAY)
  deleteAllLogs: async ({ password, email, user }) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager")
      throw new Error("Action Denied: Managers cannot wipe the database.");
    if (!password || !email)
      throw new Error("Authentication Error: Missing credentials.");

    const today = new Date().toISOString().split("T")[0];
    let wipeMeta = JSON.parse(
      localStorage.getItem("maintenance_wipe_meta") || '{"date":"","count":0}',
    );

    if (wipeMeta.date === today && wipeMeta.count >= 10000) {
      throw new Error(
        "Daily Wipe Limit Reached (10,000 records). Action locked for 24 hours to prevent backend crashes.",
      );
    }
    if (wipeMeta.date !== today) wipeMeta = { date: today, count: 0 };

    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.email !== email)
      throw new Error("Active session mismatch.");

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

    try {
      while (hasMore && totalDeleted < maxAllowed) {
        const currentBatchSize = Math.min(500, maxAllowed - totalDeleted);
        const q = query(maintCollection, limit(currentBatchSize));
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
      localStorage.setItem("maintenance_wipe_meta", JSON.stringify(wipeMeta));
      markDirty();

      if (totalDeleted >= maxAllowed && hasMore) {
        return {
          warning:
            "10,000 records deleted. Daily limit reached. Come back tomorrow for the remaining records.",
        };
      }
      return { success: true };
    } catch (error) {
      throw new Error("Failed to clear database.");
    }
  },
};

export default maintenanceService;
