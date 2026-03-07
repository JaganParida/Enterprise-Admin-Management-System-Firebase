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
  const isTransport = location.pathname.includes("/transportation");

  if (!isOpen) return null;

  // 💎 PREMIUM GLASSY THEMES CONFIGURATION
  const themes = {
    destructive: {
      overlay: "bg-black/70",
      modalBg:
        "bg-[#0a0505]/80 border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.1)]",
      glowTop: "bg-rose-500/20",
      glowBottom: "bg-red-600/10",
      iconBg:
        "bg-rose-500/10 border border-rose-500/20 text-rose-500 shadow-inner",
      titleText: "text-rose-50",
      messageText: "text-rose-100/60",
      btnCancel:
        "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white",
      btnConfirm:
        "bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white shadow-[0_0_15px_rgba(244,63,94,0.2)]",
      topHighlight: "via-rose-500/50",
      Icon: Trash2,
    },
    enterprise: {
      overlay: "bg-[#020403]/80",
      modalBg:
        "bg-[#050a08]/80 border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)]",
      glowTop: "bg-emerald-500/20",
      glowBottom: "bg-teal-500/10",
      iconBg:
        "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shadow-inner",
      titleText: "text-emerald-50",
      messageText: "text-emerald-100/60",
      btnCancel:
        "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white",
      btnConfirm:
        "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-[#020403] shadow-[0_0_15px_rgba(16,185,129,0.2)]",
      topHighlight: "via-emerald-500/50",
      Icon: CheckCircle2,
    },
    transport: {
      overlay: "bg-[#020617]/80",
      modalBg:
        "bg-[#050b14]/80 border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.1)]",
      glowTop: "bg-blue-500/20",
      glowBottom: "bg-indigo-500/10",
      iconBg:
        "bg-blue-500/10 border border-blue-500/20 text-blue-500 shadow-inner",
      titleText: "text-blue-50",
      messageText: "text-blue-100/60",
      btnCancel:
        "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white",
      btnConfirm:
        "bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]",
      topHighlight: "via-blue-500/50",
      Icon: CheckCircle2,
    },
  };

  // Switch Theme Dynamically
  const activeTheme = isDestructive
    ? themes.destructive
    : isTransport
      ? themes.transport
      : themes.enterprise;

  const ActiveIcon = isDestructive ? AlertTriangle : activeTheme.Icon;

  return (
    <div
      className={`fixed inset-0 w-screen h-[100dvh] z-[9999] flex items-center justify-center p-4 sm:p-6 ${activeTheme.overlay} backdrop-blur-md animate-in fade-in duration-300`}
    >
      {/* Background Overlay Click to Close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Glassy Modal Box - Centered Layout */}
      <div
        className={`relative w-full max-w-[380px] rounded-[28px] border backdrop-blur-3xl overflow-hidden animate-in zoom-in-95 duration-300 ${activeTheme.modalBg}`}
        role="dialog"
        aria-modal="true"
      >
        {/* --- Crisp Top Border Highlight --- */}
        <div
          className={`absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent ${activeTheme.topHighlight} to-transparent opacity-50`}
        />

        {/* --- Ambient Background Glows --- */}
        <div
          className={`absolute -top-20 -left-20 w-56 h-56 blur-[80px] rounded-full pointer-events-none transition-colors duration-500 ${activeTheme.glowTop}`}
        />
        <div
          className={`absolute -bottom-20 -right-20 w-56 h-56 blur-[80px] rounded-full pointer-events-none transition-colors duration-500 ${activeTheme.glowBottom}`}
        />

        {/* --- Content Container --- */}
        <div className="relative z-10 flex flex-col items-center text-center p-8">
          {/* Centered Icon */}
          <div
            className={`w-16 h-16 rounded-[20px] flex items-center justify-center mb-6 ${activeTheme.iconBg}`}
          >
            <ActiveIcon size={32} strokeWidth={1.5} />
          </div>

          {/* Typography */}
          <h2
            className={`text-2xl font-bold tracking-tight mb-2 ${activeTheme.titleText}`}
          >
            {title}
          </h2>
          <p
            className={`text-sm leading-relaxed font-medium mb-8 ${activeTheme.messageText}`}
          >
            {message}
          </p>

          {/* Buttons (Side-by-side) */}
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={onClose}
              className={`flex-1 py-3.5 rounded-xl font-semibold text-sm transition-colors ${activeTheme.btnCancel}`}
            >
              {cancelText}
            </button>

            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 transform active:scale-95 ${activeTheme.btnConfirm}`}
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
