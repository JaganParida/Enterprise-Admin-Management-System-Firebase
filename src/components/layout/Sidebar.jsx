import React, { useEffect, useState, useMemo, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../../config/firebase";
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
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
          bgMain: "bg-[#09090B]",
          border: "border-white/5",
          textSubtle: "text-zinc-400",
          textHighlight: "text-blue-400",
          icon: "text-blue-500",
          hoverBg: "hover:bg-zinc-900/40",
          hoverText: "hover:text-zinc-200",
          activeBg: "bg-blue-500/10",
          activeBorder: "border-blue-500/20",
          activeText: "text-blue-400",
          toggleBtn: "bg-zinc-800 hover:bg-zinc-700",
          logoBg:
            "bg-gradient-to-br from-blue-500 to-cyan-600 shadow-blue-900/20",
          scrollThumb: "bg-zinc-800 hover:bg-zinc-700",
          modalBorder: "border-zinc-800",
          strengthGood: "text-blue-400",
          strengthStrong: "bg-blue-500",
          inputIcon: "text-zinc-500 hover:text-zinc-300",
          gradientBtn:
            "from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500",
          shadowGlow: "shadow-[0_0_30px_rgba(59,130,246,0.15)]",
        }
      : {
          bgMain: "bg-[#09090B]",
          border: "border-white/5",
          textSubtle: "text-zinc-400",
          textHighlight: "text-indigo-400",
          icon: "text-indigo-500",
          hoverBg: "hover:bg-zinc-900/40",
          hoverText: "hover:text-zinc-200",
          activeBg: "bg-indigo-500/10",
          activeBorder: "border-indigo-500/20",
          activeText: "text-indigo-400",
          toggleBtn: "bg-zinc-800 hover:bg-zinc-700",
          logoBg:
            "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-900/20",
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
    // Standard Google Translate Cookie Method
    const cookieValue = `/en/${langCode}`;
    document.cookie = `googtrans=${cookieValue}; path=/`;
    document.cookie = `googtrans=${cookieValue}; path=/; domain=${window.location.hostname}`;

    // Fallback for immediate UI change if element is ready
    const select = document.querySelector(".goog-te-combo");
    if (select) {
      select.value = langCode;
      select.dispatchEvent(new Event("change"));
    } else {
      // If select isn't ready, reload to apply cookie
      window.location.reload();
    }
    setIsOpen(false);
  };

  const resetTranslation = () => {
    // Clear all possible translation cookies
    const cookies = ["googtrans", "googtrans=/en/en"];
    cookies.forEach((c) => {
      document.cookie = `${c}; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${c}; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
    });
    window.location.reload();
  };

  return (
    <div
      ref={dropdownRef}
      className={`px-3 py-4 border-t ${colors.border} mt-auto relative ${isCollapsed ? "flex justify-center" : ""}`}
    >
      <div id="google_translate_element" style={{ display: "none" }}></div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`absolute bottom-[110%] ${isCollapsed ? "left-2 w-44" : "left-3 right-3"} bg-[#09090B] border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[300px]`}
          >
            <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Language
              </span>
              <button
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
                  onClick={() => changeLanguage(lang.code)}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 w-full rounded-xl transition-all group ${colors.hoverBg} ${isCollapsed ? "p-3 justify-center w-11 h-11" : "px-4 py-3"}`}
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
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = useMemo(() => {
    let score = 0;
    if (formData.newPassword.length > 7) score++;
    if (/[A-Z]/.test(formData.newPassword)) score++;
    if (/[0-9]/.test(formData.newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(formData.newPassword)) score++;
    return score;
  }, [formData.newPassword]);

  const strengthData = [
    { label: "Very Weak", color: "bg-red-900" },
    { label: "Weak", color: "bg-red-500" },
    { label: "Fair", color: "bg-amber-500" },
    { label: "Good", color: isTransport ? "bg-blue-400" : "bg-indigo-400" },
    { label: "Strong", color: isTransport ? "bg-cyan-500" : "bg-violet-500" },
  ];

  const isMatch =
    formData.newPassword.length > 0 &&
    formData.newPassword === formData.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isMatch) return toast.error("Confirmation password does not match.");
    if (formData.oldPassword === formData.newPassword)
      return toast.error("New password cannot be same as current.");
    if (strength < 3) return toast.error("Password is too weak.");

    setLoading(true);
    const user = auth.currentUser;
    try {
      if (!user) throw new Error("No active user session.");
      const credential = EmailAuthProvider.credential(
        user.email,
        formData.oldPassword,
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, formData.newPassword);
      toast.success("Password updated successfully!");
      setFormData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      onClose();
    } catch (error) {
      toast.error("Verify your current password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div className="absolute inset-0 cursor-pointer" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className={`w-full max-w-md bg-[#09090B] border border-zinc-800/80 p-8 rounded-[2rem] shadow-2xl relative z-10 overflow-hidden`}
          >
            <div
              className={`absolute -top-20 -right-20 w-64 h-64 blur-[80px] rounded-full pointer-events-none opacity-20 ${colors.strengthStrong}`}
            />
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full bg-zinc-900/50 border border-zinc-800/80 text-zinc-400 hover:text-white transition-all z-20"
            >
              <X size={18} />
            </button>
            <div className="text-center mb-8 relative z-10">
              <div
                className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-5 border ${colors.activeBorder} ${colors.activeBg} ${colors.shadowGlow} backdrop-blur-md`}
              >
                <ShieldCheck size={32} className={colors.textHighlight} />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                Security Settings
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/60">
                <div className="relative group">
                  <Input
                    label="Current Password"
                    type={showOld ? "text" : "password"}
                    icon={Key}
                    required
                    value={formData.oldPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, oldPassword: e.target.value })
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
              </div>
              <div className="flex items-center justify-center gap-4 py-1">
                <div className="h-px bg-zinc-800/60 flex-1" />
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                <div className="h-px bg-zinc-800/60 flex-1" />
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 space-y-5">
                <div className="relative group">
                  <Input
                    label="New Password"
                    type={showNew ? "text" : "password"}
                    icon={Lock}
                    required
                    value={formData.newPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, newPassword: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className={`absolute right-4 top-[38px] ${colors.inputIcon}`}
                  >
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <div className="mt-3.5 px-1">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest mb-2">
                      <span className="text-zinc-500">Strength</span>
                      <span
                        className={
                          strength > 2 ? colors.strengthGood : "text-rose-400"
                        }
                      >
                        {formData.newPassword
                          ? strengthData[strength].label
                          : "None"}
                      </span>
                    </div>
                    <div className="flex gap-1.5 h-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all duration-500 ${formData.newPassword && strength >= i ? strengthData[strength].color : "bg-zinc-800"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="relative group">
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
              </div>
              <button
                type="submit"
                disabled={loading || !isMatch}
                className={`w-full mt-8 bg-gradient-to-r ${colors.gradientBtn} text-white font-bold py-4 rounded-xl shadow-lg border border-white/10 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <RefreshCcw className="animate-spin" size={20} />
                ) : (
                  <>
                    <Save size={18} /> Update Password
                  </>
                )}
              </button>
            </form>
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
        className={`fixed top-0 left-0 h-full ${colors.bgMain} border-r ${colors.border} text-white z-50 transition-all duration-300 flex flex-col ${isMobileOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full md:translate-x-0"} ${isCollapsed ? "md:w-20" : "md:w-64"}`}
      >
        <div
          className={`h-20 flex items-center ${isCollapsed ? "justify-center" : "px-6 justify-between"} border-b ${colors.border} shrink-0`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg shrink-0 transition-all duration-500 text-white ${colors.logoBg}`}
            >
              {isTransport ? "T" : "E"}
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="font-bold text-base text-zinc-100 tracking-tight">
                  {isTransport ? "Transport" : "Enterprise"}
                </h1>
                <p
                  className={`text-[9px] uppercase tracking-widest font-black opacity-80 ${colors.textHighlight}`}
                >
                  Portal Hub
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className={`md:hidden ${colors.textHighlight} p-1`}
          >
            <X size={20} />
          </button>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden md:flex absolute -right-3 top-24 w-6 h-6 rounded-full items-center justify-center shadow-lg border border-zinc-700 z-50 transition-all text-white ${colors.toggleBtn}`}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <nav className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
          <ul className="space-y-1.5 relative">
            {allLinks.map((item) => (
              <li key={item.path} className="relative">
                <NavLink
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl transition-all duration-300 group relative z-10 ${isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3"} ${!isActive ? `${colors.textSubtle} hover:text-white ${colors.hoverBg}` : "text-white font-bold"}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="active-nav-bg"
                          className={`absolute inset-0 rounded-xl ${colors.activeBg} border ${colors.activeBorder}`}
                          initial={{ opacity: 1, scale: 1 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                          }}
                        />
                      )}
                      <item.icon
                        size={20}
                        className={`shrink-0 relative z-20 transition-colors duration-300 ${isActive ? colors.activeText : `group-hover:${colors.textHighlight}`}`}
                      />
                      {!isCollapsed && (
                        <span className="text-sm whitespace-nowrap relative z-20">
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
          className={`p-4 border-t ${colors.border} ${colors.bgMain} space-y-1.5`}
        >
          <NavLink
            to="/"
            className={`w-full flex items-center rounded-xl ${colors.textSubtle} ${colors.hoverBg} ${colors.hoverText} transition-all group ${isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3"}`}
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
            onClick={() => setIsPassModalOpen(true)}
            className={`w-full flex items-center rounded-xl ${colors.textSubtle} ${colors.hoverBg} ${colors.hoverText} transition-all group ${isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3"}`}
          >
            <Lock
              size={18}
              className="shrink-0 group-hover:scale-110 transition-transform"
            />
            {!isCollapsed && (
              <span className="font-medium text-sm">Security Settings</span>
            )}
          </button>
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className={`w-full flex items-center rounded-xl ${colors.textSubtle} hover:bg-rose-500/10 hover:text-rose-400 transition-all group ${isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3"}`}
          >
            <LogOut
              size={18}
              className="group-hover:-translate-x-1 transition-transform shrink-0"
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
