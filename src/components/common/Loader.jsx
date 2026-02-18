import React from "react";
import { useLocation } from "react-router-dom";

const Loader = ({
  size = "md",
  fullScreen = false,
  text = "Loading System...",
}) => {
  const location = useLocation();
  const isTransport = location.pathname.includes("/transportation");

  // Dynamic Theme Colors
  const theme = isTransport
    ? {
        outerRing:
          "border-blue-500/20 border-t-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]",
        innerRing: "border-b-indigo-600",
        centerDot: "bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]",
        text: "text-blue-500/60",
        bgScreen: "bg-[#020617]/90",
      }
    : {
        outerRing:
          "border-emerald-500/20 border-t-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]",
        innerRing: "border-b-emerald-600",
        centerDot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]",
        text: "text-emerald-500/60",
        bgScreen: "bg-[#020403]/90",
      };

  // Size classes
  const sizes = {
    sm: "h-6 w-6 border-2",
    md: "h-12 w-12 border-[3px]",
    lg: "h-20 w-20 border-4",
  };

  const spinner = (
    <div className="relative flex flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center">
        {/* Outer Ring with Glow */}
        <div
          className={`animate-spin rounded-full ${sizes[size]} border-transparent ${theme.outerRing}`}
        ></div>

        {/* Inner Ring (Reverse Spin) */}
        <div
          className={`absolute animate-spin-slow-reverse rounded-full ${
            size === "lg" ? "h-12 w-12" : size === "md" ? "h-8 w-8" : "h-4 w-4"
          } border-2 border-transparent ${theme.innerRing} opacity-80`}
        ></div>

        {/* Center Tech Dot */}
        <div
          className={`absolute w-1.5 h-1.5 rounded-full animate-pulse ${theme.centerDot}`}
        ></div>
      </div>

      {/* Loading Text */}
      <p
        className={`${theme.text} text-[10px] font-mono uppercase tracking-[0.3em] animate-pulse`}
      >
        {text}
      </p>
    </div>
  );

  // Case 1: Full Screen Overlay
  if (fullScreen) {
    return (
      <div
        className={`fixed inset-0 ${theme.bgScreen} backdrop-blur-md z-[9999] flex items-center justify-center transition-all duration-500`}
      >
        {spinner}
      </div>
    );
  }

  // Case 2: Content Loader
  return (
    <div className="flex items-center justify-center w-full min-h-[60vh] animate-in fade-in zoom-in-95 duration-300">
      {spinner}
    </div>
  );
};

export default Loader;
