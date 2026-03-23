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
  getAggregateFromServer,
  sum,
  startAfter,
} from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const billsCollection = collection(db, "electricBills");

const electricService = {
  // 1. 🚀 SERVER-SIDE STATS
  getStats: async () => {
    try {
      const paidQ = query(billsCollection, where("status", "==", "Paid"));
      const pendingQ = query(billsCollection, where("status", "==", "Pending"));
      const overdueQ = query(billsCollection, where("status", "==", "Overdue"));

      const [paidSnap, pendingSnap, overdueSnap] = await Promise.all([
        getAggregateFromServer(paidQ, { total: sum("totalAmount") }),
        getAggregateFromServer(pendingQ, { total: sum("totalAmount") }),
        getAggregateFromServer(overdueQ, { total: sum("totalAmount") }),
      ]);

      const paidTotal = paidSnap.data().total || 0;
      const pendingTotal = pendingSnap.data().total || 0;
      const overdueTotal = overdueSnap.data().total || 0;

      if (paidTotal === 0 && pendingTotal === 0 && overdueTotal === 0) {
        throw new Error("Trigger Fallback");
      }

      return { paid: paidTotal, pending: pendingTotal, overdue: overdueTotal };
    } catch (error) {
      try {
        const snapshot = await getDocs(billsCollection);
        const stats = { paid: 0, pending: 0, overdue: 0 };
        snapshot.forEach((doc) => {
          const data = doc.data();
          const amount = Number(data.totalAmount) || 0;
          if (data.status === "Paid") stats.paid += amount;
          else if (data.status === "Pending") stats.pending += amount;
          else if (data.status === "Overdue") stats.overdue += amount;
        });
        return stats;
      } catch (fallbackError) {
        return { paid: 0, pending: 0, overdue: 0 };
      }
    }
  },

  // 2. 🚀 PAGINATION & BACKEND FILTERING
  getBills: async (filters = {}, lastDoc = null) => {
    let constraints = [];

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
    } else {
      constraints.push(orderBy("billDate", "desc"));
    }

    constraints.push(limit(50));

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
    return { data: { _id: docRef.id, ...payload } };
  },

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

    const billAmt = parseFloat(updateData.billAmount) || 0;
    const fineAmt = parseFloat(updateData.fineAmount) || 0;
    const totalAmount = billAmt + fineAmt;

    const payload = {
      ...updateData,
      billAmount: billAmt,
      fineAmount: fineAmt,
      totalAmount,
      lastEditedBy: currentEdit.email,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };

    await updateDoc(docRef, payload);
    return { message: "Bill updated successfully" };
  },

  // 3. 🚀 SECURE DELETE (RBAC Check)
  deleteBill: async (id, user) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager")
      throw new Error("Action Denied: Managers cannot delete records.");
    const docRef = doc(db, "electricBills", id);
    await deleteDoc(docRef);
    return { message: "Bill deleted successfully" };
  },

  // 4. 🚀 SECURE WIPE ALL (Password Re-auth + RBAC Check)
  deleteAllBills: async ({ password, email, user }) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager")
      throw new Error("Action Denied: Only Admins can wipe the database.");
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
      const snapshot = await getDocs(billsCollection);
      const deletePromises = [];
      snapshot.forEach((document) => {
        deletePromises.push(deleteDoc(doc(db, "electricBills", document.id)));
      });
      await Promise.all(deletePromises);
      return { success: true };
    } catch (error) {
      throw new Error("Failed to clear database.");
    }
  },
};

export default electricService;
