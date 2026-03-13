import React from "react";
import { ShieldCheck, Wifi, Activity } from "lucide-react";
import { useLocation } from "react-router-dom";

const Footer = () => {
  const location = useLocation();

  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const themeColors = {
    bg: "bg-[#09090B]",
    border: "border-white/5",
    pulse: isTransport ? "bg-blue-500" : "bg-indigo-500",
    textHighlight: isTransport ? "text-blue-400" : "text-indigo-400",
    textSubtle: "text-zinc-500",
    decorationHover: isTransport
      ? "decoration-blue-500/30"
      : "decoration-indigo-500/30",
  };

  return (
    <footer className={`w-full ${themeColors.bg} backdrop-blur-md border-t ${themeColors.border} py-4 px-6 md:px-8 z-10`}>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Copyright */}
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${themeColors.pulse} animate-pulse`}></div>
          <p className={`text-[10px] md:text-xs ${themeColors.textSubtle} font-mono uppercase tracking-widest`}>
            &copy; {new Date().getFullYear()} Enterprise Admin • v1.0.0
          </p>
        </div>

        {/* Right: System Status */}
        <div className={`flex items-center gap-4 md:gap-6 text-[10px] md:text-xs font-medium ${themeColors.textSubtle}`}>
          <div className={`flex items-center gap-1.5 hover:${themeColors.textHighlight} transition-colors cursor-help group`}>
            <ShieldCheck size={14} />
            <span className={`hidden sm:inline group-hover:underline ${themeColors.decorationHover} underline-offset-4`}>
              SECURE
            </span>
          </div>

          <div className={`flex items-center gap-1.5 hover:${themeColors.textHighlight} transition-colors cursor-help group`}>
            <Wifi size={14} />
            <span className={`hidden sm:inline group-hover:underline ${themeColors.decorationHover} underline-offset-4`}>
              24ms
            </span>
          </div>

          <div className={`flex items-center gap-1.5 ${themeColors.textHighlight} opacity-80`}>
            <Activity size={14} />
            <span className="tracking-wider">ONLINE</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
