import { db } from "../config/firebase";
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

const billsCollection = collection(db, "electricBills");

const electricService = {
  // 1. Get all bill records
  getBills: async () => {
    const q = query(billsCollection, orderBy("billDate", "desc"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));
    return { data };
  },

  // 2. Record a new bill (Tracking Creator)
  addBill: async (billData, user) => {
    const totalAmount =
      (parseFloat(billData.unitsConsumed) || 0) *
      (parseFloat(billData.ratePerUnit) || 0);

    const payload = {
      ...billData,
      totalAmount,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
    };

    const docRef = await addDoc(billsCollection, payload);
    return { data: { _id: docRef.id, ...payload } };
  },

  // 3. Update existing bill (With Top 10 History Limit)
  updateBill: async (id, updateData, user) => {
    const docRef = doc(db, "electricBills", id);
    const snapshot = await getDoc(docRef);

    let currentHistory = [];
    if (snapshot.exists() && snapshot.data().editHistory) {
      currentHistory = snapshot.data().editHistory;
    }

    const currentEdit = {
      by: user?.email || "Unknown",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    };

    currentHistory.push(currentEdit);

    if (currentHistory.length > 10) {
      currentHistory = currentHistory.slice(currentHistory.length - 10);
    }

    const totalAmount =
      (parseFloat(updateData.unitsConsumed) || 0) *
      (parseFloat(updateData.ratePerUnit) || 0);

    const payload = {
      ...updateData,
      totalAmount,
      lastEditedBy: currentEdit.by,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };

    await updateDoc(docRef, payload);
    return { message: "Bill updated successfully" };
  },

  // 4. Delete a bill record
  deleteBill: async (id) => {
    const docRef = doc(db, "electricBills", id);
    await deleteDoc(docRef);
    return { message: "Bill deleted successfully" };
  },
};

export default electricService;
