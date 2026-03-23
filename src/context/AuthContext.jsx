import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../config/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { verifyAndGetRole } from "../services/authService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🚀 ENTERPRISE GRADE SESSION PERSISTENCE
  useEffect(() => {
    // Firebase listener to automatically handle active sessions on reload
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Double verify from the centralized security guard
          const role = await verifyAndGetRole(user);
          const userData = {
            data: { uid: user.uid, email: user.email, role: role },
          };
          setAdmin(userData);
          localStorage.setItem("adminInfo", JSON.stringify(userData));
        } catch (error) {
          // If role is missing or unauthorized, kill the session instantly
          console.error("Session verification failed:", error.message);
          setAdmin(null);
          localStorage.removeItem("adminInfo");
        }
      } else {
        // No user logged in
        setAdmin(null);
        localStorage.removeItem("adminInfo");
      }
      setLoading(false); // Stop loading screen once session is checked
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, []);

  const login = (userData) => {
    // Optimistic UI update before Firebase listener fires
    localStorage.setItem("adminInfo", JSON.stringify(userData));
    setAdmin(userData);
  };

  const logout = async () => {
    await signOut(auth); // Properly sign out from Firebase
    localStorage.removeItem("adminInfo");
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
