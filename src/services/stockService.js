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

const stockCollection = collection(db, "stocks");

const stockService = {
  // 🚀 1. PAGINATED & 100% BACKEND FILTERED FETCH
  getAllStocks: async (filters = {}, lastDoc = null, limitCount = 50) => {
    try {
      let constraints = [];
      let hasInequality = false;

      // EXACT EQUALITY FILTERS
      if (filters.category && filters.category !== "All") {
        constraints.push(where("category", "==", filters.category));
      }

      // INEQUALITY FILTERS (Priority Logic - Only ONE allowed by Firebase)
      if (filters.search) {
        constraints.push(where("name", ">=", filters.search));
        constraints.push(where("name", "<=", filters.search + "\uf8ff"));
        constraints.push(orderBy("name"));
        hasInequality = true;
      } else if (
        filters.stockLevel &&
        filters.stockLevel !== "All" &&
        !hasInequality
      ) {
        if (filters.stockLevel === "Low") {
          constraints.push(where("quantity", "<", 100));
        } else if (filters.stockLevel === "Medium") {
          constraints.push(
            where("quantity", ">=", 100),
            where("quantity", "<=", 1000),
          );
        } else if (filters.stockLevel === "High") {
          constraints.push(where("quantity", ">", 1000));
        }
        constraints.push(orderBy("quantity", "asc"));
        hasInequality = true;
      }

      // DEFAULT SORTING
      if (!hasInequality) {
        constraints.push(orderBy("createdAt", "desc"));
      }

      constraints.push(limit(limitCount));

      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const q = query(stockCollection, ...constraints);
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((doc) => ({
        _id: doc.id,
        id: doc.id,
        ...doc.data(),
      }));

      const lastVisible = snapshot.docs[snapshot.docs.length - 1];

      return { data, lastVisible };
    } catch (error) {
      console.error("🔥 Firebase Query Error:", error);
      throw error;
    }
  },

  createStock: async (stockData, user) => {
    const payload = {
      ...stockData,
      quantity: Number(stockData.quantity),
      price: Number(stockData.price),
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
    };

    const docRef = await addDoc(stockCollection, payload);
    return { data: { _id: docRef.id, ...payload } };
  },

  getStockById: async (id) => {
    const docRef = doc(db, "stocks", id);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return { data: { _id: snapshot.id, ...snapshot.data() } };
    } else {
      throw new Error("Inventory item not found");
    }
  },

  updateStock: async (id, updateData, user) => {
    const docRef = doc(db, "stocks", id);
    const snapshot = await getDoc(docRef);
    let currentHistory = [];

    if (snapshot.exists() && Array.isArray(snapshot.data().editHistory)) {
      currentHistory = snapshot.data().editHistory;
    }

    const currentEdit = {
      by: user?.email || "Unknown",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    };

    currentHistory.push(currentEdit);
    if (currentHistory.length > 10) {
      currentHistory = currentHistory.slice(-10); // Safe slicing for array
    }

    const payload = {
      ...updateData,
      quantity: Number(updateData.quantity),
      price: Number(updateData.price),
      lastEditedBy: currentEdit.by,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };

    await updateDoc(docRef, payload);
    return { message: "Stock updated successfully" };
  },

  // 🚀 2. SECURE DELETE (RBAC Check)
  deleteStock: async (id, user) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager") {
      throw new Error("Action Denied: Managers cannot delete records.");
    }
    const docRef = doc(db, "stocks", id);
    await deleteDoc(docRef);
    return { message: "Item deleted successfully" };
  },

  // 🚀 3. SECURE WIPE ALL (Password Re-auth + RBAC Check)
  deleteAllStocks: async ({ password, email, user }) => {
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
      const snapshot = await getDocs(stockCollection);
      const deletePromises = snapshot.docs.map((document) =>
        deleteDoc(doc(db, "stocks", document.id)),
      );
      await Promise.all(deletePromises);
      return { message: "All stocks deleted successfully" };
    } catch (error) {
      throw new Error("Failed to clear database. Admin rights required.");
    }
  },
};

export default stockService;
