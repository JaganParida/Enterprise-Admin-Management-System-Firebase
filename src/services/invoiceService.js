import { db, auth } from "../config/firebase";
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
  where,
  startAfter,
} from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const invCollection = collection(db, "invoices");

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
  // 1. 🚀 PAGINATED & 100% BACKEND FILTERED FETCH
  getAllInvoices: async (filters = {}, lastDoc = null) => {
    let constraints = [];
    let hasInequality = false;

    // 1. EQUALITY FILTERS (Can mix with anything)
    if (filters.status && filters.status !== "All") {
      constraints.push(where("status", "==", filters.status));
    }
    if (filters.exactDate) {
      constraints.push(where("date", "==", filters.exactDate));
    }

    // 2. INEQUALITY FILTERS (Firebase allows only ONE per query)

    // Priority A: Search
    if (filters.search) {
      constraints.push(where("invoiceNumber", ">=", filters.search));
      constraints.push(where("invoiceNumber", "<=", filters.search + "\uf8ff"));
      constraints.push(orderBy("invoiceNumber"));
      hasInequality = true;
    }

    // Priority B: Amount Filter
    if (filters.amount && filters.amount !== "All" && !hasInequality) {
      if (filters.amount === "Under10k") {
        constraints.push(where("grandTotal", "<", 10000));
      } else if (filters.amount === "10k-50k") {
        constraints.push(
          where("grandTotal", ">=", 10000),
          where("grandTotal", "<=", 50000),
        );
      } else if (filters.amount === "Above50k") {
        constraints.push(where("grandTotal", ">", 50000));
      }
      constraints.push(orderBy("grandTotal", "desc"));
      hasInequality = true;
    }

    // Priority C: Date Range Filter
    if (
      filters.date &&
      filters.date !== "All" &&
      !filters.exactDate &&
      !hasInequality
    ) {
      const today = new Date();
      let pastDate = new Date();
      if (filters.date === "Last7Days") pastDate.setDate(today.getDate() - 7);
      else if (filters.date === "Last30Days")
        pastDate.setDate(today.getDate() - 30);
      else if (filters.date === "ThisMonth") pastDate.setDate(1);

      const pastDateStr = pastDate.toISOString().split("T")[0];
      constraints.push(where("date", ">=", pastDateStr));
      constraints.push(orderBy("date", "desc"));
      hasInequality = true;
    }

    // Fallback order if no range filters are applied
    if (!hasInequality && !filters.exactDate) {
      constraints.push(orderBy("createdAt", "desc"));
    }

    constraints.push(limit(50));

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    try {
      const q = query(invCollection, ...constraints);
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];

      return { data, lastVisible };
    } catch (error) {
      console.error("🔥 Firebase Query Error:", error);
      throw error;
    }
  },

  createInvoice: async (invoiceData, user) => {
    try {
      const payload = {
        ...invoiceData,
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

  // 3. 🚀 SECURE DELETE (RBAC Check)
  deleteInvoice: async (id, user) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager") {
      throw new Error("Action Denied: Managers cannot delete records.");
    }
    const docRef = doc(db, "invoices", id);
    await deleteDoc(docRef);
    return { message: "Invoice deleted" };
  },

  // 4. 🚀 SECURE WIPE ALL (Password Re-auth + RBAC Check)
  deleteAllInvoices: async ({ password, email, user }) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager") {
      throw new Error("Action Denied: Only Admins can wipe the database.");
    }
    if (!password || !email) throw new Error("Authentication Error");

    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.email !== email) {
      throw new Error("Active session mismatch.");
    }

    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        password,
      );
      await reauthenticateWithCredential(currentUser, credential);
    } catch (error) {
      throw new Error("Incorrect Admin Password.");
    }

    try {
      const snapshot = await getDocs(invCollection);
      const deletePromises = snapshot.docs.map((document) =>
        deleteDoc(doc(db, "invoices", document.id)),
      );
      await Promise.all(deletePromises);
      return { message: "All invoices deleted successfully" };
    } catch (error) {
      throw new Error("Failed to clear database. Admin rights required.");
    }
  },
};

export default invoiceService;
