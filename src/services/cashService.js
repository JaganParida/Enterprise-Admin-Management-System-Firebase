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

// Firestore mein apne collection ka naam (Table name)
const cashCollection = collection(db, "cashTransactions");

const cashService = {
  // 1. Get all transactions (List & Report ke liye)
  getTransactions: async () => {
    // Latest transactions pehle dikhane ke liye orderBy lagaya hai
    const q = query(cashCollection, orderBy("date", "desc"));
    const snapshot = await getDocs(q);

    const data = snapshot.docs.map((doc) => ({
      _id: doc.id, // Firebase doc.id deta hai, aapka UI _id use karta hai, isliye map kiya
      ...doc.data(),
    }));

    return { data }; // Object mein wrap kiya taaki aapka const { data } UI mein break na ho
  },

  // 2. Add new transaction (CashEntry ke liye)
  addTransaction: async (payload) => {
    const docRef = await addDoc(cashCollection, {
      ...payload,
      createdAt: new Date().toISOString(),
    });
    return { data: { _id: docRef.id, ...payload } };
  },

  // 3. Get transaction by ID (EditCash load hone par)
  getTransactionById: async (id) => {
    const docRef = doc(db, "cashTransactions", id);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return { data: { _id: snapshot.id, ...snapshot.data() } };
    } else {
      throw new Error("Transaction not found");
    }
  },

  // 4. Update transaction (EditCash form submit par)
  updateTransaction: async (id, payload) => {
    const docRef = doc(db, "cashTransactions", id);
    await updateDoc(docRef, payload);
    return { message: "Updated successfully" };
  },

  // 5. Delete transaction (Trash icon click par)
  deleteTransaction: async (id) => {
    const docRef = doc(db, "cashTransactions", id);
    await deleteDoc(docRef);
    return { message: "Deleted successfully" };
  },
};

export default cashService;
