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
  getAggregateFromServer,
  sum,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const COLLECTION_NAME = "sales";

const salesService = {
  // 🚀 1. FAST SERVER-SIDE STATS
  getStats: async () => {
    try {
      const salesCol = collection(db, COLLECTION_NAME);
      const cashQ = query(salesCol, where("paymentMode", "==", "Cash"));
      const onlineQ = query(salesCol, where("paymentMode", "==", "Online"));

      const [totalSnap, cashSnap, onlineSnap] = await Promise.all([
        getAggregateFromServer(salesCol, {
          total: sum("amount"),
          due: sum("amountDue"),
        }),
        getAggregateFromServer(cashQ, { totalCash: sum("amountPaid") }),
        getAggregateFromServer(onlineQ, { totalOnline: sum("amountPaid") }),
      ]);

      const total = totalSnap.data().total || 0;
      const cash = cashSnap.data().totalCash || 0;
      const online = onlineSnap.data().totalOnline || 0;
      const pendingDues = totalSnap.data().due || 0;

      if (total === 0 && cash === 0 && online === 0 && pendingDues === 0)
        throw new Error("Fallback Trigger");

      return { total, cash, online, pendingDues };
    } catch (error) {
      try {
        let stats = { total: 0, cash: 0, online: 0, pendingDues: 0 };
        const snapshot = await getDocs(collection(db, COLLECTION_NAME));
        snapshot.forEach((doc) => {
          const data = doc.data();
          const amt = Number(data.amount) || 0;
          stats.total += amt;
          stats.pendingDues += Number(data.amountDue) || 0;
          if (data.paymentMode === "Cash")
            stats.cash += Number(data.amountPaid || amt);
          if (data.paymentMode === "Online")
            stats.online += Number(data.amountPaid || amt);
        });
        return stats;
      } catch (fallbackError) {
        return { total: 0, cash: 0, online: 0, pendingDues: 0 };
      }
    }
  },

  // 🚀 2. PAGINATED & 100% BACKEND FILTERED SALES FETCH
  getAllSales: async (filters = {}, lastDoc = null, limitCount = 50) => {
    let constraints = [];
    let hasInequality = false;

    // EXACT EQUALITY FILTERS
    if (filters.paymentMode && filters.paymentMode !== "All Status") {
      constraints.push(where("paymentMode", "==", filters.paymentMode));
    }
    if (filters.productFilter && filters.productFilter !== "All") {
      constraints.push(where("productName", "==", filters.productFilter));
    }
    if (filters.exactDate) {
      constraints.push(where("date", "==", filters.exactDate));
    }

    // INEQUALITY FILTERS (Priority Logic - Only ONE allowed by Firebase)
    if (filters.search) {
      // Firebase doesn't support OR queries well for prefix search across multiple fields (buyerName, challan, vehicle).
      // So we will prioritize searching by Buyer Name for backend efficiency.
      constraints.push(where("buyerName", ">=", filters.search));
      constraints.push(where("buyerName", "<=", filters.search + "\uf8ff"));
      constraints.push(orderBy("buyerName"));
      hasInequality = true;
    } else if (
      filters.amountFilter &&
      filters.amountFilter !== "Any Amount" &&
      !hasInequality
    ) {
      if (filters.amountFilter === "Under ₹50k")
        constraints.push(where("amount", "<", 50000));
      else if (filters.amountFilter === "Over ₹50k")
        constraints.push(where("amount", ">=", 50000));
      constraints.push(orderBy("amount", "desc"));
      hasInequality = true;
    } else if (
      filters.dateFilter &&
      filters.dateFilter !== "All" &&
      !filters.exactDate &&
      !hasInequality
    ) {
      const today = new Date();
      let pastDate = new Date();
      if (filters.dateFilter === "Last7Days")
        pastDate.setDate(today.getDate() - 7);
      else if (filters.dateFilter === "Last30Days")
        pastDate.setDate(today.getDate() - 30);
      else if (filters.dateFilter === "ThisMonth") pastDate.setDate(1);

      const pastDateStr = pastDate.toISOString().split("T")[0];
      constraints.push(where("date", ">=", pastDateStr));
      constraints.push(orderBy("date", "desc"));
      hasInequality = true;
    }

    if (!hasInequality && !filters.exactDate) {
      constraints.push(orderBy("date", "desc"));
    }

    constraints.push(limit(limitCount));
    if (lastDoc) constraints.push(startAfter(lastDoc));

    try {
      const q = query(collection(db, COLLECTION_NAME), ...constraints);
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        _id: doc.id,
        id: doc.id,
        ...doc.data(),
      }));
      return { data, lastVisible: snapshot.docs[snapshot.docs.length - 1] };
    } catch (error) {
      throw error;
    }
  },

  // 🚀 FETCH DUES (Separate efficient query)
  getCustomerDues: async () => {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where("amountDue", ">", 0),
        orderBy("amountDue", "desc"),
      );
      const snapshot = await getDocs(q);
      const duesData = snapshot.docs.map((doc) => ({
        _id: doc.id,
        id: doc.id,
        ...doc.data(),
      }));

      // Grouping logic for the frontend Dues Tab
      const map = {};
      duesData.forEach((sale) => {
        const buyer = sale.buyerName || "Unknown Customer";
        if (!map[buyer]) {
          map[buyer] = {
            buyerName: buyer,
            totalDue: 0,
            totalBillAmount: 0,
            records: [],
          };
        }
        map[buyer].totalDue += Number(sale.amountDue);
        map[buyer].totalBillAmount += Number(sale.amount) || 0;
        map[buyer].records.push(sale);
      });
      return Object.values(map).sort((a, b) => b.totalDue - a.totalDue);
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  addSale: async (data, user) => {
    const saleData = {
      ...data,
      amount: Number(data.amount),
      amountPaid: Number(data.amountPaid || 0),
      amountDue: Number(data.amountDue || 0),
      quantity: Number(data.quantity),
      createdBy: user?.email || "admin@system.com",
      createdRole: user?.role || "admin",
      createdAt: new Date().toISOString(),
      editHistory: [],
    };
    return await addDoc(collection(db, COLLECTION_NAME), saleData);
  },

  getSaleById: async (id) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists())
      return { data: { _id: docSnap.id, id: docSnap.id, ...docSnap.data() } };
    throw new Error("Not found");
  },

  updateSale: async (id, data, user) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const existingData = docSnap.data();

    const now = new Date().toISOString();
    let currentHistory = existingData.editHistory || [];
    currentHistory.push({
      role: user?.role || "admin",
      email: user?.email || "admin@system.com",
      at: now,
    });

    if (currentHistory.length > 10) currentHistory = currentHistory.slice(-10);

    return await updateDoc(docRef, {
      ...data,
      amount: Number(data.amount),
      amountPaid: Number(data.amountPaid || 0),
      amountDue: Number(data.amountDue || 0),
      quantity: Number(data.quantity),
      editHistory: currentHistory,
    });
  },

  deleteSale: async (id, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied");
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  },

  deleteAllSales: async ({ password, email, user }) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied");
    if (!password || !email) throw new Error("Authentication Error");

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
      throw new Error("Incorrect Admin Password.");
    }

    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const deletePromises = snapshot.docs.map((document) =>
        deleteDoc(doc(db, COLLECTION_NAME, document.id)),
      );
      await Promise.all(deletePromises);
      return { success: true };
    } catch (error) {
      throw new Error("Failed to clear database.");
    }
  },
};
export default salesService;
