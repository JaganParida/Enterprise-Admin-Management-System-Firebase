import { auth, googleProvider } from "../config/firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";

// 🔒 STRICT SECURITY & ROLES: Yahan email ke sath role define karna hai
const ALLOWED_USERS = {
  "jagan.parida.dev@gmail.com": "admin", // Admin ko sab access hai
  "jaganparida39064@gmail.com": "manager", // Manager sirf view aur edit karega, delete nahi
};

// Helper function: Email check karne aur role nikalne ke liye
const verifyAndGetRole = async (user) => {
  const role = ALLOWED_USERS[user.email];
  if (!role) {
    await signOut(auth); // Unauthorized user ko turant bahar nikalo
    throw new Error("Access Denied: You are not authorized.");
  }
  return role;
};

// 1. Login with Email & Password
export const loginAdmin = async (data) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    data.email,
    data.password,
  );

  // Security Guard checks role
  const userRole = await verifyAndGetRole(userCredential.user);

  // User ke data ke sath uska role bhi return kar rahe hain
  return {
    data: {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      role: userRole,
    },
  };
};

// 2. Login with Google (Secured)
export const loginWithGoogle = async () => {
  const userCredential = await signInWithPopup(auth, googleProvider);

  // Security Guard checks role
  const userRole = await verifyAndGetRole(userCredential.user);

  return {
    data: {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      role: userRole,
    },
  };
};

// 3. Forgot Password (Sends a secure reset link to email)
export const forgotPassword = async (data) => {
  await sendPasswordResetEmail(auth, data.email);
  return { message: "Password reset link sent to your email!" };
};

// 4. Logout
export const logoutAdmin = async () => {
  await signOut(auth);
  localStorage.removeItem("adminInfo");
};
