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

const maintCollection = collection(db, "maintenances");

const maintenanceService = {
  getLogs: async () => {
    try {
      const q = query(maintCollection, orderBy("date", "desc"));
      const snapshot = await getDocs(q);
      return {
        data: snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() })),
      };
    } catch (error) {
      console.error("Fetch Error:", error);
      return { data: [] }; // 🚀 Always return array
    }
  },

  addLog: async (payload, user) => {
    const dataToSave = {
      ...payload,
      cost: Number(payload.cost) || 0,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
    };
    const docRef = await addDoc(maintCollection, dataToSave);
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  updateLog: async (id, payload, user) => {
    const docRef = doc(db, "maintenances", id);
    const snapshot = await getDoc(docRef);

    let currentHistory = [];
    if (snapshot.exists() && Array.isArray(snapshot.data().editHistory)) {
      currentHistory = snapshot.data().editHistory;
    }

    const currentEdit = {
      by: user?.email || "Unknown",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    };

    currentHistory.push(currentEdit);
    if (currentHistory.length > 10) currentHistory = currentHistory.slice(-10);

    const dataToUpdate = {
      ...payload,
      cost: Number(payload.cost) || 0,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };

    await updateDoc(docRef, dataToUpdate);
    return { message: "Updated" };
  },

  deleteLog: async (id) => {
    await deleteDoc(doc(db, "maintenances", id));
    return { message: "Deleted" };
  },
};

export default maintenanceService;
