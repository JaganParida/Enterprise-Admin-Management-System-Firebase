import React from "react";
import { AlertTriangle } from "lucide-react"; // Removed X icon
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

  // --- 💎 PREMIUM CENTERED GLASS THEMES (NO SHADOWS) ---
  const theme = isTransport
    ? {
        // 🚛 TRANSPORT THEME (Deep Navy/Blue)
        overlay: "bg-[#020617]/85",
        modalBg: "bg-[#050b14]/70 border-white/10",
        glowTop: "bg-blue-500/15",
        glowBottom: "bg-indigo-500/10",
        iconSafeBg:
          "bg-gradient-to-br from-blue-500/20 to-blue-900/20 border border-blue-500/30 text-blue-400",
        textMsg: "text-blue-100/60",
        btnConfirmSafe:
          "bg-blue-500 hover:bg-blue-400 text-[#020617] font-bold",
        topHighlight: "via-blue-500/50",
      }
    : {
        // 🏢 ENTERPRISE THEME (Deep Emerald/Black) - BEST LOOK
        overlay: "bg-[#020403]/85",
        modalBg: "bg-[#050a08]/70 border-white/10",
        glowTop: "bg-emerald-500/20",
        glowBottom: "bg-teal-500/10",
        iconSafeBg:
          "bg-gradient-to-br from-emerald-500/20 to-emerald-900/20 border border-emerald-500/30 text-emerald-400",
        textMsg: "text-emerald-100/60",
        btnConfirmSafe:
          "bg-emerald-500 hover:bg-emerald-400 text-[#020403] font-bold",
        topHighlight: "via-emerald-500/50",
      };

  // --- 🚨 DESTRUCTIVE THEME (Red - Used for Delete) ---
  const destructiveTheme = {
    iconBg:
      "bg-gradient-to-br from-rose-500/20 to-rose-900/20 border border-rose-500/30 text-rose-400",
    btnConfirm: "bg-rose-500 hover:bg-rose-400 text-white font-bold",
    glowTop: "bg-rose-500/15",
    glowBottom: "bg-rose-600/10",
    topHighlight: "via-rose-500/50",
  };

  return (
    <div
      className={`fixed inset-0 w-screen h-screen h-[100dvh] z-[9999] flex items-center justify-center p-4 sm:p-6 ${theme.overlay} backdrop-blur-md animate-in fade-in duration-300`}
    >
      {/* Background Overlay Click to Close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Glassy Modal Box - Centered Layout */}
      <div
        className={`relative w-full max-w-[380px] rounded-[28px] border backdrop-blur-3xl overflow-hidden animate-in zoom-in-95 duration-300 ${theme.modalBg}`}
        role="dialog"
        aria-modal="true"
      >
        {/* --- Crisp Top Border Highlight --- */}
        <div
          className={`absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent ${
            isDestructive ? destructiveTheme.topHighlight : theme.topHighlight
          } to-transparent opacity-50`}
        />

        {/* --- Ambient Background Glows --- */}
        <div
          className={`absolute -top-20 -left-20 w-56 h-56 blur-[80px] rounded-full pointer-events-none transition-colors duration-500 ${
            isDestructive ? destructiveTheme.glowTop : theme.glowTop
          }`}
        />
        <div
          className={`absolute -bottom-20 -right-20 w-56 h-56 blur-[80px] rounded-full pointer-events-none transition-colors duration-500 ${
            isDestructive ? destructiveTheme.glowBottom : theme.glowBottom
          }`}
        />

        {/* --- Content Container --- */}
        <div className="relative z-10 flex flex-col items-center text-center p-8">
          {/* Centered Icon (Removed X, made this the hero element) */}
          <div
            className={`w-16 h-16 rounded-[20px] flex items-center justify-center mb-6 ${
              isDestructive ? destructiveTheme.iconBg : theme.iconSafeBg
            }`}
          >
            <AlertTriangle size={32} strokeWidth={1.5} />
          </div>

          {/* Typography */}
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
            {title}
          </h2>
          <p
            className={`text-sm leading-relaxed font-medium mb-8 ${theme.textMsg}`}
          >
            {message}
          </p>

          {/* Buttons (Side-by-side, 50% width each, purely flat) */}
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl font-semibold text-sm transition-colors bg-white/[0.05] border border-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            >
              {cancelText}
            </button>

            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 py-3.5 rounded-xl text-sm transition-all duration-300 transform active:scale-95 ${
                isDestructive
                  ? destructiveTheme.btnConfirm
                  : theme.btnConfirmSafe
              }`}
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
