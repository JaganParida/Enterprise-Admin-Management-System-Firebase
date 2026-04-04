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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// 🚀 GLOBAL ZERO-READ CACHE (Dictionary Map)
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
  memoryCache.isDirty = true;
  memoryCache.queryCache = {};
  memoryCache.dynamicStatsCache = {};
  memoryCache.lastFetchTime = Date.now();
  localStorage.setItem("electric_last_update", Date.now().toString());
};

const electricService = {
  getLastFetchTime: () => memoryCache.lastFetchTime,
  getCachedStats: () => (!memoryCache.isDirty ? memoryCache.stats : null),
  getCachedLogs: (filters) => {
    const key = JSON.stringify(filters);
    if (!memoryCache.isDirty && memoryCache.queryCache[key]) {
      return memoryCache.queryCache[key];
    }
    return null;
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

    const q = query(billsCollection, ...constraints);

    try {
      const snapshot = await getAggregateFromServer(q, {
        totalRecords: count(),
        totalRevenue: sum("totalAmount"),
        averageBill: average("totalAmount"),
      });

      const res = {
        count: snapshot.data().totalRecords,
        sum: snapshot.data().totalRevenue,
        avg: snapshot.data().averageBill || 0,
      };

      memoryCache.dynamicStatsCache[filterKey] = res;
      return res;
    } catch (error) {
      // ⚠️ RISK REMOVED: NO MORE getDocs() FALLBACK HERE!
      // If aggregation fails, we return null to protect Firebase quotas.
      console.warn(
        "Aggregation failed. Fallback disabled to protect quota.",
        error,
      );
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
      const today = new Date();
      let pastDate = new Date();
      if (filters.dateFilter === "Today") pastDate.setDate(today.getDate() - 1);
      else if (filters.dateFilter === "Last7Days")
        pastDate.setDate(today.getDate() - 7);
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

    try {
      const q = query(billsCollection, ...constraints);
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
      const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

      if (!isLoadMore) {
        memoryCache.queryCache[filterKey] = data;
        memoryCache.isDirty = false;
        memoryCache.lastFetchTime = Date.now();
      }

      return { data, lastVisible: newLastVisible };
    } catch (error) {
      throw error;
    }
  },

  getBackupChunk: async (monthToFetch, maxAllowed) => {
    const storedLastDocId = localStorage.getItem(
      `backup_last_doc_${monthToFetch}_electric`,
    );
    let constraints = [
      where("month", "==", monthToFetch),
      limit(Math.min(maxAllowed, 1000)), // ⚠️ RISK REMOVED: Capped at 1,000 instead of 10,000
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
    const billAmt = parseFloat(billData.billAmount) || 0;
    const fineAmt = parseFloat(billData.fineAmount) || 0;
    const totalAmount = billAmt + fineAmt;

    const payload = {
      ...billData,
      billAmount: billAmt,
      fineAmount: fineAmt,
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
    markDirty();

    const newObj = { _id: docRef.id, ...payload };
    silentCacheUpdate(null, payload.status, 0, totalAmount);
    return { data: newObj };
  },

  updateBill: async (id, updateData, user) => {
    const docRef = doc(db, "electricBills", id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return;
    const existingData = snapshot.data();

    let currentHistory = existingData.editHistory || [];
    const currentEdit = {
      email: user?.email || "admin@system.com",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    };
    currentHistory.push(currentEdit);
    if (currentHistory.length > 2) currentHistory = currentHistory.slice(-2);

    const newBillAmt = parseFloat(updateData.billAmount) || 0;
    const newFineAmt = parseFloat(updateData.fineAmount) || 0;
    const newTotalAmount = newBillAmt + newFineAmt;
    const oldTotalAmount = Number(existingData.totalAmount) || 0;

    if (
      existingData.status !== updateData.status ||
      oldTotalAmount !== newTotalAmount
    ) {
      let updatePayload = {};
      if (existingData.status === "Paid")
        updatePayload.paid = increment(-oldTotalAmount);
      else if (existingData.status === "Pending")
        updatePayload.pending = increment(-oldTotalAmount);
      else if (existingData.status === "Overdue")
        updatePayload.overdue = increment(-oldTotalAmount);

      if (updateData.status === "Paid")
        updatePayload.paid = updatePayload.paid
          ? increment(newTotalAmount - oldTotalAmount)
          : increment(newTotalAmount);
      else if (updateData.status === "Pending")
        updatePayload.pending = updatePayload.pending
          ? increment(newTotalAmount - oldTotalAmount)
          : increment(newTotalAmount);
      else if (updateData.status === "Overdue")
        updatePayload.overdue = updatePayload.overdue
          ? increment(newTotalAmount - oldTotalAmount)
          : increment(newTotalAmount);

      await setDoc(statsRef, updatePayload, { merge: true });
    }

    const payloadObj = {
      ...updateData,
      billAmount: newBillAmt,
      fineAmount: newFineAmt,
      totalAmount: newTotalAmount,
      lastEditedBy: currentEdit.email,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };

    await updateDoc(docRef, payloadObj);
    markDirty();
    silentCacheUpdate(
      existingData.status,
      updateData.status,
      oldTotalAmount,
      newTotalAmount,
    );
    return { message: "Bill updated successfully" };
  },

  deleteBill: async (id, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied.");
    const docRef = doc(db, "electricBills", id);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      const amountToRemove = Number(data.totalAmount) || 0;
      let updatePayload = {};
      if (data.status === "Paid")
        updatePayload.paid = increment(-amountToRemove);
      else if (data.status === "Pending")
        updatePayload.pending = increment(-amountToRemove);
      else if (data.status === "Overdue")
        updatePayload.overdue = increment(-amountToRemove);

      await setDoc(statsRef, updatePayload, { merge: true });
      silentCacheUpdate(data.status, null, amountToRemove, 0);
    }

    await deleteDoc(docRef);
    markDirty();
    return { message: "Bill deleted successfully" };
  },

  deleteAllBills: async ({ password, email, user }) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied.");

    const today = new Date().toISOString().split("T")[0];
    let wipeMeta = JSON.parse(
      localStorage.getItem("electric_wipe_meta") || '{"date":"","count":0}',
    );

    // ⚠️ RISK REMOVED: Capped at 2,000 per day instead of 10,000 to save free tier delete quota
    if (wipeMeta.date === today && wipeMeta.count >= 2000) {
      throw new Error(
        "Daily Wipe Limit Reached (2,000 records). Action locked for 24 hours to protect Database Limits.",
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
    const maxAllowed = 2000 - wipeMeta.count;

    while (hasMore && totalDeleted < maxAllowed) {
      const q = query(
        billsCollection,
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
    localStorage.setItem("electric_wipe_meta", JSON.stringify(wipeMeta));
    markDirty();

    if (totalDeleted >= maxAllowed && hasMore) {
      return {
        isPartial: true,
        message: "2,000 limit reached. Come back tomorrow for remaining.",
      };
    }

    await setDoc(statsRef, { paid: 0, pending: 0, overdue: 0 });
    return {
      isPartial: false,
      message: "Electric Bills wiped within safe limits!",
    };
  },
};

export default electricService;
