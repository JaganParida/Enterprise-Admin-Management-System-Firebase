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

const employeeService = {
  // 1. 🚀 PAGINATED & SMART FILTERED GET
  getAllEmployees: async (filters = {}, lastDoc = null) => {
    let constraints = [];
    let hasInequality = false;

    if (filters.status && filters.status !== "All")
      constraints.push(where("status", "==", filters.status));
    if (filters.salary === "No Salary Taken")
      constraints.push(where("salaryTaken", "==", 0));

    // 🚀 FIXED: 100% Case-Insensitive Backend Search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      constraints.push(where("nameLower", ">=", searchLower));
      constraints.push(where("nameLower", "<=", searchLower + "\uf8ff"));
      constraints.push(orderBy("nameLower"));
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
    constraints.push(limit(50));
    if (lastDoc) constraints.push(startAfter(lastDoc));

    try {
      const q = query(empCollection, ...constraints);
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      return { data, lastVisible };
    } catch (error) {
      console.error("🔥 Firebase Query Error:", error);
      throw error;
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
    return { data: { _id: newEmpRef.id, ...payload } };
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
    if (currentHistory.length > 10) currentHistory = currentHistory.slice(-10);

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
    return { message: "Removed successfully" };
  },

  // 3. 🚀 SECURE WIPE ALL (Smart Recursive Delete with 10k Limit)
  deleteAllEmployees: async ({ password, email, user }) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager")
      throw new Error("Action Denied: Only Admins can wipe the database.");

    const currentUser = auth.currentUser;
    const credential = EmailAuthProvider.credential(
      currentUser.email,
      password,
    );
    await reauthenticateWithCredential(currentUser, credential);

    let totalDeleted = 0;
    const SAFE_DAILY_LIMIT = 10000;

    const deleteInBatches = async () => {
      if (totalDeleted >= SAFE_DAILY_LIMIT) return "PARTIAL_SUCCESS";

      const q = query(empCollection, limit(500));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return "FULL_SUCCESS";

      const batch = writeBatch(db);
      snapshot.docs.forEach((document) => {
        batch.delete(document.ref);
        totalDeleted++;
      });
      await batch.commit();
      return await deleteInBatches(); // Recursion
    };

    try {
      const result = await deleteInBatches();
      if (result === "FULL_SUCCESS") {
        await setDoc(statsDocRef, { totalCount: 0 }); // Reset stats
        return {
          success: true,
          isPartial: false,
          message: "All Employee records cleared successfully!",
        };
      } else {
        return {
          success: true,
          isPartial: true,
          message: `⚠️ System Protection: ${totalDeleted.toLocaleString()} employees wiped. Daily limit saved. Please wipe remaining tomorrow.`,
        };
      }
    } catch (error) {
      console.error("Wipe Error:", error);
      throw new Error("Wipe failed midway. Please try again.");
    }
  },

  // 4. 🚀 SALARY PAYMENT (Batch Auto-Syncs 2 Tables with 0 Extra Reads)
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
    return { data: { _id: newSalaryRef.id, ...payload } };
  },

  getSalaryHistory: async (lastDoc = null) => {
    let constraints = [orderBy("date", "desc"), limit(50)];
    if (lastDoc) constraints.push(startAfter(lastDoc));

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
    const lastVisible = salarySnap.docs[salarySnap.docs.length - 1];
    return { data, lastVisible };
  },
};

export default employeeService;
