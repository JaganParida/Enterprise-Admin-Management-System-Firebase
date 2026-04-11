import { db, auth } from "../config/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  where,
  startAfter,
  writeBatch,
  increment,
  setDoc,
  getAggregateFromServer,
  sum,
  count,
  getDocsFromCache,
  getDocsFromServer,
  runTransaction,
} from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const empCollection = collection(db, "employees");
const salaryCollection = collection(db, "salaryPayments");
const statsDocRef = doc(db, "systemStats", "employees");
const dailyLimitsRef = doc(db, "systemStats", "dailyLimits");

// L1 Cache: In-Memory
let memoryCache = {
  queries: {},
  salaryLogs: null,
  isDirty: true,
  lastFetchTime: 0,
};

const markDirty = () => {
  memoryCache.isDirty = true;
  localStorage.setItem("emp_last_update", Date.now().toString());
};

const buildCacheKey = (filters = {}) => {
  return JSON.stringify({
    salary: filters.salary ?? "All",
    search: (filters.search ?? "").trim().toLowerCase(),
    status: filters.status ?? "All",
  });
};

const silentCacheUpdate = (target, action, payloadObj) => {
  if (target === "EMPLOYEE") {
    const next = {};
    Object.keys(memoryCache.queries).forEach((key) => {
      const list = memoryCache.queries[key];
      if (action === "ADD") {
        const updated = [payloadObj, ...list];
        next[key] = updated.length > 50 ? updated.slice(0, 50) : updated;
      } else if (action === "EDIT") {
        next[key] = list.map((e) =>
          e._id === payloadObj._id ? { ...e, ...payloadObj } : e,
        );
      } else if (action === "DELETE") {
        next[key] = list.filter((e) => e._id !== payloadObj._id);
      }
    });
    memoryCache.queries = next;
  }

  if (target === "SALARY" && memoryCache.salaryLogs) {
    if (action === "ADD") {
      memoryCache.salaryLogs = [payloadObj, ...memoryCache.salaryLogs].slice(
        0,
        50,
      );
    }
  }

  memoryCache.lastFetchTime = Date.now();
  localStorage.setItem("emp_last_update", Date.now().toString());
};

const getLocalISTDate = () => {
  const date = new Date();
  return new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  ).toISOString();
};

const getMonthDateRange = (monthStr) => {
  const [year, month] = monthStr.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const pad = (n) => String(n).padStart(2, "0");
  return {
    start: `${monthStr}-01T00:00:00.000Z`,
    end: `${monthStr}-${pad(lastDay)}T23:59:59.999Z`,
  };
};

// STRICT QUOTA ENFORCER: 2500 per day limit
const checkAndReserveQuota = async (type, requestedAmount) => {
  const today = new Date().toISOString().split("T")[0];
  const maxAllowed = 2500; // Hard Limit Enforced
  let reserved = 0;

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(dailyLimitsRef);
    const data = snap.exists() ? snap.data() : {};
    const storedDate = data.date || "";

    const wipeCount = storedDate === today ? data.wipeCount || 0 : 0;
    const backupCount = storedDate === today ? data.backupCount || 0 : 0;

    const currentCount = type === "WIPE" ? wipeCount : backupCount;
    const available = maxAllowed - currentCount;

    if (available <= 0) {
      throw new Error(
        `Daily ${type === "WIPE" ? "wipe" : "backup"} limit of ${maxAllowed.toLocaleString()} reached. System locked for 24 hours.`,
      );
    }

    reserved = Math.min(requestedAmount, available);

    const update = { date: today };
    if (type === "WIPE") update.wipeCount = currentCount + reserved;
    if (type === "BACKUP") update.backupCount = currentCount + reserved;

    transaction.set(dailyLimitsRef, update, { merge: true });
  });

  return { reserved, today };
};

export const validateFilters = (filters) => {
  const hasSearch = !!(filters.search && filters.search.trim());
  const hasSalaryRange =
    filters.salary &&
    filters.salary !== "All" &&
    filters.salary !== "No Salary Taken";
  const hasNoSalary = filters.salary === "No Salary Taken";

  if (hasSearch && hasSalaryRange)
    return {
      valid: false,
      reason: "Name search and salary range cannot be used together.",
    };
  if (hasSearch && hasNoSalary)
    return {
      valid: false,
      reason: "Name search and 'Unpaid' filter cannot be used together.",
    };
  return { valid: true, reason: "" };
};

