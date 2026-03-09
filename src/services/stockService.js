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
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const stockCollection = collection(db, "stocks");

const getUpdatedHistory = async (id, user) => {
  const docRef = doc(db, "stocks", id);
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

  return { currentEdit, currentHistory, docRef };
};

const stockService = {
  getAllStocks: async () => {
    const q = query(stockCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const data = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));

    return { data };
  },

  createStock: async (stockData, user) => {
    const payload = {
      ...stockData,
      quantity: Number(stockData.quantity),
      price: Number(stockData.price),
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
    };

    const docRef = await addDoc(stockCollection, payload);
    return { data: { _id: docRef.id, ...payload } };
  },

  getStockById: async (id) => {
    const docRef = doc(db, "stocks", id);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return { data: { _id: snapshot.id, ...snapshot.data() } };
    } else {
      throw new Error("Inventory item not found");
    }
  },

  updateStock: async (id, updateData, user) => {
    const docRef = doc(db, "stocks", id);

    const snapshot = await getDoc(docRef);
    let currentHistory = [];

    if (snapshot.exists() && snapshot.data().editHistory) {
      currentHistory = snapshot.data().editHistory;
    }

    // 🚀 UPDATED: Role save kar rahe hain yahan
    const currentEdit = {
      by: user?.email || "Unknown",
      role: user?.role || "Admin", // 👈 ROLE SAVE KIYA
      at: new Date().toISOString(),
    };

    currentHistory.push(currentEdit);

    if (currentHistory.length > 10) {
      currentHistory = currentHistory.slice(currentHistory.length - 10);
    }

    const payload = {
      ...updateData,
      quantity: Number(updateData.quantity),
      price: Number(updateData.price),
      lastEditedBy: currentEdit.by,
      lastEditedRole: currentEdit.role, // 👈 ROLE UPDATE KIYA
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };

    await updateDoc(docRef, payload);
    return { message: "Stock updated successfully" };
  },

  deleteStock: async (id) => {
    const docRef = doc(db, "stocks", id);
    await deleteDoc(docRef);
    return { message: "Item deleted successfully" };
  },

  // 🛑 SECURE: Wipe Entire Database Method Added - Strictly Verifies Admin Password
  deleteAllStocks: async ({ password, email }) => {
    if (!password) {
      throw new Error("Password is required to wipe the database.");
    }
    if (!email) {
      throw new Error("Authentication Error: Unable to verify admin identity.");
    }

    try {
      const auth = getAuth();
      // Securely verifies password against current admin's email using Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw new Error("Access Denied: Incorrect Admin Password.");
    }

    try {
      const snapshot = await getDocs(stockCollection);
      const deletePromises = snapshot.docs.map((document) =>
        deleteDoc(doc(db, "stocks", document.id)),
      );
      await Promise.all(deletePromises);
      return { message: "All stocks deleted successfully" };
    } catch (error) {
      console.error("Wipe Database Error:", error);
      throw new Error("Failed to clear database. Admin rights required.");
    }
  },
};

export default stockService;
