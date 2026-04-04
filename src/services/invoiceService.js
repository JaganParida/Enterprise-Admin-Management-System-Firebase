import { db, auth } from "../config/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
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
  count,
} from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const invCollection = collection(db, "invoices");

const getLocalISTDate = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString();
};

const getHistoryFromSnap = (snapshot, user) => {
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
  if (currentHistory.length > 2) {
    currentHistory = currentHistory.slice(currentHistory.length - 2);
  }
  return { currentEdit, currentHistory };
};

const invoiceService = {
  // GLOBAL MEMORY CACHE
  cache: {
    data: [],
    stats: null,
    lastDoc: null,
    hasMore: false,
    filters: null,
    isDirty: true,
  },

  markDirty: function () {
    this.cache.isDirty = true;
  },

  clearCache: function () {
    this.markDirty();
  },

  // 🚀 THE ULTIMATE ZERO-READ ATOMIC BUNCHER 🚀
  getInvoiceStats: async () => {
    try {
      const statsRef = doc(db, "metadata", "invoiceStats");
      const statsDoc = await getDoc(statsRef);

      // If Atomic Document exists, return it instantly (Cost: Exactly 1 Read)
      if (statsDoc.exists() && statsDoc.data().isSynced) {
        return statsDoc.data();
      }

      // --- AGGREGATION SYNC ENGINE (RISK-FREE) ---
      // Even if you have 1 Million records, this will cost EXACTLY 4 reads.
      console.log("Running Ultra-Optimized Aggregation Sync...");

      const qTotal = query(invCollection);
      const qPaid = query(invCollection, where("status", "==", "Paid"));
      const qPending = query(invCollection, where("status", "==", "Pending"));
      const qCancelled = query(
        invCollection,
        where("status", "==", "Cancelled"),
      );

      // Run aggregations in parallel for speed
      const [aggTotal, aggPaid, aggPending, aggCancelled] = await Promise.all([
        getAggregateFromServer(qTotal, { c: count(), s: sum("grandTotal") }),
        getAggregateFromServer(qPaid, { c: count(), s: sum("grandTotal") }),
        getAggregateFromServer(qPending, { c: count(), s: sum("grandTotal") }),
        getAggregateFromServer(qCancelled, {
          c: count(),
          s: sum("grandTotal"),
        }),
      ]);

      let stats = {
        total: { amt: aggTotal.data().s || 0, count: aggTotal.data().c || 0 },
        paid: { amt: aggPaid.data().s || 0, count: aggPaid.data().c || 0 },
        pending: {
          amt: aggPending.data().s || 0,
          count: aggPending.data().c || 0,
        },
        cancelled: {
          amt: aggCancelled.data().s || 0,
          count: aggCancelled.data().c || 0,
        },
        isSynced: true,
      };

      await setDoc(statsRef, stats);
      return stats;
    } catch (error) {
      console.error("Atomic Stats read failed", error);
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
        const lowerCase = searchStr.toLowerCase();
        constraints.push(where("clientNameLower", ">=", lowerCase));
        constraints.push(where("clientNameLower", "<=", lowerCase + "\uf8ff"));
      }

      const q = query(invCollection, ...constraints, limit(50));
      try {
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          _id: doc.id,
          ...doc.data(),
        }));
        invoiceService.cache.isDirty = false;
        return {
          data,
          lastVisible: snapshot.docs[snapshot.docs.length - 1] || null,
        };
      } catch (error) {
        throw error;
      }
    }

    if (filters.amount && filters.amount !== "All") {
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

    if (!hasInequality && !filters.exactDate)
      constraints.push(orderBy("createdAt", "desc"));
    constraints.push(limit(50));
    if (lastDoc) constraints.push(startAfter(lastDoc));

    try {
      const q = query(invCollection, ...constraints);
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      invoiceService.cache.isDirty = false;
      return { data, lastVisible };
    } catch (error) {
      throw error;
    }
  },

  createInvoice: async (invoiceData, user) => {
    const payload = {
      ...invoiceData,
      clientNameLower: invoiceData.client.name.toLowerCase(),
      createdAt: getLocalISTDate(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
    };

    // ATOMIC BATCH WRITE
    const batch = writeBatch(db);
    const newDocRef = doc(invCollection);
    batch.set(newDocRef, payload);

    const amt = Number(payload.grandTotal) || 0;
    const statusKey = (payload.status || "Pending").toLowerCase();

    // Auto-update the 1-Read Document
    batch.set(
      doc(db, "metadata", "invoiceStats"),
      {
        total: { amt: increment(amt), count: increment(1) },
        [statusKey]: { amt: increment(amt), count: increment(1) },
      },
      { merge: true },
    );

    await batch.commit();

    const newInv = { _id: newDocRef.id, ...payload };

    if (
      !invoiceService.cache.isDirty &&
      Array.isArray(invoiceService.cache.data)
    ) {
      invoiceService.cache.data.unshift(newInv);
      if (invoiceService.cache.stats) {
        invoiceService.cache.stats.total.amt += amt;
        invoiceService.cache.stats.total.count += 1;
        if (invoiceService.cache.stats[statusKey]) {
          invoiceService.cache.stats[statusKey].amt += amt;
          invoiceService.cache.stats[statusKey].count += 1;
        }
      }
    }
    return { data: newInv };
  },

  getInvoiceById: async (id) => {
    const snapshot = await getDoc(doc(db, "invoices", id));
    if (snapshot.exists())
      return { data: { _id: snapshot.id, ...snapshot.data() } };
    throw new Error("Invoice not found");
  },

  updateInvoice: async (id, invoiceData, user) => {
    const oldSnap = await getDoc(doc(db, "invoices", id));
    if (!oldSnap.exists()) throw new Error("Invoice not found");

    const oldData = oldSnap.data();
    const oldAmt = Number(oldData.grandTotal) || 0;
    const oldStatus = (oldData.status || "Pending").toLowerCase();

    const newAmt = Number(invoiceData.grandTotal) || 0;
    const newStatus = (invoiceData.status || "Pending").toLowerCase();

    const { currentEdit, currentHistory } = getHistoryFromSnap(oldSnap, user);

    // ATOMIC BATCH WRITE
    const batch = writeBatch(db);
    batch.update(doc(db, "invoices", id), {
      ...invoiceData,
      clientNameLower: invoiceData.client.name.toLowerCase(),
      lastEditedBy: currentEdit.by,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    });

    const statsRef = doc(db, "metadata", "invoiceStats");

    // Recalculate Atomic Adjustments Dynamically
    if (oldStatus === newStatus) {
      const diff = newAmt - oldAmt;
      if (diff !== 0) {
        batch.set(
          statsRef,
          {
            total: { amt: increment(diff) },
            [newStatus]: { amt: increment(diff) },
          },
          { merge: true },
        );
      }
    } else {
      batch.set(
        statsRef,
        {
          total: { amt: increment(newAmt - oldAmt) },
          [oldStatus]: { amt: increment(-oldAmt), count: increment(-1) },
          [newStatus]: { amt: increment(newAmt), count: increment(1) },
        },
        { merge: true },
      );
    }

    await batch.commit();

    if (
      !invoiceService.cache.isDirty &&
      Array.isArray(invoiceService.cache.data)
    ) {
      const idx = invoiceService.cache.data.findIndex((i) => i._id === id);
      if (idx !== -1) {
        invoiceService.cache.data[idx] = {
          ...oldData,
          ...invoiceData,
          editHistory: currentHistory,
          lastEditedAt: currentEdit.at,
        };

        if (invoiceService.cache.stats) {
          invoiceService.cache.stats.total.amt = Math.max(
            0,
            invoiceService.cache.stats.total.amt - oldAmt + newAmt,
          );
          if (invoiceService.cache.stats[oldStatus]) {
            invoiceService.cache.stats[oldStatus].amt = Math.max(
              0,
              invoiceService.cache.stats[oldStatus].amt - oldAmt,
            );
            invoiceService.cache.stats[oldStatus].count = Math.max(
              0,
              invoiceService.cache.stats[oldStatus].count - 1,
            );
          }
          if (invoiceService.cache.stats[newStatus]) {
            invoiceService.cache.stats[newStatus].amt += newAmt;
            invoiceService.cache.stats[newStatus].count += 1;
          }
        }
      }
    }
    return { message: "Updated" };
  },

  updateStatus: async (id, newStatus, user) => {
    const oldSnap = await getDoc(doc(db, "invoices", id));
    if (!oldSnap.exists()) return;

    const oldData = oldSnap.data();
    const amt = Number(oldData.grandTotal) || 0;
    const oldStatus = (oldData.status || "Pending").toLowerCase();
    const targetStatus = newStatus.toLowerCase();

    if (oldStatus === targetStatus) return { message: "Status unchanged" };

    const { currentEdit, currentHistory } = getHistoryFromSnap(oldSnap, user);

    // ATOMIC BATCH WRITE
    const batch = writeBatch(db);
    batch.update(doc(db, "invoices", id), {
      status: newStatus,
      lastEditedBy: currentEdit.by,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    });

    batch.set(
      doc(db, "metadata", "invoiceStats"),
      {
        [oldStatus]: { amt: increment(-amt), count: increment(-1) },
        [targetStatus]: { amt: increment(amt), count: increment(1) },
      },
      { merge: true },
    );

    await batch.commit();
    return { message: "Status updated" };
  },

  deleteInvoice: async (id, user) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager") throw new Error("Action Denied.");

    const oldSnap = await getDoc(doc(db, "invoices", id));
    if (!oldSnap.exists()) return;

    const amt = Number(oldSnap.data().grandTotal) || 0;
    const statusKey = (oldSnap.data().status || "Pending").toLowerCase();

    // ATOMIC BATCH WRITE
    const batch = writeBatch(db);
    batch.delete(doc(db, "invoices", id));

    batch.set(
      doc(db, "metadata", "invoiceStats"),
      {
        total: { amt: increment(-amt), count: increment(-1) },
        [statusKey]: { amt: increment(-amt), count: increment(-1) },
      },
      { merge: true },
    );

    await batch.commit();
  },

  // ⚠️ SAFE GUARD ADDED: Max 2,500 records per chunk for Export
  getFullBackupByMonth: async (monthToFetch) => {
    const startDate = `${monthToFetch}-01`;
    const endDate = `${monthToFetch}-31`;
    let allData = [];
    let lastVisible = null;
    let fetchedCount = 0;
    const SAFE_BACKUP_LIMIT = 2500; // REDUCED FROM 10,000 to save Quota
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

  // ⚠️ SAFE GUARD ADDED: Max 2,500 records per day for Wipe
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
    const SAFE_DAILY_LIMIT = 2500; // REDUCED FROM 10,000 to save Quota

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
        localStorage.removeItem("wipe_lock");

        // RESET THE ATOMIC BUNCHER TO 0
        await setDoc(doc(db, "metadata", "invoiceStats"), {
          total: { amt: 0, count: 0 },
          paid: { amt: 0, count: 0 },
          pending: { amt: 0, count: 0 },
          cancelled: { amt: 0, count: 0 },
          isSynced: true,
        });

        return {
          success: true,
          isPartial: false,
          message: "All Invoices cleared successfully!",
        };
      } else {
        localStorage.setItem("wipe_lock", Date.now().toString());
        return {
          success: true,
          isPartial: true,
          message: `⚠️ 2,500 Daily Safe Limit Reached. Action locked for 24 hours to prevent Firebase quota exhaustion.`,
        };
      }
    } catch (error) {
      throw new Error("Wipe failed midway. Please try again.");
    }
  },
};

export default invoiceService;
