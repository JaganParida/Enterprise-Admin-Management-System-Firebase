import React, { useEffect, useState, useMemo, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../../config/firebase";
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  reauthenticateWithPopup,
} from "firebase/auth";
import {
  LayoutDashboard,
  Package,
  Factory,
  ShoppingCart,
  FileText,
  Users,
  Truck,
  Zap,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Languages,
  Lock,
  Key,
  Save,
  Eye,
  EyeOff,
  ShieldCheck,
  Timer,
  RefreshCcw,
  AlertTriangle,
  Home,
  Fuel,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIProvider";
import Button from "../common/Button";
import Input from "../common/Input";

const useThemeColors = () => {
  const location = useLocation();
  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;

  const isTransport = currentPath.includes("/transportation");

  return {
    isTransport,
    colors: isTransport
      ? {
          bgMain: "bg-[#09090B]/95 supports-[backdrop-filter]:bg-[#09090B]/80",
          border: "border-white/10",
          textSubtle: "text-zinc-400",
          textHighlight: "text-cyan-400",
          icon: "text-cyan-500",
          hoverBg: "hover:bg-cyan-500/10",
          hoverText: "hover:text-cyan-50",
          activeBg: "bg-cyan-500/15",
          activeBorder: "border-cyan-500/30",
          activeIndicator: "bg-cyan-400",
          activeText: "text-cyan-300",
          toggleBtn: "bg-[#09090B] hover:bg-zinc-800 border-white/10",
          logoBg:
            "bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-900/30",
          scrollThumb: "bg-zinc-800 hover:bg-zinc-700",
          modalBorder: "border-zinc-800",
          strengthGood: "text-cyan-400",
          strengthStrong: "bg-cyan-500",
          inputIcon: "text-zinc-500 hover:text-zinc-300",
          gradientBtn:
            "from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500",
          shadowGlow: "shadow-[0_0_30px_rgba(6,182,212,0.15)]",
        }
      : {
          bgMain: "bg-[#09090B]/95 supports-[backdrop-filter]:bg-[#09090B]/80",
          border: "border-white/10",
          textSubtle: "text-zinc-400",
          textHighlight: "text-indigo-400",
          icon: "text-indigo-500",
          hoverBg: "hover:bg-indigo-500/10",
          hoverText: "hover:text-indigo-50",
          activeBg: "bg-indigo-500/15",
          activeBorder: "border-indigo-500/30",
          activeIndicator: "bg-indigo-400",
          activeText: "text-indigo-300",
          toggleBtn: "bg-[#09090B] hover:bg-zinc-800 border-white/10",
          logoBg:
            "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/30",
          scrollThumb: "bg-zinc-800 hover:bg-zinc-700",
          modalBorder: "border-zinc-800",
          strengthGood: "text-indigo-400",
          strengthStrong: "bg-indigo-500",
          inputIcon: "text-zinc-500 hover:text-zinc-300",
          gradientBtn:
            "from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500",
          shadowGlow: "shadow-[0_0_30px_rgba(99,102,241,0.15)]",
        },
  };
};

const GoogleTranslate = ({ isCollapsed }) => {
  const { colors } = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const languages = [
    { code: "en", name: "English (Default)" },
    { code: "hi", name: "Hindi" },
    { code: "or", name: "Odia" },
    { code: "bn", name: "Bengali" },
    { code: "te", name: "Telugu" },
    { code: "mr", name: "Marathi" },
    { code: "ta", name: "Tamil" },
    { code: "gu", name: "Gujarati" },
    { code: "kn", name: "Kannada" },
    { code: "ml", name: "Malayalam" },
    { code: "pa", name: "Punjabi" },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .goog-te-banner-frame { display: none !important; }
      .skiptranslate { display: none !important; }
      body { top: 0px !important; }
      #goog-gt-tt { display: none !important; }
    `;
    document.head.appendChild(style);

    const addScript = () => {
      if (document.getElementById("google-translate-script")) return;
      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            layout:
              window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
          },
          "google_translate_element",
        );
      };
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src =
        "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    };

    addScript();
  }, []);

  const changeLanguage = (langCode) => {
    document.cookie = `googtrans=/en/${langCode}; path=/`;
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname}`;

    const select = document.querySelector(".goog-te-combo");
    if (select) {
      select.value = langCode;
      const event = new Event("change", { bubbles: true, cancelable: true });
      select.dispatchEvent(event);
    } else {
      window.location.reload();
    }
    setIsOpen(false);
  };

  const resetTranslation = () => {
    document.cookie = `googtrans=/en/en; path=/`;
    document.cookie = `googtrans=/en/en; path=/; domain=${window.location.hostname}`;

    const select = document.querySelector(".goog-te-combo");
    if (select) {
      select.value = "en";
      const event = new Event("change", { bubbles: true, cancelable: true });
      select.dispatchEvent(event);
    } else {
      window.location.reload();
    }
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className={`px-3 py-4 border-t ${colors.border} mt-auto relative ${isCollapsed ? "flex justify-center" : ""}`}
    >
      <div
        id="google_translate_element"
        className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden z-[-1]"
      ></div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`absolute bottom-[110%] ${isCollapsed ? "left-2 w-44" : "left-3 right-3"} bg-[#09090B]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[300px]`}
          >
            <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Language
              </span>
              <button
                type="button"
                onClick={resetTranslation}
                className="text-[9px] font-bold uppercase text-rose-400 hover:text-rose-300 transition-colors"
              >
                Reset
              </button>
            </div>
            <div className="overflow-y-auto py-1 custom-scrollbar">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => changeLanguage(lang.code)}
                  className="w-full text-left px-4 py-2.5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 w-full rounded-xl transition-all duration-200 group ${colors.hoverBg} ${isCollapsed ? "p-3 justify-center w-11 h-11" : "px-4 py-3"}`}
      >
        <Languages
          size={20}
          className={`${colors.textSubtle} group-hover:${colors.textHighlight} transition-colors`}
        />
        {!isCollapsed && (
          <span
            className={`text-sm font-medium ${colors.textSubtle} group-hover:text-zinc-100`}
          >
            Translate
          </span>
        )}
      </button>
    </div>
  );
};

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { toast } = useUI();
  const { colors, isTransport } = useThemeColors();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasPassword, setHasPassword] = useState(false); // 👈 Updated State

  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // 🚀 Check if the user specifically has an Email/Password provider
  useEffect(() => {
    if (isOpen && auth.currentUser) {
      const hasPass = auth.currentUser.providerData.some(
        (p) => p.providerId === "password",
      );
      setHasPassword(hasPass);
    }
  }, [isOpen]);

  const strength = useMemo(() => {
    let score = 0;
    if (formData.newPassword.length > 7) score++;
    if (/[A-Z]/.test(formData.newPassword)) score++;
    if (/[0-9]/.test(formData.newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(formData.newPassword)) score++;
    return score;
  }, [formData.newPassword]);

  const strengthData = [
    { label: "Very Weak", color: "bg-rose-900" },
    { label: "Weak", color: "bg-rose-500" },
    { label: "Fair", color: "bg-amber-500" },
    { label: "Good", color: isTransport ? "bg-cyan-400" : "bg-indigo-400" },
    { label: "Strong", color: isTransport ? "bg-cyan-500" : "bg-violet-500" },
  ];

  const isMatch =
    formData.newPassword.length > 0 &&
    formData.newPassword === formData.confirmPassword;

  const handleModalClose = () => {
    setStep(1);
    setFormData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    setShowOld(false);
    setShowNew(false);
    setShowConfirm(false);
    onClose();
  };

  // 🚀 UPDATED VERIFICATION LOGIC
  const handleVerifyCurrentPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    const user = auth.currentUser;

    try {
      if (!user) throw new Error("No active user session.");

      if (hasPassword) {
        // Force email/password verification if they have a password set
        if (!formData.oldPassword) {
          toast.error("Please enter current password.");
          setLoading(false);
          return;
        }
        const credential = EmailAuthProvider.credential(
          user.email,
          formData.oldPassword,
        );
        await reauthenticateWithCredential(user, credential);
      } else {
        // ONLY use Google popup if they have NO password set at all
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      }
      setStep(2);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Authentication failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!isMatch) return toast.error("Confirmation password does not match.");
    if (strength < 3) return toast.error("Password is too weak.");

    // 🚀 THE BULLETPROOF CHECK
    if (hasPassword && formData.oldPassword === formData.newPassword) {
      return toast.error(
        "New password cannot be the same as your current password.",
      );
    }

    setLoading(true);
    const user = auth.currentUser;
    try {
      if (!user) throw new Error("No active user session.");

      await updatePassword(user, formData.newPassword);

      toast.success(
        "Password updated successfully! You can now login with Email & Password.",
      );
      handleModalClose();
    } catch (error) {
      if (error.code === "auth/requires-recent-login") {
        toast.error(
          "Session expired. Please log out and log back in to change your password.",
        );
      } else {
        toast.error(error.message || "Failed to update password. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fadeVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    },
    exit: { opacity: 0, y: -15, transition: { duration: 0.2, ease: "easeIn" } },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={handleModalClose}
          />

          <motion.div
            initial={{ scale: 0.98, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 10 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className={`w-full max-w-md bg-[#09090B] border border-white/10 p-6 md:p-8 rounded-[24px] shadow-2xl relative z-10 flex flex-col`}
          >
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="w-[80px]">
                {step === 2 && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors py-1 pl-1 pr-2 rounded-lg hover:bg-white/5"
                  >
                    <ChevronLeft size={16} /> Back
                  </button>
                )}
              </div>
              <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                  Step {step} of 2
                </span>
              </div>
              <div className="w-[80px] flex justify-end">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="p-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="text-center mb-8 relative z-10">
              <div
                className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-4 border ${colors.activeBorder} ${colors.activeBg} ${colors.shadowGlow}`}
              >
                {step === 1 ? (
                  <Key size={22} className={colors.textHighlight} />
                ) : (
                  <ShieldCheck size={22} className={colors.textHighlight} />
                )}
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-2">
                {step === 1 ? "Verify Identity" : "New Password"}
              </h3>
              <p className="text-sm text-zinc-400 px-4">
                {step === 1
                  ? !hasPassword
                    ? "Verify your Google account to set a password."
                    : "For your security, please confirm your current password."
                  : "Create a strong new password to secure your account."}
              </p>
            </div>

            <div className="relative z-10">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.form
                    key="step1"
                    variants={fadeVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onSubmit={handleVerifyCurrentPassword}
                    className="space-y-6"
                  >
                    {/* Only show Old Password input if they have a password set */}
                    {hasPassword && (
                      <div className="relative group">
                        <Input
                          label="Current Password"
                          type={showOld ? "text" : "password"}
                          icon={Key}
                          required
                          value={formData.oldPassword}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              oldPassword: e.target.value,
                            })
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setShowOld(!showOld)}
                          className={`absolute right-4 top-[38px] ${colors.inputIcon}`}
                        >
                          {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={
                        loading || (hasPassword && !formData.oldPassword)
                      }
                      className={`w-full bg-white text-black font-semibold py-3.5 rounded-xl shadow-lg transition-all hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group`}
                    >
                      {loading ? (
                        <RefreshCcw className="animate-spin" size={18} />
                      ) : (
                        <>
                          {!hasPassword ? "Verify with Google" : "Continue"}
                          <ArrowRight
                            size={16}
                            className="group-hover:translate-x-1 transition-transform"
                          />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}

                {step === 2 && (
                  <motion.form
                    key="step2"
                    variants={fadeVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onSubmit={handleUpdatePassword}
                    className="space-y-5"
                  >
                    <div className="relative group">
                      <Input
                        label="New Password"
                        type={showNew ? "text" : "password"}
                        icon={Lock}
                        required
                        value={formData.newPassword}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            newPassword: e.target.value,
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className={`absolute right-4 top-[38px] ${colors.inputIcon}`}
                      >
                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>

                      <div className="mt-3">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest mb-1.5">
                          <span className="text-zinc-500">Strength</span>
                          <span
                            className={
                              strength > 2
                                ? colors.strengthGood
                                : "text-rose-400"
                            }
                          >
                            {formData.newPassword
                              ? strengthData[strength].label
                              : "None"}
                          </span>
                        </div>
                        <div className="flex gap-1 h-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={`flex-1 rounded-full transition-all duration-300 ${formData.newPassword && strength >= i ? strengthData[strength].color : "bg-white/10"}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="relative group mt-2">
                      <Input
                        label="Confirm New Password"
                        type={showConfirm ? "text" : "password"}
                        icon={(p) => (
                          <CheckCircle2
                            {...p}
                            className={`${p.className} ${isMatch ? "!text-emerald-500" : ""}`}
                          />
                        )}
                        required
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            confirmPassword: e.target.value,
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className={`absolute right-4 top-[38px] ${colors.inputIcon}`}
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !isMatch}
                      className={`w-full mt-4 bg-gradient-to-r ${colors.gradientBtn} text-white font-bold py-3.5 rounded-xl shadow-lg border border-white/10 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2`}
                    >
                      {loading ? (
                        <RefreshCcw className="animate-spin" size={18} />
                      ) : (
                        <>
                          <Save size={18} /> Update Password
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Sidebar = ({
  isMobileOpen,
  setIsMobileOpen,
  isCollapsed,
  setIsCollapsed,
}) => {
  const { logout } = useAuth();
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const { isTransport, colors } = useThemeColors();
  const navigate = useNavigate();

  const enterpriseLinks = [
    {
      path: "/enterprise/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    { path: "/enterprise/stock", label: "Purchasing Items", icon: Package },
    { path: "/enterprise/production", label: "Production", icon: Factory },
    { path: "/enterprise/sales", label: "Sales Tracking", icon: ShoppingCart },
    { path: "/enterprise/invoices", label: "Invoices", icon: FileText },
    { path: "/enterprise/employees", label: "Employees", icon: Users },
  ];

  const transportationLinks = [
    {
      path: "/transportation/dashboard",
      label: "Fleet View",
      icon: LayoutDashboard,
    },
    { path: "/transportation/logs", label: "Vehicle Logs", icon: Truck },
    { path: "/transportation/fuel", label: "Fuel Tracker", icon: Fuel },
    {
      path: "/transportation/maintenance",
      label: "Maintenance",
      icon: AlertTriangle,
    },
    { path: "/transportation/jcb", label: "JCB Tracking", icon: Timer },
  ];

  const sharedLinks = [
    { path: "/electricity", label: "Electric Bill", icon: Zap },
  ];
  const allLinks = isTransport
    ? transportationLinks
    : [...enterpriseLinks, ...sharedLinks];

  return (
    <>
      <aside
        className={`fixed top-0 left-0 h-full ${colors.bgMain} backdrop-blur-2xl border-r ${colors.border} text-white z-50 transition-all duration-300 flex flex-col ${
          isMobileOpen
            ? "translate-x-0 w-64 shadow-2xl"
            : "-translate-x-full md:translate-x-0"
        } ${isCollapsed ? "md:w-20" : "md:w-64"}`}
      >
        <div
          className={`h-16 md:h-20 flex items-center ${isCollapsed ? "justify-center" : "px-6 justify-between"} border-b ${colors.border} shrink-0 transition-all`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 transition-all duration-500 text-white ${colors.logoBg} ring-1 ring-white/10`}
            >
              {isTransport ? "T" : "E"}
            </div>

            {!isCollapsed && (
              <div className="flex flex-col">
                <h1 className="font-semibold text-sm md:text-base text-zinc-100 tracking-tight">
                  {isTransport ? "Transport" : "Enterprise"}
                </h1>
                <p
                  className={`text-[9px] uppercase tracking-[0.2em] font-bold ${colors.textHighlight}`}
                >
                  Portal Hub
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className={`md:hidden p-2 rounded-lg text-zinc-400 hover:text-white ${colors.hoverBg} transition-colors`}
          >
            <X size={20} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden md:flex absolute -right-3 top-24 w-6 h-6 rounded-full items-center justify-center border shadow-md z-50 transition-all duration-200 text-zinc-400 hover:text-white hover:scale-110 ${colors.toggleBtn}`}
        >
          {isCollapsed ? (
            <ChevronRight size={14} strokeWidth={3} />
          ) : (
            <ChevronLeft size={14} strokeWidth={3} />
          )}
        </button>

        <nav className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
          <ul className="space-y-1.5">
            {allLinks.map((item) => (
              <li key={item.path} className="relative group/navitem">
                <NavLink
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl transition-all duration-200 relative overflow-hidden ${
                      isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3"
                    } ${
                      isActive
                        ? `${colors.activeBg} border ${colors.activeBorder} text-white font-medium`
                        : `text-zinc-400 hover:text-zinc-100 ${colors.hoverBg} border border-transparent`
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="activeNavIndicator"
                          className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${colors.activeIndicator}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}

                      <item.icon
                        size={20}
                        strokeWidth={isActive ? 2.5 : 2}
                        className={`shrink-0 transition-colors duration-200 ${
                          isActive
                            ? colors.activeText
                            : `group-hover/navitem:${colors.textHighlight}`
                        }`}
                      />

                      {!isCollapsed && (
                        <span className="text-sm whitespace-nowrap">
                          {item.label}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <GoogleTranslate isCollapsed={isCollapsed} />

        <div
          className={`p-4 border-t ${colors.border} space-y-1.5 bg-black/20`}
        >
          <NavLink
            to="/"
            className={`w-full flex items-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200 active:scale-95 group ${isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3"}`}
          >
            <Home
              size={18}
              className="shrink-0 group-hover:scale-110 transition-transform"
            />
            {!isCollapsed && (
              <span className="font-medium text-sm">Back to Home</span>
            )}
          </NavLink>

          <button
            type="button"
            onClick={() => setIsPassModalOpen(true)}
            className={`w-full flex items-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200 active:scale-95 group ${isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3"}`}
          >
            <Lock
              size={18}
              className="shrink-0 group-hover:scale-110 transition-transform"
            />
            {!isCollapsed && (
              <span className="font-medium text-sm">Security</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/");
            }}
            className={`w-full flex items-center rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 active:scale-95 group ${isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3"}`}
          >
            <LogOut
              size={18}
              className="shrink-0 group-hover:-translate-x-1 transition-transform"
            />
            {!isCollapsed && (
              <span className="font-medium text-sm">Sign Out</span>
            )}
          </button>
        </div>
      </aside>

      <ChangePasswordModal
        isOpen={isPassModalOpen}
        onClose={() => setIsPassModalOpen(false)}
      />
    </>
  );
};

export default Sidebar;
