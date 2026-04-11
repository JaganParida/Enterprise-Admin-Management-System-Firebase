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
  where,
  startAfter,
  increment,
  setDoc,
  writeBatch,
  getAggregateFromServer,
  sum,
  count,
  average,
} from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const billsCollection = collection(db, "electricBills");
const statsRef = doc(db, "systemStats", "electric");

const getLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// 🚀 GLOBAL ZERO-READ L1 CACHE
let memoryCache = {
  stats: null,
  queryCache: {},
  dynamicStatsCache: {},
  isDirty: true,
  lastFetchTime: 0,
};

const markDirty = () => {
  memoryCache.isDirty = true;
  memoryCache.queryCache = {};
  memoryCache.dynamicStatsCache = {};
  localStorage.setItem("electric_last_update", Date.now().toString());
};

const silentCacheUpdate = (oldStatus, newStatus, oldAmt, newAmt) => {
  if (memoryCache.stats) {
    if (oldStatus) memoryCache.stats[oldStatus.toLowerCase()] -= oldAmt;
    if (newStatus) memoryCache.stats[newStatus.toLowerCase()] += newAmt;
  }
  markDirty();
};

const electricService = {
  getLastFetchTime: () => memoryCache.lastFetchTime,
  getCachedStats: () => (!memoryCache.isDirty ? memoryCache.stats : null),
  getCachedLogs: (filters) => {
    const key = JSON.stringify(filters);
    return !memoryCache.isDirty && memoryCache.queryCache[key]
      ? memoryCache.queryCache[key]
      : null;
  },

  getStats: async (forceRefresh = false) => {
    if (!forceRefresh && !memoryCache.isDirty && memoryCache.stats)
      return memoryCache.stats;
    try {
      const snap = await getDoc(statsRef);
      let result = { paid: 0, pending: 0, overdue: 0 };
      if (snap.exists()) {
        const data = snap.data();
        result = {
          paid: data.paid || 0,
          pending: data.pending || 0,
          overdue: data.overdue || 0,
        };
      } else {
        await setDoc(statsRef, result);
      }
      memoryCache.stats = result;
      return result;
    } catch (error) {
      return { paid: 0, pending: 0, overdue: 0 };
    }
  },

  getDynamicViewStats: async (filters = {}) => {
    const filterKey = JSON.stringify(filters);
    if (!memoryCache.isDirty && memoryCache.dynamicStatsCache[filterKey]) {
      return memoryCache.dynamicStatsCache[filterKey];
    }

    let constraints = [];
    if (filters.status && filters.status !== "All")
      constraints.push(where("status", "==", filters.status));
    if (filters.exactMonth)
      constraints.push(where("month", "==", filters.exactMonth));

    if (filters.search) {
      constraints.push(
        where("caNumber", ">=", filters.search),
        where("caNumber", "<=", filters.search + "\uf8ff"),
      );
    } else if (filters.amountFilter && filters.amountFilter !== "Any Amount") {
      if (filters.amountFilter === "Under ₹10k")
        constraints.push(where("totalAmount", "<", 10000));
      else if (filters.amountFilter === "₹10k - ₹50k")
        constraints.push(
          where("totalAmount", ">=", 10000),
          where("totalAmount", "<=", 50000),
        );
      else if (filters.amountFilter === "Over ₹50k")
        constraints.push(where("totalAmount", ">", 50000));
    } else if (
      filters.dateFilter &&
      filters.dateFilter !== "All" &&
      !filters.exactMonth
    ) {
      const today = new Date();
      let pastDate = new Date();
      if (filters.dateFilter === "Today") pastDate.setDate(today.getDate() - 1);
      else if (filters.dateFilter === "Last7Days")
        pastDate.setDate(today.getDate() - 7);
      else if (filters.dateFilter === "ThisMonth") pastDate.setDate(1);
      constraints.push(where("billDate", ">=", getLocalDateString(pastDate)));
    }

    try {
      // STRICT ENFORCEMENT: ONLY getAggregateFromServer used. No getDocs fallback.
      const snapshot = await getAggregateFromServer(
        query(billsCollection, ...constraints),
        {
          totalRecords: count(),
          totalRevenue: sum("totalAmount"),
          averageBill: average("totalAmount"),
        },
      );

      const res = {
        count: snapshot.data().totalRecords,
        sum: snapshot.data().totalRevenue,
        avg: snapshot.data().averageBill || 0,
      };

      memoryCache.dynamicStatsCache[filterKey] = res;
      return res;
    } catch (error) {
      console.warn("Aggregation failed. Fallback disabled to protect quota.");
      return null;
    }
  },

  getBills: async (
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
      memoryCache.queryCache[filterKey]
    ) {
      return { data: memoryCache.queryCache[filterKey], lastVisible: null };
    }

    let constraints = [];
    let hasInequality = false;

    if (filters.status && filters.status !== "All")
      constraints.push(where("status", "==", filters.status));
    if (filters.exactMonth)
      constraints.push(where("month", "==", filters.exactMonth));

    if (filters.search) {
      constraints.push(
        where("caNumber", ">=", filters.search),
        where("caNumber", "<=", filters.search + "\uf8ff"),
        orderBy("caNumber"),
      );
      hasInequality = true;
    } else if (filters.amountFilter && filters.amountFilter !== "Any Amount") {
      if (filters.amountFilter === "Under ₹10k")
        constraints.push(where("totalAmount", "<", 10000));
      else if (filters.amountFilter === "₹10k - ₹50k")
        constraints.push(
          where("totalAmount", ">=", 10000),
          where("totalAmount", "<=", 50000),
        );
      else if (filters.amountFilter === "Over ₹50k")
        constraints.push(where("totalAmount", ">", 50000));
      constraints.push(orderBy("totalAmount", "desc"));
      hasInequality = true;
    } else if (
      filters.dateFilter &&
      filters.dateFilter !== "All" &&
      !filters.exactMonth
    ) {
      const pastDate = new Date();
      if (filters.dateFilter === "Today")
        pastDate.setDate(pastDate.getDate() - 1);
      else if (filters.dateFilter === "Last7Days")
        pastDate.setDate(pastDate.getDate() - 7);
      else if (filters.dateFilter === "ThisMonth") pastDate.setDate(1);
      constraints.push(
        where("billDate", ">=", getLocalDateString(pastDate)),
        orderBy("billDate", "desc"),
      );
      hasInequality = true;
    }

    if (!hasInequality) constraints.push(orderBy("billDate", "desc"));
    constraints.push(limit(limitCount));
    if (lastVisibleDoc) constraints.push(startAfter(lastVisibleDoc));

    const snapshot = await getDocs(query(billsCollection, ...constraints));
    const data = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
    const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

    if (!isLoadMore) {
      memoryCache.queryCache[filterKey] = data;
      memoryCache.isDirty = false;
      memoryCache.lastFetchTime = Date.now();
    }
    return { data, lastVisible: newLastVisible };
  },

  getBackupChunk: async (monthToFetch, maxAllowed) => {
    const storedLastDocId = localStorage.getItem(
      `backup_last_doc_${monthToFetch}_electric`,
    );
    // STRICT ENFORCEMENT: Max limit locked to 2,500
    let constraints = [
      where("month", "==", monthToFetch),
      limit(Math.min(maxAllowed, 2500)),
    ];

    if (storedLastDocId) {
      const lastDocRef = await getDoc(
        doc(db, "electricBills", storedLastDocId),
      );
      if (lastDocRef.exists()) constraints.push(startAfter(lastDocRef));
    }

    const snapshot = await getDocs(query(billsCollection, ...constraints));
    return {
      data: snapshot.docs.map((doc) => doc.data()),
      lastDocId:
        snapshot.docs.length > 0
          ? snapshot.docs[snapshot.docs.length - 1].id
          : null,
    };
  },

  addBill: async (billData, user) => {
    const totalAmount =
      (parseFloat(billData.billAmount) || 0) +
      (parseFloat(billData.fineAmount) || 0);
    const payload = {
      ...billData,
      billAmount: parseFloat(billData.billAmount) || 0,
      fineAmount: parseFloat(billData.fineAmount) || 0,
      totalAmount,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "admin@system.com",
      createdRole: user?.role || "Admin",
      editHistory: [],
    };
    const docRef = await addDoc(billsCollection, payload);

    let updatePayload = {};
    if (payload.status === "Paid") updatePayload.paid = increment(totalAmount);
    else if (payload.status === "Pending")
      updatePayload.pending = increment(totalAmount);
    else if (payload.status === "Overdue")
      updatePayload.overdue = increment(totalAmount);

    await setDoc(statsRef, updatePayload, { merge: true });
    silentCacheUpdate(null, payload.status, 0, totalAmount);
    return { data: { _id: docRef.id, ...payload } };
  },

  updateBill: async (id, updateData, user) => {
    const docRef = doc(db, "electricBills", id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return;
    const existingData = snapshot.data();

    // STRICT ENFORCEMENT: Max 2 history entries
    let currentHistory = existingData.editHistory || [];
    currentHistory.push({
      email: user?.email || "admin",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    });
    if (currentHistory.length > 2) currentHistory = currentHistory.slice(-2);

    const newTotal =
      (parseFloat(updateData.billAmount) || 0) +
      (parseFloat(updateData.fineAmount) || 0);
    const oldTotal = Number(existingData.totalAmount) || 0;

    if (existingData.status !== updateData.status || oldTotal !== newTotal) {
      let up = {};
      if (existingData.status === "Paid") up.paid = increment(-oldTotal);
      else if (existingData.status === "Pending")
        up.pending = increment(-oldTotal);
      else if (existingData.status === "Overdue")
        up.overdue = increment(-oldTotal);

      if (updateData.status === "Paid")
        up.paid = up.paid
          ? increment(newTotal - oldTotal)
          : increment(newTotal);
      else if (updateData.status === "Pending")
        up.pending = up.pending
          ? increment(newTotal - oldTotal)
          : increment(newTotal);
      else if (updateData.status === "Overdue")
        up.overdue = up.overdue
          ? increment(newTotal - oldTotal)
          : increment(newTotal);

      await setDoc(statsRef, up, { merge: true });
    }

    await updateDoc(docRef, {
      ...updateData,
      billAmount: parseFloat(updateData.billAmount) || 0,
      fineAmount: parseFloat(updateData.fineAmount) || 0,
      totalAmount: newTotal,
      editHistory: currentHistory,
    });
    silentCacheUpdate(
      existingData.status,
      updateData.status,
      oldTotal,
      newTotal,
    );
    return { message: "Updated successfully" };
  },

  deleteBill: async (id, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied.");
    const docRef = doc(db, "electricBills", id);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      const amt = Number(data.totalAmount) || 0;
      let up = {};
      if (data.status === "Paid") up.paid = increment(-amt);
      else if (data.status === "Pending") up.pending = increment(-amt);
      else if (data.status === "Overdue") up.overdue = increment(-amt);

      await setDoc(statsRef, up, { merge: true });
      silentCacheUpdate(data.status, null, amt, 0);
    }
    await deleteDoc(docRef);
    markDirty();
    return { message: "Deleted" };
  },

  deleteAllBills: async ({ password, email, user }) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied.");

    const today = new Date().toISOString().split("T")[0];
    let wipeMeta = JSON.parse(
      localStorage.getItem("electric_wipe_meta") || '{"date":"","count":0}',
    );

    // STRICT ENFORCEMENT: Max 2,500 deletions/day. Locks out to protect quotas.
    if (wipeMeta.date === today && wipeMeta.count >= 2500) {
      throw new Error(
        "Daily Wipe Limit Reached (2,500 records). Action locked for 24 hours to protect Database Limits.",
      );
    }
    if (wipeMeta.date !== today) wipeMeta = { date: today, count: 0 };

    const currentUser = auth.currentUser;
    try {
      await reauthenticateWithCredential(
        currentUser,
        EmailAuthProvider.credential(currentUser.email, password),
      );
    } catch (error) {
      throw new Error("Incorrect Admin Password.");
    }

    let totalDeleted = 0,
      hasMore = true;
    const maxAllowed = 2500 - wipeMeta.count;

    // STRICT ENFORCEMENT: 500 doc batch size optimal for Firestore writes
    while (hasMore && totalDeleted < maxAllowed) {
      const snapshot = await getDocs(
        query(billsCollection, limit(Math.min(500, maxAllowed - totalDeleted))),
      );
      if (snapshot.empty) break;

      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      totalDeleted += snapshot.size;
    }

    wipeMeta.count += totalDeleted;
    localStorage.setItem("electric_wipe_meta", JSON.stringify(wipeMeta));
    markDirty();

    if (totalDeleted >= maxAllowed && hasMore)
      return {
        isPartial: true,
        message: "2,500 limit reached. Lock engaged for 24h.",
      };
    await setDoc(statsRef, { paid: 0, pending: 0, overdue: 0 });
    return { isPartial: false, message: "Database wiped within safe limits!" };
  },
};

export default electricService;
