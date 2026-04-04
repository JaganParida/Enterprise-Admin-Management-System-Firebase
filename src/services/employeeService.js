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
} from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const empCollection = collection(db, "employees");
const salaryCollection = collection(db, "salaryPayments");
const statsDocRef = doc(db, "systemStats", "employees");
const dailyLimitsRef = doc(db, "systemStats", "dailyLimits"); // 🚀 GLOBAL LIMIT TRACKER

const getLocalISTDate = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString();
};

// 🚀 GLOBAL ZERO-READ CACHE
let memoryCache = {
  stats: null,
  employees: null,
  empFiltersKey: "",
  salaryLogs: null,
  isDirty: true,
  lastFetchTime: 0,
};

const markDirty = () => {
  memoryCache.isDirty = true;
  localStorage.setItem("emp_last_update", Date.now().toString());
};

const silentCacheUpdate = (target, action, payloadObj) => {
  if (target === "EMPLOYEE" && memoryCache.employees) {
    if (action === "ADD") {
      memoryCache.employees.unshift(payloadObj);
      if (memoryCache.employees.length > 50) memoryCache.employees.pop();
    } else if (action === "EDIT") {
      const idx = memoryCache.employees.findIndex(
        (e) => e._id === payloadObj._id,
      );
      if (idx > -1)
        memoryCache.employees[idx] = {
          ...memoryCache.employees[idx],
          ...payloadObj,
        };
    } else if (action === "DELETE") {
      memoryCache.employees = memoryCache.employees.filter(
        (e) => e._id !== payloadObj._id,
      );
    }
  }

  if (target === "SALARY" && memoryCache.salaryLogs) {
    if (action === "ADD") {
      memoryCache.salaryLogs.unshift(payloadObj);
      if (memoryCache.salaryLogs.length > 50) memoryCache.salaryLogs.pop();
    }
  }

  memoryCache.lastFetchTime = Date.now();
  localStorage.setItem("emp_last_update", Date.now().toString());
};

// 🚀 HELPER: Check Global Limits to prevent multiple admins bypassing limits
const checkGlobalLimits = async (type, requestedAmount) => {
  const today = new Date().toISOString().split("T")[0];
  const snap = await getDoc(dailyLimitsRef);
  let data = snap.exists()
    ? snap.data()
    : { date: today, wipeCount: 0, backupCount: 0 };

  if (data.date !== today) {
    data = { date: today, wipeCount: 0, backupCount: 0 }; // Reset for new day
  }

  const currentCount = type === "WIPE" ? data.wipeCount : data.backupCount;
  // Limit Wipes to 5k (5k reads + 5k deletes) and Backups to 10k (10k reads) globally per day
  const maxAllowed = type === "WIPE" ? 5000 : 10000;

  if (currentCount + requestedAmount > maxAllowed) {
    throw new Error(
      `Global daily limit reached for ${type}. Try again tomorrow to protect Free Tier limits.`,
    );
  }

  return { today, currentCount, maxAllowed };
};

const updateGlobalLimits = async (type, amountAdded, today) => {
  const updatePayload = { date: today };
  if (type === "WIPE") updatePayload.wipeCount = increment(amountAdded);
  if (type === "BACKUP") updatePayload.backupCount = increment(amountAdded);
  await setDoc(dailyLimitsRef, updatePayload, { merge: true });
};

