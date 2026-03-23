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
  // 1. 🚀 SERVER-SIDE STATS CALCULATION (Golden Rule #1)
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
      // Fallback for older Firebase SDKs or missing index
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

  // 2 & 3. 🚀 PAGINATION & BACKEND FILTERING (Golden Rules #2 & #3)
  getLogs: async (filters = {}, lastVisibleDoc = null, pageSize = 50) => {
    let queryConstraints = [];

    // Date Filtering (Using >= allows us to order by date desc safely)
    if (filters.exactDate) {
      // For exact date, we match the prefix
      queryConstraints.push(where("date", ">=", filters.exactDate));
      queryConstraints.push(where("date", "<=", filters.exactDate + "\uf8ff"));
    } else if (filters.dateFilter && filters.dateFilter !== "All") {
      const today = new Date();
      let targetDate = new Date();

      if (filters.dateFilter === "Today")
        targetDate.setDate(today.getDate() - 1);
      if (filters.dateFilter === "Last7Days")
        targetDate.setDate(today.getDate() - 7);
      if (filters.dateFilter === "ThisMonth") targetDate.setDate(1); // 1st of month

      queryConstraints.push(
        where("date", ">=", targetDate.toISOString().split("T")[0]),
      );
    }

    queryConstraints.push(orderBy("date", "desc"));
    if (lastVisibleDoc) queryConstraints.push(startAfter(lastVisibleDoc));
    queryConstraints.push(limit(pageSize));

    const q = query(fuelCollection, ...queryConstraints);
    const snapshot = await getDocs(q);

    let fetchedData = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));

    // Apply strict secondary filters on the fetched chunk (to bypass Firebase limitations)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      fetchedData = fetchedData.filter((log) =>
        String(log.vehicleNo || "")
          .toLowerCase()
          .includes(searchLower),
      );
    }

    if (filters.amountFilter && filters.amountFilter !== "Any Amount") {
      fetchedData = fetchedData.filter((log) => {
        const amt = Number(log.totalCost) || 0;
        if (filters.amountFilter === "Under ₹5k") return amt < 5000;
        if (filters.amountFilter === "₹5k - ₹20k")
          return amt >= 5000 && amt <= 20000;
        if (filters.amountFilter === "Over ₹20k") return amt > 20000;
        return true;
      });
    }

    return {
      data: fetchedData,
      lastVisible: snapshot.docs[snapshot.docs.length - 1],
    };
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

  // 4. 🚀 BACKEND SECURITY: Blocks Managers
  deleteLog: async (id, user) => {
    if (user?.role === "manager" || user?.data?.role === "manager") {
      throw new Error(
        "Action Denied: Managers are not allowed to delete records.",
      );
    }
    await deleteDoc(doc(db, "fuels", id));
    return { message: "Deleted" };
  },

  // 4. 🚀 BACKEND SECURITY: Admin Password Re-auth + Role Check
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
