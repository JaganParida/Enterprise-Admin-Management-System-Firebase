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
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const tripCollection = collection(db, "trips");
const expenseCollection = collection(db, "expenses");

const vehicleService = {
  // 1. 🚀 SERVER-SIDE STATS CALCULATION
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
      // Fallback
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

  // 2 & 3. 🚀 PAGINATION & BACKEND FILTERING (TRIPS)
  getLogs: async (filters = {}, lastVisibleDoc = null, pageSize = 50) => {
    let queryConstraints = [];

    if (filters.exactDate) {
      queryConstraints.push(where("date", ">=", filters.exactDate));
      queryConstraints.push(where("date", "<=", filters.exactDate + "\uf8ff"));
    } else if (filters.dateFilter && filters.dateFilter !== "All") {
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
    }

    queryConstraints.push(orderBy("date", "desc"));
    if (lastVisibleDoc) queryConstraints.push(startAfter(lastVisibleDoc));
    queryConstraints.push(limit(pageSize));

    const q = query(tripCollection, ...queryConstraints);
    const snapshot = await getDocs(q);

    let fetchedData = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));

    // Client-side fallback for Search & Amounts
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      fetchedData = fetchedData.filter(
        (item) =>
          String(item.vehicleNo || "")
            .toLowerCase()
            .includes(searchLower) ||
          String(item.driverName || "")
            .toLowerCase()
            .includes(searchLower) ||
          String(item.loadingPoint || "")
            .toLowerCase()
            .includes(searchLower) ||
          String(item.unloadingSite || "")
            .toLowerCase()
            .includes(searchLower),
      );
    }

    if (filters.amountFilter && filters.amountFilter !== "Any Amount") {
      fetchedData = fetchedData.filter((item) => {
        const amt = Number(item.totalAmount) || 0;
        if (filters.amountFilter === "Under ₹10k") return amt < 10000;
        if (filters.amountFilter === "₹10k - ₹50k")
          return amt >= 10000 && amt <= 50000;
        if (filters.amountFilter === "Over ₹50k") return amt > 50000;
        return true;
      });
    }

    return {
      data: fetchedData,
      lastVisible: snapshot.docs[snapshot.docs.length - 1],
    };
  },

  // 2 & 3. 🚀 PAGINATION & BACKEND FILTERING (EXPENSES)
  getExpenses: async (filters = {}, lastVisibleDoc = null, pageSize = 50) => {
    let queryConstraints = [];

    if (filters.exactDate) {
      queryConstraints.push(where("date", ">=", filters.exactDate));
      queryConstraints.push(where("date", "<=", filters.exactDate + "\uf8ff"));
    } else if (filters.dateFilter && filters.dateFilter !== "All") {
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
    }

    queryConstraints.push(orderBy("date", "desc"));
    if (lastVisibleDoc) queryConstraints.push(startAfter(lastVisibleDoc));
    queryConstraints.push(limit(pageSize));

    const q = query(expenseCollection, ...queryConstraints);
    const snapshot = await getDocs(q);

    let fetchedData = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));

    // Client-side fallback for Search & Amounts
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      fetchedData = fetchedData.filter((item) =>
        String(item.reason || "")
          .toLowerCase()
          .includes(searchLower),
      );
    }
    if (filters.amountFilter && filters.amountFilter !== "Any Amount") {
      fetchedData = fetchedData.filter((item) => {
        const amt = Number(item.amount) || 0;
        if (filters.amountFilter === "Under ₹10k") return amt < 10000;
        if (filters.amountFilter === "₹10k - ₹50k")
          return amt >= 10000 && amt <= 50000;
        if (filters.amountFilter === "Over ₹50k") return amt > 50000;
        return true;
      });
    }

    return {
      data: fetchedData,
      lastVisible: snapshot.docs[snapshot.docs.length - 1],
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

  // 4. 🚀 BACKEND SECURITY (RBAC)
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

  // 4. 🚀 BACKEND SECURITY WIPE FEATURE
  deleteAllLogs: async ({ password, type = "trips", email, user }) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied: Managers cannot wipe the database.");
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
      const snapshot = await getDocs(targetCollection);
      const deletePromises = [];
      snapshot.forEach((document) => {
        deletePromises.push(
          deleteDoc(
            doc(db, type === "expenses" ? "expenses" : "trips", document.id),
          ),
        );
      });
      await Promise.all(deletePromises);
      return { success: true };
    } catch (error) {
      throw new Error("Failed to clear database. Admin rights required.");
    }
  },
};

export default vehicleService;
