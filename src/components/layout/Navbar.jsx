import React from "react";
import { UserCircle, Menu, LogOut, Activity } from "lucide-react";
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

  // Upgraded Theme Configuration
  const theme = {
    textHighlight: isTransport ? "text-blue-400" : "text-indigo-400",
    bgHover: isTransport ? "hover:bg-blue-500/10" : "hover:bg-indigo-500/10",
    ping: isTransport ? "bg-blue-400" : "bg-indigo-400",
    glowFrom: isTransport ? "from-blue-600/50" : "from-indigo-600/50",
    glowTo: isTransport ? "to-cyan-500/50" : "to-purple-500/50",
    ringColor: isTransport ? "ring-blue-500/30" : "ring-indigo-500/30",
  };

  return (
    <header className="sticky top-0 z-50 w-full h-16 md:h-20 bg-[#09090B]/75 supports-[backdrop-filter]:bg-[#09090B]/60 backdrop-blur-xl border-b border-white/10 transition-all duration-300">
      <div className="flex items-center justify-between h-full px-4 md:px-8 max-w-screen-2xl mx-auto">
        {/* Left Section: Controls & Brand */}
        <div className="flex items-center gap-4">
          <div className="md:hidden flex items-center">
            {isHomePage ? (
              <button
                onClick={handleLogout}
                aria-label="Logout"
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200"
              >
                <LogOut size={22} />
              </button>
            ) : (
              <button
                onClick={toggleMobileSidebar}
                aria-label="Toggle Menu"
                className={`p-2 text-zinc-400 hover:text-zinc-100 ${theme.bgHover} rounded-xl transition-all duration-200`}
              >
                <Menu size={22} />
              </button>
            )}
          </div>

          <div className="flex flex-col justify-center border-l border-white/10 pl-4 md:border-none md:pl-0">
            <h2 className="text-zinc-100 font-semibold text-base md:text-lg tracking-tight flex items-center gap-2">
              {isHomePage
                ? "Enterprise OS"
                : isTransport
                  ? "Logistics Command"
                  : "System Overview"}
            </h2>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="relative flex h-2 w-2 items-center justify-center">
                <span
                  className={`animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full ${theme.ping} opacity-60`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-1.5 w-1.5 ${theme.ping}`}
                ></span>
              </span>
              <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-[0.2em] hidden sm:flex items-center gap-1">
                System Active
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: User Profile */}
        <div className="flex items-center gap-4">
          {admin && (
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="text-right hidden sm:block">
                {userName && (
                  <p className="text-sm font-medium text-zinc-100 group-hover:text-white transition-colors">
                    {userName}
                  </p>
                )}
                <p
                  className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${theme.textHighlight}`}
                >
                  {userRole}
                </p>
              </div>

              {/* Upgraded Avatar with smooth glow & ring effect */}
              <div className="relative">
                <div
                  className={`absolute -inset-0.5 bg-gradient-to-br ${theme.glowFrom} ${theme.glowTo} rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500`}
                ></div>
                <div
                  className={`relative flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-zinc-950 border border-white/10 ring-2 ring-transparent group-hover:${theme.ringColor} transition-all duration-300`}
                >
                  <UserCircle
                    size={22}
                    className={`${theme.textHighlight} group-hover:scale-110 transition-transform duration-300`}
                    strokeWidth={1.5}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
