import { auth, googleProvider } from "../config/firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";

// 1. Login with Email & Password
export const loginAdmin = async (data) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    data.email,
    data.password,
  );
  return { data: userCredential.user };
};

// 2. Login with Google
export const loginWithGoogle = async () => {
  const userCredential = await signInWithPopup(auth, googleProvider);
  return { data: userCredential.user };
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

// Note: Phone Auth OTP logic is handled directly in Login.jsx
// because it requires a physical reCAPTCHA element in the DOM.
