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
  startAfter,
  where,
  getAggregateFromServer,
  sum,
  count,
} from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const jcbCollection = collection(db, "jcb_logs");

const jcbService = {
  // 1. 🚀 SERVER-SIDE STATS CALCULATION
  getStats: async () => {
    try {
      const q = query(jcbCollection);
      const snapshot = await getAggregateFromServer(q, {
        totalMins: sum("totalMins"),
        logCount: count(),
      });
      return {
        totalMins: snapshot.data().totalMins || 0,
        logCount: snapshot.data().logCount || 0,
      };
    } catch (error) {
      console.warn("Aggregation failed, falling back to client calc:", error);
      const snap = await getDocs(query(jcbCollection));
      let totalMins = 0;
      snap.forEach((doc) => {
        totalMins += Number(doc.data().totalMins) || 0;
      });
      return { totalMins, logCount: snap.size };
    }
  },

  // 🚀 2. PAGINATED & 100% BACKEND FILTERED FETCH
  getLogs: async (filters = {}, lastVisibleDoc = null, pageSize = 50) => {
    let constraints = [];
    let hasInequality = false;

    // --- 1. EQUALITY FILTERS ---
    if (filters.vehicleFilter && filters.vehicleFilter !== "All") {
      constraints.push(where("vehicleNo", "==", filters.vehicleFilter));
    }
    if (filters.exactDate) {
      constraints.push(where("date", "==", filters.exactDate));
    }

    // --- 2. MUTUALLY EXCLUSIVE INEQUALITY FILTERS ---
    // Note: Firebase doesn't support OR queries well for prefix search across multiple fields
    // So we will prioritize searching by Customer Name
    if (filters.search) {
      constraints.push(where("customerName", ">=", filters.search));
      constraints.push(where("customerName", "<=", filters.search + "\uf8ff"));
      constraints.push(orderBy("customerName"));
      hasInequality = true;
    } else if (
      filters.dateFilter &&
      filters.dateFilter !== "All" &&
      !filters.exactDate
    ) {
      const today = new Date();
      let targetDate = new Date();

      if (filters.dateFilter === "Today")
        targetDate.setDate(today.getDate() - 1);
      else if (filters.dateFilter === "Last7Days")
        targetDate.setDate(today.getDate() - 7);
      else if (filters.dateFilter === "ThisMonth") targetDate.setDate(1);

      const pastDateStr = targetDate.toISOString().split("T")[0];
      constraints.push(where("date", ">=", pastDateStr));
      constraints.push(orderBy("date", "desc"));
      hasInequality = true;
    }

    // Default sorting
    if (!hasInequality && !filters.exactDate) {
      constraints.push(orderBy("date", "desc"));
    }

    // --- 3. APPLY PAGINATION ---
    constraints.push(limit(pageSize));
    if (lastVisibleDoc) constraints.push(startAfter(lastVisibleDoc));

    try {
      const q = query(jcbCollection, ...constraints);
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }));

      return {
        data,
        lastVisible: snapshot.docs[snapshot.docs.length - 1],
      };
    } catch (error) {
      console.error("🔥 Firebase Query Error:", error);
      throw error;
    }
  },

  addLog: async (payload, user) => {
    const dataToSave = {
      ...payload,
      totalMins: Number(payload.totalMins) || 0,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
      editHistory: [],
    };
    const docRef = await addDoc(jcbCollection, dataToSave);
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  updateLog: async (id, payload, user) => {
    const docRef = doc(db, "jcb_logs", id);
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
    if (currentHistory.length > 10) currentHistory = currentHistory.slice(-10);

    const dataToUpdate = {
      ...payload,
      totalMins: Number(payload.totalMins) || 0,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };

    await updateDoc(docRef, dataToUpdate);
    return { message: "Updated" };
  },

  deleteLog: async (id, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager") {
      throw new Error("Action Denied: Managers cannot delete records.");
    }
    await deleteDoc(doc(db, "jcb_logs", id));
    return { message: "Deleted" };
  },

  deleteAllLogs: async ({ password, email, user }) => {
    if (user?.role === "manager" || user?.data?.role === "manager") {
      throw new Error("Action Denied: Managers cannot wipe the database.");
    }
    if (!password || !email) {
      throw new Error("Authentication Error: Missing credentials.");
    }

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
      throw new Error("Access Denied: Incorrect Admin Password.");
    }

    try {
      const snapshot = await getDocs(jcbCollection);
      const deletePromises = [];
      snapshot.forEach((document) => {
        deletePromises.push(deleteDoc(doc(db, "jcb_logs", document.id)));
      });
      await Promise.all(deletePromises);
      return { success: true };
    } catch (error) {
      throw new Error("Failed to clear database. Admin rights required.");
    }
  },
};

export default jcbService;
