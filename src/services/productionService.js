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

const prodCollection = collection(db, "production");

const productionService = {
  // 1. Get all production logs (For List & Reports)
  getAllProduction: async () => {
    // Latest production date ke hisaab se sort kiya hai
    const q = query(prodCollection, orderBy("date", "desc"));
    const snapshot = await getDocs(q);

    const data = snapshot.docs.map((doc) => ({
      _id: doc.id, // Firestore ID to UI _id
      ...doc.data(),
    }));

    return { data };
  },

  // 2. Add new production entry
  addProduction: async (formData) => {
    const payload = {
      ...formData,
      quantity: Number(formData.quantity), // Ensure quantity is a number
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(prodCollection, payload);
    return { data: { _id: docRef.id, ...payload } };
  },

  // 3. Get single log by ID (For Edit mode)
  getProductionById: async (id) => {
    const docRef = doc(db, "production", id);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return { data: { _id: snapshot.id, ...snapshot.data() } };
    } else {
      throw new Error("Production log not found");
    }
  },

  // 4. Update existing production log
  updateProduction: async (id, updateData) => {
    const docRef = doc(db, "production", id);
    const payload = {
      ...updateData,
      quantity: Number(updateData.quantity),
    };

    await updateDoc(docRef, payload);
    return { message: "Record updated successfully" };
  },

  // 5. Delete production log
  deleteProduction: async (id) => {
    const docRef = doc(db, "production", id);
    await deleteDoc(docRef);
    return { message: "Record deleted" };
  },
};

export default productionService;
