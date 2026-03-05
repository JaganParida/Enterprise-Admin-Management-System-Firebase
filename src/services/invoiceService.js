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
  limit,
} from "firebase/firestore";

const invCollection = collection(db, "invoices");

// Helper function history maintain karne ke liye
const getUpdatedHistory = async (id, user) => {
  const docRef = doc(db, "invoices", id);
  const snapshot = await getDoc(docRef);
  let currentHistory = [];

  if (snapshot.exists() && snapshot.data().editHistory) {
    currentHistory = snapshot.data().editHistory;
  }

  const currentEdit = {
    by: user?.email || "Unknown",
    role: user?.role || "Admin",
    at: new Date().toISOString(),
  };

  currentHistory.push(currentEdit);

  if (currentHistory.length > 10) {
    currentHistory = currentHistory.slice(currentHistory.length - 10);
  }

  return { currentEdit, currentHistory, docRef };
};

const invoiceService = {
  getAllInvoices: async () => {
    const q = query(invCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
    return { data };
  },

  createInvoice: async (invoiceData, user) => {
    try {
      const q = query(invCollection, orderBy("createdAt", "desc"), limit(1));
      const lastInvSnap = await getDocs(q);

      let nextNumber = 1001;
      if (!lastInvSnap.empty) {
        const lastInvData = lastInvSnap.docs[0].data();
        if (lastInvData.invoiceNumber) {
          const lastNum = parseInt(lastInvData.invoiceNumber.split("-")[1]);
          nextNumber = lastNum + 1;
        }
      }

      const invoiceNumber = `INV-${nextNumber}`;
      const payload = {
        ...invoiceData,
        invoiceNumber,
        createdAt: new Date().toISOString(),
        createdBy: user?.email || "Unknown",
        createdRole: user?.role || "Admin",
      };

      const docRef = await addDoc(invCollection, payload);
      return { data: { _id: docRef.id, ...payload } };
    } catch (error) {
      console.error("Invoice Creation Error:", error);
      throw error;
    }
  },

  getInvoiceById: async (id) => {
    const docRef = doc(db, "invoices", id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { data: { _id: snapshot.id, ...snapshot.data() } };
    } else {
      throw new Error("Invoice not found");
    }
  },

  // 🚀 NAYA: Poora Invoice Edit karne ke liye
  updateInvoice: async (id, invoiceData, user) => {
    const { currentEdit, currentHistory, docRef } = await getUpdatedHistory(
      id,
      user,
    );

    const payload = {
      ...invoiceData,
      lastEditedBy: currentEdit.by,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };

    await updateDoc(docRef, payload);
    return { message: "Invoice updated successfully" };
  },

  // 🚀 UPDATED: Status update bhi history mein record hoga!
  updateStatus: async (id, newStatus, user) => {
    const { currentEdit, currentHistory, docRef } = await getUpdatedHistory(
      id,
      user,
    );

    await updateDoc(docRef, {
      status: newStatus,
      lastEditedBy: currentEdit.by,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    });
    return { message: "Status updated" };
  },

  deleteInvoice: async (id) => {
    const docRef = doc(db, "invoices", id);
    await deleteDoc(docRef);
    return { message: "Invoice deleted" };
  },
};

export default invoiceService;
