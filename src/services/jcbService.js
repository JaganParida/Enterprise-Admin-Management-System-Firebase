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

const jcbCollection = collection(db, "jcb_logs");

const jcbService = {
  getLogs: async () => {
    try {
      const q = query(jcbCollection, orderBy("date", "desc"));
      const snapshot = await getDocs(q);
      return {
        data: snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() })),
      };
    } catch (error) {
      console.error("Fetch Error:", error);
      return { data: [] };
    }
  },

  addLog: async (payload, user) => {
    const dataToSave = {
      ...payload,
      totalMins: Number(payload.totalMins) || 0,
      createdAt: new Date().toISOString(),
      createdBy: user?.email || "Unknown",
      createdRole: user?.role || "Admin",
      editHistory: [],
    };
    const docRef = await addDoc(jcbCollection, dataToSave);
    return { data: { _id: docRef.id, ...dataToSave } };
  },

  updateLog: async (id, payload, user) => {
    const docRef = doc(db, "jcb_logs", id);
    const snapshot = await getDoc(docRef);

    let currentHistory = [];
    if (snapshot.exists() && Array.isArray(snapshot.data().editHistory)) {
      currentHistory = snapshot.data().editHistory;
    }

    const currentEdit = {
      by: user?.email || "Unknown",
      role: user?.role || "Admin",
      at: new Date().toISOString(),
    };

    currentHistory.push(currentEdit);
    if (currentHistory.length > 10) currentHistory = currentHistory.slice(-10);

    const dataToUpdate = {
      ...payload,
      totalMins: Number(payload.totalMins) || 0,
      lastEditedRole: currentEdit.role,
      lastEditedAt: currentEdit.at,
      editHistory: currentHistory,
    };

    await updateDoc(docRef, dataToUpdate);
    return { message: "Updated" };
  },

  deleteLog: async (id) => {
    await deleteDoc(doc(db, "jcb_logs", id));
    return { message: "Deleted" };
  },

  // 🚀 SECURE WIPE DATABASE FEATURE
  deleteAllLogs: async ({ password }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Admin not logged in.");

    try {
      await signInWithEmailAndPassword(auth, currentUser.email, password);
      const snapshot = await getDocs(jcbCollection);
      const deletePromises = [];
      snapshot.forEach((document) => {
        deletePromises.push(deleteDoc(doc(db, "jcb_logs", document.id)));
      });
      await Promise.all(deletePromises);
      return { success: true };
    } catch (error) {
      throw new Error("Incorrect Admin Password or Wipe Failed.");
    }
  },
};

export default jcbService;
