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

const fuelCollection = collection(db, "fuels");

const fuelService = {
  getLogs: async () => {
    const q = query(fuelCollection, orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return {
      data: snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() })),
    };
  },

  addLog: async (payload, user) => {
    const dataToSave = {
      ...payload,
      liters: Number(payload.liters),
      pricePerLiter: Number(payload.pricePerLiter),
      totalCost: Number(payload.totalCost),
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
      editHistory: [],
    };
    const docRef = await addDoc(fuelCollection, dataToSave);
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  updateLog: async (id, payload, user) => {
    const docRef = doc(db, "fuels", id);
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

    // Keep last 10 edits to prevent oversized documents
    if (currentHistory.length > 10) {
      currentHistory = currentHistory.slice(currentHistory.length - 10);
    }

    const dataToUpdate = {
      ...payload,
      liters: Number(payload.liters),
      pricePerLiter: Number(payload.pricePerLiter),
      totalCost: Number(payload.totalCost),
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };
    await updateDoc(docRef, dataToUpdate);
    return { message: "Updated" };
  },

  deleteLog: async (id) => {
    await deleteDoc(doc(db, "fuels", id));
    return { message: "Deleted" };
  },
};

export default fuelService;
