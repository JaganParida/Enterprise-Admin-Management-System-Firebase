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

const tripCollection = collection(db, "trips");
const expenseCollection = collection(db, "expenses");

// 🚀 GLOBAL ZERO-READ CACHE
let localCache = {
  stats: null,
  trips: { data: null, lastVisible: null, filtersKey: "" },
  expenses: { data: null, lastVisible: null, filtersKey: "" },
  isDirty: true,
  lastFetchTime: 0,
};

const markDirty = () => {
  localCache.isDirty = true;
  localStorage.setItem("vehicle_last_update", Date.now().toString());
};

const vehicleService = {
  getLastFetchTime: () => localCache.lastFetchTime,
  getCachedStats: () => (!localCache.isDirty ? localCache.stats : null),
  getCachedLogs: (type, filters) => {
    const key = JSON.stringify(filters);
    if (
      !localCache.isDirty &&
      localCache[type].filtersKey === key &&
      localCache[type].data
    ) {
      return localCache[type].data;
    }
    return null;
  },

  // 1. 🚀 ATOMIC SERVER-SIDE STATS
  getStats: async (force = false) => {
    if (!force && !localCache.isDirty && localCache.stats) {
      return localCache.stats; // 0 Reads!
    }

    try {
      const [tripSnap, expSnap] = await Promise.all([
        getAggregateFromServer(query(tripCollection), {
          totalAmount: sum("totalAmount"),
          amountPaid: sum("amountPaid"),
          amountDue: sum("amountDue"),
          tripsCount: count(),
        }),
        getAggregateFromServer(query(expenseCollection), {
          totalAmount: sum("amount"),
          expensesCount: count(),
        }),
      ]);
      const result = {
        trips: {
          total: tripSnap.data().totalAmount || 0,
          paid: tripSnap.data().amountPaid || 0,
          due: tripSnap.data().amountDue || 0,
          count: tripSnap.data().tripsCount || 0,
        },
        expenses: {
          total: expSnap.data().totalAmount || 0,
          count: expSnap.data().expensesCount || 0,
        },
      };
      localCache.stats = result;
      return result;
    } catch (error) {
      console.warn("Atomic Aggregation failed, falling back to client calc.");
      const [tripDocs, expDocs] = await Promise.all([
        getDocs(query(tripCollection)),
        getDocs(query(expenseCollection)),
      ]);
      let trips = { total: 0, paid: 0, due: 0, count: tripDocs.size };
      let expenses = { total: 0, count: expDocs.size };
      tripDocs.forEach((doc) => {
        trips.total += Number(doc.data().totalAmount) || 0;
        trips.paid += Number(doc.data().amountPaid) || 0;
        trips.due += Number(doc.data().amountDue) || 0;
      });
      expDocs.forEach((doc) => {
        expenses.total += Number(doc.data().amount) || 0;
      });
      const result = { trips, expenses };
      localCache.stats = result;
      return result;
    }
  },

  // 2. 🚀 PAGINATED & CACHED TRIPS
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
      localCache.trips.filtersKey === filterKey &&
      localCache.trips.data
    ) {
      return {
        data: localCache.trips.data,
        lastVisible: localCache.trips.lastVisible,
      };
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
      !filters.exactDate
    ) {
      const today = new Date();
      let targetDate = new Date();
      if (filters.dateFilter === "Today")
        targetDate.setDate(today.getDate() - 1);
      if (filters.dateFilter === "Last7Days")
        targetDate.setDate(today.getDate() - 7);
      if (filters.dateFilter === "ThisMonth") targetDate.setDate(1);
      constraints.push(
        where("date", ">=", targetDate.toISOString().split("T")[0]),
        orderBy("date", "desc"),
      );
      hasInequality = true;
    }

    if (!hasInequality && !filters.exactDate)
      constraints.push(orderBy("date", "desc"));
    constraints.push(limit(pageSize));
    if (lastVisibleDoc) constraints.push(startAfter(lastVisibleDoc));

    const q = query(tripCollection, ...constraints);
    const snapshot = await getDocs(q);
    const fetchedData = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));
    const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

    if (!isLoadMore) {
      localCache.trips.data = fetchedData;
      localCache.trips.filtersKey = filterKey;
      localCache.trips.lastVisible = newLastVisible;
      localCache.isDirty = false;
      localCache.lastFetchTime = Date.now();
    }
    return { data: fetchedData, lastVisible: newLastVisible };
  },

  // 3. 🚀 PAGINATED & CACHED EXPENSES
  getExpenses: async (
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
      localCache.expenses.filtersKey === filterKey &&
      localCache.expenses.data
    ) {
      return {
        data: localCache.expenses.data,
        lastVisible: localCache.expenses.lastVisible,
      };
    }

    let constraints = [];
    let hasInequality = false;

    if (filters.exactDate)
      constraints.push(where("date", "==", filters.exactDate));

    if (filters.search) {
      constraints.push(
        where("reason", ">=", filters.search),
        where("reason", "<=", filters.search + "\uf8ff"),
        orderBy("reason"),
      );
      hasInequality = true;
    } else if (filters.amountFilter && filters.amountFilter !== "Any Amount") {
      if (filters.amountFilter === "Under ₹10k")
        constraints.push(where("amount", "<", 10000));
      else if (filters.amountFilter === "₹10k - ₹50k")
        constraints.push(
          where("amount", ">=", 10000),
          where("amount", "<=", 50000),
        );
      else if (filters.amountFilter === "Over ₹50k")
        constraints.push(where("amount", ">", 50000));
      constraints.push(orderBy("amount", "desc"));
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
      constraints.push(
        where("date", ">=", targetDate.toISOString().split("T")[0]),
        orderBy("date", "desc"),
      );
      hasInequality = true;
    }

    if (!hasInequality && !filters.exactDate)
      constraints.push(orderBy("date", "desc"));
    constraints.push(limit(pageSize));
    if (lastVisibleDoc) constraints.push(startAfter(lastVisibleDoc));

    const q = query(expenseCollection, ...constraints);
    const snapshot = await getDocs(q);
    const fetchedData = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));
    const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

    if (!isLoadMore) {
      localCache.expenses.data = fetchedData;
      localCache.expenses.filtersKey = filterKey;
      localCache.expenses.lastVisible = newLastVisible;
      localCache.isDirty = false;
      localCache.lastFetchTime = Date.now();
    }
    return { data: fetchedData, lastVisible: newLastVisible };
  },

  // 4. 🚀 10,000 BACKUP CHUNKER
  getBackupChunk: async (monthToFetch, type, maxAllowed) => {
    const collectionRef = type === "trips" ? tripCollection : expenseCollection;
    const storedLastDocId = localStorage.getItem(
      `backup_last_doc_${monthToFetch}_${type}`,
    );

    let constraints = [
      where("date", ">=", monthToFetch),
      where("date", "<=", monthToFetch + "\uf8ff"),
      orderBy("date", "asc"),
      limit(Math.min(maxAllowed, 10000)),
    ];

    if (storedLastDocId) {
      const lastDocRef = await getDoc(
        doc(db, type === "trips" ? "trips" : "expenses", storedLastDocId),
      );
      if (lastDocRef.exists()) constraints.push(startAfter(lastDocRef));
    }

    const q = query(collectionRef, ...constraints);
    const snapshot = await getDocs(q);
    return {
      data: snapshot.docs.map((doc) => doc.data()),
      lastDocId:
        snapshot.docs.length > 0
          ? snapshot.docs[snapshot.docs.length - 1].id
          : null,
    };
  },

  addLog: async (payload, user) => {
    const qty = Number(payload.quantity) || 0;
    const rate = Number(payload.rate) || 0;
    const food = Number(payload.foodCharge) || 0;
    const paid = Number(payload.amountPaid) || 0;
    const totalAmount = qty * rate + food;
    const amountDue =
      payload.amountDue !== ""
        ? Number(payload.amountDue)
        : Math.max(0, totalAmount - paid);

    const dataToSave = {
      ...payload,
      quantity: qty,
      rate,
      foodCharge: food,
      amountPaid: paid,
      totalAmount,
      amountDue,
      distanceTravelled: Number(payload.distanceTravelled) || 0,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
      editHistory: [],
    };
    const docRef = await addDoc(tripCollection, dataToSave);
    markDirty();
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  updateLog: async (id, payload, user) => {
    const docRef = doc(db, "trips", id);
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
    if (currentHistory.length > 2) currentHistory = currentHistory.slice(-2); // 🚀 TOP 2 LIMIT

    const qty = Number(payload.quantity) || 0;
    const rate = Number(payload.rate) || 0;
    const food = Number(payload.foodCharge) || 0;
    const paid = Number(payload.amountPaid) || 0;
    const totalAmount = qty * rate + food;
    const amountDue =
      payload.amountDue !== ""
        ? Number(payload.amountDue)
        : Math.max(0, totalAmount - paid);

    await updateDoc(docRef, {
      ...payload,
      quantity: qty,
      rate,
      foodCharge: food,
      amountPaid: paid,
      totalAmount,
      amountDue,
      distanceTravelled: Number(payload.distanceTravelled) || 0,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    });
    markDirty();
    return { message: "Updated" };
  },

  addExpense: async (payload, user) => {
    const dataToSave = {
      ...payload,
      amount: Number(payload.amount) || 0,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
      editHistory: [],
    };
    const docRef = await addDoc(expenseCollection, dataToSave);
    markDirty();
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  updateExpense: async (id, payload, user) => {
    const docRef = doc(db, "expenses", id);
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
    if (currentHistory.length > 2) currentHistory = currentHistory.slice(-2); // 🚀 TOP 2 LIMIT

    await updateDoc(docRef, {
      ...payload,
      amount: Number(payload.amount) || 0,
      lastEditedBy: currentEdit.by,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    });
    markDirty();
    return { message: "Updated" };
  },

  deleteLog: async (id, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied.");
    await deleteDoc(doc(db, "trips", id));
    markDirty();
    return { message: "Deleted" };
  },

  deleteExpense: async (id, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied.");
    await deleteDoc(doc(db, "expenses", id));
    markDirty();
    return { message: "Deleted" };
  },

  // 5. 🚀 ATOMIC CHUNKED DELETE (Max 10k daily limit)
  deleteAllLogs: async ({ password, type = "trips", email }) => {
    const today = new Date().toISOString().split("T")[0];
    const wipeKey = `vehicle_wipe_meta_${type}`;
    let wipeMeta = JSON.parse(
      localStorage.getItem(wipeKey) || '{"date":"","count":0}',
    );

    if (wipeMeta.date === today && wipeMeta.count >= 10000) {
      throw new Error(
        "Daily Wipe Limit Reached (10,000 records). Action locked for 24 hours.",
      );
    }
    if (wipeMeta.date !== today) wipeMeta = { date: today, count: 0 };

    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.email !== email)
      throw new Error("Session mismatch.");

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
    const targetCollection =
      type === "expenses" ? expenseCollection : tripCollection;

    try {
      while (hasMore && totalDeleted < maxAllowed) {
        const currentBatchSize = Math.min(500, maxAllowed - totalDeleted);
        const q = query(targetCollection, limit(currentBatchSize));
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
      localStorage.setItem(wipeKey, JSON.stringify(wipeMeta));
      markDirty();

      if (totalDeleted >= maxAllowed && hasMore) {
        return {
          warning:
            "10,000 records deleted. Daily limit reached. Come back tomorrow.",
        };
      }
      return { success: true, deletedCount: totalDeleted };
    } catch (error) {
      throw new Error("Failed to clear database.");
    }
  },
};

export default vehicleService;
