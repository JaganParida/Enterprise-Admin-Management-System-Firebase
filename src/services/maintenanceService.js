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

  // 2 & 3. 🚀 PAGINATION & 100% BACKEND FILTERING
  getLogs: async (filters = {}, lastVisibleDoc = null, pageSize = 50) => {
    try {
      let queryConstraints = [];
      let hasInequality = false;

      // --- 1. EQUALITY FILTERS ---
      if (filters.exactDate) {
        // Using strict equality for dates mapped to YYYY-MM-DD
        queryConstraints.push(where("date", "==", filters.exactDate));
      }

      // --- 2. MUTUALLY EXCLUSIVE INEQUALITY FILTERS ---
      // Firebase allows only ONE inequality filter. The UI locks ensure only one is passed.
      if (filters.search) {
        queryConstraints.push(where("vehicleNo", ">=", filters.search));
        queryConstraints.push(
          where("vehicleNo", "<=", filters.search + "\uf8ff"),
        );
        queryConstraints.push(orderBy("vehicleNo"));
        hasInequality = true;
      } else if (
        filters.amountFilter &&
        filters.amountFilter !== "Any Amount"
      ) {
        if (filters.amountFilter === "Under ₹10k") {
          queryConstraints.push(where("cost", "<", 10000));
        } else if (filters.amountFilter === "₹10k - ₹50k") {
          queryConstraints.push(
            where("cost", ">=", 10000),
            where("cost", "<=", 50000),
          );
        } else if (filters.amountFilter === "Over ₹50k") {
          queryConstraints.push(where("cost", ">", 50000));
        }
        queryConstraints.push(orderBy("cost", "desc"));
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
        if (filters.dateFilter === "Last7Days")
          targetDate.setDate(today.getDate() - 7);
        if (filters.dateFilter === "ThisMonth") targetDate.setDate(1);

        queryConstraints.push(
          where("date", ">=", targetDate.toISOString().split("T")[0]),
        );
        queryConstraints.push(orderBy("date", "desc"));
        hasInequality = true;
      }

      // Default sorting if no inequalities
      if (!hasInequality && !filters.exactDate) {
        queryConstraints.push(orderBy("date", "desc"));
      }

      // --- 3. APPLY PAGINATION ---
      queryConstraints.push(limit(pageSize));
      if (lastVisibleDoc) queryConstraints.push(startAfter(lastVisibleDoc));

      const q = query(maintCollection, ...queryConstraints);
      const snapshot = await getDocs(q);

      let fetchedData = snapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }));

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
    const docRef = doc(db, "maintenances", id);
    await deleteDoc(docRef);
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
