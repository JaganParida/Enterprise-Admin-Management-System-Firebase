import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  startAfter,
  writeBatch,
  increment,
  setDoc,
  getAggregateFromServer,
  sum,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const COLLECTION_NAME = "sales";
const STATS_DOC_REF = doc(db, "systemStats", "salesSummary");

const salesService = {
  getStats: async () => {
    try {
      const snap = await getDoc(STATS_DOC_REF);
      if (snap.exists()) {
        const d = snap.data();
        return {
          total: Number(d.total) || 0,
          cash: Number(d.cash) || 0,
          online: Number(d.online) || 0,
          pendingDues: Number(d.pendingDues) || 0,
        };
      }
      return { total: 0, cash: 0, online: 0, pendingDues: 0 };
    } catch (error) {
      console.error("Failed to fetch stats", error);
      return { total: 0, cash: 0, online: 0, pendingDues: 0 };
    }
  },

  recalculateStats: async () => {
    try {
      const cashQuery = query(
        collection(db, COLLECTION_NAME),
        where("paymentMode", "==", "Cash"),
      );
      const onlineQuery = query(
        collection(db, COLLECTION_NAME),
        where("paymentMode", "==", "Online"),
      );

      const [cashAgg, onlineAgg] = await Promise.all([
        getAggregateFromServer(cashQuery, {
          totalAmt: sum("amount"),
          totalPaid: sum("amountPaid"),
          totalDue: sum("amountDue"),
        }),
        getAggregateFromServer(onlineQuery, {
          totalAmt: sum("amount"),
          totalPaid: sum("amountPaid"),
          totalDue: sum("amountDue"),
        }),
      ]);

      const cashData = cashAgg.data();
      const onlineData = onlineAgg.data();

      const newStats = {
        total: (cashData.totalAmt || 0) + (onlineData.totalAmt || 0),
        cash: cashData.totalPaid || 0,
        online: onlineData.totalPaid || 0,
        pendingDues: (cashData.totalDue || 0) + (onlineData.totalDue || 0),
      };

      await setDoc(STATS_DOC_REF, newStats);
      return newStats;
    } catch (error) {
      console.error("Aggregation Error:", error);
      throw error;
    }
  },

  getAllSales: async (filters = {}, lastDoc = null, limitCount = 50) => {
    let constraints = [];
    let hasInequality = false;

    if (filters.paymentMode && filters.paymentMode !== "All Status")
      constraints.push(where("paymentMode", "==", filters.paymentMode));
    if (filters.productFilter && filters.productFilter !== "All")
      constraints.push(where("productName", "==", filters.productFilter));
    if (filters.exactDate)
      constraints.push(where("date", "==", filters.exactDate));

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      constraints.push(where("buyerNameLower", ">=", searchTerm));
      constraints.push(where("buyerNameLower", "<=", searchTerm + "\uf8ff"));
      constraints.push(orderBy("buyerNameLower"));
      hasInequality = true;
    } else if (filters.amountFilter && filters.amountFilter !== "Any Amount") {
      if (filters.amountFilter === "Under ₹50k")
        constraints.push(where("amount", "<", 50000));
      else if (filters.amountFilter === "Over ₹50k")
        constraints.push(where("amount", ">=", 50000));
      constraints.push(orderBy("amount", "desc"));
      hasInequality = true;
    } else if (
      filters.dateFilter &&
      filters.dateFilter !== "All" &&
      !filters.exactDate
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

    if (!hasInequality && !filters.exactDate)
      constraints.push(orderBy("date", "desc"));

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
      console.error("🔥 Firebase Query Error:", error.message);
      throw error;
    }
  },

  getCustomerDues: async (lastDoc = null, limitCount = 50) => {
    try {
      const constraints = [
        where("amountDue", ">", 0),
        orderBy("amountDue", "desc"),
        limit(limitCount),
      ];
      if (lastDoc) constraints.push(startAfter(lastDoc));

      const q = query(collection(db, COLLECTION_NAME), ...constraints);
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        _id: doc.id,
        id: doc.id,
        ...doc.data(),
      }));
      return { data, lastVisible: snapshot.docs[snapshot.docs.length - 1] };
    } catch (error) {
      console.error("🔥 Firebase Dues Query Error:", error.message);
      return { data: [], lastVisible: null };
    }
  },

  getSaleById: async (id) => {
    try {
      const docSnap = await getDoc(doc(db, COLLECTION_NAME, id));
      if (docSnap.exists())
        return { data: { _id: docSnap.id, id: docSnap.id, ...docSnap.data() } };
      throw new Error("Not found");
    } catch (error) {
      console.error("Error fetching sale by ID:", error);
      throw error;
    }
  },

  addSale: async (data, user) => {
    const batch = writeBatch(db);
    const newSaleRef = doc(collection(db, COLLECTION_NAME));

    const amt = Number(data.amount) || 0;
    const paid = Number(data.amountPaid) || 0;
    const due = Number(data.amountDue) || 0;
    const isCash = data.paymentMode === "Cash";

    const saleData = {
      ...data,
      amount: amt,
      amountPaid: paid,
      amountDue: due,
      quantity: Number(data.quantity),
      buyerNameLower: (data.buyerName || "").toLowerCase(),
      createdBy: user?.email || "admin@system.com",
      createdAt: new Date().toISOString(),
      editHistory: [],
    };

    batch.set(newSaleRef, saleData);
    batch.set(
      STATS_DOC_REF,
      {
        total: increment(amt),
        cash: increment(isCash ? paid : 0),
        online: increment(!isCash ? paid : 0),
        pendingDues: increment(due),
      },
      { merge: true },
    );

    await batch.commit();
    return newSaleRef;
  },

  updateSale: async (id, data, user) => {
    const saleRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(saleRef);
    if (!docSnap.exists()) throw new Error("Not found");

    const old = docSnap.data();
    const newAmt = Number(data.amount) || 0;
    const newPaid = Number(data.amountPaid) || 0;
    const newDue = Number(data.amountDue) || 0;
    const newIsCash = data.paymentMode === "Cash";

    const diffAmt = newAmt - (Number(old.amount) || 0);
    const diffDue = newDue - (Number(old.amountDue) || 0);

    let diffCash = 0,
      diffOnline = 0;
    const oldIsCash = old.paymentMode === "Cash";
    const oldPaid = Number(old.amountPaid) || 0;

    if (oldIsCash && newIsCash) diffCash = newPaid - oldPaid;
    else if (!oldIsCash && !newIsCash) diffOnline = newPaid - oldPaid;
    else if (oldIsCash && !newIsCash) {
      diffCash = -oldPaid;
      diffOnline = newPaid;
    } else if (!oldIsCash && newIsCash) {
      diffOnline = -oldPaid;
      diffCash = newPaid;
    }

    const batch = writeBatch(db);
    batch.update(saleRef, {
      ...data,
      amount: newAmt,
      amountPaid: newPaid,
      amountDue: newDue,
      buyerNameLower: (data.buyerName || "").toLowerCase(),
    });

    batch.set(
      STATS_DOC_REF,
      {
        total: increment(diffAmt),
        cash: increment(diffCash),
        online: increment(diffOnline),
        pendingDues: increment(diffDue),
      },
      { merge: true },
    );

    await batch.commit();
  },

  deleteSale: async (id, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied");
    const saleRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(saleRef);
    if (!docSnap.exists()) return;

    const old = docSnap.data();
    const isCash = old.paymentMode === "Cash";

    const batch = writeBatch(db);
    batch.delete(saleRef);
    batch.set(
      STATS_DOC_REF,
      {
        total: increment(-old.amount),
        cash: increment(isCash ? -old.amountPaid : 0),
        online: increment(!isCash ? -old.amountPaid : 0),
        pendingDues: increment(-old.amountDue),
      },
      { merge: true },
    );

    await batch.commit();
  },

  deleteAllSales: async ({ password, email }) => {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.email !== email)
      throw new Error("Authentication Mismatch");

    try {
      // Step 1: Re-authenticate with password
      const credential = EmailAuthProvider.credential(email, password);
      await reauthenticateWithCredential(currentUser, credential);

      // Step 2: Delete in Batches (Limit 9500 for safety)
      let totalDeleted = 0;
      while (totalDeleted < 9500) {
        const q = query(collection(db, COLLECTION_NAME), limit(500));
        const snapshot = await getDocs(q);
        if (snapshot.empty) break;

        const batch = writeBatch(db);
        snapshot.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        totalDeleted += snapshot.size;
      }

      // Step 3: Reset Stats
      await setDoc(STATS_DOC_REF, {
        total: 0,
        cash: 0,
        online: 0,
        pendingDues: 0,
      });

      return { success: true, count: totalDeleted };
    } catch (error) {
      console.error("Wipe Error:", error);
      throw new Error("Invalid Password or Authentication Failed");
    }
  },

  getBackupState: async (month) => {
    try {
      const snap = await getDoc(doc(db, "systemStats", "backupLocks"));
      if (snap.exists()) {
        const data = snap.data();
        return data[month] || null;
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  setBackupState: async (month, stateData) => {
    try {
      const lockRef = doc(db, "systemStats", "backupLocks");
      await setDoc(lockRef, { [month]: stateData }, { merge: true });
    } catch (e) {
      console.error("Failed to set lock", e);
    }
  },
};

export default salesService;
