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

const fuelCollection = collection(db, "fuels");

const fuelService = {
  // 1. 🚀 SERVER-SIDE STATS CALCULATION
  getStats: async () => {
    try {
      const q = query(fuelCollection);
      const snapshot = await getAggregateFromServer(q, {
        totalLiters: sum("liters"),
        totalCost: sum("totalCost"),
        refuelCount: count(),
      });

      return {
        totalLiters: snapshot.data().totalLiters || 0,
        totalCost: snapshot.data().totalCost || 0,
        refuelCount: snapshot.data().refuelCount || 0,
      };
    } catch (error) {
      console.warn("Aggregation failed, falling back to client calc:", error);
      const snap = await getDocs(query(fuelCollection));
      let totalLiters = 0;
      let totalCost = 0;
      snap.forEach((doc) => {
        totalLiters += Number(doc.data().liters) || 0;
        totalCost += Number(doc.data().totalCost) || 0;
      });
      return { totalLiters, totalCost, refuelCount: snap.size };
    }
  },

  // 🚀 2. PAGINATED & 100% BACKEND FILTERED FETCH
  getLogs: async (filters = {}, lastVisibleDoc = null, limitCount = 50) => {
    let constraints = [];
    let hasInequality = false;

    // --- 1. EQUALITY FILTERS ---
    if (filters.exactDate) {
      constraints.push(where("date", "==", filters.exactDate));
    }

    // --- 2. MUTUALLY EXCLUSIVE INEQUALITY FILTERS ---
    if (filters.search) {
      constraints.push(where("vehicleNo", ">=", filters.search));
      constraints.push(where("vehicleNo", "<=", filters.search + "\uf8ff"));
      constraints.push(orderBy("vehicleNo"));
      hasInequality = true;
    } else if (filters.amountFilter && filters.amountFilter !== "Any Amount") {
      if (filters.amountFilter === "Under ₹5k") {
        constraints.push(where("totalCost", "<", 5000));
      } else if (filters.amountFilter === "₹5k - ₹20k") {
        constraints.push(
          where("totalCost", ">=", 5000),
          where("totalCost", "<=", 20000),
        );
      } else if (filters.amountFilter === "Over ₹20k") {
        constraints.push(where("totalCost", ">", 20000));
      }
      constraints.push(orderBy("totalCost", "desc"));
      hasInequality = true;
    } else if (
      filters.dateFilter &&
      filters.dateFilter !== "All" &&
      !filters.exactDate
    ) {
      const today = new Date();
      let pastDate = new Date();
      if (filters.dateFilter === "Today") pastDate.setDate(today.getDate() - 1);
      else if (filters.dateFilter === "Last7Days")
        pastDate.setDate(today.getDate() - 7);
      else if (filters.dateFilter === "ThisMonth") pastDate.setDate(1);

      const pastDateStr = pastDate.toISOString().split("T")[0];
      constraints.push(where("date", ">=", pastDateStr));
      constraints.push(orderBy("date", "desc"));
      hasInequality = true;
    }

    // Default sorting
    if (!hasInequality && !filters.exactDate) {
      constraints.push(orderBy("date", "desc"));
    }

    // --- 3. APPLY PAGINATION ---
    constraints.push(limit(limitCount));
    if (lastVisibleDoc) constraints.push(startAfter(lastVisibleDoc));

    try {
      const q = query(fuelCollection, ...constraints);
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }));
      return { data, lastVisible: snapshot.docs[snapshot.docs.length - 1] };
    } catch (error) {
      console.error("🔥 Firebase Query Error:", error);
      throw error;
    }
  },

  addLog: async (payload, user) => {
    const dataToSave = {
      ...payload,
      liters: Number(payload.liters),
      pricePerLiter: Number(payload.pricePerLiter),
      totalCost: Number(payload.totalCost),
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
      editHistory: [],
    };
    const docRef = await addDoc(fuelCollection, dataToSave);
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  updateLog: async (id, payload, user) => {
    const docRef = doc(db, "fuels", id);
    const snapshot = await getDoc(docRef);
    let currentHistory =
      snapshot.exists() && snapshot.data().editHistory
        ? snapshot.data().editHistory
        : [];

    const currentEdit = {
      by: user?.email || "Unknown",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    };
    currentHistory.push(currentEdit);

    if (currentHistory.length > 10) {
      currentHistory = currentHistory.slice(currentHistory.length - 10);
    }

    const dataToUpdate = {
      ...payload,
      liters: Number(payload.liters),
      pricePerLiter: Number(payload.pricePerLiter),
      totalCost: Number(payload.totalCost),
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };
    await updateDoc(docRef, dataToUpdate);
    return { message: "Updated" };
  },

  deleteLog: async (id, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager") {
      throw new Error(
        "Action Denied: Managers are not allowed to delete records.",
      );
    }
    await deleteDoc(doc(db, "fuels", id));
    return { message: "Deleted" };
  },

  deleteAllLogs: async ({ password, email, user }) => {
    if (user?.role === "manager" || user?.data?.role === "manager") {
      throw new Error("Action Denied: Managers cannot wipe the database.");
    }

    if (!password || !email) {
      throw new Error("Authentication Error: Unable to verify admin identity.");
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
      const snapshot = await getDocs(fuelCollection);
      const deletePromises = [];
      snapshot.forEach((document) => {
        deletePromises.push(deleteDoc(doc(db, "fuels", document.id)));
      });
      await Promise.all(deletePromises);
      return { success: true };
    } catch (error) {
      console.error("Wipe Database Error:", error);
      throw new Error("Failed to clear database. Admin rights required.");
    }
  },
};

export default fuelService;
