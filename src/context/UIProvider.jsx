import React, { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

const UIContext = createContext();

// --- 1. THE VISUAL COMPONENTS ---

// A. Toast Notification Component
const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-right-full duration-300 ${
          t.type === "success"
            ? "bg-[#050a08]/95 border-emerald-500/30 text-emerald-400"
            : t.type === "error"
              ? "bg-[#0a0202]/95 border-rose-500/30 text-rose-400"
              : "bg-[#050a08]/95 border-blue-500/30 text-blue-400"
        }`}
        style={{ minWidth: "300px" }}
      >
        <div
          className={`p-1 rounded-full ${
            t.type === "success"
              ? "bg-emerald-500/10"
              : t.type === "error"
                ? "bg-rose-500/10"
                : "bg-blue-500/10"
          }`}
        >
          {t.type === "success" && <CheckCircle size={18} />}
          {t.type === "error" && <AlertCircle size={18} />}
          {t.type === "info" && <Info size={18} />}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold capitalize">{t.type}</h4>
          <p className="text-xs opacity-80">{t.message}</p>
        </div>
        <button
          onClick={() => removeToast(t.id)}
          className="opacity-50 hover:opacity-100 transition-opacity"
        >
          <X size={16} />
        </button>
      </div>
    ))}
  </div>
);

// B. Confirmation Modal Component
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#050a08] border border-emerald-900/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="p-4 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20 shadow-inner shadow-amber-900/20">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-emerald-100/50 text-sm">{message}</p>
          </div>
          <div className="flex gap-3 w-full mt-4">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-emerald-900/30 text-emerald-100/60 hover:text-white hover:bg-emerald-900/20 transition-all font-bold text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-900/20 font-bold text-sm transition-all"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 2. THE PROVIDER LOGIC ---

export const UIProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: "",
    message: "",
    resolve: null,
  });

  // Toast Logic
  const showToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const toast = {
    success: (msg) => showToast(msg, "success"),
    error: (msg) => showToast(msg, "error"),
    info: (msg) => showToast(msg, "info"),
  };

  // Confirm Logic
  const confirm = useCallback((title, message) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        resolve,
      });
    });
  }, []);

  const handleConfirm = () => {
    if (confirmState.resolve) confirmState.resolve(true);
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    if (confirmState.resolve) confirmState.resolve(false);
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}
      <ToastContainer
        toasts={toasts}
        removeToast={(id) =>
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }
      />
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </UIContext.Provider>
  );
};

export const useUI = () => useContext(UIContext);
