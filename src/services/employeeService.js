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
} from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

const empCollection = collection(db, "employees");
const salaryCollection = collection(db, "salaryPayments");

const employeeService = {
  // 1. 🚀 PAGINATED & FILTERED GET EMPLOYEES (100% BACKEND FILTERING)
  getAllEmployees: async (filters = {}, lastDoc = null) => {
    let constraints = [];

    // Status Filter (Equality)
    if (filters.status && filters.status !== "All") {
      constraints.push(where("status", "==", filters.status));
    }

    let hasInequality = false;

    // Search Filter (Priority Inequality)
    if (filters.search) {
      constraints.push(where("name", ">=", filters.search));
      constraints.push(where("name", "<=", filters.search + "\uf8ff"));
      constraints.push(orderBy("name"));
      hasInequality = true;
    }

    // Salary Range Filter
    if (filters.salary && filters.salary !== "All") {
      if (filters.salary === "No Salary Taken") {
        constraints.push(where("salaryTaken", "==", 0));
      } else if (!hasInequality) {
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
    }

    if (!hasInequality) {
      constraints.push(orderBy("createdAt", "desc"));
    }

    constraints.push(limit(50));

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    try {
      const q = query(empCollection, ...constraints);
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }));
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
      initialSalary: Number(employeeData.initialSalary || 0),
      salaryTaken: Number(employeeData.salaryTaken || 0),
      status: "Active",
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
      editHistory: [],
    };
    const docRef = await addDoc(empCollection, payload);
    return { data: { _id: docRef.id, ...payload } };
  },

  getEmployeeById: async (id) => {
    const docRef = doc(db, "employees", id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { data: { _id: snapshot.id, ...snapshot.data() } };
    }
    throw new Error("Employee not found");
  },

  updateEmployee: async (id, updateData, user) => {
    const docRef = doc(db, "employees", id);
    const snapshot = await getDoc(docRef);

    let currentHistory = [];
    if (snapshot.exists() && snapshot.data().editHistory) {
      currentHistory = snapshot.data().editHistory;
    }

    const currentEdit = {
      by: user?.email || "Unknown",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    };

    currentHistory.push(currentEdit);
    if (currentHistory.length > 10) currentHistory = currentHistory.slice(-10);

    const payload = {
      ...updateData,
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

  // 2. 🚀 SECURE DELETE (RBAC Check)
  deleteEmployee: async (id, user) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager") {
      throw new Error("Action Denied: Managers cannot delete records.");
    }
    const docRef = doc(db, "employees", id);
    await deleteDoc(docRef);
    return { message: "Removed successfully" };
  },

  // 3. 🚀 SECURE WIPE ALL (Password Re-auth + RBAC Check)
  deleteAllEmployees: async ({ password, email, user }) => {
    const userRole = user?.data?.role || user?.role;
    if (userRole === "manager") {
      throw new Error("Action Denied: Only Admins can wipe the database.");
    }

    if (!password || !email) throw new Error("Authentication Error");

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
      throw new Error("Incorrect Admin Password.");
    }

    try {
      const snapshot = await getDocs(empCollection);
      const deletePromises = [];
      snapshot.forEach((document) => {
        deletePromises.push(deleteDoc(doc(db, "employees", document.id)));
      });
      await Promise.all(deletePromises);
      return { success: true };
    } catch (error) {
      throw new Error("Failed to clear database.");
    }
  },

  addSalaryPayment: async (paymentData, user) => {
    const payload = {
      ...paymentData,
      amount: Number(paymentData.amount),
      createdAt: new Date().toISOString(),
      recordedBy: user?.email || "Unknown",
      recordedRole: user?.role || "Admin",
    };
    const docRef = await addDoc(salaryCollection, payload);
    return { data: { _id: docRef.id, ...payload } };
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
          name: payment.employeeName || "Legacy Record",
          position: payment.employeePosition || "-",
        },
      };
    });

    const lastVisible = salarySnap.docs[salarySnap.docs.length - 1];
    return { data, lastVisible };
  },
};

export default employeeService;
