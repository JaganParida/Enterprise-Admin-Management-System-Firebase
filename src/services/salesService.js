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
  writeBatch,
  increment,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const COLLECTION_NAME = "sales";
// 🔥 The single document that tracks all totals to keep dashboard reads at exactly 1
const STATS_DOC_REF = doc(db, "systemStats", "salesSummary");

// 🛠️ Helper: Atomic Background Math (Costs 0 extra reads)
const updateGlobalStats = async (amtDiff, cashDiff, onlineDiff, dueDiff) => {
  try {
    await setDoc(
      STATS_DOC_REF,
      {
        total: increment(amtDiff),
        cash: increment(cashDiff),
        online: increment(onlineDiff),
        pendingDues: increment(dueDiff),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Stats Update Failed:", error);
  }
};

const salesService = {
  // 🏆 1. THE 1-READ DASHBOARD STATS (O(1) Read Complexity)
  getStats: async () => {
    try {
      const snap = await getDoc(STATS_DOC_REF);
      if (snap.exists()) return snap.data();
      return { total: 0, cash: 0, online: 0, pendingDues: 0 };
    } catch (error) {
      console.error("Failed to fetch stats", error);
      return { total: 0, cash: 0, online: 0, pendingDues: 0 };
    }
  },

  // ⚡ 2. 100% BACKEND PAGINATED SALES FETCH (Max 50 Reads)
  getAllSales: async (filters = {}, lastDoc = null, limitCount = 50) => {
    let constraints = [];
    let hasInequality = false;

    // Equality Filters
    if (filters.paymentMode && filters.paymentMode !== "All Status") {
      constraints.push(where("paymentMode", "==", filters.paymentMode));
    }
    if (filters.productFilter && filters.productFilter !== "All") {
      constraints.push(where("productName", "==", filters.productFilter));
    }
    if (filters.exactDate) {
      constraints.push(where("date", "==", filters.exactDate));
    }

    // Inequality Filters (Firebase rule: Only ONE allowed)
    if (filters.search) {
      constraints.push(where("buyerName", ">=", filters.search));
      constraints.push(where("buyerName", "<=", filters.search + "\uf8ff"));
      constraints.push(orderBy("buyerName"));
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

    // Default sorting
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
      console.error("🔥 Firebase Query Error:", error);
      throw error;
    }
  },

  // 💸 3. PAGINATED CUSTOMER DUES (Limits Reads to 50 max)
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
      console.error(error);
      return { data: [], lastVisible: null };
    }
  },

  // ➕ ADD SALE (Syncs Stats Automatically)
  addSale: async (data, user) => {
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
      createdBy: user?.email || "admin@system.com",
      createdRole: user?.role || "admin",
      createdAt: new Date().toISOString(),
      editHistory: [],
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), saleData);
    updateGlobalStats(amt, isCash ? paid : 0, !isCash ? paid : 0, due);
    return docRef;
  },

  getSaleById: async (id) => {
    const docSnap = await getDoc(doc(db, COLLECTION_NAME, id));
    if (docSnap.exists())
      return { data: { _id: docSnap.id, id: docSnap.id, ...docSnap.data() } };
    throw new Error("Not found");
  },

  // 🔄 UPDATE SALE (Calculates Diff & Syncs Stats)
  updateSale: async (id, data, user) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    const old = docSnap.data();
    const oldAmt = Number(old.amount) || 0;
    const oldPaid = Number(old.amountPaid) || 0;
    const oldDue = Number(old.amountDue) || 0;
    const oldIsCash = old.paymentMode === "Cash";

    const newAmt = Number(data.amount) || 0;
    const newPaid = Number(data.amountPaid) || 0;
    const newDue = Number(data.amountDue) || 0;
    const newIsCash = data.paymentMode === "Cash";

    let currentHistory = old.editHistory || [];
    currentHistory.push({
      role: user?.role || "admin",
      email: user?.email || "admin",
      at: new Date().toISOString(),
    });
    if (currentHistory.length > 10) currentHistory = currentHistory.slice(-10);

    await updateDoc(docRef, {
      ...data,
      amount: newAmt,
      amountPaid: newPaid,
      amountDue: newDue,
      quantity: Number(data.quantity),
      editHistory: currentHistory,
    });

    const diffAmt = newAmt - oldAmt;
    const diffDue = newDue - oldDue;

    let diffCash = 0;
    let diffOnline = 0;
    if (oldIsCash && newIsCash) diffCash = newPaid - oldPaid;
    else if (!oldIsCash && !newIsCash) diffOnline = newPaid - oldPaid;
    else if (oldIsCash && !newIsCash) {
      diffCash = -oldPaid;
      diffOnline = newPaid;
    } else if (!oldIsCash && newIsCash) {
      diffOnline = -oldPaid;
      diffCash = newPaid;
    }

    updateGlobalStats(diffAmt, diffCash, diffOnline, diffDue);
  },

  // 🗑️ DELETE SALE (Deducts from Stats)
  deleteSale: async (id, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied");

    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    const old = docSnap.data();
    await deleteDoc(docRef);

    const oldIsCash = old.paymentMode === "Cash";
    updateGlobalStats(
      -old.amount,
      oldIsCash ? -old.amountPaid : 0,
      !oldIsCash ? -old.amountPaid : 0,
      -old.amountDue,
    );
  },

  // 🧨 BATCH WIPE (Crash-Proof 500-Chunk Loop)
  deleteAllSales: async ({ password, email, user }) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Action Denied");

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

    let totalDeleted = 0;
    const BATCH_SIZE = 500;
    const SAFE_DAILY_LIMIT = 9500; // Leaves quota breathing room

    try {
      while (totalDeleted < SAFE_DAILY_LIMIT) {
        const q = query(collection(db, COLLECTION_NAME), limit(BATCH_SIZE));
        const snapshot = await getDocs(q);

        if (snapshot.empty) break;

        const batch = writeBatch(db);
        snapshot.docs.forEach((document) => batch.delete(document.ref));
        await batch.commit();

        totalDeleted += snapshot.size;
      }

      // Reset dashboard stats instantly
      await setDoc(STATS_DOC_REF, {
        total: 0,
        cash: 0,
        online: 0,
        pendingDues: 0,
      });
      return { success: true, count: totalDeleted };
    } catch (error) {
      console.error(error);
      throw new Error(
        `Wipe stopped early. Deleted ${totalDeleted} records before error.`,
      );
    }
  },
};
export default salesService;
