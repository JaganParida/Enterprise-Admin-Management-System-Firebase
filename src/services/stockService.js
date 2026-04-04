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

// GLOBAL MEMORY CACHE
export let memoryCache = {
  data: [],
  lastDoc: null,
  hasMore: true,
  isDirty: true,
  fullDBLoaded: false,
};

const applyLocalFilters = (data, filters) => {
  let filtered = [...data];
  if (filters.category && filters.category !== "All") {
    filtered = filtered.filter((item) => item.category === filters.category);
  }
  if (filters.search) {
    const s = filters.search.toLowerCase().trim();
    filtered = filtered.filter((item) =>
      (item.name || "").toLowerCase().includes(s),
    );
  } else if (filters.stockLevel && filters.stockLevel !== "All") {
    if (filters.stockLevel === "Low")
      filtered = filtered.filter((i) => Number(i.quantity) < 100);
    else if (filters.stockLevel === "Medium")
      filtered = filtered.filter(
        (i) => Number(i.quantity) >= 100 && Number(i.quantity) <= 1000,
      );
    else if (filters.stockLevel === "High")
      filtered = filtered.filter((i) => Number(i.quantity) > 1000);
  }
  return filtered;
};

const stockService = {
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

  getAllStocks: async (
    filters = {},
    lastDoc = null,
    limitCount = 50,
    forceRefresh = false,
  ) => {
    try {
      const isInitialLoad = !lastDoc;
      const noFilters =
        !filters.search &&
        filters.category === "All" &&
        filters.stockLevel === "All";

      if (forceRefresh) {
        memoryCache.isDirty = true;
        memoryCache.fullDBLoaded = false;
      }

      // ZERO-READ: Return from RAM if no filters and not dirty
      if (!memoryCache.isDirty && isInitialLoad && noFilters) {
        return {
          data: memoryCache.data.slice(0, limitCount),
          lastVisible: memoryCache.lastDoc,
          hasMore: memoryCache.hasMore,
          source: "cache",
        };
      }

      // SUPER-OPTIMIZATION: 0-Read Local Search if full DB is in RAM
      if (memoryCache.fullDBLoaded && !forceRefresh) {
        const localFiltered = applyLocalFilters(memoryCache.data, filters);
        const startIndex = lastDoc
          ? memoryCache.data.findIndex((d) => d._id === lastDoc.id) + 1
          : 0;
        const slicedData = localFiltered.slice(
          startIndex,
          startIndex + limitCount,
        );
        const hasMoreLocal = startIndex + limitCount < localFiltered.length;
        const lastVisibleLocal =
          slicedData.length > 0
            ? { id: slicedData[slicedData.length - 1]._id }
            : null;

        return {
          data: slicedData,
          lastVisible: lastVisibleLocal,
          hasMore: hasMoreLocal,
          source: "local_filter",
        };
      }

      // Server Fetch Construction
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
        if (filters.stockLevel === "Low")
          constraints.push(where("quantity", "<", 100));
        else if (filters.stockLevel === "Medium")
          constraints.push(
            where("quantity", ">=", 100),
            where("quantity", "<=", 1000),
          );
        else if (filters.stockLevel === "High")
          constraints.push(where("quantity", ">", 1000));
        constraints.push(orderBy("quantity", "asc"));
        hasInequality = true;
      }

      if (!hasInequality) constraints.push(orderBy("createdAt", "desc"));
      constraints.push(limit(limitCount));
      if (lastDoc && typeof lastDoc.data === "function")
        constraints.push(startAfter(lastDoc));

      const q = query(stockCollection, ...constraints);
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((doc) => ({
        _id: doc.id,
        id: doc.id,
        ...doc.data(),
      }));
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      const hasMore = snapshot.docs.length === limitCount;

      if (noFilters) {
        if (isInitialLoad) {
          memoryCache.data = data;
        } else {
          const existingIds = new Set(memoryCache.data.map((d) => d._id));
          const newUniqueData = data.filter((d) => !existingIds.has(d._id));
          memoryCache.data = [...memoryCache.data, ...newUniqueData];
        }
        memoryCache.lastDoc = lastVisible;
        memoryCache.hasMore = hasMore;
        memoryCache.isDirty = false;
        if (!hasMore) memoryCache.fullDBLoaded = true;
      }

      return { data, lastVisible, hasMore, source: "server" };
    } catch (error) {
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
    const newItem = { _id: docRef.id, id: docRef.id, ...payload };

    memoryCache.data.unshift(newItem);
    memoryCache.isDirty = false;

    return { data: newItem };
  },

  getStockById: async (id) => {
    const cachedItem = memoryCache.data.find((item) => item._id === id);
    if (cachedItem) return { data: cachedItem };

    const docRef = doc(db, "stocks", id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists())
      return { data: { _id: snapshot.id, ...snapshot.data() } };
    throw new Error("Inventory item not found");
  },

  updateStock: async (id, updateData, user) => {
    const docRef = doc(db, "stocks", id);
    let currentHistory = [];
    const cachedItem = memoryCache.data.find((item) => item._id === id);

    if (cachedItem && cachedItem.editHistory) {
      currentHistory = [...cachedItem.editHistory];
    } else {
      const snap = await getDoc(docRef);
      currentHistory = Array.isArray(snap.data()?.editHistory)
        ? snap.data().editHistory
        : [];
    }

    const currentEdit = {
      by: user?.email || "Unknown",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    };
    currentHistory.push(currentEdit);
    if (currentHistory.length > 2) currentHistory = currentHistory.slice(-2);

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

    memoryCache.data = memoryCache.data.map((item) =>
      item._id === id ? { ...item, ...payload } : item,
    );
    memoryCache.isDirty = false;

    return { message: "Stock updated successfully" };
  },

  deleteStock: async (id, user) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager") throw new Error("Action Denied.");

    await deleteDoc(doc(db, "stocks", id));

    memoryCache.data = memoryCache.data.filter((item) => item._id !== id);
    memoryCache.isDirty = false;

    return { message: "Item deleted successfully" };
  },

  // 🚀 FIXED WIPE AUTHENTICATION & BATCHING
  deleteAllStocks: async ({ password, email, user }) => {
    try {
      // 1. Secure Authentication Verification
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.email !== email) {
        throw new Error("Authentication mismatch. Please log out and back in.");
      }

      // Re-authenticate to ensure it's actually the admin
      const credential = EmailAuthProvider.credential(email, password);
      await reauthenticateWithCredential(currentUser, credential);

      // 2. Daily Limit Guard (10,000 Deletes max per day)
      const todayString = new Date().toDateString();
      let wipeState = (await stockService.getWipeState()) || {
        count: 0,
        date: todayString,
        lockedUntil: null,
      };

      // Reset count if it is a new day
      if (wipeState.date !== todayString) {
        wipeState = { count: 0, date: todayString, lockedUntil: null };
      }

      if (wipeState.lockedUntil && Date.now() < wipeState.lockedUntil) {
        return {
          locked: true,
          message: "Action Locked. 24-hour limit reached.",
        };
      }

      if (wipeState.count >= 10000) {
        wipeState.lockedUntil = Date.now() + 24 * 60 * 60 * 1000;
        await stockService.setWipeState(wipeState);
        return {
          locked: true,
          message:
            "10k Daily delete limit hit. Locked for 24h to prevent billing.",
        };
      }

      // 3. Batch Deletion Logic
      let totalDeleted = 0;
      let hasMore = true;
      const MAX_UI_SAFE_DELETE = Math.min(10000 - wipeState.count, 5000);

      while (hasMore && totalDeleted < MAX_UI_SAFE_DELETE) {
        const q = query(stockCollection, limit(500)); // Firebase max batch size is 500
        const snapshot = await getDocs(q);

        if (snapshot.size === 0) {
          hasMore = false;
          break;
        }

        const batch = writeBatch(db);
        snapshot.docs.forEach((document) => {
          batch.delete(document.ref);
        });

        await batch.commit();
        totalDeleted += snapshot.size;
      }

      // 4. Update Wipe State Quota
      wipeState.count += totalDeleted;
      await stockService.setWipeState(wipeState);

      // 5. Clear Memory Cache
      memoryCache.data = [];
      memoryCache.lastDoc = null;
      memoryCache.hasMore = false;
      memoryCache.isDirty = true;
      memoryCache.fullDBLoaded = true;

      return { message: `Wiped ${totalDeleted} records securely.` };
    } catch (error) {
      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        throw new Error("Incorrect Admin Password.");
      }
      throw new Error("Wipe operation failed: " + error.message);
    }
  },
};

export default stockService;
