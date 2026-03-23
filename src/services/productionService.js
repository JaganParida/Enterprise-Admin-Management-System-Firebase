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
  getAggregateFromServer,
  sum,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const PROD_COLLECTION = "production";
const LABOUR_COLLECTION = "labour_payouts";

const productionService = {
  // 1. 🚀 FAST SERVER-SIDE STATS
  getStats: async () => {
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

      const output = prodSnap.data().totalQty || 0;
      const paid = labSnap.data().totalPaid || 0;
      const due = duesSnap.data().totalDue || 0;

      if (output === 0 && paid === 0 && due === 0)
        throw new Error("Fallback Trigger");

      return { output, paid, due };
    } catch (error) {
      try {
        let stats = { output: 0, paid: 0, due: 0 };
        const [pSnap, lSnap] = await Promise.all([
          getDocs(collection(db, PROD_COLLECTION)),
          getDocs(collection(db, LABOUR_COLLECTION)),
        ]);
        pSnap.forEach(
          (doc) => (stats.output += Number(doc.data().quantity) || 0),
        );
        lSnap.forEach((doc) => {
          stats.paid += Number(doc.data().amountPaid) || 0;
          stats.due += Number(doc.data().amountDue) || 0;
        });
        return stats;
      } catch (fallbackError) {
        return { output: 0, paid: 0, due: 0 };
      }
    }
  },

  // 2. 🚀 PAGINATED & BACKEND FILTERED PRODUCTION FETCH
  getAllProduction: async (filters = {}, lastDoc = null, limitCount = 50) => {
    let constraints = [];
    let hasInequality = false;

    // EXACT FILTERS (Equality)
    if (filters.product && filters.product !== "All") {
      constraints.push(where("productName", "==", filters.product));
    }
    if (filters.exactDate) {
      constraints.push(where("date", "==", filters.exactDate));
    }

    // INEQUALITY FILTERS
    if (filters.search) {
      constraints.push(where("productName", ">=", filters.search));
      constraints.push(where("productName", "<=", filters.search + "\uf8ff"));
      constraints.push(orderBy("productName"));
      hasInequality = true;
    } else if (
      filters.quantity &&
      filters.quantity !== "All" &&
      !hasInequality
    ) {
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
      hasInequality = true;
    } else if (
      filters.date &&
      filters.date !== "All" &&
      !filters.exactDate &&
      !hasInequality
    ) {
      const today = new Date();
      let pastDate = new Date();
      if (filters.date === "Last7Days") pastDate.setDate(today.getDate() - 7);
      else if (filters.date === "Last30Days")
        pastDate.setDate(today.getDate() - 30);
      else if (filters.date === "ThisMonth") pastDate.setDate(1);

      const pastDateStr = pastDate.toISOString().split("T")[0];
      constraints.push(where("date", ">=", pastDateStr));
      constraints.push(orderBy("date", "desc"));
      hasInequality = true;
    }

    if (!hasInequality && !filters.exactDate) {
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

  addProduction: async (data, user) => {
    const payload = {
      ...data,
      quantity: Number(data.quantity),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
      createdAt: new Date().toISOString(),
      editHistory: [],
    };
    return await addDoc(collection(db, PROD_COLLECTION), payload);
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
    let history = docSnap.data().editHistory || [];
    history.push({
      role: user?.role || "admin",
      by: user?.email || "Unknown", // standardizing 'by' for consistency with other files
      at: new Date().toISOString(),
    });
    if (history.length > 10) history = history.slice(-10);

    return await updateDoc(docRef, {
      ...data,
      quantity: Number(data.quantity),
      editHistory: history,
    });
  },

  // 3. 🚀 SECURE DELETE (RBAC)
  deleteProduction: async (id, user) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager")
      throw new Error("Action Denied: Managers cannot delete records.");
    await deleteDoc(doc(db, PROD_COLLECTION, id));
  },

  // 4. 🚀 SECURE WIPE ALL (Password Re-Auth + RBAC)
  deleteAllProduction: async ({ password, email, user }) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager")
      throw new Error("Action Denied: Only Admins can wipe the database.");
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

    try {
      const [prodSnap, labSnap] = await Promise.all([
        getDocs(collection(db, PROD_COLLECTION)),
        getDocs(collection(db, LABOUR_COLLECTION)),
      ]);
      const promises = [
        ...prodSnap.docs.map((doc) => deleteDoc(doc.ref)),
        ...labSnap.docs.map((doc) => deleteDoc(doc.ref)),
      ];
      await Promise.all(promises);
      return { message: "Database wiped" };
    } catch (error) {
      throw new Error("Failed to clear database.");
    }
  },

  // 3. 🚀 PAGINATED & BACKEND FILTERED PAYOUTS
  getAllLabourPayouts: async (
    filters = {},
    lastDoc = null,
    limitCount = 50,
    onlyDues = false,
  ) => {
    let constraints = [];
    let hasInequality = false;

    if (filters.exactDate) {
      constraints.push(where("date", "==", filters.exactDate));
    }

    if (onlyDues) {
      constraints.push(where("amountDue", ">", 0));
      constraints.push(orderBy("amountDue", "desc"));
      hasInequality = true;
    } else if (filters.search) {
      constraints.push(where("labourName", ">=", filters.search));
      constraints.push(where("labourName", "<=", filters.search + "\uf8ff"));
      constraints.push(orderBy("labourName"));
      hasInequality = true;
    } else if (filters.date && filters.date !== "All" && !filters.exactDate) {
      const today = new Date();
      let pastDate = new Date();
      if (filters.date === "Last7Days") pastDate.setDate(today.getDate() - 7);
      else if (filters.date === "Last30Days")
        pastDate.setDate(today.getDate() - 30);
      else if (filters.date === "ThisMonth") pastDate.setDate(1);

      const pastDateStr = pastDate.toISOString().split("T")[0];
      constraints.push(where("date", ">=", pastDateStr));
      constraints.push(orderBy("date", "desc"));
      hasInequality = true;
    }

    if (!hasInequality && !filters.exactDate) {
      constraints.push(orderBy("date", "desc"));
    }

    constraints.push(limit(limitCount));
    if (lastDoc) constraints.push(startAfter(lastDoc));

    try {
      const q = query(collection(db, LABOUR_COLLECTION), ...constraints);
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

  addLabourPayout: async (data, user) => {
    const payload = {
      ...data,
      quantityProduced: Number(data.quantityProduced || 0),
      cost: Number(data.cost || 0),
      amountPaid: Number(data.amountPaid || 0),
      amountDue: Number(data.amountDue || 0),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
      createdAt: new Date().toISOString(),
      editHistory: [],
    };
    return await addDoc(collection(db, LABOUR_COLLECTION), payload);
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
    let history = docSnap.data().editHistory || [];
    history.push({
      role: user?.role || "admin",
      by: user?.email || "Unknown",
      at: new Date().toISOString(),
    });
    if (history.length > 10) history = history.slice(-10);

    return await updateDoc(docRef, {
      ...data,
      quantityProduced: Number(data.quantityProduced || 0),
      cost: Number(data.cost || 0),
      amountPaid: Number(data.amountPaid || 0),
      amountDue: Number(data.amountDue || 0),
      editHistory: history,
    });
  },

  deleteLabourPayout: async (id, user) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager")
      throw new Error("Action Denied: Managers cannot delete records.");
    await deleteDoc(doc(db, LABOUR_COLLECTION, id));
  },
};

export default productionService;