const employeeService = {
  getLastFetchTime: () => memoryCache.lastFetchTime,

  getCachedEmployees: (filters) => {
    const key = buildCacheKey(filters);
    if (!memoryCache.isDirty && memoryCache.queries[key]) {
      return memoryCache.queries[key];
    }
    return null;
  },

  getCachedSalaryLogs: () =>
    !memoryCache.isDirty ? memoryCache.salaryLogs : null,

  getAllEmployees: async (
    filters = {},
    lastVisibleDoc = null,
    limitCount = 50,
    forceRefresh = false,
  ) => {
    const filterKey = buildCacheKey(filters);
    const isLoadMore = !!lastVisibleDoc;

    if (
      !forceRefresh &&
      !memoryCache.isDirty &&
      !isLoadMore &&
      memoryCache.queries[filterKey]
    ) {
      return { data: memoryCache.queries[filterKey], lastVisible: null };
    }

    const validation = validateFilters(filters);
    if (!validation.valid) return { data: [], lastVisible: null };

    const normalizedSearch = (filters.search || "").trim().toLowerCase();
    let constraints = [];
    let hasInequality = false;

    if (filters.status && filters.status !== "All") {
      constraints.push(where("status", "==", filters.status));
    }

    if (filters.salary === "No Salary Taken") {
      constraints.push(where("salaryTaken", "in", [0, "0", ""]));
    } else if (normalizedSearch) {
      constraints.push(
        where("nameLower", ">=", normalizedSearch),
        where("nameLower", "<=", normalizedSearch + "\uf8ff"),
        orderBy("nameLower"),
      );
      hasInequality = true;
    } else if (filters.salary && filters.salary !== "All") {
      if (filters.salary === "Under ₹10k") {
        constraints.push(
          where("salaryTaken", ">", 0),
          where("salaryTaken", "<", 10000),
        );
      } else if (filters.salary === "₹10k - ₹50k") {
        constraints.push(
          where("salaryTaken", ">=", 10000),
          where("salaryTaken", "<=", 50000),
        );
      } else if (filters.salary === "Over ₹50k") {
        constraints.push(where("salaryTaken", ">", 50000));
      }
      constraints.push(orderBy("salaryTaken", "desc"));
      hasInequality = true;
    }

    if (!hasInequality && filters.salary !== "No Salary Taken") {
      constraints.push(orderBy("createdAt", "desc"));
    }

    constraints.push(limit(limitCount));
    if (lastVisibleDoc) constraints.push(startAfter(lastVisibleDoc));

    try {
      const q = query(empCollection, ...constraints);
      let snapshot;

      // Prefer Cache Over Network Logic
      const timeSinceFetch = Date.now() - memoryCache.lastFetchTime;
      if (!forceRefresh && timeSinceFetch < 300000) {
        try {
          snapshot = await getDocsFromCache(q);
          if (snapshot.empty && !isLoadMore) throw new Error("Cache empty");
        } catch {
          snapshot = await getDocsFromServer(q);
        }
      } else {
        snapshot = await getDocsFromServer(q);
      }

      let data = snapshot.docs.map((d) => ({ _id: d.id, ...d.data() }));
      const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

      if (!isLoadMore) {
        memoryCache.queries[filterKey] = data;
        memoryCache.isDirty = false;
        memoryCache.lastFetchTime = Date.now();
      }

      return { data, lastVisible: newLastVisible };
    } catch (error) {
      throw error;
    }
  },

  getDynamicViewStats: async (filters = {}) => {
    const validation = validateFilters(filters);
    if (!validation.valid) return null;

    const normalizedSearch = (filters.search || "").trim().toLowerCase();
    let constraints = [];

    if (filters.status && filters.status !== "All") {
      constraints.push(where("status", "==", filters.status));
    }
    if (filters.salary === "No Salary Taken") {
      constraints.push(where("salaryTaken", "in", [0, "0", ""]));
    } else if (normalizedSearch) {
      constraints.push(
        where("nameLower", ">=", normalizedSearch),
        where("nameLower", "<=", normalizedSearch + "\uf8ff"),
      );
    } else if (filters.salary && filters.salary !== "All") {
      if (filters.salary === "Under ₹10k") {
        constraints.push(
          where("salaryTaken", ">", 0),
          where("salaryTaken", "<", 10000),
        );
      } else if (filters.salary === "₹10k - ₹50k") {
        constraints.push(
          where("salaryTaken", ">=", 10000),
          where("salaryTaken", "<=", 50000),
        );
      } else if (filters.salary === "Over ₹50k") {
        constraints.push(where("salaryTaken", ">", 50000));
      }
    }

    try {
      const q = query(empCollection, ...constraints);
      const snap = await getAggregateFromServer(q, {
        totalRecords: count(),
        totalBaseSalary: sum("initialSalary"),
        totalSalaryTaken: sum("salaryTaken"),
      });
      const d = snap.data();

      return {
        count: d.totalRecords,
        baseSalarySum: d.totalBaseSalary,
        salaryTakenSum: d.totalSalaryTaken,
        isFallback: false,
      };
    } catch {
      return null; // Strict aggregation ONLY. Removed fallback to getDocs.
    }
  },

  addEmployee: async (employeeData, user) => {
    const payload = {
      ...employeeData,
      nameLower: (employeeData.name || "").toLowerCase(),
      initialSalary: Number(employeeData.initialSalary || 0),
      salaryTaken: Number(employeeData.salaryTaken || 0),
      status: "Active",
      createdAt: getLocalISTDate(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
      editHistory: [],
    };

    const batch = writeBatch(db);
    const newEmpRef = doc(empCollection);
    batch.set(newEmpRef, payload);
    batch.set(statsDocRef, { totalCount: increment(1) }, { merge: true });
    await batch.commit();

    const newObj = { _id: newEmpRef.id, ...payload };
    silentCacheUpdate("EMPLOYEE", "ADD", newObj);
    return { data: newObj };
  },

  getEmployeeById: async (id) => {
    const docRef = doc(db, "employees", id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists())
      return { data: { _id: snapshot.id, ...snapshot.data() } };
    throw new Error("Employee not found");
  },

  updateEmployee: async (id, updateData, user) => {
    const docRef = doc(db, "employees", id);
    const snapshot = await getDoc(docRef);
    let currentHistory =
      snapshot.exists() && snapshot.data().editHistory
        ? snapshot.data().editHistory
        : [];

    const currentEdit = {
      by: user?.email || "Unknown",
      role: user?.role || "Admin",
      at: getLocalISTDate(),
    };

    // Strict requirement: Max 2 history items
    currentHistory = [...currentHistory, currentEdit].slice(-2);

    const payload = {
      ...updateData,
      nameLower: (updateData.name || "").toLowerCase(),
      initialSalary: Number(updateData.initialSalary || 0),
      salaryTaken: Number(updateData.salaryTaken || 0),
      lastEditedBy: currentEdit.by,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };

    await updateDoc(docRef, payload);
    silentCacheUpdate("EMPLOYEE", "EDIT", { _id: id, ...payload });
    return { message: "Updated successfully" };
  },

  deleteEmployee: async (id, user) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager") throw new Error("Action Denied.");

    const batch = writeBatch(db);
    batch.delete(doc(db, "employees", id));
    batch.set(statsDocRef, { totalCount: increment(-1) }, { merge: true });
    await batch.commit();

    silentCacheUpdate("EMPLOYEE", "DELETE", { _id: id });
    return { message: "Removed successfully" };
  },

  deleteAllEmployees: async ({ password, email, user }) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager") throw new Error("Action Denied.");

    const currentUser = auth.currentUser;
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        password,
      );
      await reauthenticateWithCredential(currentUser, credential);
    } catch {
      throw new Error("Incorrect Admin Password.");
    }

    const { reserved } = await checkAndReserveQuota("WIPE", 2500);
    if (reserved === 0)
      throw new Error(
        "Daily wipe limit of 2,500 records already reached. System locked for 24 hours.",
      );

    let totalDeleted = 0;
    while (totalDeleted < reserved) {
      const chunkSize = Math.min(500, reserved - totalDeleted); // Max batch size 500
      const q = query(empCollection, limit(chunkSize));
      const snapshot = await getDocsFromServer(q);

      if (snapshot.empty) break;

      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      totalDeleted += snapshot.size;

      if (snapshot.size < chunkSize) break;
    }

    markDirty();

    if (totalDeleted === 0)
      return { isPartial: false, message: "Database is already empty." };
    if (totalDeleted >= reserved && reserved < 2500) {
      return {
        isPartial: true,
        message: `Wiped ${totalDeleted.toLocaleString()} records. Daily limit reached — locked for 24 hours.`,
      };
    }

    await setDoc(statsDocRef, { totalCount: 0 });
    return {
      isPartial: false,
      message: `Wiped ${totalDeleted.toLocaleString()} employee records successfully!`,
    };
  },

  getBackupChunk: async (monthToFetch, limitCount, lastDocId = null) => {
    const safeLimit = Math.min(limitCount, 2500);
    const { reserved } = await checkAndReserveQuota("BACKUP", safeLimit);

    if (reserved === 0)
      throw new Error(
        "Daily backup limit of 2,500 records reached. Locked for 24 hours.",
      );

    const { start, end } = getMonthDateRange(monthToFetch);

    let constraints = [
      where("createdAt", ">=", start),
      where("createdAt", "<=", end),
      orderBy("createdAt", "asc"),
      limit(reserved),
    ];

    if (lastDocId) {
      try {
        const docRef = doc(db, "employees", lastDocId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) constraints.push(startAfter(docSnap));
      } catch {
        console.warn("Backup resume pointer invalid.");
      }
    }

    const q = query(empCollection, ...constraints);
    const snapshot = await getDocsFromServer(q);
    const data = snapshot.docs.map((d) => ({ _id: d.id, ...d.data() }));

    return {
      data,
      lastDocId: snapshot.docs[snapshot.docs.length - 1]?.id || null,
      wasLimited: reserved < safeLimit,
      remainingHint: reserved - data.length,
    };
  },

  addSalaryPayment: async (paymentData, user) => {
    const payload = {
      ...paymentData,
      amount: Number(paymentData.amount),
      createdAt: getLocalISTDate(),
      recordedBy: user?.email || "Unknown",
      recordedRole: user?.role || "Admin",
    };

    const batch = writeBatch(db);
    const newSalaryRef = doc(salaryCollection);
    batch.set(newSalaryRef, payload);

    if (paymentData.employeeId) {
      const empRef = doc(db, "employees", paymentData.employeeId);
      batch.update(empRef, {
        salaryTaken: increment(Number(paymentData.amount)),
      });
    }

    await batch.commit();
    const newObj = { _id: newSalaryRef.id, ...payload };

    silentCacheUpdate("SALARY", "ADD", {
      ...newObj,
      employee: {
        name: payload.employeeName,
        position: payload.employeePosition,
      },
    });

    if (paymentData.employeeId) {
      const nextQueries = {};
      Object.keys(memoryCache.queries).forEach((key) => {
        nextQueries[key] = memoryCache.queries[key].map((emp) =>
          emp._id === paymentData.employeeId
            ? {
                ...emp,
                salaryTaken:
                  Number(emp.salaryTaken || 0) + Number(paymentData.amount),
              }
            : emp,
        );
      });
      memoryCache.queries = nextQueries;
    }

    return { data: newObj };
  },

  getSalaryHistory: async (lastVisibleDoc = null, limitCount = 50) => {
    const isLoadMore = !!lastVisibleDoc;
    if (!memoryCache.isDirty && !isLoadMore && memoryCache.salaryLogs) {
      return { data: memoryCache.salaryLogs, lastVisible: null };
    }

    let constraints = [orderBy("date", "desc"), limit(limitCount)];
    if (lastVisibleDoc) constraints.push(startAfter(lastVisibleDoc));

    const q = query(salaryCollection, ...constraints);
    const snap = await getDocs(q);

    const data = snap.docs.map((d) => {
      const payment = d.data();
      return {
        _id: d.id,
        ...payment,
        employee: {
          name: payment.employeeName || "Legacy",
          position: payment.employeePosition || "-",
        },
      };
    });

    const newLastVisible = snap.docs[snap.docs.length - 1] || null;
    if (!isLoadMore) memoryCache.salaryLogs = data;

    return { data, lastVisible: newLastVisible };
  },
};

export default employeeService;
