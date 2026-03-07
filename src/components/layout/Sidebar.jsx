import React, { useEffect, useState, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  LayoutDashboard,
  Package,
  Factory,
  ShoppingCart, // 🚀 Sales icon
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
  Check,
  AlertCircle,
  Fuel,
  AlertTriangle,
  Home,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIProvider";
import Button from "../common/Button";
import Input from "../common/Input";

// --- Helper Hook for Theme Colors (Premium Transport & Enterprise Themes) ---
const useThemeColors = () => {
  const location = useLocation();
  const isTransport = location.pathname.includes("/transportation");

  return {
    isTransport,
    colors: isTransport
      ? {
          // 🚙 TRANSPORT THEME: Deep Slate & Neon Blue/Indigo
          bgMain: "bg-[#020617]",
          border: "border-blue-900/30",
          textSubtle: "text-blue-200/50",
          textHighlight: "text-blue-400",
          icon: "text-blue-500",
          hoverBg: "hover:bg-blue-900/30",
          hoverText: "hover:text-blue-300",
          activeBg: "bg-blue-600/15",
          activeBorder: "border-blue-500/40",
          activeText: "text-blue-400",
          toggleBtn: "bg-blue-600 hover:bg-blue-500",
          logoBg:
            "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-900/50",
          scrollThumb: "bg-blue-900/50 hover:bg-blue-600",
          modalBorder: "border-blue-900/40",
          strengthGood: "text-blue-400",
          strengthStrong: "bg-blue-500",
          inputIcon: "text-blue-200/30 hover:text-blue-400",
          gradientBtn:
            "from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500",
          shadowGlow: "shadow-[0_0_30px_rgba(59,130,246,0.15)]",
        }
      : {
          // 🏢 ENTERPRISE THEME: Deep Emerald & Teal
          bgMain: "bg-[#050a08]",
          border: "border-emerald-900/20",
          textSubtle: "text-emerald-100/60",
          textHighlight: "text-emerald-400",
          icon: "text-emerald-500",
          hoverBg: "hover:bg-emerald-500/10",
          hoverText: "hover:text-emerald-400",
          activeBg: "bg-emerald-500/10",
          activeBorder: "border-emerald-500/20",
          activeText: "text-emerald-400",
          toggleBtn: "bg-emerald-700 hover:bg-emerald-600",
          logoBg:
            "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-900/50",
          scrollThumb: "bg-emerald-900/50 hover:bg-emerald-600",
          modalBorder: "border-emerald-900/40",
          strengthGood: "text-emerald-400",
          strengthStrong: "bg-emerald-500",
          inputIcon: "text-emerald-100/20 hover:text-emerald-400",
          gradientBtn:
            "from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500",
          shadowGlow: "shadow-[0_0_30px_rgba(16,185,129,0.1)]",
        },
  };
};

// --- Google Translate Component ---
const GoogleTranslate = ({ isCollapsed }) => {
  const { colors } = useThemeColors();

  useEffect(() => {
    if (
      window.googleTranslateElementInit ||
      document.getElementById("google-translate-script")
    )
      return;

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "en,hi,or,bn,te,mr,ta,gu,kn,ml,pa",
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
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
  }, []);

  return (
    <div
      className={`px-3 py-4 border-t ${colors.border} mt-auto ${isCollapsed ? "flex justify-center" : ""}`}
    >
      <div id="google_translate_element" style={{ display: "none" }}></div>
      <button
        onClick={() =>
          document.querySelector(".goog-te-gadget-simple")?.click()
        }
        className={`flex items-center gap-3 w-full rounded-xl transition-all group ${colors.hoverBg} ${isCollapsed ? "p-3 justify-center w-11 h-11" : "px-4 py-3"}`}
      >
        <Languages
          size={20}
          className={`${colors.textSubtle} group-hover:${colors.textHighlight} shrink-0 transition-colors`}
        />
        {!isCollapsed && (
          <div className="text-left">
            <span
              className={`text-sm font-medium ${colors.textSubtle} group-hover:text-white transition-colors`}
            >
              Translate Page
            </span>
          </div>
        )}
      </button>
    </div>
  );
};

// --- PREMIUM SECURITY MODAL ---
const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { toast } = useUI();
  const { user } = useAuth();
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
    { label: "Good", color: isTransport ? "bg-blue-400" : "bg-emerald-400" },
    {
      label: "Strong",
      color: isTransport
        ? "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
        : "bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]",
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword)
      return toast.error("Passwords do not match.");
    if (formData.oldPassword === formData.newPassword)
      return toast.error("New password cannot be the same as current.");
    if (strength < 3) return toast.error("Please use a stronger password.");

    setLoading(true);
    try {
      const storageData =
        localStorage.getItem("adminInfo") || localStorage.getItem("userInfo");
      const adminData = storageData ? JSON.parse(storageData) : null;
      const token = user?.token || adminData?.token;

      const { data } = await axios.put(
        "http://localhost:5000/api/admin/change-password",
        {
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast.success(data.message || "Security updated successfully!");
      setFormData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update security");
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          {/* Overlay click to close */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`w-full max-w-md ${colors.bgMain}/90 backdrop-blur-2xl border ${colors.modalBorder} p-8 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative z-10`}
          >
            {/* Background Glow */}
            <div
              className={`absolute -inset-1 bg-gradient-to-br ${isTransport ? "from-blue-500/10 to-indigo-500/10" : "from-emerald-500/10 to-teal-500/10"} rounded-3xl blur-xl -z-10`}
            />

            <button
              onClick={onClose}
              className={`absolute top-5 right-5 p-2 rounded-full ${colors.hoverBg} ${colors.textSubtle} hover:text-white transition-all`}
            >
              <X size={18} />
            </button>

            <div className="text-center mb-8">
              <div
                className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 border ${colors.activeBorder} ${colors.activeBg} ${colors.shadowGlow}`}
              >
                <ShieldCheck size={32} className={colors.textHighlight} />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                Security Update
              </h3>
              <p
                className={`text-xs uppercase tracking-widest font-bold mt-1 ${colors.textSubtle}`}
              >
                Access Management
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Old Password */}
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

              {/* New Password */}
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

                {/* Strength Meter */}
                <AnimatePresence>
                  {formData.newPassword && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 overflow-hidden"
                    >
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest mb-1.5 px-1">
                        <span className={colors.textSubtle}>Strength</span>
                        <span
                          className={
                            strength > 2 ? colors.strengthGood : "text-rose-400"
                          }
                        >
                          {strengthData[strength].label}
                        </span>
                      </div>
                      <div className="flex gap-1.5 h-1.5 px-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-full transition-all duration-500 ${strength >= i ? strengthData[strength].color : "bg-white/10"}`}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Confirm Password */}
              <div className="relative group">
                <Input
                  label="Confirm Password"
                  type={showConfirm ? "text" : "password"}
                  icon={Lock}
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

                {/* Match Indicator */}
                <AnimatePresence>
                  {formData.confirmPassword && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 flex items-center gap-2 px-1 overflow-hidden"
                    >
                      {formData.newPassword === formData.confirmPassword ? (
                        <>
                          <Check size={14} className={colors.icon} />
                          <span
                            className={`text-[10px] ${colors.textHighlight} font-bold uppercase tracking-widest`}
                          >
                            Match Found
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={14} className="text-rose-500" />
                          <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">
                            No Match
                          </span>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full mt-6 bg-gradient-to-r ${colors.gradientBtn} text-white font-bold py-4 rounded-xl shadow-lg border border-white/5 transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  <>
                    <Save size={18} /> Update Security
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

// --- MAIN SIDEBAR COMPONENT ---
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

  // 🚀 Removed Cash, Added Sales
  const enterpriseLinks = [
    {
      path: "/enterprise/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    { path: "/enterprise/stock", label: "Inventory", icon: Package },
    { path: "/enterprise/production", label: "Production", icon: Factory },
    { path: "/enterprise/sales", label: "Sales Tracking", icon: ShoppingCart }, // ✅ New Sales Link
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
  ];

  const sharedLinks = [
    { path: "/electricity", label: "Electric Bill", icon: Zap },
  ];

  const allLinks = isTransport
    ? transportationLinks
    : [...enterpriseLinks, ...sharedLinks];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      <aside
        className={`fixed top-0 left-0 h-full ${colors.bgMain} border-r ${colors.border} text-white z-50 transition-all duration-300 flex flex-col ${
          isMobileOpen
            ? "translate-x-0 w-64 shadow-2xl"
            : "-translate-x-full md:translate-x-0"
        } ${isCollapsed ? "md:w-20" : "md:w-64"}`}
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
              <div className="animate-in fade-in duration-300">
                <h1 className="font-bold text-base text-white tracking-tight">
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
          className={`hidden md:flex absolute -right-3 top-24 w-6 h-6 rounded-full items-center justify-center shadow-lg border ${colors.bgMain} z-50 transition-all text-white ${colors.toggleBtn}`}
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
                          initial={false}
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
            title={isCollapsed ? "Back to Home" : ""}
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
            title={isCollapsed ? "Security" : ""}
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
            onClick={handleLogout}
            className={`w-full flex items-center rounded-xl ${colors.textSubtle} hover:bg-rose-500/10 hover:text-rose-400 transition-all group ${isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3"}`}
            title={isCollapsed ? "Sign Out" : ""}
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
