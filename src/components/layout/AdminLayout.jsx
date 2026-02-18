import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Footer from "./Footer"; // Import the Admin Footer

const AdminLayout = () => {
  // 1. Define State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Toggle
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop Collapse

  // Auto-close mobile sidebar on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#020403] text-emerald-50 font-sans selection:bg-emerald-500 selection:text-white overflow-hidden">
      {/* 2. Sidebar (Only rendered here, inside the protected layout) */}
      <Sidebar
        isMobileOpen={isSidebarOpen}
        setIsMobileOpen={setIsSidebarOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* 3. Main Content Wrapper */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out 
          ${isCollapsed ? "md:ml-20" : "md:ml-64"} 
          ml-0 relative w-full`}
      >
        {/* Admin Navbar */}
        <Navbar toggleMobileSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        {/* Page Content Area */}
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden w-full relative z-0 flex flex-col">
          {/* Cyber Grid Background */}
          <div className="fixed inset-0 bg-[linear-gradient(to_right,#0a1f16_1px,transparent_1px),linear-gradient(to_bottom,#0a1f16_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.1] pointer-events-none -z-10"></div>

          {/* Content Outlet */}
          <div className="w-full max-w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Outlet />
          </div>
        </main>

        {/* Admin Footer */}
        <Footer />
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        ></div>
      )}
    </div>
  );
};

export default AdminLayout;
