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
  increment,
  setDoc,
  getAggregateFromServer,
  sum,
  count,
} from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const empCollection = collection(db, "employees");
const salaryCollection = collection(db, "salaryPayments");
const statsDocRef = doc(db, "systemStats", "employees");

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

// 🚀 OPTIMIZATION: Silently Mutate Memory Cache (Optimistic UI)
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
      const snapshot = await getDocs(q);
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
    } else if (
      filters.salary &&
      filters.salary !== "All" &&
      filters.salary !== "No Salary Taken"
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
      console.warn(
        "Dynamic Aggregation failed, falling back to manual calc:",
        error,
      );
      try {
        const q = query(empCollection, ...constraints);
        const fallbackSnap = await getDocs(q);
        let baseSalarySum = 0;
        let salaryTakenSum = 0;

        fallbackSnap.forEach((doc) => {
          const d = doc.data();
          baseSalarySum += Number(d.initialSalary || 0);
          salaryTakenSum += Number(d.salaryTaken || 0);
        });

        return { count: fallbackSnap.size, baseSalarySum, salaryTakenSum };
      } catch (fallbackErr) {
        console.error("Fallback failed:", fallbackErr);
        return null;
      }
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
    if (userRole === "manager")
      throw new Error("Action Denied: Managers cannot delete records.");

    const batch = writeBatch(db);
    batch.delete(doc(db, "employees", id));
    batch.set(statsDocRef, { totalCount: increment(-1) }, { merge: true });

    await batch.commit();
    silentCacheUpdate("EMPLOYEE", "DELETE", { _id: id });
    return { message: "Removed successfully" };
  },

  deleteAllEmployees: async ({ password, email, user }) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager")
      throw new Error("Action Denied: Only Admins can wipe the database.");

    const today = new Date().toISOString().split("T")[0];
    let wipeMeta = JSON.parse(
      localStorage.getItem("emp_wipe_meta") || '{"date":"","count":0}',
    );

    if (wipeMeta.date === today && wipeMeta.count >= 10000) {
      throw new Error(
        "Daily Wipe Limit Reached (10,000 records). Action locked for 24 hours.",
      );
    }
    if (wipeMeta.date !== today) wipeMeta = { date: today, count: 0 };

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

    let totalDeleted = 0,
      hasMore = true;
    const maxAllowed = 10000 - wipeMeta.count;

    while (hasMore && totalDeleted < maxAllowed) {
      const q = query(
        empCollection,
        limit(Math.min(500, maxAllowed - totalDeleted)),
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) break;

      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      totalDeleted += snapshot.size;
    }

    wipeMeta.count += totalDeleted;
    localStorage.setItem("emp_wipe_meta", JSON.stringify(wipeMeta));
    markDirty();

    if (totalDeleted >= maxAllowed && hasMore) {
      return {
        isPartial: true,
        message: "10,000 limit reached. Come back tomorrow for remaining.",
      };
    }

    await setDoc(statsDocRef, { totalCount: 0 });
    return {
      isPartial: false,
      message: "All Employee records cleared successfully!",
    };
  },

  // 🚀 CONCEPT 6 FIX: Applied strict Date Filtering and StartAfter pagination retrieval
  getBackupChunk: async (monthToFetch, limitCount, lastDocId = null) => {
    let constraints = [
      where("createdAt", ">=", `${monthToFetch}-01`),
      where("createdAt", "<=", `${monthToFetch}-31T23:59:59.999Z`),
      orderBy("createdAt", "asc"),
      limit(limitCount),
    ];

    // Restore memory state if resuming from 10k limit drop-off
    if (lastDocId) {
      try {
        const docRef = doc(db, "employees", lastDocId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          constraints.push(startAfter(docSnap));
        }
      } catch (err) {
        console.warn(
          "Failed to resume from last document, starting from beginning of chunk.",
          err,
        );
      }
    }

    const q = query(empCollection, ...constraints);
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));

    return {
      data,
      lastDocId: snapshot.docs[snapshot.docs.length - 1]?.id || null,
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
      if (targetEmp) {
        silentCacheUpdate("EMPLOYEE", "EDIT", {
          ...targetEmp,
          salaryTaken: targetEmp.salaryTaken + Number(paymentData.amount),
        });
      }
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
