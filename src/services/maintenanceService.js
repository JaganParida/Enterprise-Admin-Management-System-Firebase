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

const maintCollection = collection(db, "maintenances");

const maintenanceService = {
  getLogs: async () => {
    const q = query(maintCollection, orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));
    return { data };
  },

  addLog: async (payload) => {
    const dataToSave = {
      ...payload,
      cost: Number(payload.cost),
      createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(maintCollection, dataToSave);
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  updateLog: async (id, payload) => {
    const docRef = doc(db, "maintenances", id);
    const dataToUpdate = {
      ...payload,
      cost: Number(payload.cost),
    };
    await updateDoc(docRef, dataToUpdate);
    return { message: "Updated" };
  },

  deleteLog: async (id) => {
    const docRef = doc(db, "maintenances", id);
    await deleteDoc(docRef);
    return { message: "Deleted" };
  },
};

export default maintenanceService;
