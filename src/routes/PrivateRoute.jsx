import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PrivateRoute = () => {
  const { admin, loading } = useAuth();

  // 1. If Auth is still loading, show nothing (or a spinner) instead of crashing
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020403] flex items-center justify-center text-emerald-500">
        Loading...
      </div>
    );
  }

  // 2. If no admin is found, kick them back to login
  if (!admin) {
    return <Navigate to="/login" replace />;
  }

  // 3. If admin exists, let them see the page
  return <Outlet />;
};

export default PrivateRoute;
