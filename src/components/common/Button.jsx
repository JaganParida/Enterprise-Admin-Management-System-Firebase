import React from "react";
import { Loader } from "lucide-react";
import { useLocation } from "react-router-dom";

const Button = ({
  children,
  variant = "primary",
  className = "",
  isLoading = false,
  ...props
}) => {
  const location = useLocation();
  const isTransport = location.pathname.includes("/transportation");

  // Dynamic Variants based on route
  const variants = isTransport
    ? {
        // --- TRANSPORT THEME (Blue/Indigo) ---
        primary:
          "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/20 border border-transparent",
        secondary:
          "bg-[#020617] border border-blue-900/30 text-blue-100/80 hover:bg-blue-900/20 hover:text-white hover:border-blue-500/30",
        danger:
          "bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40",
        success:
          "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20 border border-transparent",
        outline:
          "bg-transparent border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]",
        ghost: "bg-transparent text-blue-400 hover:bg-blue-500/10",
      }
    : {
        // --- ENTERPRISE THEME (Emerald/Teal) ---
        primary:
          "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/20 border border-transparent",
        secondary:
          "bg-[#050a08] border border-emerald-900/30 text-emerald-100/80 hover:bg-emerald-900/20 hover:text-white hover:border-emerald-500/30",
        danger:
          "bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40",
        success:
          "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 border border-transparent",
        outline:
          "bg-transparent border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]",
        ghost: "bg-transparent text-emerald-400 hover:bg-emerald-500/10",
      };

  return (
    <button
      className={`relative px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader className="animate-spin" size={16} />}
      {children}
    </button>
  );
};

export default Button;
