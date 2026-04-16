import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../config/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { verifyAndGetRole } from "../services/authService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🚀 ENTERPRISE GRADE SESSION PERSISTENCE
  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const role = await verifyAndGetRole(user);

          const storedAdminInfo = JSON.parse(localStorage.getItem("adminInfo"));
          const currentSessionId = storedAdminInfo?.data?.sessionId;

          const userData = {
            data: {
              uid: user.uid,
              email: user.email,
              role: role,
              sessionId: currentSessionId,
            },
          };

          setAdmin(userData);
          localStorage.setItem("adminInfo", JSON.stringify(userData));

          // 🔴 REAL-TIME DEVICE LIMIT MONITORING
          const userRef = doc(db, "users", user.uid);
          unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              const activeSessions = docSnap.data().activeSessions || [];
              const isSessionValid = activeSessions.some(
                (s) => s.sessionId === currentSessionId,
              );

              if (!isSessionValid && currentSessionId) {
                console.warn(
                  "Logged out automatically: Logged in from too many devices.",
                );
                signOut(auth);
                localStorage.removeItem("adminInfo");
                setAdmin(null);
              }
            }
          });
        } catch (error) {
          console.error("Session verification failed:", error.message);
          setAdmin(null);
          localStorage.removeItem("adminInfo");
        }
      } else {
        setAdmin(null);
        localStorage.removeItem("adminInfo");
        if (unsubscribeSnapshot) unsubscribeSnapshot();
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const login = (userData) => {
    localStorage.setItem("adminInfo", JSON.stringify(userData));
    setAdmin(userData);
  };

  const logout = async () => {
    await signOut(auth);
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
