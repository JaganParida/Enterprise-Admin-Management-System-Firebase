import React from "react";
import { ShieldCheck, Wifi, Activity } from "lucide-react";
import { useLocation } from "react-router-dom";

const Footer = () => {
  const location = useLocation();
  const isTransport = location.pathname.includes("/transportation");

  // Dynamic Theme Object
  const theme = {
    bg: isTransport ? "bg-[#020617]/80" : "bg-[#050a08]/80",
    border: isTransport ? "border-blue-900/20" : "border-emerald-900/20",
    dot: isTransport ? "bg-blue-500" : "bg-emerald-500",
    textSubtle: isTransport ? "text-blue-900/60" : "text-emerald-900/60",
    textHighlight: isTransport
      ? "hover:text-blue-400"
      : "hover:text-emerald-400",
    iconColor: isTransport ? "text-blue-500/30" : "text-emerald-500/30",
    decoration: isTransport
      ? "decoration-blue-500/30"
      : "decoration-emerald-500/30",
    statusColor: isTransport ? "text-blue-500/60" : "text-emerald-500/60",
  };

  return (
    <footer
      className={`w-full ${theme.bg} backdrop-blur-md border-t ${theme.border} py-4 px-6 md:px-8 z-10`}
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Copyright */}
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${theme.dot} animate-pulse`}
          ></div>
          <p
            className={`text-[10px] md:text-xs ${theme.textSubtle} font-mono uppercase tracking-widest`}
          >
            &copy; {new Date().getFullYear()}{" "}
            {isTransport ? "Logistics Hub" : "Enterprise Admin"} • v1.0.0
          </p>
        </div>

        {/* Right: System Status */}
        <div
          className={`flex items-center gap-4 md:gap-6 text-[10px] md:text-xs font-medium ${theme.iconColor}`}
        >
          <div
            className={`flex items-center gap-1.5 ${theme.textHighlight} transition-colors cursor-help group`}
          >
            <ShieldCheck size={14} />
            <span
              className={`hidden sm:inline group-hover:underline ${theme.decoration} underline-offset-4`}
            >
              SECURE
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 ${theme.textHighlight} transition-colors cursor-help group`}
          >
            <Wifi size={14} />
            <span
              className={`hidden sm:inline group-hover:underline ${theme.decoration} underline-offset-4`}
            >
              24ms
            </span>
          </div>

          <div className={`flex items-center gap-1.5 ${theme.statusColor}`}>
            <Activity size={14} />
            <span className="tracking-wider">ONLINE</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
