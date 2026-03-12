import React from "react";
import { AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import { useLocation } from "react-router-dom";

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = true,
}) => {
  const location = useLocation();
  if (!isOpen) return null;

  // 🔥 FOUC Fix
  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const themes = {
    destructive: {
      iconBg: "bg-red-500/10 text-red-500 border-red-500/20",
      btnConfirm: "bg-red-600 text-white hover:bg-red-500",
      Icon: Trash2,
    },
    enterprise: isTransport
      ? {
          iconBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          btnConfirm:
            "bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500",
          Icon: CheckCircle2,
        }
      : {
          iconBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
          btnConfirm:
            "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500",
          Icon: CheckCircle2,
        },
  };

  const activeTheme = isDestructive ? themes.destructive : themes.enterprise;
  const ActiveIcon = isDestructive ? AlertTriangle : activeTheme.Icon;

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative w-full max-w-[400px] rounded-2xl border border-zinc-800/60 bg-[#09090B] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="relative z-10 flex flex-col items-center text-center p-6">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 border ${activeTheme.iconBg}`}
          >
            <ActiveIcon size={24} strokeWidth={2} />
          </div>

          <h2 className="text-xl font-bold tracking-tight mb-2 text-white">
            {title}
          </h2>
          <p className="text-sm leading-relaxed mb-6 text-zinc-400">
            {message}
          </p>

          <div className="flex items-center gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors bg-transparent border border-zinc-800 text-zinc-400 hover:bg-zinc-900/50 hover:text-white"
            >
              {cancelText}
            </button>

            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${activeTheme.btnConfirm}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
