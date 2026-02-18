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

const invoiceService = {
  // 1. Get all invoices (List view)
  getAllInvoices: async () => {
    const q = query(invCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const data = snapshot.docs.map((doc) => ({
      _id: doc.id, // Firestore ID to UI _id
      ...doc.data(),
    }));

    return { data };
  },

  // 2. Create New Invoice (With auto-incrementing readable ID)
  createInvoice: async (invoiceData) => {
    try {
      // Logic to generate a readable Invoice Number (e.g., INV-001)
      const q = query(invCollection, orderBy("createdAt", "desc"), limit(1));
      const lastInvSnap = await getDocs(q);

      let nextNumber = 1001; // Starting number
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
      };

      const docRef = await addDoc(invCollection, payload);
      return { data: { _id: docRef.id, ...payload } };
    } catch (error) {
      console.error("Invoice Creation Error:", error);
      throw error;
    }
  },

  // 3. Get Single Invoice by ID (View mode)
  getInvoiceById: async (id) => {
    const docRef = doc(db, "invoices", id);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return { data: { _id: snapshot.id, ...snapshot.data() } };
    } else {
      throw new Error("Invoice not found");
    }
  },

  // 4. Update Invoice Status (List view toggle)
  updateStatus: async (id, newStatus) => {
    const docRef = doc(db, "invoices", id);
    await updateDoc(docRef, { status: newStatus });
    return { message: "Status updated" };
  },

  // 5. Delete Invoice
  deleteInvoice: async (id) => {
    const docRef = doc(db, "invoices", id);
    await deleteDoc(docRef);
    return { message: "Invoice deleted" };
  },
};

export default invoiceService;
