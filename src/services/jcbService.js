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
import { signInWithEmailAndPassword } from "firebase/auth";

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

  // 2 & 3. 🚀 PAGINATION & BACKEND FILTERING
  getLogs: async (filters = {}, lastVisibleDoc = null, pageSize = 50) => {
    try {
      let queryConstraints = [];

      // Date Filtering
      if (filters.exactDate) {
        queryConstraints.push(where("date", ">=", filters.exactDate));
        queryConstraints.push(
          where("date", "<=", filters.exactDate + "\uf8ff"),
        );
      } else if (filters.dateFilter && filters.dateFilter !== "All") {
        const today = new Date();
        let targetDate = new Date();

        if (filters.dateFilter === "Today")
          targetDate.setDate(today.getDate() - 1);
        if (filters.dateFilter === "Last7Days")
          targetDate.setDate(today.getDate() - 7);
        if (filters.dateFilter === "ThisMonth") targetDate.setDate(1);

        queryConstraints.push(
          where("date", ">=", targetDate.toISOString().split("T")[0]),
        );
      }

      queryConstraints.push(orderBy("date", "desc"));
      if (lastVisibleDoc) queryConstraints.push(startAfter(lastVisibleDoc));
      queryConstraints.push(limit(pageSize));

      const q = query(jcbCollection, ...queryConstraints);
      const snapshot = await getDocs(q);

      let fetchedData = snapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }));

      // Client-side fallback for Search & Vehicle (Due to Firebase multiple-inequality limits)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        fetchedData = fetchedData.filter(
          (log) =>
            String(log.customerName || "")
              .toLowerCase()
              .includes(searchLower) ||
            String(log.location || "")
              .toLowerCase()
              .includes(searchLower) ||
            String(log.phone || "")
              .toLowerCase()
              .includes(searchLower),
        );
      }

      if (filters.vehicleFilter && filters.vehicleFilter !== "All") {
        fetchedData = fetchedData.filter(
          (log) => log.vehicleNo === filters.vehicleFilter,
        );
      }

      return {
        data: fetchedData,
        lastVisible: snapshot.docs[snapshot.docs.length - 1],
      };
    } catch (error) {
      console.error("Fetch Error:", error);
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

  // 4. 🚀 BACKEND SECURITY (RBAC)
  deleteLog: async (id, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager") {
      throw new Error("Action Denied: Managers cannot delete records.");
    }
    await deleteDoc(doc(db, "jcb_logs", id));
    return { message: "Deleted" };
  },

  // 4. 🚀 BACKEND SECURITY WIPE FEATURE
  deleteAllLogs: async ({ password, email, user }) => {
    if (user?.role === "manager" || user?.data?.role === "manager") {
      throw new Error("Action Denied: Managers cannot wipe the database.");
    }
    if (!password || !email) {
      throw new Error("Authentication Error: Missing credentials.");
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
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
