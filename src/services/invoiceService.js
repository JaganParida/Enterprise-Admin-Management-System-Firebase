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
  where,
  startAfter,
  writeBatch,
  getAggregateFromServer,
  sum,
  count,
} from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const invCollection = collection(db, "invoices");

const getLocalISTDate = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString();
};

const getUpdatedHistory = async (id, user) => {
  const docRef = doc(db, "invoices", id);
  const snapshot = await getDoc(docRef);
  let currentHistory = [];

  if (snapshot.exists() && snapshot.data().editHistory) {
    currentHistory = snapshot.data().editHistory;
  }

  const currentEdit = {
    by: user?.email || "Unknown",
    role: user?.role || "Admin",
    at: getLocalISTDate(),
  };

  currentHistory.push(currentEdit);
  if (currentHistory.length > 10) {
    currentHistory = currentHistory.slice(currentHistory.length - 10);
  }

  return { currentEdit, currentHistory, docRef };
};

const invoiceService = {
  cache: {
    data: [],
    lastDoc: null,
    hasMore: false,
    filters: null,
    isValid: false,
  },

  clearCache: function () {
    this.cache.isValid = false;
  },

  getInvoiceStats: async () => {
    try {
      const results = await Promise.allSettled([
        getAggregateFromServer(query(invCollection), {
          val: sum("grandTotal"),
          cnt: count(),
        }),
        getAggregateFromServer(
          query(invCollection, where("status", "==", "Paid")),
          { val: sum("grandTotal"), cnt: count() },
        ),
        getAggregateFromServer(
          query(invCollection, where("status", "==", "Pending")),
          { val: sum("grandTotal"), cnt: count() },
        ),
        getAggregateFromServer(
          query(invCollection, where("status", "==", "Cancelled")),
          { val: sum("grandTotal"), cnt: count() },
        ),
      ]);

      const getVals = (res) =>
        res.status === "fulfilled"
          ? { amt: res.value.data().val || 0, count: res.value.data().cnt || 0 }
          : { amt: 0, count: 0 };

      return {
        total: getVals(results[0]),
        paid: getVals(results[1]),
        pending: getVals(results[2]),
        cancelled: getVals(results[3]),
      };
    } catch (error) {
      console.error("Stats Error:", error);
      return {
        total: { amt: 0, count: 0 },
        paid: { amt: 0, count: 0 },
        pending: { amt: 0, count: 0 },
        cancelled: { amt: 0, count: 0 },
      };
    }
  },

  getAllInvoices: async (filters = {}, lastDoc = null) => {
    let constraints = [];
    let hasInequality = false;

    if (filters.status && filters.status !== "All")
      constraints.push(where("status", "==", filters.status));
    if (filters.exactDate)
      constraints.push(where("date", "==", filters.exactDate));

    if (filters.search) {
      const searchStr = filters.search.trim();
      const isNumber =
        /^\d+$/.test(searchStr) || searchStr.toLowerCase().startsWith("inv");

      if (isNumber) {
        const cleanSearch = searchStr.replace(/inv-?/i, "");
        constraints.push(where("invoiceNumber", ">=", cleanSearch));
        constraints.push(where("invoiceNumber", "<=", cleanSearch + "\uf8ff"));
        constraints.push(orderBy("invoiceNumber"));
      } else {
        constraints.push(where("client.name", ">=", searchStr));
        constraints.push(where("client.name", "<=", searchStr + "\uf8ff"));
        constraints.push(orderBy("client.name"));
      }
      hasInequality = true;
    } else if (filters.amount && filters.amount !== "All" && !hasInequality) {
      if (filters.amount === "Under10k")
        constraints.push(where("grandTotal", "<", 10000));
      else if (filters.amount === "10k-50k")
        constraints.push(
          where("grandTotal", ">=", 10000),
          where("grandTotal", "<=", 50000),
        );
      else if (filters.amount === "Above50k")
        constraints.push(where("grandTotal", ">", 50000));
      constraints.push(orderBy("grandTotal", "desc"));
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

    if (!hasInequality && !filters.exactDate)
      constraints.push(orderBy("createdAt", "desc"));

    constraints.push(limit(50));
    if (lastDoc) constraints.push(startAfter(lastDoc));

    try {
      const q = query(invCollection, ...constraints);
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      return { data, lastVisible };
    } catch (error) {
      console.error("Firebase Query Error:", error);
      throw error;
    }
  },

  createInvoice: async (invoiceData, user) => {
    const payload = {
      ...invoiceData,
      createdAt: getLocalISTDate(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
    };
    const docRef = await addDoc(invCollection, payload);
    invoiceService.clearCache();
    return { data: { _id: docRef.id, ...payload } };
  },

  getInvoiceById: async (id) => {
    const snapshot = await getDoc(doc(db, "invoices", id));
    if (snapshot.exists())
      return { data: { _id: snapshot.id, ...snapshot.data() } };
    throw new Error("Invoice not found");
  },

  updateInvoice: async (id, invoiceData, user) => {
    const { currentEdit, currentHistory, docRef } = await getUpdatedHistory(
      id,
      user,
    );
    await updateDoc(docRef, {
      ...invoiceData,
      lastEditedBy: currentEdit.by,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    });
    invoiceService.clearCache();
    return { message: "Updated" };
  },

  updateStatus: async (id, newStatus, user) => {
    const { currentEdit, currentHistory, docRef } = await getUpdatedHistory(
      id,
      user,
    );
    await updateDoc(docRef, {
      status: newStatus,
      lastEditedBy: currentEdit.by,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    });
    invoiceService.clearCache();
    return { message: "Status updated" };
  },

  deleteInvoice: async (id, user) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager") throw new Error("Action Denied.");
    await deleteDoc(doc(db, "invoices", id));
    invoiceService.clearCache();
  },

  getFullBackupByMonth: async (monthToFetch) => {
    const startDate = `${monthToFetch}-01`;
    const endDate = `${monthToFetch}-31`;
    let allData = [];
    let lastVisible = null;
    let fetchedCount = 0;
    const SAFE_BACKUP_LIMIT = 10000;
    const resumeKey = `backup_resume_${monthToFetch}`;
    const resumeDataStr = localStorage.getItem(resumeKey);
    let partNumber = 1;

    if (resumeDataStr) {
      const resumeData = JSON.parse(resumeDataStr);
      partNumber = resumeData.part + 1;
      try {
        const snap = await getDoc(doc(db, "invoices", resumeData.lastId));
        if (snap.exists()) lastVisible = snap;
      } catch (e) {}
    }

    while (fetchedCount < SAFE_BACKUP_LIMIT) {
      let constraints = [
        where("date", ">=", startDate),
        where("date", "<=", endDate + "\uf8ff"),
        orderBy("date", "asc"),
        limit(500),
      ];
      if (lastVisible) constraints.push(startAfter(lastVisible));
      const q = query(invCollection, ...constraints);
      const snapshot = await getDocs(q);

      if (snapshot.empty) break;
      snapshot.docs.forEach((doc) => {
        if (fetchedCount < SAFE_BACKUP_LIMIT) {
          allData.push({ _id: doc.id, ...doc.data() });
          fetchedCount++;
          lastVisible = doc;
        }
      });
      if (snapshot.docs.length < 500) break;
    }

    if (fetchedCount >= SAFE_BACKUP_LIMIT) {
      localStorage.setItem(
        resumeKey,
        JSON.stringify({ lastId: lastVisible?.id, part: partNumber }),
      );
      return { data: allData, hasMore: true, part: partNumber };
    } else {
      localStorage.removeItem(resumeKey);
      return { data: allData, hasMore: false, part: partNumber };
    }
  },

  deleteAllInvoices: async ({ password, email, user }) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager") throw new Error("Action Denied.");
    if (!password || !email) throw new Error("Authentication Error");
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.email !== email)
      throw new Error("Active session mismatch.");

    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        password,
      );
      await reauthenticateWithCredential(currentUser, credential);
    } catch (error) {
      throw new Error("Incorrect Admin Password.");
    }

    let totalDeleted = 0;
    const SAFE_DAILY_LIMIT = 10000;

    const deleteInBatches = async () => {
      if (totalDeleted >= SAFE_DAILY_LIMIT) return "PARTIAL_SUCCESS";
      const snapshot = await getDocs(query(invCollection, limit(500)));
      if (snapshot.empty) return "FULL_SUCCESS";

      const batch = writeBatch(db);
      snapshot.docs.forEach((document) => {
        batch.delete(document.ref);
        totalDeleted++;
      });
      await batch.commit();
      return await deleteInBatches();
    };

    try {
      const result = await deleteInBatches();
      invoiceService.clearCache();
      if (result === "FULL_SUCCESS") {
        return {
          success: true,
          isPartial: false,
          message: "All Invoices cleared successfully!",
        };
      } else {
        return {
          success: true,
          isPartial: true,
          message: `⚠️ 10,000 Limit Reached. Progress saved. Please do Part 2 tomorrow.`,
        };
      }
    } catch (error) {
      throw new Error("Wipe failed midway. Please try again.");
    }
  },
};

export default invoiceService;