const employeeService = {
  getLastFetchTime: () => memoryCache.lastFetchTime,
  getCachedStats: () => (!memoryCache.isDirty ? memoryCache.stats : null),
  getCachedEmployees: (filters) => {
    const key = JSON.stringify(filters);
    if (
      !memoryCache.isDirty &&
      memoryCache.empFiltersKey === key &&
      memoryCache.employees
    )
      return memoryCache.employees;
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
    const filterKey = JSON.stringify(filters);
    const isLoadMore = !!lastVisibleDoc;

    if (
      !forceRefresh &&
      !memoryCache.isDirty &&
      !isLoadMore &&
      memoryCache.employees &&
      memoryCache.empFiltersKey === filterKey
    ) {
      return { data: memoryCache.employees, lastVisible: null };
    }

    let constraints = [];
    let hasInequality = false;

    if (filters.status && filters.status !== "All")
      constraints.push(where("status", "==", filters.status));
    if (filters.salary === "No Salary Taken")
      constraints.push(where("salaryTaken", "==", 0));

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      constraints.push(
        where("nameLower", ">=", searchLower),
        where("nameLower", "<=", searchLower + "\uf8ff"),
        orderBy("nameLower"),
      );
      hasInequality = true;
    } else if (
      filters.salary &&
      filters.salary !== "All" &&
      filters.salary !== "No Salary Taken" &&
      !hasInequality
    ) {
      if (filters.salary === "Under ₹10k")
        constraints.push(
          where("salaryTaken", ">", 0),
          where("salaryTaken", "<", 10000),
        );
      else if (filters.salary === "₹10k - ₹50k")
        constraints.push(
          where("salaryTaken", ">=", 10000),
          where("salaryTaken", "<=", 50000),
        );
      else if (filters.salary === "Over ₹50k")
        constraints.push(where("salaryTaken", ">", 50000));

      constraints.push(orderBy("salaryTaken", "desc"));
      hasInequality = true;
    }

    if (!hasInequality) constraints.push(orderBy("createdAt", "desc"));
    constraints.push(limit(limitCount));
    if (lastVisibleDoc) constraints.push(startAfter(lastVisibleDoc));

    try {
      const q = query(empCollection, ...constraints);
      let snapshot;

      // 🚀 AGGRESSIVE CACHE: Attempt cache first if fetched within last 5 mins and not forcing
      const timeSinceFetch = Date.now() - memoryCache.lastFetchTime;
      if (!forceRefresh && timeSinceFetch < 300000) {
        try {
          snapshot = await getDocsFromCache(q);
          if (snapshot.empty && !isLoadMore) throw new Error("Cache Empty");
        } catch (err) {
          snapshot = await getDocsFromServer(q); // Fallback to server
        }
      } else {
        snapshot = await getDocsFromServer(q);
      }

      const data = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
      const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

      if (!isLoadMore) {
        memoryCache.employees = data;
        memoryCache.empFiltersKey = filterKey;
        memoryCache.isDirty = false;
        memoryCache.lastFetchTime = Date.now();
      }

      return { data, lastVisible: newLastVisible };
    } catch (error) {
      throw error;
    }
  },

  getDynamicViewStats: async (filters = {}) => {
    let constraints = [];
    if (filters.status && filters.status !== "All")
      constraints.push(where("status", "==", filters.status));
    if (filters.salary === "No Salary Taken")
      constraints.push(where("salaryTaken", "==", 0));

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      constraints.push(
        where("nameLower", ">=", searchLower),
        where("nameLower", "<=", searchLower + "\uf8ff"),
      );
    }

    try {
      const q = query(empCollection, ...constraints);
      const snapshot = await getAggregateFromServer(q, {
        totalRecords: count(),
        totalBaseSalary: sum("initialSalary"),
        totalSalaryTaken: sum("salaryTaken"),
      });

      return {
        count: snapshot.data().totalRecords,
        baseSalarySum: snapshot.data().totalBaseSalary,
        salaryTakenSum: snapshot.data().totalSalaryTaken,
      };
    } catch (error) {
      // 🚀 RISK ELIMINATED: No more manual getDocs() fallback.
      // If aggregation fails, return null. Safe & Zero Reads.
      console.warn(
        "Aggregation failed. Safe mode: Returning null to protect read quota.",
      );
      return null;
    }
  },

  addEmployee: async (employeeData, user) => {
    const payload = {
      ...employeeData,
      nameLower: employeeData.name ? employeeData.name.toLowerCase() : "",
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
    currentHistory.push(currentEdit);
    if (currentHistory.length > 2) currentHistory = currentHistory.slice(-2);

    const payload = {
      ...updateData,
      nameLower: updateData.name ? updateData.name.toLowerCase() : "",
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
    } catch (error) {
      throw new Error("Incorrect Admin Password.");
    }

    // 🚀 GLOBAL LIMIT CHECK (Max 5000 wipes per day globally to save 10k ops)
    const { today, currentCount, maxAllowed } = await checkGlobalLimits(
      "WIPE",
      500,
    );

    let totalDeleted = 0;
    let hasMore = true;
    const remainingQuota = maxAllowed - currentCount;

    while (hasMore && totalDeleted < remainingQuota) {
      const q = query(
        empCollection,
        limit(Math.min(500, remainingQuota - totalDeleted)),
      );
      const snapshot = await getDocsFromServer(q); // Force server to ensure exact sync
      if (snapshot.empty) break;

      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      totalDeleted += snapshot.size;
    }

    await updateGlobalLimits("WIPE", totalDeleted, today);
    markDirty();

    if (totalDeleted === 0)
      return { isPartial: false, message: "Database is already empty." };

    if (totalDeleted >= remainingQuota && hasMore) {
      return {
        isPartial: true,
        message: `Global Free Tier limit reached. ${totalDeleted} deleted. Remaining ops locked until tomorrow.`,
      };
    }

    await setDoc(statsDocRef, { totalCount: 0 });
    return {
      isPartial: false,
      message: `Wiped ${totalDeleted} Employee records successfully!`,
    };
  },

  getBackupChunk: async (monthToFetch, limitCount, lastDocId = null) => {
    // 🚀 GLOBAL LIMIT CHECK for Backups
    const { today, currentCount, maxAllowed } = await checkGlobalLimits(
      "BACKUP",
      limitCount,
    );

    // Adjust requested limit if approaching daily quota
    const safeLimitCount = Math.min(limitCount, maxAllowed - currentCount);
    if (safeLimitCount <= 0)
      throw new Error("Global 10k backup limit reached for today.");

    let constraints = [
      where("createdAt", ">=", `${monthToFetch}-01`),
      where("createdAt", "<=", `${monthToFetch}-31T23:59:59.999Z`),
      orderBy("createdAt", "asc"),
      limit(safeLimitCount),
    ];

    if (lastDocId) {
      try {
        const docRef = doc(db, "employees", lastDocId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) constraints.push(startAfter(docSnap));
      } catch (err) {
        console.warn("Failed to resume from last document.");
      }
    }

    const q = query(empCollection, ...constraints);
    const snapshot = await getDocsFromServer(q);
    const data = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));

    // Record usage globally
    if (data.length > 0) {
      await updateGlobalLimits("BACKUP", data.length, today);
    }

    return {
      data,
      lastDocId: snapshot.docs[snapshot.docs.length - 1]?.id || null,
      wasLimited: safeLimitCount < limitCount,
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

    if (paymentData.employeeId && memoryCache.employees) {
      const targetEmp = memoryCache.employees.find(
        (e) => e._id === paymentData.employeeId,
      );
      if (targetEmp)
        silentCacheUpdate("EMPLOYEE", "EDIT", {
          ...targetEmp,
          salaryTaken: targetEmp.salaryTaken + Number(paymentData.amount),
        });
    }
    return { data: newObj };
  },

  getSalaryHistory: async (
    lastVisibleDoc = null,
    limitCount = 50,
    forceRefresh = false,
  ) => {
    const isLoadMore = !!lastVisibleDoc;
    if (
      !forceRefresh &&
      !memoryCache.isDirty &&
      !isLoadMore &&
      memoryCache.salaryLogs
    ) {
      return { data: memoryCache.salaryLogs, lastVisible: null };
    }

    let constraints = [orderBy("date", "desc"), limit(limitCount)];
    if (lastVisibleDoc) constraints.push(startAfter(lastVisibleDoc));

    const q = query(salaryCollection, ...constraints);
    const salarySnap = await getDocs(q);
    const data = salarySnap.docs.map((doc) => {
      const payment = doc.data();
      return {
        _id: doc.id,
        ...payment,
        employee: {
          name: payment.employeeName || "Legacy",
          position: payment.employeePosition || "-",
        },
      };
    });

    const newLastVisible = salarySnap.docs[salarySnap.docs.length - 1] || null;
    if (!isLoadMore) memoryCache.salaryLogs = data;

    return { data, lastVisible: newLastVisible };
  },
};

export default employeeService;
