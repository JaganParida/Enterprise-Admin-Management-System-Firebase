import React from "react";
import { useLocation } from "react-router-dom";

const Loader = ({
  size = "md",
  fullScreen = false,
  text = "Initializing...",
}) => {
  const location = useLocation();

  // 🔥 Dynamic Routing-based Theme
  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const theme = isTransport
    ? {
        primary: "border-t-[#0ea5e9]", // Cyan
        secondary: "border-b-[#0ea5e9]/30",
        glow: "shadow-[0_0_20px_rgba(14,165,233,0.3)]",
        text: "text-[#38bdf8]",
      }
    : {
        primary: "border-t-indigo-500", // Indigo
        secondary: "border-b-indigo-500/30",
        glow: "shadow-[0_0_20px_rgba(99,102,241,0.3)]",
        text: "text-indigo-400",
      };

  const sizes = {
    sm: "h-6 w-6 border-2",
    md: "h-12 w-12 border-[3px]",
    lg: "h-16 w-16 border-4",
  };

  const innerSizes = {
    sm: "h-3 w-3 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-[3px]",
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-5">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing ring */}
        <div
          className={`absolute animate-spin rounded-full ${sizes[size]} border-zinc-800/40 ${theme.primary} ${theme.secondary} ${theme.glow}`}
        ></div>
        {/* Inner fast-spinning ring */}
        <div
          className={`animate-[spin_0.5s_linear_infinite] rounded-full opacity-60 ${innerSizes[size]} border-transparent ${theme.primary}`}
        ></div>
      </div>

      {text && (
        <p
          className={`text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] animate-pulse ${theme.text}`}
        >
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-[#09090B]/90 backdrop-blur-md z-[9999] flex items-center justify-center transition-all duration-500">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full min-h-[40vh] animate-in fade-in duration-500">
      {spinner}
    </div>
  );
};

export default Loader;
