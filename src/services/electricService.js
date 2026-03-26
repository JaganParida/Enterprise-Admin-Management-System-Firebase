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
} from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const billsCollection = collection(db, "electricBills");
// 🚀 THE MAGIC DOCUMENT: Yehi ek document poore dashboard ko power karega
const statsRef = doc(db, "systemStats", "electric");

// Helper: Safe Local Date Formatter (Prevents UTC timezone shift bug)
const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const electricService = {
  // 1. 🚀 GET STATS (Always Costs Exactly 1 Read!)
  getStats: async () => {
    try {
      const snap = await getDoc(statsRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          paid: data.paid || 0,
          pending: data.pending || 0,
          overdue: data.overdue || 0,
        };
      } else {
        // Agar first time run ho raha hai, toh zero stats create karega
        await setDoc(statsRef, { paid: 0, pending: 0, overdue: 0 });
        return { paid: 0, pending: 0, overdue: 0 };
      }
    } catch (error) {
      console.error("🔥 Error fetching stats:", error);
      return { paid: 0, pending: 0, overdue: 0 };
    }
  },

  // 2. 🚀 100% BACKEND FILTERING & PAGINATION
  getBills: async (filters = {}, lastDoc = null, limitCount = 50) => {
    let constraints = [];
    let hasInequality = false;

    if (filters.status && filters.status !== "All") {
      constraints.push(where("status", "==", filters.status));
    }
    if (filters.exactMonth) {
      constraints.push(where("month", "==", filters.exactMonth));
    }

    if (filters.search) {
      constraints.push(where("caNumber", ">=", filters.search));
      constraints.push(where("caNumber", "<=", filters.search + "\uf8ff"));
      constraints.push(orderBy("caNumber"));
      hasInequality = true;
    } else if (filters.amountFilter && filters.amountFilter !== "Any Amount") {
      if (filters.amountFilter === "Under ₹10k") {
        constraints.push(where("totalAmount", "<", 10000));
      } else if (filters.amountFilter === "₹10k - ₹50k") {
        constraints.push(
          where("totalAmount", ">=", 10000),
          where("totalAmount", "<=", 50000),
        );
      } else if (filters.amountFilter === "Over ₹50k") {
        constraints.push(where("totalAmount", ">", 50000));
      }
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

      const pastDateStr = getLocalDateString(pastDate);
      constraints.push(where("billDate", ">=", pastDateStr));
      constraints.push(orderBy("billDate", "desc"));
      hasInequality = true;
    }

    if (!hasInequality) {
      constraints.push(orderBy("billDate", "desc"));
    }

    constraints.push(limit(limitCount));

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    try {
      const q = query(billsCollection, ...constraints);
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }));
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];

      return { data, lastVisible };
    } catch (error) {
      console.error("🔥 Firebase Query Error:", error);
      throw error;
    }
  },

  // 3. 🚀 ADD BILL (Updates Metadata Counter)
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

    // 📊 Metadata Increment Logic
    let updatePayload = {};
    if (payload.status === "Paid") updatePayload.paid = increment(totalAmount);
    else if (payload.status === "Pending")
      updatePayload.pending = increment(totalAmount);
    else if (payload.status === "Overdue")
      updatePayload.overdue = increment(totalAmount);

    await setDoc(statsRef, updatePayload, { merge: true });

    return { data: { _id: docRef.id, ...payload } };
  },

  // 4. 🚀 UPDATE BILL (Balances Metadata Counter)
  updateBill: async (id, updateData, user) => {
    const docRef = doc(db, "electricBills", id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return;
    const existingData = snapshot.data();

    const isChanged =
      existingData.caNumber !== updateData.caNumber ||
      existingData.month !== updateData.month ||
      existingData.billDate !== updateData.billDate ||
      Number(existingData.billAmount) !== Number(updateData.billAmount) ||
      Number(existingData.fineAmount) !== Number(updateData.fineAmount) ||
      existingData.status !== updateData.status;

    if (!isChanged) return { message: "No changes made" };

    let currentHistory = existingData.editHistory || [];
    const currentEdit = {
      email: user?.email || "admin@system.com",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    };

    currentHistory.push(currentEdit);
    if (currentHistory.length > 10) currentHistory = currentHistory.slice(-10);

    const newBillAmt = parseFloat(updateData.billAmount) || 0;
    const newFineAmt = parseFloat(updateData.fineAmount) || 0;
    const newTotalAmount = newBillAmt + newFineAmt;
    const oldTotalAmount = Number(existingData.totalAmount) || 0;

    // 📊 Metadata Re-balancing Logic
    if (
      existingData.status !== updateData.status ||
      oldTotalAmount !== newTotalAmount
    ) {
      let updatePayload = {};

      // Step A: Minus old amount from old status
      if (existingData.status === "Paid")
        updatePayload.paid = increment(-oldTotalAmount);
      else if (existingData.status === "Pending")
        updatePayload.pending = increment(-oldTotalAmount);
      else if (existingData.status === "Overdue")
        updatePayload.overdue = increment(-oldTotalAmount);

      // Step B: Add new amount to new status
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

    const payload = {
      ...updateData,
      billAmount: newBillAmt,
      fineAmount: newFineAmt,
      totalAmount: newTotalAmount,
      lastEditedBy: currentEdit.email,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };

    await updateDoc(docRef, payload);
    return { message: "Bill updated successfully" };
  },

  // 5. 🚀 SECURE DELETE (Deducts from Metadata Counter)
  deleteBill: async (id, user) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager")
      throw new Error("Action Denied: Managers cannot delete records.");

    const docRef = doc(db, "electricBills", id);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      const amountToRemove = Number(data.totalAmount) || 0;

      // 📊 Metadata Decrement Logic
      let updatePayload = {};
      if (data.status === "Paid")
        updatePayload.paid = increment(-amountToRemove);
      else if (data.status === "Pending")
        updatePayload.pending = increment(-amountToRemove);
      else if (data.status === "Overdue")
        updatePayload.overdue = increment(-amountToRemove);

      await setDoc(statsRef, updatePayload, { merge: true });
    }

    await deleteDoc(docRef);
    return { message: "Bill deleted successfully" };
  },

  // 6. 🚀 SECURE WIPE ALL (Smart Safe-Guard Batched Deleter)
  deleteAllBills: async ({ password, email, user }) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager")
      throw new Error("Action Denied: Only Admins can wipe the database.");
    if (!password || !email) throw new Error("Authentication Error");

    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.email !== email)
      throw new Error("Active session mismatch.");

    // Password Verification
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
    // 🚀 SAFEGUARD LIMIT UPDATED TO 10,000
    const SAFE_DAILY_LIMIT = 10000;

    // Auto-Loop Delete Function
    const deleteInBatches = async () => {
      // 🛡️ THE SAFEGUARD: Agar 10,000 hit ho gaya toh ruk jao!
      if (totalDeleted >= SAFE_DAILY_LIMIT) {
        return "PARTIAL_SUCCESS";
      }

      const q = query(billsCollection, limit(500));
      const snapshot = await getDocs(q);

      if (snapshot.empty) return "FULL_SUCCESS"; // Sab kuch saf ho gaya!

      const batch = writeBatch(db);
      snapshot.docs.forEach((document) => {
        batch.delete(document.ref);
        totalDeleted++;
      });

      await batch.commit();
      return await deleteInBatches(); // Loop wapas chalao
    };

    try {
      const result = await deleteInBatches();

      if (result === "FULL_SUCCESS") {
        // Poora database saf ho gaya, stats ko 0 kar do
        await setDoc(statsRef, { paid: 0, pending: 0, overdue: 0 });
        return {
          success: true,
          isPartial: false,
          message: "All Electric Bills cleared successfully!",
        };
      } else {
        // PARTIAL WIPE HUA HAI: (Matlab bache hue records ka total wapas nikalna padega)
        const paidQ = query(billsCollection, where("status", "==", "Paid"));
        const pendingQ = query(
          billsCollection,
          where("status", "==", "Pending"),
        );
        const overdueQ = query(
          billsCollection,
          where("status", "==", "Overdue"),
        );

        // Bache hue records ka live sum calculate karke wapas save kar do (Sirf 3 reads lagenge)
        const [paidSnap, pendingSnap, overdueSnap] = await Promise.all([
          getAggregateFromServer(paidQ, { total: sum("totalAmount") }),
          getAggregateFromServer(pendingQ, { total: sum("totalAmount") }),
          getAggregateFromServer(overdueQ, { total: sum("totalAmount") }),
        ]);

        await setDoc(statsRef, {
          paid: paidSnap.data().total || 0,
          pending: pendingSnap.data().total || 0,
          overdue: overdueSnap.data().total || 0,
        });

        return {
          success: true,
          isPartial: true,
          message: `⚠️ System Protection: ${totalDeleted.toLocaleString()} records wiped. Daily limit safed. Please wipe the remaining bills tomorrow.`,
        };
      }
    } catch (error) {
      console.error("Wipe Error:", error);
      throw new Error("Wipe failed midway. Please try again.");
    }
  },
};

export default electricService;
