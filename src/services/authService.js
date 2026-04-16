import { auth, googleProvider, db } from "../config/firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const ALLOWED_USERS = {
  "maaflyashbricks2016@gmail.com": "admin",
  "sanjibcutm07@gmail.com": "manager",
};

export const verifyAndGetRole = async (user) => {
  const role = ALLOWED_USERS[user.email];
  if (!role) {
    await signOut(auth);
    throw new Error("Access Denied: You are not authorized.");
  }
  return role;
};

// 🚀 NEW LOGIC: Manage Max 2 Sessions
const manageSessions = async (uid) => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  let activeSessions = [];
  if (userSnap.exists() && userSnap.data().activeSessions) {
    activeSessions = userSnap.data().activeSessions;
  }

  // Generate a unique session ID for this login
  const newSessionId = Math.random().toString(36).substring(2, 15);

  // Add new session with a timestamp
  activeSessions.push({ sessionId: newSessionId, timestamp: Date.now() });

  // Sort by oldest first, and keep only the latest 2 sessions
  activeSessions.sort((a, b) => a.timestamp - b.timestamp);
  while (activeSessions.length > 2) {
    activeSessions.shift(); // Removes the oldest session
  }

  // Save back to Firestore
  await setDoc(userRef, { activeSessions }, { merge: true });

  return newSessionId;
};

// 1. Login with Email & Password
export const loginAdmin = async (data) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    data.email,
    data.password,
  );

  const userRole = await verifyAndGetRole(userCredential.user);
  const sessionId = await manageSessions(userCredential.user.uid);

  return {
    data: {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      role: userRole,
      sessionId: sessionId,
    },
  };
};

// 2. Login with Google (Secured)
export const loginWithGoogle = async () => {
  const userCredential = await signInWithPopup(auth, googleProvider);

  const userRole = await verifyAndGetRole(userCredential.user);
  const sessionId = await manageSessions(userCredential.user.uid);

  return {
    data: {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      role: userRole,
      sessionId: sessionId,
    },
  };
};

// 3. Forgot Password
export const forgotPassword = async (data) => {
  await sendPasswordResetEmail(auth, data.email);
  return { message: "Password reset link sent to your email!" };
};

// 4. Logout
export const logoutAdmin = async () => {
  await signOut(auth);
  localStorage.removeItem("adminInfo");
};
