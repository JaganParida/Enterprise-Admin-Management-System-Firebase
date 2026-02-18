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

const fuelCollection = collection(db, "fuels");

const fuelService = {
  // 1. Get all fuel logs
  getLogs: async () => {
    const q = query(fuelCollection, orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));
    return { data };
  },

  // 2. Add new fuel log
  addLog: async (payload) => {
    const dataToSave = {
      ...payload,
      liters: Number(payload.liters),
      pricePerLiter: Number(payload.pricePerLiter),
      totalCost: Number(payload.totalCost),
      createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(fuelCollection, dataToSave);
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  // 3. Update log
  updateLog: async (id, payload) => {
    const docRef = doc(db, "fuels", id);
    const dataToUpdate = {
      ...payload,
      liters: Number(payload.liters),
      pricePerLiter: Number(payload.pricePerLiter),
      totalCost: Number(payload.totalCost),
    };
    await updateDoc(docRef, dataToUpdate);
    return { message: "Updated successfully" };
  },

  // 4. Delete log
  deleteLog: async (id) => {
    const docRef = doc(db, "fuels", id);
    await deleteDoc(docRef);
    return { message: "Deleted successfully" };
  },
};

export default fuelService;
