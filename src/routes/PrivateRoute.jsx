import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/common/Loader"; // 👈 1. Loader import kiya

const PrivateRoute = () => {
  const { admin, loading } = useAuth();

  // 1. If Auth is still loading, show our premium futuristic loader
  if (loading) {
    return <Loader fullScreen={true} text="AUTHENTICATING SESSION" />; // 👈 2. Green div hata kar apna dark theme loader laga diya
  }

  // 2. If no admin is found, kick them back to login
  if (!admin) {
    return <Navigate to="/login" replace />;
  }

  // 3. If admin exists, let them see the page
  return <Outlet />;
};

export default PrivateRoute;
