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

  // 🔥 Instantly read URL to prevent FOUC
  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  // Dynamic themes based on route
  const variants = {
    primary: isTransport
      ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-900/20 border border-transparent"
      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-900/20 border border-transparent",
    secondary: isTransport
      ? "bg-[#09090B] border border-blue-900/30 text-blue-100/80 hover:bg-blue-900/20 hover:text-white hover:border-blue-500/30"
      : "bg-[#09090B] border border-indigo-900/30 text-indigo-100/80 hover:bg-indigo-900/20 hover:text-white hover:border-indigo-500/30",
    danger:
      "bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40",
    success: isTransport
      ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20 border border-transparent"
      : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 border border-transparent",
    outline: isTransport
      ? "bg-transparent border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
      : "bg-transparent border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]",
    ghost: isTransport
      ? "bg-transparent text-blue-400 hover:bg-blue-500/10"
      : "bg-transparent text-indigo-400 hover:bg-indigo-500/10",
    module: isTransport
      ? "bg-blue-950/30 border border-blue-500/40 text-white shadow-[0_8px_20px_-6px_rgba(59,130,246,0.2)] hover:bg-blue-900/40 hover:border-blue-400/60 hover:shadow-[0_8px_25px_-6px_rgba(59,130,246,0.35)]"
      : "bg-indigo-950/30 border border-indigo-500/40 text-white shadow-[0_8px_20px_-6px_rgba(99,102,241,0.2)] hover:bg-indigo-900/40 hover:border-indigo-400/60 hover:shadow-[0_8px_25px_-6px_rgba(99,102,241,0.35)]",
  };

  return (
    <button
      className={`relative px-5 py-3 rounded-2xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-3 transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader className="animate-spin" size={18} />}
      {children}
    </button>
  );
};

export default Button;
