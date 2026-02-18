import React from "react";
import { useLocation } from "react-router-dom";

const Input = ({ label, error, icon: Icon, className = "", ...props }) => {
  const location = useLocation();
  const isTransport = location.pathname.includes("/transportation");

  // --- Dynamic Theme Configuration ---
  const theme = isTransport
    ? {
        label: "text-blue-200/40",
        iconDefault: "text-blue-900",
        iconFocus: "group-focus-within:text-blue-400",
        bg: "bg-[#02040a]/60",
        borderDefault: "border-blue-500/10",
        borderHover: "hover:border-blue-500/30",
        borderFocus: "focus:border-blue-500/50",
        ring: "focus:ring-blue-500/20",
        shadow: "focus:shadow-[0_0_20px_rgba(59,130,246,0.15)]",
        text: "text-blue-50",
        placeholder: "placeholder:text-blue-900/40",
      }
    : {
        label: "text-emerald-100/60",
        iconDefault: "text-emerald-800",
        iconFocus: "group-focus-within:text-emerald-500",
        bg: "bg-[#020403]/60",
        borderDefault: "border-emerald-900/40",
        borderHover: "hover:border-emerald-500/30",
        borderFocus: "focus:border-emerald-500/50",
        ring: "focus:ring-emerald-500/50",
        shadow: "focus:shadow-[0_0_15px_rgba(16,185,129,0.1)]",
        text: "text-emerald-50",
        placeholder: "placeholder:text-emerald-900/50",
      };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          className={`block text-[10px] font-black uppercase tracking-[0.15em] mb-2 ml-1 ${theme.label}`}
        >
          {label}
        </label>
      )}

      <div className="relative group">
        {Icon && (
          <div
            className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${theme.iconDefault} ${theme.iconFocus}`}
          >
            <Icon size={18} />
          </div>
        )}

        <input
          className={`w-full ${Icon ? "pl-11" : "px-4"} py-3.5 backdrop-blur-md border rounded-2xl outline-none transition-all duration-300 font-medium ${theme.bg} ${theme.text} ${theme.placeholder} 
            ${
              error
                ? "border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                : `${theme.borderDefault} ${theme.borderHover} ${theme.borderFocus} focus:ring-1 ${theme.ring} ${theme.shadow}`
            }
          `}
          {...props}
        />
      </div>

      {error && (
        <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider mt-2 flex items-center gap-1.5 ml-1 animate-in slide-in-from-top-1">
          <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
