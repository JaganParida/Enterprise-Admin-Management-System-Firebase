import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// 🚀 GLOBAL APP SHELL SKELETON
// This mimics a generic dashboard layout (Sidebar + Header + Content Area)
// so it looks perfectly natural no matter which page the user is landing on.
const AppShellSkeleton = () => {
  return (
    <div className="min-h-screen bg-[#09090B] flex w-full h-screen overflow-hidden">
      {/* Sidebar Skeleton (Hidden on mobile, visible on desktop) */}
      <div className="hidden lg:flex w-64 flex-col border-r border-zinc-800/60 bg-zinc-950/30 p-5 gap-6 animate-in fade-in duration-500">
        {/* Logo Placeholder */}
        <div className="h-10 w-36 bg-zinc-800/50 rounded-xl animate-pulse mb-4"></div>

        {/* Navigation Items Placeholder */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={`h-11 w-full rounded-xl animate-pulse ${
                i === 1 ? "bg-zinc-800/60" : "bg-zinc-800/30"
              }`}
            ></div>
          ))}
        </div>

        {/* Bottom User Profile Placeholder */}
        <div className="mt-auto h-14 w-full bg-zinc-800/30 rounded-xl animate-pulse"></div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full w-full">
        {/* Top Header Skeleton */}
        <div className="h-[72px] border-b border-zinc-800/60 bg-[#09090B] flex items-center justify-between px-4 sm:px-8 shrink-0">
          {/* Mobile Menu Toggle Placeholder */}
          <div className="h-8 w-8 lg:hidden bg-zinc-800/50 rounded-lg animate-pulse"></div>

          {/* Breadcrumb / Page Title Placeholder (Desktop) */}
          <div className="hidden lg:block h-5 w-32 bg-zinc-800/40 rounded animate-pulse"></div>

          {/* Right Header Actions (Profile/Notifications) */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="h-9 w-9 bg-zinc-800/50 rounded-full animate-pulse"></div>
            <div className="h-9 w-9 bg-zinc-800/50 rounded-xl animate-pulse"></div>
          </div>
        </div>

        {/* Generic Inner Content Skeleton */}
        <div className="flex-1 p-4 sm:p-8 overflow-y-auto custom-scrollbar space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Page Header */}
          <div className="space-y-2">
            <div className="h-8 w-48 bg-zinc-800/60 rounded-lg animate-pulse"></div>
            <div className="h-4 w-64 bg-zinc-800/40 rounded-md animate-pulse"></div>
          </div>

          {/* Top Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl animate-pulse"
              ></div>
            ))}
          </div>

          {/* Main Body Area (Table/Chart Placeholder) */}
          <div className="h-[400px] bg-zinc-900/40 border border-zinc-800/60 rounded-3xl animate-pulse w-full"></div>
        </div>
      </div>
    </div>
  );
};

const PrivateRoute = () => {
  const { admin, loading } = useAuth();

  // 1. If Auth is still loading on a hard refresh, show the generic App Shell Skeleton
  if (loading) {
    return <AppShellSkeleton />;
  }

  // 2. If no admin is found, kick them back to login
  if (!admin) {
    return <Navigate to="/login" replace />;
  }

  // 3. If admin exists, let them see the page
  return <Outlet />;
};

export default PrivateRoute;
