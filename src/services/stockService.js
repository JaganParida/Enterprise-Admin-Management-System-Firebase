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

const stockCollection = collection(db, "stocks");

const stockService = {
  // 1. Get all inventory items
  getAllStocks: async () => {
    // Latest items pehle dikhane ke liye createdAt use kiya hai
    const q = query(stockCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const data = snapshot.docs.map((doc) => ({
      _id: doc.id, // Firestore ID mapping for UI compatibility
      ...doc.data(),
    }));

    return { data };
  },

  // 2. Create new stock item
  createStock: async (stockData) => {
    const payload = {
      ...stockData,
      quantity: Number(stockData.quantity),
      price: Number(stockData.price),
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(stockCollection, payload);
    return { data: { _id: docRef.id, ...payload } };
  },

  // 3. Get single item by ID (For Edit mode)
  getStockById: async (id) => {
    const docRef = doc(db, "stocks", id);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return { data: { _id: snapshot.id, ...snapshot.data() } };
    } else {
      throw new Error("Inventory item not found");
    }
  },

  // 4. Update stock details
  updateStock: async (id, updateData) => {
    const docRef = doc(db, "stocks", id);
    const payload = {
      ...updateData,
      quantity: Number(updateData.quantity),
      price: Number(updateData.price),
    };

    await updateDoc(docRef, payload);
    return { message: "Stock updated successfully" };
  },

  // 5. Delete item
  deleteStock: async (id) => {
    const docRef = doc(db, "stocks", id);
    await deleteDoc(docRef);
    return { message: "Item deleted successfully" };
  },
};

export default stockService;
