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
import { db } from "../config/firebase";

const PROD_COLLECTION = "production";
const LABOUR_COLLECTION = "labour_payouts";

const productionService = {
  // --- PRODUCTION LOGS ---
  addProduction: async (data, user) => {
    const now = new Date().toISOString();
    const userRole = user?.role || "admin";
    const userEmail = user?.email || "admin@system.com";

    const prodData = {
      ...data,
      quantity: Number(data.quantity),
      createdBy: userEmail,
      createdRole: userRole,
      createdAt: now,
      editHistory: [], // 🚀 COMPLETELY EMPTY. NO 'CREATED' TRACKING HERE.
    };
    return await addDoc(collection(db, PROD_COLLECTION), prodData);
  },

  getAllProduction: async () => {
    const q = query(collection(db, PROD_COLLECTION), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return {
      data: snapshot.docs.map((doc) => ({
        _id: doc.id,
        id: doc.id,
        ...doc.data(),
      })),
    };
  },

  getProductionById: async (id) => {
    const docRef = doc(db, PROD_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists())
      return { data: { _id: docSnap.id, id: docSnap.id, ...docSnap.data() } };
    throw new Error("Not found");
  },

  updateProduction: async (id, data, user) => {
    const docRef = doc(db, PROD_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const existingData = docSnap.data();

    // Check if data actually changed to avoid false tracking
    const isChanged =
      existingData.productName !== data.productName ||
      Number(existingData.quantity) !== Number(data.quantity) ||
      existingData.date !== data.date;

    if (!isChanged) return; // Returns nothing if user didn't change anything

    const now = new Date().toISOString();
    const userRole = user?.role || "admin";
    const userEmail = user?.email || "admin@system.com";

    let history = existingData.editHistory || [];

    // 🚀 ONLY TRACKING EDITS
    history.push({ role: userRole, email: userEmail, at: now });
    if (history.length > 10) history = history.slice(-10); // Keep max 10

    return await updateDoc(docRef, {
      ...data,
      quantity: Number(data.quantity),
      editHistory: history,
    });
  },

  deleteProduction: async (id) => await deleteDoc(doc(db, PROD_COLLECTION, id)),
  deleteAllProduction: async () => {},

  // --- LABOUR PAYOUTS ---
  addLabourPayout: async (data, user) => {
    const now = new Date().toISOString();
    const userRole = user?.role || "admin";
    const userEmail = user?.email || "admin@system.com";

    const payoutData = {
      ...data,
      quantityProduced: Number(data.quantityProduced || 0),
      cost: Number(data.cost || 0),
      amountPaid: Number(data.amountPaid || 0),
      amountDue: Number(data.amountDue || 0),
      createdBy: userEmail,
      createdRole: userRole,
      createdAt: now,
      editHistory: [], // 🚀 COMPLETELY EMPTY. NO TRACKING ON CREATION.
    };
    return await addDoc(collection(db, LABOUR_COLLECTION), payoutData);
  },

  getAllLabourPayouts: async () => {
    const q = query(collection(db, LABOUR_COLLECTION), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return {
      data: snapshot.docs.map((doc) => ({
        _id: doc.id,
        id: doc.id,
        ...doc.data(),
      })),
    };
  },

  getLabourPayoutById: async (id) => {
    const docRef = doc(db, LABOUR_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists())
      return { data: { _id: docSnap.id, id: docSnap.id, ...docSnap.data() } };
    throw new Error("Not found");
  },

  updateLabourPayout: async (id, data, user) => {
    const docRef = doc(db, LABOUR_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const existingData = docSnap.data();

    // Check if data actually changed
    const isChanged =
      existingData.labourName !== data.labourName ||
      existingData.payoutCategory !== data.payoutCategory ||
      Number(existingData.quantityProduced || 0) !==
        Number(data.quantityProduced || 0) ||
      Number(existingData.cost || 0) !== Number(data.cost || 0) ||
      Number(existingData.amountPaid || 0) !== Number(data.amountPaid || 0) ||
      Number(existingData.amountDue || 0) !== Number(data.amountDue || 0) ||
      existingData.date !== data.date;

    if (!isChanged) return;

    const now = new Date().toISOString();
    const userRole = user?.role || "admin";
    const userEmail = user?.email || "admin@system.com";

    let history = existingData.editHistory || [];

    // 🚀 ONLY TRACKING EDITS
    history.push({ role: userRole, email: userEmail, at: now });
    if (history.length > 10) history = history.slice(-10); // Keep max 10

    return await updateDoc(docRef, {
      ...data,
      quantityProduced: Number(data.quantityProduced || 0),
      cost: Number(data.cost || 0),
      amountPaid: Number(data.amountPaid || 0),
      amountDue: Number(data.amountDue || 0),
      editHistory: history,
    });
  },

  deleteLabourPayout: async (id) =>
    await deleteDoc(doc(db, LABOUR_COLLECTION, id)),
};

export default productionService;
