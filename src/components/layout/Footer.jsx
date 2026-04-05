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

  const theme = {
    bg: "bg-[#09090B]/60", // Transparent enough to show background blur
    pulse: isTransport
      ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
      : "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]",
    textHighlight: isTransport ? "text-blue-400" : "text-indigo-400",
    textSubtle: "text-zinc-500",
  };

  return (
    <footer
      className={`w-full ${theme.bg} backdrop-blur-xl border-t border-white/[0.06] py-4 px-6 md:px-10 z-10`}
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Left: Branding & Version */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${theme.pulse.split(" ")[0]}`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${theme.pulse}`}
            ></span>
          </div>
          <p
            className={`text-[11px] md:text-xs ${theme.textSubtle} font-medium tracking-wide`}
          >
            &copy; {new Date().getFullYear()} Enterprise Admin{" "}
            <span className="mx-1 opacity-50">•</span>{" "}
            <span className="font-mono">v1.0.0</span>
          </p>
        </div>

        {/* Right: Telemetry & Status */}
        <div
          className={`flex items-center gap-5 md:gap-8 text-[11px] md:text-xs font-semibold ${theme.textSubtle} font-mono tracking-wider`}
        >
          <div className="flex items-center gap-2 hover:text-zinc-300 transition-colors cursor-crosshair">
            <ShieldCheck size={14} className="opacity-70" />
            <span className="hidden sm:inline">SECURE</span>
          </div>

          <div className="flex items-center gap-2 hover:text-zinc-300 transition-colors cursor-crosshair">
            <Wifi size={14} className="opacity-70" />
            <span className="hidden sm:inline">24ms</span>
          </div>

          <div className={`flex items-center gap-2 ${theme.textHighlight}`}>
            <Activity size={14} />
            <span>SYSTEM ONLINE</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
