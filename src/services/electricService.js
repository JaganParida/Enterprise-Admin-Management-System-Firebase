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
} from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";

const billsCollection = collection(db, "electricBills");

const electricService = {
  getBills: async () => {
    const q = query(billsCollection, orderBy("billDate", "desc"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));
    return { data };
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
      editHistory: [], // 🚀 COMPLETELY EMPTY ON CREATION
    };

    const docRef = await addDoc(billsCollection, payload);
    return { data: { _id: docRef.id, ...payload } };
  },

  updateBill: async (id, updateData, user) => {
    const docRef = doc(db, "electricBills", id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return;
    const existingData = snapshot.data();

    // 🚀 Smart Check: Ensure data actually changed before logging history
    const isChanged =
      existingData.caNumber !== updateData.caNumber ||
      existingData.month !== updateData.month ||
      existingData.billDate !== updateData.billDate ||
      Number(existingData.billAmount) !== Number(updateData.billAmount) ||
      Number(existingData.fineAmount) !== Number(updateData.fineAmount) ||
      existingData.status !== updateData.status;

    if (!isChanged) return { message: "No changes made" };

    let currentHistory = existingData.editHistory || [];

    // 🚀 ONLY TRACKING ACTUAL EDITS
    const currentEdit = {
      email: user?.email || "admin@system.com",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    };

    currentHistory.push(currentEdit);

    if (currentHistory.length > 10) {
      currentHistory = currentHistory.slice(-10);
    }

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

  deleteBill: async (id) => {
    const docRef = doc(db, "electricBills", id);
    await deleteDoc(docRef);
    return { message: "Bill deleted successfully" };
  },

  // 🛑 SECURE: Wipe Entire Database Method Added - Strictly Verifies Admin Password
  deleteAllBills: async ({ password, email }) => {
    if (!password) {
      throw new Error("Password is required to wipe the database.");
    }
    if (!email) {
      throw new Error("Authentication Error: Unable to verify admin identity.");
    }

    try {
      // Securely verifies password against current admin's email using Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw new Error("Access Denied: Incorrect Admin Password.");
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
      console.error("Wipe Database Error:", error);
      throw new Error("Failed to clear database. Admin rights required.");
    }
  },
};

export default electricService;
