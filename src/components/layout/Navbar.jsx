import React from "react";
import { UserCircle, Menu, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

const Navbar = ({ toggleMobileSidebar }) => {
  const { admin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 🔥 FIX 3: Instantly read the actual URL to prevent the flashing dots/text
  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;

  const isHomePage = currentPath === "/";
  const isTransport = currentPath.includes("/transportation");

  const userData = admin?.data || admin;
  const userName = userData?.name || "";
  const userRole =
    userData?.role?.toLowerCase() === "admin" ? "Admin" : "Manager";

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const theme = {
    bg: "bg-zinc-950/80", // Unified deep background
    border: "border-zinc-800", // Unified borders
    textHighlight: isTransport ? "text-blue-400" : "text-indigo-400",
    textSubtle: "text-zinc-400",
    ping: isTransport ? "bg-blue-500" : "bg-indigo-500",
    dot: isTransport ? "bg-blue-500" : "bg-indigo-500",
    gradientFrom: isTransport ? "from-blue-500" : "from-indigo-500",
    gradientTo: isTransport ? "to-cyan-600" : "to-violet-600",
    avatarBorder: "border-zinc-800",
  };

  return (
    <header
      className={`h-20 ${theme.bg} backdrop-blur-md border-b ${theme.border} flex items-center justify-between px-4 md:px-8 sticky top-0 z-40`}
    >
      <div className="flex items-center gap-3 md:gap-4">
        <div className="md:hidden">
          {isHomePage ? (
            <button
              onClick={handleLogout}
              className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <LogOut size={24} />
            </button>
          ) : (
            <button
              onClick={toggleMobileSidebar}
              className={`p-2 ${theme.textHighlight} hover:bg-zinc-900 rounded-lg transition-colors`}
            >
              <Menu size={24} />
            </button>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <h2 className="text-zinc-100 font-bold text-lg md:text-xl tracking-tight hidden sm:block">
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
              className={`text-[10px] ${theme.textSubtle} font-mono uppercase tracking-widest hidden sm:block`}
            >
              System Active
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {admin && (
          <div
            className={`flex items-center gap-3 md:gap-4 pl-4 md:pl-6 border-l ${theme.border}`}
          >
            <div className="text-right">
              {userName && (
                <p className="text-sm font-bold text-zinc-100 leading-tight mb-0.5">
                  {userName}
                </p>
              )}
              <p
                className={`text-[10px] uppercase ${theme.textHighlight} font-bold tracking-wider`}
              >
                {userRole}
              </p>
            </div>
            <div className="relative group">
              <div
                className={`absolute -inset-0.5 bg-gradient-to-br ${theme.gradientFrom} ${theme.gradientTo} rounded-full blur-[2px] opacity-75`}
              ></div>
              <div
                className={`relative w-9 h-9 md:w-10 md:h-10 rounded-full bg-zinc-950 flex items-center justify-center border ${theme.avatarBorder}`}
              >
                <UserCircle size={24} className={theme.textHighlight} />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
