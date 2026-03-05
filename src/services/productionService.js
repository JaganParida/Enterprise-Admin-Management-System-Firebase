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
  getAllProduction: async () => {
    const q = query(prodCollection, orderBy("date", "desc"));
    const snapshot = await getDocs(q);

    const data = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));

    return { data };
  },

  addProduction: async (formData, user) => {
    const payload = {
      ...formData,
      quantity: Number(formData.quantity),
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
    };

    const docRef = await addDoc(prodCollection, payload);
    return { data: { _id: docRef.id, ...payload } };
  },

  getProductionById: async (id) => {
    const docRef = doc(db, "production", id);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return { data: { _id: snapshot.id, ...snapshot.data() } };
    } else {
      throw new Error("Production log not found");
    }
  },

  // 🚀 UPDATED: Role save karna aur Top 10 History Limit
  updateProduction: async (id, updateData, user) => {
    const docRef = doc(db, "production", id);

    // 1. Purani history nikalna
    const snapshot = await getDoc(docRef);
    let currentHistory = [];

    if (snapshot.exists() && snapshot.data().editHistory) {
      currentHistory = snapshot.data().editHistory;
    }

    // 2. Naya edit record with ROLE
    const currentEdit = {
      by: user?.email || "Unknown",
      role: user?.role || "Admin", // 👈 ROLE SAVE KIYA
      at: new Date().toISOString(),
    };

    currentHistory.push(currentEdit);

    // 3. Top 10 Limit Capping
    if (currentHistory.length > 10) {
      currentHistory = currentHistory.slice(currentHistory.length - 10);
    }

    const payload = {
      ...updateData,
      quantity: Number(updateData.quantity),
      lastEditedBy: currentEdit.by,
      lastEditedRole: currentEdit.role, // 👈 ROLE UPDATE KIYA
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };

    await updateDoc(docRef, payload);
    return { message: "Record updated successfully" };
  },

  deleteProduction: async (id) => {
    const docRef = doc(db, "production", id);
    await deleteDoc(docRef);
    return { message: "Record deleted" };
  },
};

export default productionService;
