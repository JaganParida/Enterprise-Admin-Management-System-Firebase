import { db, auth } from "../config/firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  startAfter,
  writeBatch,
} from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const stockCollection = collection(db, "stocks");
const METADATA_COLLECTION = "_system_metadata";
const WIPE_STATE_KEY = "daily_wipe_state";

const stockService = {
  // --- BACKUP STATE LOCK SYSTEM ---
  getBackupState: async (backupKey) => {
    try {
      const snap = await getDoc(doc(db, METADATA_COLLECTION, backupKey));
      return snap.exists() ? snap.data() : null;
    } catch (e) {
      return null;
    }
  },

  setBackupState: async (backupKey, stateData) => {
    try {
      const docRef = doc(db, METADATA_COLLECTION, backupKey);
      if (!stateData) await deleteDoc(docRef);
      else await setDoc(docRef, stateData, { merge: true });
    } catch (e) {}
  },

  // --- WIPE STATE LOCK SYSTEM ---
  getWipeState: async () => {
    try {
      const snap = await getDoc(doc(db, METADATA_COLLECTION, WIPE_STATE_KEY));
      return snap.exists() ? snap.data() : null;
    } catch (e) {
      return null;
    }
  },

  setWipeState: async (stateData) => {
    try {
      await setDoc(doc(db, METADATA_COLLECTION, WIPE_STATE_KEY), stateData, {
        merge: true,
      });
    } catch (e) {}
  },

  // --- CRUD OPERATIONS ---
  getAllStocks: async (filters = {}, lastDoc = null, limitCount = 50) => {
    try {
      let constraints = [];
      let hasInequality = false;

      if (filters.category && filters.category !== "All") {
        constraints.push(where("category", "==", filters.category));
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase().trim();
        constraints.push(
          where("searchName", ">=", searchLower),
          where("searchName", "<=", searchLower + "\uf8ff"),
          orderBy("searchName", "asc"),
        );
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
      searchName: stockData.name.toLowerCase().trim(),
      quantity: Number(stockData.quantity) || 0,
      price: Number(stockData.price) || 0,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
      editHistory: [],
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

    // 🚀 Strict Limit: Keep only the latest 2 records
    if (currentHistory.length > 2) {
      currentHistory = currentHistory.slice(-2);
    }

    const payload = {
      ...updateData,
      searchName: updateData.name.toLowerCase().trim(),
      quantity: Number(updateData.quantity) || 0,
      price: Number(updateData.price) || 0,
      lastEditedBy: currentEdit.by,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };

    await updateDoc(docRef, payload);
    return { message: "Stock updated successfully" };
  },

  deleteStock: async (id, user) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager") {
      throw new Error("Action Denied: Managers cannot delete records.");
    }
    const docRef = doc(db, "stocks", id);
    await deleteDoc(docRef);
    return { message: "Item deleted successfully" };
  },

  // --- SECURE WIPE ALL (10k Limit + 500 Chunking + 24h Lock) ---
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

    const WIPE_LIMIT = 10000;
    const now = Date.now();
    let state = await stockService.getWipeState();

    // Reset lock if it has expired
    if (!state || (state.lockedUntil && now > state.lockedUntil)) {
      state = { count: 0, lockedUntil: null };
    }
    // Block immediately if still locked
    else if (state.lockedUntil && now < state.lockedUntil) {
      throw new Error(
        "Daily limit reached. Wipe feature is locked for 24 hours.",
      );
    }

    let remainingQuota = WIPE_LIMIT - (state.count || 0);
    if (remainingQuota <= 0) {
      const lockTime = now + 24 * 60 * 60 * 1000;
      await stockService.setWipeState({
        count: WIPE_LIMIT,
        lockedUntil: lockTime,
      });
      throw new Error(
        "Daily wipe limit (10,000) exhausted. Locked for 24 hours.",
      );
    }

    let isDeleting = true;
    let sessionDeletedCount = 0;

    // Loop for chunked deletion (Max 500 at a time to prevent timeout/crashes)
    while (isDeleting && remainingQuota > 0) {
      const chunkSize = Math.min(500, remainingQuota);
      const q = query(collection(db, "stocks"), limit(chunkSize));
      const snapshot = await getDocs(q);

      if (snapshot.empty) break;

      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      const deletedDocs = snapshot.docs.length;
      sessionDeletedCount += deletedDocs;
      remainingQuota -= deletedDocs;

      state.count += deletedDocs;
      await stockService.setWipeState(state);

      if (deletedDocs < chunkSize) break;
    }

    // Apply 24 Hour Lock if limit hit during this specific run
    if (remainingQuota === 0) {
      state.lockedUntil = Date.now() + 24 * 60 * 60 * 1000;
      await stockService.setWipeState(state);
      return {
        message: `Wiped ${sessionDeletedCount} items. Daily limit reached. Locked for 24 hours.`,
        locked: true,
      };
    }

    return {
      message: `Successfully wiped ${sessionDeletedCount} items.`,
      locked: false,
    };
  },
};

export default stockService;
