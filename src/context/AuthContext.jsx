import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for an existing session on startup
    const storedAdmin = localStorage.getItem("adminInfo");
    if (storedAdmin) {
      setAdmin(JSON.parse(storedAdmin));
    }
    setLoading(false); // Done loading
  }, []);

  const login = (userData) => {
    localStorage.setItem("adminInfo", JSON.stringify(userData));
    setAdmin(userData);
  };

  const logout = () => {
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
