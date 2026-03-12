import React from "react";
import { useLocation } from "react-router-dom";

const Loader = ({ size = "md", fullScreen = false, text = "Loading..." }) => {
  const location = useLocation();

  // 🔥 FOUC Fix
  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const theme = isTransport
    ? {
        spinner: "border-[#1E293B] border-t-cyan-500",
        text: "text-cyan-400",
      }
    : {
        spinner: "border-[#1E293B] border-t-indigo-500",
        text: "text-indigo-400",
      };

  const sizes = {
    sm: "h-5 w-5 border-2",
    md: "h-8 w-8 border-[3px]",
    lg: "h-12 w-12 border-4",
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`animate-spin rounded-full ${sizes[size]} ${theme.spinner}`}
      ></div>
      {text && (
        <p className={`text-xs font-medium tracking-wide ${theme.text}`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-[#09090B]/90 backdrop-blur-sm z-[9999] flex items-center justify-center transition-all duration-300">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full min-h-[40vh]">
      {spinner}
    </div>
  );
};

export default Loader;
