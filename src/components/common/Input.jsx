import React from "react";
import { useLocation } from "react-router-dom";

const Input = ({ label, error, icon: Icon, className = "", ...props }) => {
  const location = useLocation();

  // 🔥 FOUC Fix
  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const focusColor = isTransport
    ? "focus:border-blue-500/50 focus:ring-blue-500/50"
    : "focus:border-indigo-500/50 focus:ring-indigo-500/50";

  const iconFocus = isTransport
    ? "group-focus-within:text-blue-400"
    : "group-focus-within:text-indigo-400";

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">
          {label}
        </label>
      )}

      <div className="relative group">
        {Icon && (
          <div
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 text-zinc-500 ${
              !error ? iconFocus : ""
            }`}
          >
            <Icon size={18} />
          </div>
        )}

        <input
          className={`w-full ${
            Icon ? "pl-10" : "px-4"
          } py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl outline-none transition-all duration-200 text-zinc-100 placeholder:text-zinc-600 text-sm
            ${
              error
                ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                : `hover:border-zinc-700 focus:ring-1 ${focusColor}`
            }
          `}
          {...props}
        />
      </div>

      {error && (
        <p className="text-red-400 text-xs font-medium mt-1.5 ml-1">{error}</p>
      )}
    </div>
  );
};

export default Input;
