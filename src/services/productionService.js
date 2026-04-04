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
  increment,
  getAggregateFromServer,
  sum,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const PROD_COLLECTION = "production";
const LABOUR_COLLECTION = "labour_payouts";
const METADATA_COLLECTION = "_system_metadata";
const STATS_DOC = "dashboard_stats";

const productionService = {
  // 🚀 1 READ FOR ENTIRE DASHBOARD SUMMARY
  getStats: async () => {
    try {
      const snap = await getDoc(doc(db, METADATA_COLLECTION, STATS_DOC));
      if (snap.exists()) return snap.data();
      return { output: 0, paid: 0, due: 0 };
    } catch (error) {
      return { output: 0, paid: 0, due: 0 };
    }
  },

  syncAllStats: async () => {
    try {
      const prodQ = collection(db, PROD_COLLECTION);
      const labQ = collection(db, LABOUR_COLLECTION);
      const duesQ = query(
        collection(db, LABOUR_COLLECTION),
        where("amountDue", ">", 0),
      );

      const [prodSnap, labSnap, duesSnap] = await Promise.all([
        getAggregateFromServer(prodQ, { totalQty: sum("quantity") }),
        getAggregateFromServer(labQ, { totalPaid: sum("amountPaid") }),
        getAggregateFromServer(duesQ, { totalDue: sum("amountDue") }),
      ]);

      const newStats = {
        output: prodSnap.data().totalQty || 0,
        paid: labSnap.data().totalPaid || 0,
        due: duesSnap.data().totalDue || 0,
      };

      await setDoc(doc(db, METADATA_COLLECTION, STATS_DOC), newStats);
      return newStats;
    } catch (error) {
      // ✅ FIX 1: FALLBACK BOMB REMOVED
      // We no longer fallback to getDocs() which would burn all daily reads.
      console.error(
        "Aggregation failed. Server error or indexing delay.",
        error,
      );
      throw new Error(
        "Stats sync failed due to server timeout. Please try again later.",
      );
    }
  },

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

  // 🚀 EXACT 50 RECORDS LIMIT + INDEX CRASH PREVENTION
  getAllProduction: async (filters = {}, lastDoc = null, limitCount = 50) => {
    let constraints = [];

    if (filters.product && filters.product !== "All")
      constraints.push(where("productName", "==", filters.product));
    if (filters.exactDate)
      constraints.push(where("date", "==", filters.exactDate));

    if (filters.search) {
      const searchLower = filters.search.toLowerCase().trim();
      constraints.push(
        where("searchName", ">=", searchLower),
        where("searchName", "<=", searchLower + "\uf8ff"),
        orderBy("searchName", "asc"),
      );
    } else if (filters.quantity && filters.quantity !== "All") {
      if (filters.quantity === "Under5k")
        constraints.push(where("quantity", "<", 5000));
      else if (filters.quantity === "5k-15k")
        constraints.push(
          where("quantity", ">=", 5000),
          where("quantity", "<=", 15000),
        );
      else if (filters.quantity === "Above15k")
        constraints.push(where("quantity", ">", 15000));
      constraints.push(orderBy("quantity", "desc"));
    } else if (filters.date && filters.date !== "All" && !filters.exactDate) {
      const today = new Date();
      let pastDate = new Date();
      if (filters.date === "Last7Days") pastDate.setDate(today.getDate() - 7);
      else if (filters.date === "Last30Days")
        pastDate.setDate(today.getDate() - 30);
      else if (filters.date === "ThisMonth") pastDate.setDate(1);

      constraints.push(
        where("date", ">=", pastDate.toISOString().split("T")[0]),
      );
      constraints.push(orderBy("date", "desc"));
    } else {
      constraints.push(orderBy("date", "desc"));
    }

    constraints.push(limit(limitCount));
    if (lastDoc) constraints.push(startAfter(lastDoc));

    try {
      const q = query(collection(db, PROD_COLLECTION), ...constraints);
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        _id: doc.id,
        id: doc.id,
        ...doc.data(),
      }));
      return { data, lastVisible: snapshot.docs[snapshot.docs.length - 1] };
    } catch (error) {
      throw error;
    }
  },

  getAllLabourPayouts: async (
    filters = {},
    lastDoc = null,
    limitCount = 50,
    onlyDues = false,
  ) => {
    let constraints = [];

    if (filters.exactDate)
      constraints.push(where("date", "==", filters.exactDate));

    if (filters.search) {
      const searchLower = filters.search.toLowerCase().trim();
      constraints.push(
        where("searchName", ">=", searchLower),
        where("searchName", "<=", searchLower + "\uf8ff"),
        orderBy("searchName", "asc"),
      );
    } else if (onlyDues) {
      constraints.push(
        where("amountDue", ">", 0),
        orderBy("amountDue", "desc"),
      );
    } else if (filters.date && filters.date !== "All" && !filters.exactDate) {
      const today = new Date();
      let pastDate = new Date();
      if (filters.date === "Last7Days") pastDate.setDate(today.getDate() - 7);
      else if (filters.date === "Last30Days")
        pastDate.setDate(today.getDate() - 30);
      else if (filters.date === "ThisMonth") pastDate.setDate(1);

      constraints.push(
        where("date", ">=", pastDate.toISOString().split("T")[0]),
        orderBy("date", "desc"),
      );
    } else {
      constraints.push(orderBy("date", "desc"));
    }

    constraints.push(limit(limitCount));
    if (lastDoc) constraints.push(startAfter(lastDoc));

    try {
      const q = query(collection(db, LABOUR_COLLECTION), ...constraints);
      const snapshot = await getDocs(q);
      let data = snapshot.docs.map((doc) => ({
        _id: doc.id,
        id: doc.id,
        ...doc.data(),
      }));

      if (filters.search && onlyDues) {
        data = data.filter((d) => Number(d.amountDue) > 0);
      }

      return { data, lastVisible: snapshot.docs[snapshot.docs.length - 1] };
    } catch (error) {
      throw error;
    }
  },

  addProduction: async (data, user) => {
    const batch = writeBatch(db);
    const newDocRef = doc(collection(db, PROD_COLLECTION));
    const qty = Number(data.quantity) || 0;

    const payload = {
      ...data,
      searchName: data.productName.toLowerCase(),
      quantity: qty,
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
      createdAt: new Date().toISOString(),
      editHistory: [],
    };

    batch.set(newDocRef, payload);
    const statsRef = doc(db, METADATA_COLLECTION, STATS_DOC);
    batch.set(statsRef, { output: increment(qty) }, { merge: true });

    await batch.commit();
    return newDocRef;
  },

  getProductionById: async (id) => {
    const docSnap = await getDoc(doc(db, PROD_COLLECTION, id));
    if (docSnap.exists())
      return { data: { _id: docSnap.id, id: docSnap.id, ...docSnap.data() } };
    throw new Error("Not found");
  },

  updateProduction: async (id, data, user) => {
    const docRef = doc(db, PROD_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    const oldQty = Number(docSnap.data().quantity) || 0;
    const newQty = Number(data.quantity) || 0;
    const diff = newQty - oldQty;

    let history = docSnap.data().editHistory || [];
    history.push({
      role: user?.role || "admin",
      by: user?.email || "Unknown",
      at: new Date().toISOString(),
    });
    // Strict Top 2 History
    if (history.length > 2) history = history.slice(-2);

    const batch = writeBatch(db);
    batch.update(docRef, {
      ...data,
      searchName: data.productName.toLowerCase(),
      quantity: newQty,
      editHistory: history,
    });

    if (diff !== 0) {
      const statsRef = doc(db, METADATA_COLLECTION, STATS_DOC);
      batch.set(statsRef, { output: increment(diff) }, { merge: true });
    }
    await batch.commit();
  },

  deleteProduction: async (id, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Managers cannot delete.");
    const docRef = doc(db, PROD_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const qtyToRemove = Number(docSnap.data().quantity) || 0;
    const batch = writeBatch(db);
    batch.delete(docRef);
    const statsRef = doc(db, METADATA_COLLECTION, STATS_DOC);
    batch.set(statsRef, { output: increment(-qtyToRemove) }, { merge: true });
    await batch.commit();
  },

  addLabourPayout: async (data, user) => {
    const batch = writeBatch(db);
    const newDocRef = doc(collection(db, LABOUR_COLLECTION));
    const paid = Number(data.amountPaid || 0);
    const due = Number(data.amountDue || 0);

    const payload = {
      ...data,
      searchName: data.labourName.toLowerCase(),
      quantityProduced: Number(data.quantityProduced || 0),
      cost: Number(data.cost || 0),
      amountPaid: paid,
      amountDue: due,
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
      createdAt: new Date().toISOString(),
      editHistory: [],
    };

    batch.set(newDocRef, payload);
    const statsRef = doc(db, METADATA_COLLECTION, STATS_DOC);
    batch.set(
      statsRef,
      { paid: increment(paid), due: increment(due) },
      { merge: true },
    );
    await batch.commit();
    return newDocRef;
  },

  getLabourPayoutById: async (id) => {
    const docSnap = await getDoc(doc(db, LABOUR_COLLECTION, id));
    if (docSnap.exists())
      return { data: { _id: docSnap.id, id: docSnap.id, ...docSnap.data() } };
    throw new Error("Not found");
  },

  updateLabourPayout: async (id, data, user) => {
    const docRef = doc(db, LABOUR_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    const oldPaid = Number(docSnap.data().amountPaid) || 0;
    const oldDue = Number(docSnap.data().amountDue) || 0;
    const newPaid = Number(data.amountPaid) || 0;
    const newDue = Number(data.amountDue) || 0;

    let history = docSnap.data().editHistory || [];
    history.push({
      role: user?.role || "admin",
      by: user?.email || "Unknown",
      at: new Date().toISOString(),
    });
    // Strict Top 2 History
    if (history.length > 2) history = history.slice(-2);

    const batch = writeBatch(db);
    batch.update(docRef, {
      ...data,
      searchName: data.labourName.toLowerCase(),
      quantityProduced: Number(data.quantityProduced || 0),
      cost: Number(data.cost || 0),
      amountPaid: newPaid,
      amountDue: newDue,
      editHistory: history,
    });

    if (newPaid - oldPaid !== 0 || newDue - oldDue !== 0) {
      const statsRef = doc(db, METADATA_COLLECTION, STATS_DOC);
      batch.set(
        statsRef,
        { paid: increment(newPaid - oldPaid), due: increment(newDue - oldDue) },
        { merge: true },
      );
    }
    await batch.commit();
  },

  deleteLabourPayout: async (id, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Managers cannot delete.");
    const docRef = doc(db, LABOUR_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    const paidToRemove = Number(docSnap.data().amountPaid) || 0;
    const dueToRemove = Number(docSnap.data().amountDue) || 0;
    const batch = writeBatch(db);
    batch.delete(docRef);
    const statsRef = doc(db, METADATA_COLLECTION, STATS_DOC);
    batch.set(
      statsRef,
      { paid: increment(-paidToRemove), due: increment(-dueToRemove) },
      { merge: true },
    );
    await batch.commit();
  },

  // 🚀 ✅ FIX 2: BATCH WIPE SAFE LIMIT (2k instead of 10k)
  deleteAllProduction: async ({ password, email, user }) => {
    if (user?.role === "manager" || user?.data?.role === "manager")
      throw new Error("Only Admins can wipe.");
    if (!password || !email) throw new Error("Authentication Error");
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.email !== email)
      throw new Error("Session mismatch");

    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        password,
      );
      await reauthenticateWithCredential(currentUser, credential);
    } catch (error) {
      throw new Error("Incorrect Admin Password.");
    }

    // CHECK DAILY LOCK STATUS FIRST
    const lockDoc = await getDoc(doc(db, METADATA_COLLECTION, "wipe_lock"));
    if (lockDoc.exists()) {
      const lockedUntil = lockDoc.data().lockedUntil;
      if (Date.now() < lockedUntil) {
        const hrs = Math.ceil((lockedUntil - Date.now()) / (1000 * 60 * 60));
        throw new Error(
          `Daily Delete Limit Reached. Locked for ${hrs} hour(s).`,
        );
      }
    }

    const DAILY_LIMIT = 2000; // REDUCED FROM 10,000 to protect Firebase Free Tier
    let totalDeleted = 0;

    const wipeInChunks = async (collectionName) => {
      let isDeleting = true;
      while (isDeleting && totalDeleted < DAILY_LIMIT) {
        const remainingAllowed = DAILY_LIMIT - totalDeleted;
        const limitCount = Math.min(500, remainingAllowed);

        const q = query(collection(db, collectionName), limit(limitCount));
        const snapshot = await getDocs(q);

        if (snapshot.empty) break;

        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        totalDeleted += snapshot.docs.length;
        if (totalDeleted >= DAILY_LIMIT) {
          isDeleting = false;
        }
      }
    };

    try {
      await wipeInChunks(PROD_COLLECTION);
      if (totalDeleted < DAILY_LIMIT) {
        await wipeInChunks(LABOUR_COLLECTION);
      }

      if (totalDeleted >= DAILY_LIMIT) {
        // ENFORCE 24 HOUR LOCK IF LIMIT REACHED
        await setDoc(doc(db, METADATA_COLLECTION, "wipe_lock"), {
          lockedUntil: Date.now() + 24 * 60 * 60 * 1000,
        });
        return {
          message:
            "Wiped 2k records. Daily safe limit reached and system locked.",
        };
      } else {
        // FULLY WIPED - RESET STATS AND CLEAR LOCK
        await setDoc(doc(db, METADATA_COLLECTION, STATS_DOC), {
          output: 0,
          paid: 0,
          due: 0,
        });
        await deleteDoc(doc(db, METADATA_COLLECTION, "wipe_lock")); // clear lock if expired
        return { message: "Database wiped safely" };
      }
    } catch (error) {
      throw new Error("Failed to clear database.");
    }
  },
};

export default productionService;
