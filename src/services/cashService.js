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

const cashCollection = collection(db, "cashTransactions");

const cashService = {
  getTransactions: async () => {
    const q = query(cashCollection, orderBy("date", "desc"));
    const snapshot = await getDocs(q);

    const data = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));

    return { data };
  },

  // 🚀 UPDATED: CreatedBy Role
  addTransaction: async (payload, user) => {
    const docRef = await addDoc(cashCollection, {
      ...payload,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
    });
    return { data: { _id: docRef.id, ...payload } };
  },

  getTransactionById: async (id) => {
    const docRef = doc(db, "cashTransactions", id);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return { data: { _id: snapshot.id, ...snapshot.data() } };
    } else {
      throw new Error("Transaction not found");
    }
  },

  // 🚀 UPDATED: Role save karna aur Top 10 History Limit
  updateTransaction: async (id, payload, user) => {
    const docRef = doc(db, "cashTransactions", id);

    // Purani history nikalna
    const snapshot = await getDoc(docRef);
    let currentHistory = [];

    if (snapshot.exists() && snapshot.data().editHistory) {
      currentHistory = snapshot.data().editHistory;
    }

    // Naya edit record with ROLE
    const currentEdit = {
      by: user?.email || "Unknown",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    };

    currentHistory.push(currentEdit);

    // Top 10 Limit Capping
    if (currentHistory.length > 10) {
      currentHistory = currentHistory.slice(currentHistory.length - 10);
    }

    const updatedPayload = {
      ...payload,
      lastEditedBy: currentEdit.by,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };

    await updateDoc(docRef, updatedPayload);
    return { message: "Updated successfully" };
  },

  deleteTransaction: async (id) => {
    const docRef = doc(db, "cashTransactions", id);
    await deleteDoc(docRef);
    return { message: "Deleted successfully" };
  },
};

export default cashService;
