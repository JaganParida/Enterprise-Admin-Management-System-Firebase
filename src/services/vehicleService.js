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

const tripCollection = collection(db, "trips");
const expenseCollection = collection(db, "expenses"); // Added Expense Collection

const vehicleService = {
  // ================= TRIP LOGS =================
  getLogs: async () => {
    const q = query(tripCollection, orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return {
      data: snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() })),
    };
  },

  addLog: async (payload, user) => {
    const qty = Number(payload.quantity) || 0;
    const rate = Number(payload.rate) || 0;
    const food = Number(payload.foodCharge) || 0;
    const paid = Number(payload.amountPaid) || 0;
    const distance = Number(payload.distanceTravelled) || 0;

    const totalAmount = qty * rate + food;
    const amountDue =
      payload.amountDue !== ""
        ? Number(payload.amountDue)
        : Math.max(0, totalAmount - paid);

    const dataToSave = {
      ...payload,
      quantity: qty,
      rate: rate,
      foodCharge: food,
      amountPaid: paid,
      totalAmount: totalAmount,
      amountDue: amountDue,
      distanceTravelled: distance,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
      editHistory: [],
    };
    const docRef = await addDoc(tripCollection, dataToSave);
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  updateLog: async (id, payload, user) => {
    const docRef = doc(db, "trips", id);
    const snapshot = await getDoc(docRef);
    let currentHistory =
      snapshot.exists() && snapshot.data().editHistory
        ? snapshot.data().editHistory
        : [];

    const currentEdit = {
      by: user?.email || "Unknown",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    };
    currentHistory.push(currentEdit);

    const qty = Number(payload.quantity) || 0;
    const rate = Number(payload.rate) || 0;
    const food = Number(payload.foodCharge) || 0;
    const paid = Number(payload.amountPaid) || 0;
    const distance = Number(payload.distanceTravelled) || 0;

    const totalAmount = qty * rate + food;
    const amountDue =
      payload.amountDue !== ""
        ? Number(payload.amountDue)
        : Math.max(0, totalAmount - paid);

    const dataToUpdate = {
      ...payload,
      quantity: qty,
      rate: rate,
      foodCharge: food,
      amountPaid: paid,
      totalAmount: totalAmount,
      amountDue: amountDue,
      distanceTravelled: distance,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory.slice(-10),
    };
    await updateDoc(docRef, dataToUpdate);
    return { message: "Updated" };
  },

  deleteLog: async (id) => {
    await deleteDoc(doc(db, "trips", id));
    return { message: "Deleted" };
  },

  // ================= EXPENSES =================
  getExpenses: async () => {
    const q = query(expenseCollection, orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return {
      data: snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() })),
    };
  },

  addExpense: async (payload, user) => {
    const dataToSave = {
      ...payload,
      amount: Number(payload.amount) || 0,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
      editHistory: [], // ADDED HISTORY ARRAY
    };
    const docRef = await addDoc(expenseCollection, dataToSave);
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  updateExpense: async (id, payload, user) => {
    const docRef = doc(db, "expenses", id);
    const snapshot = await getDoc(docRef);
    let currentHistory =
      snapshot.exists() && snapshot.data().editHistory
        ? snapshot.data().editHistory
        : [];

    const currentEdit = {
      by: user?.email || "Unknown",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    };
    currentHistory.push(currentEdit); // ADDED HISTORY PUSH

    const dataToUpdate = {
      ...payload,
      amount: Number(payload.amount) || 0,
      lastEditedBy: currentEdit.by,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory.slice(-10), // KEEPS LAST 10 EDITS
    };
    await updateDoc(docRef, dataToUpdate);
    return { message: "Updated" };
  },

  deleteExpense: async (id) => {
    await deleteDoc(doc(db, "expenses", id));
    return { message: "Deleted" };
  },

  // ================= ADMIN SECURE WIPE =================
  deleteAllLogs: async ({ password, type = "trips", email }) => {
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
      const targetCollection =
        type === "expenses" ? expenseCollection : tripCollection;
      const snapshot = await getDocs(targetCollection);
      const deletePromises = [];
      snapshot.forEach((document) => {
        deletePromises.push(
          deleteDoc(
            doc(db, type === "expenses" ? "expenses" : "trips", document.id),
          ),
        );
      });
      await Promise.all(deletePromises);
      return { success: true };
    } catch (error) {
      console.error("Wipe Database Error:", error);
      throw new Error("Failed to clear database. Admin rights required.");
    }
  },
};

export default vehicleService;
