import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Footer from "./Footer"; 

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [isCollapsed, setIsCollapsed] = useState(false); 
  const location = useLocation();

  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;

  const isTransport = currentPath.includes("/transportation");

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
    <div className={`flex min-h-screen bg-[#09090B] text-zinc-100 font-sans selection:text-white overflow-hidden ${isTransport ? "selection:bg-blue-500" : "selection:bg-indigo-500"}`}>
      {/* Sidebar */}
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
          {/* Dynamic Premium Background */}
          {isTransport ? (
              <div className="fixed inset-0 bg-[#09090B] pointer-events-none -z-10">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.05),transparent_50%)]" />
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.2]" />
              </div>
          ) : (
              <div className="fixed inset-0 bg-[#09090B] pointer-events-none -z-10">
                   <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.05),transparent_50%)]" />
                   <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.2]" />
              </div>
          )}

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
