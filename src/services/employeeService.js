import { db } from "../config/firebase";
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
  addEmployee: async (employeeData) => {
    const payload = {
      ...employeeData,
      status: "Active",
      createdAt: new Date().toISOString(),
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

  // 4. Update employee
  updateEmployee: async (id, updateData) => {
    const docRef = doc(db, "employees", id);
    await updateDoc(docRef, updateData);
    return { message: "Updated successfully" };
  },

  // 5. Delete employee
  deleteEmployee: async (id) => {
    const docRef = doc(db, "employees", id);
    await deleteDoc(docRef);
    return { message: "Removed successfully" };
  },

  // --- SALARY SECTION ---

  // 6. Record Salary/Advance Payment
  addSalaryPayment: async (paymentData) => {
    const payload = {
      ...paymentData,
      amount: Number(paymentData.amount),
      createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(salaryCollection, payload);
    return { data: { _id: docRef.id, ...payload } };
  },

  // 7. Get Salary History (With Employee Names)
  getSalaryHistory: async () => {
    const q = query(salaryCollection, orderBy("date", "desc"));
    const salarySnap = await getDocs(q);
    const employeesSnap = await getDocs(empCollection);

    // Create a map of employees for quick lookup
    const empMap = {};
    employeesSnap.docs.forEach((d) => {
      empMap[d.id] = { name: d.data().name, position: d.data().position };
    });

    // Attach employee details to each payment record
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
