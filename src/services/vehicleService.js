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
} from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";

const tripCollection = collection(db, "trips");
const expenseCollection = collection(db, "expenses");

const vehicleService = {
  // 1. STATS CALCULATION
  getStats: async () => {
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
      return {
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
    } catch (error) {
      console.warn("Aggregation failed, falling back to client calc:", error);
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
      return { trips, expenses };
    }
  },

  // 2. GET LOGS: Native Paginated Request
  getLogs: async (filters = {}, lastVisibleDoc = null, pageSize = 50) => {
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

    try {
      const q = query(tripCollection, ...constraints);
      const snapshot = await getDocs(q);
      return {
        data: snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() })),
        lastVisible: snapshot.docs[snapshot.docs.length - 1],
      };
    } catch (error) {
      throw error;
    }
  },

  // 3. GET EXPENSES: Native Paginated Request
  getExpenses: async (filters = {}, lastVisibleDoc = null, pageSize = 50) => {
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

    try {
      const q = query(expenseCollection, ...constraints);
      const snapshot = await getDocs(q);
      return {
        data: snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() })),
        lastVisible: snapshot.docs[snapshot.docs.length - 1],
      };
    } catch (error) {
      throw error;
    }
  },

  // 4. BACKUP DOWNLOAD CHUNKER (Max 10k restriction logic)
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
    const distance = Number(payload.distanceTravelled) || 0;
    const totalAmount = qty * rate + food;
    const amountDue =
      payload.amountDue !== ""
        ? Number(payload.amountDue)
        : Math.max(0, totalAmount - paid);
    const dataToSave = {
      ...payload,
      quantity: qty,
      rate: rate,
      foodCharge: food,
      amountPaid: paid,
      totalAmount,
      amountDue,
      distanceTravelled: distance,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
      editHistory: [],
    };
    const docRef = await addDoc(tripCollection, dataToSave);
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  updateLog: async (id, payload, user) => {
    const docRef = doc(db, "trips", id);
    const snapshot = await getDoc(docRef);
    let currentHistory =
      snapshot.exists() && snapshot.data().editHistory
        ? snapshot.data().editHistory
        : [];
    const currentEdit = {
      by: user?.email || "Unknown",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    };
    currentHistory.push(currentEdit);
    const qty = Number(payload.quantity) || 0;
    const rate = Number(payload.rate) || 0;
    const food = Number(payload.foodCharge) || 0;
    const paid = Number(payload.amountPaid) || 0;
    const distance = Number(payload.distanceTravelled) || 0;
    const totalAmount = qty * rate + food;
    const amountDue =
      payload.amountDue !== ""
        ? Number(payload.amountDue)
        : Math.max(0, totalAmount - paid);
    const dataToUpdate = {
      ...payload,
      quantity: qty,
      rate: rate,
      foodCharge: food,
      amountPaid: paid,
      totalAmount,
      amountDue,
      distanceTravelled: distance,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory.slice(-10),
    };
    await updateDoc(docRef, dataToUpdate);
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
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  updateExpense: async (id, payload, user) => {
    const docRef = doc(db, "expenses", id);
    const snapshot = await getDoc(docRef);
    let currentHistory =
      snapshot.exists() && snapshot.data().editHistory
        ? snapshot.data().editHistory
        : [];
    const currentEdit = {
      by: user?.email || "Unknown",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    };
    currentHistory.push(currentEdit);
    const dataToUpdate = {
      ...payload,
      amount: Number(payload.amount) || 0,
      lastEditedBy: currentEdit.by,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory.slice(-10),
    };
    await updateDoc(docRef, dataToUpdate);
    return { message: "Updated" };
  },

  deleteLog: async (id, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied: Managers cannot delete records.");
    await deleteDoc(doc(db, "trips", id));
    return { message: "Deleted" };
  },

  deleteExpense: async (id, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied: Managers cannot delete records.");
    await deleteDoc(doc(db, "expenses", id));
    return { message: "Deleted" };
  },

  // 5. ATOMIC DELETE BUNCHER (Max 10k daily limit)
  deleteAllLogs: async ({ password, type = "trips", email, limitChunk }) => {
    if (limitChunk <= 0) throw new Error("Daily wipe limit reached.");
    if (!password || !email)
      throw new Error("Authentication Error: Missing credentials.");

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw new Error("Access Denied: Incorrect Admin Password.");
    }

    try {
      const targetCollection =
        type === "expenses" ? expenseCollection : tripCollection;

      // Batch limits implemented cleanly here. It respects limitChunk.
      const q = query(targetCollection, limit(Math.min(limitChunk, 500)));
      const snapshot = await getDocs(q);

      const deletePromises = [];
      snapshot.forEach((document) => {
        deletePromises.push(
          deleteDoc(
            doc(db, type === "expenses" ? "expenses" : "trips", document.id),
          ),
        );
      });
      await Promise.all(deletePromises);
      return { success: true, deletedCount: snapshot.docs.length };
    } catch (error) {
      throw new Error("Failed to clear database. Admin rights required.");
    }
  },
};

export default vehicleService;
