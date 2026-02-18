import React from "react";
import { Bell, UserCircle, Search, Menu, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

const Navbar = ({ toggleMobileSidebar }) => {
  const { admin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Precise check for the Landing Page
  const isHomePage = location.pathname === "/";
  const isTransport = location.pathname.includes("/transportation");

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const theme = {
    bg: isTransport ? "bg-[#020617]/80" : "bg-[#050a08]/80",
    border: isTransport ? "border-blue-900/20" : "border-emerald-900/20",
    textHighlight: isTransport ? "text-blue-400" : "text-emerald-400",
    textSubtle: isTransport ? "text-blue-200/50" : "text-emerald-100/50",
    hoverBg: isTransport ? "hover:bg-blue-900/20" : "hover:bg-emerald-900/20",
    ping: isTransport ? "bg-blue-400" : "bg-emerald-400",
    dot: isTransport ? "bg-blue-500" : "bg-emerald-500",
    gradientFrom: isTransport ? "from-blue-500" : "from-emerald-500",
    gradientTo: isTransport ? "to-indigo-600" : "to-teal-600",
    avatarBorder: isTransport ? "border-blue-900/50" : "border-emerald-900/50",
  };

  return (
    <header
      className={`h-20 ${theme.bg} backdrop-blur-md border-b ${theme.border} flex items-center justify-between px-6 md:px-8 sticky top-0 z-40`}
    >
      <div className="flex items-center gap-4">
        {/* MOBILE BUTTON LOGIC */}
        <div className="md:hidden">
          {isHomePage ? (
            /* Show Logout on Landing Page (Home) */
            <button
              onClick={handleLogout}
              className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <LogOut size={24} />
            </button>
          ) : (
            /* Show Hamburger on Admin/Enterprise Pages */
            <button
              onClick={toggleMobileSidebar}
              className={`p-2 ${theme.textHighlight} ${theme.hoverBg} rounded-lg transition-colors`}
            >
              <Menu size={24} />
            </button>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <h2 className="text-white font-bold text-xl tracking-tight hidden sm:block">
            {isHomePage
              ? "Enterprise OS"
              : isTransport
                ? "Logistics Command"
                : "Overview"}
          </h2>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${theme.ping} opacity-75`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${theme.dot}`}
              ></span>
            </span>
            <p
              className={`text-[10px] ${theme.textSubtle} font-mono uppercase tracking-widest`}
            >
              System Active
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Profile Section - Only show if admin is logged in */}
        {admin && (
          <div
            className={`flex items-center gap-4 pl-6 border-l ${theme.border}`}
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white">{admin.name}</p>
              <p
                className={`text-[10px] uppercase ${theme.textHighlight} font-bold`}
              >
                Admin
              </p>
            </div>
            <div className="relative group">
              <div
                className={`absolute -inset-0.5 bg-gradient-to-br ${theme.gradientFrom} ${theme.gradientTo} rounded-full blur-[2px] opacity-75`}
              ></div>
              <div
                className={`relative w-10 h-10 rounded-full bg-black flex items-center justify-center border ${theme.avatarBorder}`}
              >
                <UserCircle size={28} className={theme.textHighlight} />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
