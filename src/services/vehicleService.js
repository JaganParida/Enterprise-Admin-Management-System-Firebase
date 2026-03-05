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

const tripCollection = collection(db, "trips");

const vehicleService = {
  getLogs: async () => {
    const q = query(tripCollection, orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return {
      data: snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() })),
    };
  },

  addLog: async (payload, user) => {
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
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
    };
    const docRef = await addDoc(tripCollection, dataToSave);
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  updateLog: async (id, payload, user) => {
    const docRef = doc(db, "trips", id);
    const snapshot = await getDoc(docRef);
    let currentHistory =
      snapshot.exists() && snapshot.data().editHistory
        ? snapshot.data().editHistory
        : [];

    const currentEdit = {
      by: user?.email || "Unknown",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    };
    currentHistory.push(currentEdit);
    if (currentHistory.length > 10)
      currentHistory = currentHistory.slice(currentHistory.length - 10);

    const fuelCost =
      (Number(payload.litersFilled) || 0) *
      (Number(payload.pricePerLiter) || 0);
    const dataToUpdate = {
      ...payload,
      distance: Number(payload.distance),
      litersFilled: Number(payload.litersFilled),
      pricePerLiter: Number(payload.pricePerLiter),
      fuelCost: fuelCost,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };
    await updateDoc(docRef, dataToUpdate);
    return { message: "Updated" };
  },

  deleteLog: async (id) => {
    await deleteDoc(doc(db, "trips", id));
    return { message: "Deleted" };
  },
};

export default vehicleService;
