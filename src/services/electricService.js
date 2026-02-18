import { db } from "../config/firebase";
import {
  collection,
  addDoc,
  getDocs,
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
    // query se hum bills ko latest date ke hisaab se order karenge
    const q = query(billsCollection, orderBy("billDate", "desc"));
    const snapshot = await getDocs(q);

    const data = snapshot.docs.map((doc) => ({
      _id: doc.id, // Firestore ID ko _id mein map kiya taaki UI na toote
      ...doc.data(),
    }));

    return { data };
  },

  // 2. Record a new bill
  addBill: async (billData) => {
    // Total amount backend calculate karta tha, ab hum frontend service mein hi kar denge
    const totalAmount =
      (parseFloat(billData.unitsConsumed) || 0) *
      (parseFloat(billData.ratePerUnit) || 0);

    const payload = {
      ...billData,
      totalAmount,
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(billsCollection, payload);
    return { data: { _id: docRef.id, ...payload } };
  },

  // 3. Update existing bill
  updateBill: async (id, updateData) => {
    const totalAmount =
      (parseFloat(updateData.unitsConsumed) || 0) *
      (parseFloat(updateData.ratePerUnit) || 0);

    const docRef = doc(db, "electricBills", id);
    const payload = {
      ...updateData,
      totalAmount,
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
