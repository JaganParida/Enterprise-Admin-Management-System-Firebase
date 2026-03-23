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

const maintCollection = collection(db, "maintenances");

const maintenanceService = {
  // 1. 🚀 SERVER-SIDE STATS CALCULATION
  getStats: async () => {
    try {
      const q = query(maintCollection);
      const snapshot = await getAggregateFromServer(q, {
        totalCost: sum("cost"),
        serviceCount: count(),
      });
      return {
        totalCost: snapshot.data().totalCost || 0,
        serviceCount: snapshot.data().serviceCount || 0,
      };
    } catch (error) {
      console.warn("Aggregation failed, falling back to client calc:", error);
      const snap = await getDocs(query(maintCollection));
      let totalCost = 0;
      snap.forEach((doc) => {
        totalCost += Number(doc.data().cost) || 0;
      });
      return { totalCost, serviceCount: snap.size };
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

      const q = query(maintCollection, ...queryConstraints);
      const snapshot = await getDocs(q);

      let fetchedData = snapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }));

      // Client-side fallback for Search & Amount Ranges (Due to Firebase limits)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        fetchedData = fetchedData.filter(
          (log) =>
            String(log.vehicleNo || "")
              .toLowerCase()
              .includes(searchLower) ||
            String(log.serviceType || "")
              .toLowerCase()
              .includes(searchLower) ||
            String(log.description || "")
              .toLowerCase()
              .includes(searchLower),
        );
      }

      if (filters.amountFilter && filters.amountFilter !== "Any Amount") {
        fetchedData = fetchedData.filter((log) => {
          const amt = Number(log.cost) || 0;
          if (filters.amountFilter === "Under ₹10k") return amt < 10000;
          if (filters.amountFilter === "₹10k - ₹50k")
            return amt >= 10000 && amt <= 50000;
          if (filters.amountFilter === "Over ₹50k") return amt > 50000;
          return true;
        });
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
      cost: Number(payload.cost) || 0,
      meterKm: Number(payload.meterKm) || 0,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
      editHistory: [],
    };
    const docRef = await addDoc(maintCollection, dataToSave);
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  updateLog: async (id, payload, user) => {
    const docRef = doc(db, "maintenances", id);
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
      cost: Number(payload.cost) || 0,
      meterKm: Number(payload.meterKm) || 0,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };

    await updateDoc(docRef, dataToUpdate);
    return { message: "Updated" };
  },

  // 4. 🚀 BACKEND SECURITY (RBAC Check)
  deleteLog: async (id, user) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager") {
      throw new Error("Action Denied: Managers cannot delete records.");
    }
    await deleteDoc(doc(db, "maintenances", id));
    return { message: "Deleted" };
  },

  // 4. 🚀 BACKEND SECURITY WIPE FEATURE (Password Re-Auth + RBAC)
  deleteAllLogs: async ({ password, email, user }) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager") {
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
      const snapshot = await getDocs(maintCollection);
      const deletePromises = [];
      snapshot.forEach((document) => {
        deletePromises.push(deleteDoc(doc(db, "maintenances", document.id)));
      });
      await Promise.all(deletePromises);
      return { success: true };
    } catch (error) {
      throw new Error("Failed to clear database. Admin rights required.");
    }
  },
};

export default maintenanceService;
