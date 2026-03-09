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
} from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";

const empCollection = collection(db, "employees");
const salaryCollection = collection(db, "salaryPayments");

const employeeService = {
  // 1. Get all employees
  getAllEmployees: async () => {
    const snapshot = await getDocs(empCollection);
    const data = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));
    return { data };
  },

  // 2. Add new employee
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

  // 3. Get employee by ID
  getEmployeeById: async (id) => {
    const docRef = doc(db, "employees", id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { data: { _id: snapshot.id, ...snapshot.data() } };
    }
    throw new Error("Employee not found");
  },

  // 4. Update employee (With History limit 10)
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

    if (currentHistory.length > 10) {
      currentHistory = currentHistory.slice(-10);
    }

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

  // 5. Delete employee
  deleteEmployee: async (id) => {
    const docRef = doc(db, "employees", id);
    await deleteDoc(docRef);
    return { message: "Removed successfully" };
  },

  // 🚀 WIPE ALL SECURE FUNCTION
  deleteAllEmployees: async ({ password, email }) => {
    if (!password) {
      throw new Error("Password is required to wipe the database.");
    }
    if (!email) {
      throw new Error("Authentication Error: Unable to verify admin identity.");
    }

    try {
      // Securely verifies password against current admin's email using Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw new Error("Access Denied: Incorrect Admin Password.");
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
      console.error("Wipe Database Error:", error);
      throw new Error("Failed to clear database. Admin rights required.");
    }
  },

  // --- SALARY SECTION ---
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

  getSalaryHistory: async () => {
    const q = query(salaryCollection, orderBy("date", "desc"));
    const salarySnap = await getDocs(q);
    const employeesSnap = await getDocs(empCollection);

    const empMap = {};
    employeesSnap.docs.forEach((d) => {
      empMap[d.id] = { name: d.data().name, position: d.data().position };
    });

    const data = salarySnap.docs.map((doc) => {
      const payment = doc.data();
      return {
        _id: doc.id,
        ...payment,
        employee: empMap[payment.employeeId] || {
          name: "Unknown",
          position: "-",
        },
      };
    });

    return { data };
  },
};

export default employeeService;
