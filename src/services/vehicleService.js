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

const tripCollection = collection(db, "trips");

const vehicleService = {
  getLogs: async () => {
    const q = query(tripCollection, orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));
    return { data };
  },

  addLog: async (payload) => {
    // Calculate fuelCost here to ensure chart and stats work perfectly
    const fuelCost =
      (Number(payload.litersFilled) || 0) *
      (Number(payload.pricePerLiter) || 0);

    const dataToSave = {
      ...payload,
      distance: Number(payload.distance),
      litersFilled: Number(payload.litersFilled),
      pricePerLiter: Number(payload.pricePerLiter),
      fuelCost: fuelCost,
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(tripCollection, dataToSave);
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  updateLog: async (id, payload) => {
    const fuelCost =
      (Number(payload.litersFilled) || 0) *
      (Number(payload.pricePerLiter) || 0);
    const docRef = doc(db, "trips", id);

    const dataToUpdate = {
      ...payload,
      distance: Number(payload.distance),
      litersFilled: Number(payload.litersFilled),
      pricePerLiter: Number(payload.pricePerLiter),
      fuelCost: fuelCost,
    };

    await updateDoc(docRef, dataToUpdate);
    return { message: "Updated" };
  },

  deleteLog: async (id) => {
    const docRef = doc(db, "trips", id);
    await deleteDoc(docRef);
    return { message: "Deleted" };
  },
};

export default vehicleService;
