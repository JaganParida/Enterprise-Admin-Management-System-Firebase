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
import { db, auth } from "../config/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

const COLLECTION_NAME = "sales";

const salesService = {
  addSale: async (data, user) => {
    const saleData = {
      ...data,
      amount: Number(data.amount),
      amountPaid: Number(data.amountPaid || 0),
      amountDue: Number(data.amountDue || 0),
      quantity: Number(data.quantity),
      createdBy: user?.email || "admin@system.com",
      createdRole: user?.role || "admin",
      createdAt: new Date().toISOString(),
      editHistory: [], // 🚀 NO LOG ON FIRST CREATION
    };
    return await addDoc(collection(db, COLLECTION_NAME), saleData);
  },

  getAllSales: async () => {
    const q = query(collection(db, COLLECTION_NAME), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    const sales = querySnapshot.docs.map((doc) => ({
      _id: doc.id,
      id: doc.id,
      ...doc.data(),
    }));
    return { data: sales };
  },

  getSaleById: async (id) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists())
      return { data: { _id: docSnap.id, id: docSnap.id, ...docSnap.data() } };
    throw new Error("Not found");
  },

  updateSale: async (id, data, user) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const existingData = docSnap.data();

    // 🚀 SMART CHECK: Update history ONLY if data actually changed
    const isChanged =
      existingData.buyerName !== data.buyerName ||
      existingData.productName !== data.productName ||
      Number(existingData.quantity) !== Number(data.quantity) ||
      Number(existingData.amount) !== Number(data.amount) ||
      Number(existingData.amountPaid) !== Number(data.amountPaid) ||
      Number(existingData.amountDue) !== Number(data.amountDue) ||
      existingData.paymentMode !== data.paymentMode ||
      existingData.date !== data.date ||
      existingData.vehicleNo !== data.vehicleNo ||
      existingData.address !== data.address ||
      existingData.challanNo !== data.challanNo;

    if (!isChanged) return;

    const now = new Date().toISOString();
    let currentHistory = existingData.editHistory || [];
    currentHistory.push({
      role: user?.role || "admin",
      email: user?.email || "admin@system.com",
      at: now,
    });

    if (currentHistory.length > 10) currentHistory = currentHistory.slice(-10);

    return await updateDoc(docRef, {
      ...data,
      amount: Number(data.amount),
      amountPaid: Number(data.amountPaid || 0),
      amountDue: Number(data.amountDue || 0),
      quantity: Number(data.quantity),
      editHistory: currentHistory,
    });
  },

  deleteSale: async (id) => await deleteDoc(doc(db, COLLECTION_NAME, id)),

  // 🚀 WIPE ALL DATA
  deleteAllSales: async ({ password }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Admin not logged in.");

    try {
      await signInWithEmailAndPassword(auth, currentUser.email, password);
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const deletePromises = [];
      snapshot.forEach((document) => {
        deletePromises.push(deleteDoc(doc(db, COLLECTION_NAME, document.id)));
      });
      await Promise.all(deletePromises);
      return { success: true };
    } catch (error) {
      throw new Error("Incorrect Admin Password.");
    }
  },
};
export default salesService;
