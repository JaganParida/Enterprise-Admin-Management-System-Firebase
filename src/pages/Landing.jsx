import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  Factory,
  Truck,
  ChevronRight,
  ChevronLeft,
  MapPin,
  LifeBuoy,
  X,
  ShieldCheck,
  Zap,
  BarChart3,
  Users,
  MessageCircle,
  PlayCircle,
  LogOut,
  Building2,
  Construction,
  Tractor,
  ArrowRight,
  BookOpen,
  Activity,
  Package,
  ShoppingCart,
  CheckCircle2,
  Sparkles,
  Settings,
  Languages,
  FileText,
  Fuel,
  Wrench,
  Search,
  Filter,
  Download,
  Trash2,
} from "lucide-react";

// --- Smooth Framer Motion Variants ---
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const fadeUpVariant = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

// --- Support Data ---
const supportDevelopers = [
  {
    id: 1,
    name: "Jagan Parida",
    phone: "+91 91245 40575",
    whatsapp: "919124540575",
  },
  {
    id: 2,
    name: "Swoyamjit Biswal",
    phone: "+91 63720 75270",
    whatsapp: "916372075270",
  },
  {
    id: 3,
    name: "Arpit Khatua",
    phone: "+91 96923 52502",
    whatsapp: "919692352502",
  },
  {
    id: 4,
    name: "Sameer Jena",
    phone: "+91 93482 06812",
    whatsapp: "919348206812",
  },
  {
    id: 5,
    name: "Biswajit Rout",
    phone: "+91 82604 18838",
    whatsapp: "918260418838",
  },
];

// --- ENHANCED TOUR DATA WITH VIEWS ---
const enterpriseSteps = [
  {
    id: 1,
    title: "Enterprise Hub",
    icon: Activity,
    desc: "Your real-time command center. Monitor overall factory health, revenue, stock value, and active workforce instantly.",
    features: [
      "View top-level financial metrics.",
      "Analyze 7-day production trends.",
    ],
    anchor: "top-stats",
    view: "dashboard",
  },
  {
    id: 2,
    title: "Recent Activity Log",
    icon: FileText,
    desc: "A live feed of the latest factory actions. Quickly see recent bricks produced or sales closed.",
    features: [
      "Live feed of the last 10 transactions.",
      "Click items to view full details.",
    ],
    anchor: "right-list",
    view: "dashboard",
  },
  {
    id: 3,
    title: "Smart Search & Filter",
    icon: Search,
    desc: "Instantly locate specific records. Use advanced filters to sort logs by date, status, or transaction amount.",
    features: [
      "Real-time search across all columns.",
      "Multi-parameter status filtering.",
    ],
    anchor: "table-search",
    view: "table",
  },
  {
    id: 4,
    title: "Export Reports",
    icon: Download,
    desc: "Generate compliance-ready reports. Export your filtered data to CSV or PDF for accounting.",
    features: [
      "One-click CSV/PDF downloads.",
      "Exports respect your active filters.",
    ],
    anchor: "table-export",
    view: "table",
  },
  {
    id: 5,
    title: "Security: Wipe Data",
    icon: Trash2,
    desc: "Absolute control over your data. Securely format the database at the end of a financial year.",
    features: [
      "Requires Admin Password confirmation.",
      "Irreversible action for privacy.",
    ],
    anchor: "table-wipe",
    view: "table",
  },
  {
    id: 6,
    title: "Global Settings",
    icon: Settings,
    desc: "Access system-wide controls easily from the bottom of the navigation menu.",
    features: [
      "Use 'Translate' to switch languages.",
      "Manage Security or Sign Out securely.",
    ],
    anchor: "sidebar-bottom",
    view: "table",
  },
];

const transportSteps = [
  {
    id: 1,
    title: "Logistics Command",
    icon: Truck,
    desc: "Centralized oversight of your entire heavy fleet. Track total distance covered, trip counts, and aggregated fuel expenses.",
    features: [
      "Monitor Total Distance and Expenses.",
      "Identify fleet inefficiencies.",
    ],
    anchor: "top-stats",
    view: "dashboard",
  },
  {
    id: 2,
    title: "Maintenance Logs",
    icon: Wrench,
    desc: "Keep your heavy machinery running smoothly. Track recent repairs and JCB hour-meters.",
    features: [
      "Monitor JCB operating hours.",
      "Log repair costs and maintenance.",
    ],
    anchor: "right-list",
    view: "dashboard",
  },
  {
    id: 3,
    title: "Search Vehicle Logs",
    icon: Search,
    desc: "Instantly find trips for specific vehicles. Filter by date, driver, or fuel station.",
    features: ["Instant number-plate search.", "Filter by date ranges."],
    anchor: "table-search",
    view: "table",
  },
  {
    id: 4,
    title: "Export Fleet Data",
    icon: Download,
    desc: "Generate comprehensive fleet efficiency reports. Perfect for analyzing diesel consumption over time.",
    features: ["Export to Excel/CSV.", "Shareable PDF summaries."],
    anchor: "table-export",
    view: "table",
  },
  {
    id: 5,
    title: "Format Fleet History",
    icon: Trash2,
    desc: "Clear out old trip and fuel logs securely to start a new tracking quarter.",
    features: ["Strict Admin-only action.", "Completely wipes selected table."],
    anchor: "table-wipe",
    view: "table",
  },
  {
    id: 6,
    title: "Global Actions",
    icon: Languages,
    desc: "Control your portal experience. Ensure you log out securely after managing fleet data.",
    features: [
      "Use 'Translate' for regional language.",
      "Securely Sign Out of the hub.",
    ],
    anchor: "sidebar-bottom",
    view: "table",
  },
];

// --- Tour Popover Tooltip Component ---
const TourTooltip = ({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  themeColor,
  customClasses,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={`absolute z-[100] w-72 md:w-80 bg-[#121214] border border-${themeColor}-500/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-5 ${customClasses}`}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-2 h-2 rounded-full bg-${themeColor}-400 animate-pulse`}
          />
          <h4 className="text-white font-bold text-sm tracking-wide">
            {step.title}
          </h4>
        </div>
        <p className="text-zinc-400 text-xs leading-relaxed mb-4">
          {step.desc}
        </p>

        <div
          className={`bg-${themeColor}-500/5 rounded-lg p-3 border border-${themeColor}-500/10 mb-4`}
        >
          <ul className="space-y-2">
            {step.features.map((f, i) => (
              <li
                key={i}
                className="text-[11px] text-zinc-300 flex items-start gap-2"
              >
                <CheckCircle2
                  size={12}
                  className={`text-${themeColor}-400 shrink-0 mt-0.5`}
                />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest">
            Step {stepIndex + 1} of {totalSteps}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onPrev}
              disabled={stepIndex === 0}
              className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={onNext}
              className={`px-3 py-1.5 bg-${themeColor}-500 hover:bg-${themeColor}-400 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-${themeColor}-500/20 flex items-center gap-1`}
            >
              {stepIndex === totalSteps - 1 ? "Finish" : "Next"}{" "}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// --- Animated Highlight Ring ---
const HotspotPulse = ({ color }) => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
    <span
      className={`absolute w-[calc(100%+12px)] h-[calc(100%+12px)] rounded-xl border-2 border-${color}-500 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-60`}
    />
    <span
      className={`absolute w-full h-full rounded-lg border-2 border-${color}-400 shadow-[0_0_15px_var(--tw-shadow-color)] shadow-${color}-500/50`}
    />
  </div>
);

// --- Interactive Admin Guide Modal Component ---
const AdminGuideModal = ({ isOpen, onClose }) => {
  const [selectedPath, setSelectedPath] = useState(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setSelectedPath(null);
      setActiveStep(0);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => (document.body.style.overflow = "unset");
  }, [isOpen]);

  const steps =
    selectedPath === "enterprise" ? enterpriseSteps : transportSteps;
  const themeColor = selectedPath === "enterprise" ? "indigo" : "cyan";

  const handleNext = () => {
    if (activeStep < steps.length - 1) setActiveStep(activeStep + 1);
    else onClose();
  };
  const handlePrev = () => {
    if (activeStep > 0) setActiveStep(activeStep - 1);
  };

  const currentView = steps?.[activeStep]?.view || "dashboard";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#09090B]/90 backdrop-blur-xl cursor-pointer"
          />

          {/* CROSS BUTTON OUTSIDE POPUP */}
          <motion.button
            initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
              delay: 0.1,
            }}
            onClick={onClose}
            className="fixed top-6 right-6 md:top-8 md:right-8 z-[110] p-3 md:p-4 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white rounded-full transition-all backdrop-blur-xl group hover:scale-110 shadow-2xl"
          >
            <X size={24} strokeWidth={2} />
          </motion.button>

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`relative w-full max-w-6xl aspect-[4/3] md:aspect-[16/9] max-h-[85vh] bg-[#09090b] border border-white/10 rounded-2xl md:rounded-[2rem] flex flex-col z-10 overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)]`}
          >
            {/* BACKGROUND AMBIENT GLOW */}
            {selectedPath && (
              <div
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[150px] pointer-events-none transition-colors duration-1000 opacity-10 ${selectedPath === "enterprise" ? "bg-indigo-600" : "bg-cyan-600"}`}
              />
            )}

            {/* SELECTION SCREEN */}
            {!selectedPath ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
                <div className="text-center mb-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-6 text-white">
                    <BookOpen size={32} />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
                    Interactive System Guide
                  </h2>
                  <p className="text-zinc-400 max-w-md mx-auto">
                    Select a module to begin the guided walkthrough. Learn how
                    to navigate your dashboards effectively.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
                  <button
                    onClick={() => setSelectedPath("enterprise")}
                    className="group text-left p-8 rounded-3xl bg-[#121214] border border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full group-hover:bg-indigo-500/20 transition-colors" />
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                      <Factory size={28} />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">
                      Enterprise Hub
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-8">
                      Production cycles, inventory, invoicing, and workforce
                      tracking.
                    </p>
                    <div className="flex items-center text-xs font-bold uppercase tracking-widest text-indigo-400 gap-2 group-hover:gap-4 transition-all">
                      Start Tour <ArrowRight size={16} />
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedPath("transport")}
                    className="group text-left p-8 rounded-3xl bg-[#121214] border border-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[50px] rounded-full group-hover:bg-cyan-500/20 transition-colors" />
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                      <Truck size={28} />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">
                      Transport Node
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-8">
                      Fleet logistics, fuel analytics, JCB tracking, and
                      maintenance logs.
                    </p>
                    <div className="flex items-center text-xs font-bold uppercase tracking-widest text-cyan-400 gap-2 group-hover:gap-4 transition-all">
                      Start Tour <ArrowRight size={16} />
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              /* TOUR SCREEN (WIREFRAME) */
              <div className="flex-1 flex flex-col h-full relative z-10">
                {/* Fake Browser Header */}
                <div className="h-10 md:h-12 bg-[#121214] border-b border-white/5 flex items-center justify-between px-4 shrink-0">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500/50" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest">
                      {selectedPath === "enterprise"
                        ? "Enterprise OS Walkthrough"
                        : "Transport Node Walkthrough"}
                    </span>
                  </div>
                  <div className="w-16" />
                </div>

                {/* Dashboard Layout Area */}
                <div className="flex-1 flex overflow-hidden bg-[#09090b]">
                  <div className="flex-1 flex min-w-[800px] h-full relative p-4 gap-4">
                    {/* SIDEBAR */}
                    <div className="w-56 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between p-3 relative shrink-0 hidden md:flex">
                      {/* Sidebar Top Nav */}
                      <div className="space-y-1 relative z-10">
                        <div
                          className={`h-10 rounded-lg flex items-center px-3 gap-3 ${currentView === "dashboard" ? `bg-${themeColor}-500/10 border border-${themeColor}-500/20` : ""}`}
                        >
                          <Activity
                            size={16}
                            className={
                              currentView === "dashboard"
                                ? `text-${themeColor}-400`
                                : "text-zinc-500"
                            }
                          />
                          <div
                            className={`w-20 h-2 rounded ${currentView === "dashboard" ? "bg-white/30" : "bg-white/10"}`}
                          />
                        </div>
                        <div
                          className={`h-10 rounded-lg flex items-center px-3 gap-3 ${currentView === "table" ? `bg-${themeColor}-500/10 border border-${themeColor}-500/20` : ""}`}
                        >
                          <FileText
                            size={16}
                            className={
                              currentView === "table"
                                ? `text-${themeColor}-400`
                                : "text-zinc-500"
                            }
                          />
                          <div
                            className={`w-24 h-2 rounded ${currentView === "table" ? "bg-white/30" : "bg-white/10"}`}
                          />
                        </div>
                        <div className="h-10 rounded-lg flex items-center px-3 gap-3">
                          <Users size={16} className="text-zinc-500" />
                          <div className="w-16 h-2 rounded bg-white/10" />
                        </div>
                      </div>

                      {/* Sidebar Bottom (Global Actions) */}
                      <div className="relative pt-4 border-t border-white/5">
                        {steps[activeStep].anchor === "sidebar-bottom" && (
                          <HotspotPulse color={themeColor} />
                        )}
                        <div className="space-y-1 relative z-10">
                          <div className="h-10 rounded-lg flex items-center px-3 gap-3">
                            <Languages size={16} className="text-zinc-500" />
                            <div className="w-16 h-2 rounded bg-white/10" />
                          </div>
                          <div className="h-10 rounded-lg flex items-center px-3 gap-3">
                            <ShieldCheck size={16} className="text-zinc-500" />
                            <div className="w-16 h-2 rounded bg-white/10" />
                          </div>
                          <div className="h-10 rounded-lg flex items-center px-3 gap-3">
                            <LogOut size={16} className="text-zinc-500" />
                            <div className="w-16 h-2 rounded bg-white/10" />
                          </div>
                        </div>
                        {/* Tooltip fixed position upward to prevent cutoff */}
                        <AnimatePresence>
                          {steps[activeStep].anchor === "sidebar-bottom" && (
                            <TourTooltip
                              step={steps[activeStep]}
                              stepIndex={activeStep}
                              totalSteps={steps.length}
                              onNext={handleNext}
                              onPrev={handlePrev}
                              themeColor={themeColor}
                              customClasses="bottom-4 left-[calc(100%+16px)]"
                            />
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div className="flex-1 flex flex-col gap-4 relative overflow-hidden">
                      {/* DYNAMIC VIEWS */}
                      <AnimatePresence mode="wait">
                        {/* VIEW 1: DASHBOARD */}
                        {currentView === "dashboard" && (
                          <motion.div
                            key="dashboard"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex flex-col gap-4 absolute inset-0"
                          >
                            <div className="h-14 flex items-center justify-between shrink-0">
                              <div className="w-48 h-6 bg-white/10 rounded" />
                              <div className="flex items-center gap-3">
                                <div className="w-24 h-8 bg-white/5 rounded-lg" />
                                <div
                                  className={`w-24 h-8 bg-${themeColor}-500/20 rounded-lg`}
                                />
                              </div>
                            </div>

                            {/* Top Stats Cards */}
                            <div className="grid grid-cols-4 gap-4 relative shrink-0">
                              {steps[activeStep].anchor === "top-stats" && (
                                <HotspotPulse color={themeColor} />
                              )}
                              {[1, 2, 3, 4].map((i) => (
                                <div
                                  key={i}
                                  className="h-24 rounded-xl bg-white/[0.02] border border-white/5 p-4 flex flex-col justify-between"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-white/5" />
                                  <div className="w-1/2 h-4 bg-white/10 rounded" />
                                </div>
                              ))}

                              <AnimatePresence>
                                {steps[activeStep].anchor === "top-stats" && (
                                  <TourTooltip
                                    step={steps[activeStep]}
                                    stepIndex={activeStep}
                                    totalSteps={steps.length}
                                    onNext={handleNext}
                                    onPrev={handlePrev}
                                    themeColor={themeColor}
                                    customClasses="top-[calc(100%+20px)] left-1/2 -translate-x-1/2"
                                  />
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Chart & List */}
                            <div className="flex-1 flex gap-4 min-h-0">
                              {/* Chart */}
                              <div className="flex-[2] rounded-xl bg-white/[0.01] border border-white/5 p-4 flex flex-col gap-4">
                                <div className="w-32 h-4 bg-white/10 rounded" />
                                <div className="flex-1 flex items-end justify-between gap-2 px-8">
                                  {[40, 70, 45, 90, 65, 80].map((h, i) => (
                                    <div
                                      key={i}
                                      style={{ height: `${h}%` }}
                                      className={`w-12 rounded-t-sm bg-${themeColor}-500/20 border-t border-${themeColor}-500/50`}
                                    />
                                  ))}
                                </div>
                              </div>

                              {/* Right List */}
                              <div className="flex-1 rounded-xl bg-white/[0.02] border border-white/5 p-4 flex flex-col gap-3 relative">
                                {steps[activeStep].anchor === "right-list" && (
                                  <HotspotPulse color={themeColor} />
                                )}
                                <div className="w-32 h-4 bg-white/10 rounded mb-2" />
                                {[1, 2, 3].map((i) => (
                                  <div
                                    key={i}
                                    className="h-[60px] rounded-lg bg-white/5 flex items-center px-3 gap-3"
                                  >
                                    <div className="w-8 h-8 rounded-md bg-white/10 shrink-0" />
                                    <div className="flex-1 space-y-2">
                                      <div className="w-full h-2 bg-white/10 rounded" />
                                      <div className="w-1/2 h-2 bg-white/5 rounded" />
                                    </div>
                                  </div>
                                ))}

                                {/* Fix: Anchor tooltip to bottom-left of the list pointing left, growing upwards */}
                                <AnimatePresence>
                                  {steps[activeStep].anchor ===
                                    "right-list" && (
                                    <TourTooltip
                                      step={steps[activeStep]}
                                      stepIndex={activeStep}
                                      totalSteps={steps.length}
                                      onNext={handleNext}
                                      onPrev={handlePrev}
                                      themeColor={themeColor}
                                      customClasses="bottom-0 right-[calc(100%+20px)]"
                                    />
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* VIEW 2: DATA TABLE */}
                        {currentView === "table" && (
                          <motion.div
                            key="table"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex flex-col gap-4 absolute inset-0"
                          >
                            {/* Table Controls */}
                            <div className="flex items-center justify-between shrink-0">
                              <div className="relative w-72 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center px-3 z-10">
                                <Search
                                  size={16}
                                  className="text-zinc-500 mr-2"
                                />
                                <div className="w-24 h-2 bg-white/20 rounded" />
                                {steps[activeStep].anchor ===
                                  "table-search" && (
                                  <HotspotPulse color={themeColor} />
                                )}

                                <AnimatePresence>
                                  {steps[activeStep].anchor ===
                                    "table-search" && (
                                    <TourTooltip
                                      step={steps[activeStep]}
                                      stepIndex={activeStep}
                                      totalSteps={steps.length}
                                      onNext={handleNext}
                                      onPrev={handlePrev}
                                      themeColor={themeColor}
                                      customClasses="top-[calc(100%+16px)] left-0"
                                    />
                                  )}
                                </AnimatePresence>
                              </div>

                              <div className="flex gap-3">
                                <div className="relative w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
                                  <Filter size={16} className="text-zinc-400" />
                                </div>
                                <div
                                  className={`relative px-4 h-10 bg-${themeColor}-500/20 border border-${themeColor}-500/30 rounded-lg flex items-center justify-center z-10`}
                                >
                                  <Download
                                    size={16}
                                    className={`text-${themeColor}-400 mr-2`}
                                  />
                                  <div
                                    className={`w-12 h-2 bg-${themeColor}-400/50 rounded`}
                                  />
                                  {steps[activeStep].anchor ===
                                    "table-export" && (
                                    <HotspotPulse color={themeColor} />
                                  )}
                                  <AnimatePresence>
                                    {steps[activeStep].anchor ===
                                      "table-export" && (
                                      <TourTooltip
                                        step={steps[activeStep]}
                                        stepIndex={activeStep}
                                        totalSteps={steps.length}
                                        onNext={handleNext}
                                        onPrev={handlePrev}
                                        themeColor={themeColor}
                                        customClasses="top-[calc(100%+16px)] right-0"
                                      />
                                    )}
                                  </AnimatePresence>
                                </div>
                                <div className="relative px-4 h-10 bg-rose-500/20 border border-rose-500/30 rounded-lg flex items-center justify-center z-10">
                                  <Trash2
                                    size={16}
                                    className="text-rose-400 mr-2"
                                  />
                                  <div className="w-16 h-2 bg-rose-400/50 rounded" />
                                  {steps[activeStep].anchor ===
                                    "table-wipe" && (
                                    <HotspotPulse color="rose" />
                                  )}
                                  <AnimatePresence>
                                    {steps[activeStep].anchor ===
                                      "table-wipe" && (
                                      <TourTooltip
                                        step={steps[activeStep]}
                                        stepIndex={activeStep}
                                        totalSteps={steps.length}
                                        onNext={handleNext}
                                        onPrev={handlePrev}
                                        themeColor="rose"
                                        customClasses="top-[calc(100%+16px)] right-0"
                                      />
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            </div>

                            {/* Table Body */}
                            <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col overflow-hidden min-h-0">
                              <div className="h-12 border-b border-white/5 flex items-center px-4 gap-4 bg-white/[0.01] shrink-0">
                                <div className="w-8 h-3 bg-white/10 rounded" />
                                <div className="w-32 h-3 bg-white/10 rounded" />
                                <div className="w-24 h-3 bg-white/10 rounded hidden sm:block" />
                                <div className="flex-1" />
                                <div className="w-20 h-3 bg-white/10 rounded" />
                              </div>
                              <div className="p-4 space-y-2 overflow-y-auto custom-scrollbar">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                  <div
                                    key={i}
                                    className="h-14 bg-white/5 hover:bg-white/10 transition-colors border border-white/5 rounded-lg flex items-center px-4 gap-4"
                                  >
                                    <div className="w-8 h-3 bg-white/10 rounded" />
                                    <div className="w-32 h-3 bg-white/20 rounded" />
                                    <div className="w-24 h-3 bg-white/10 rounded hidden sm:block" />
                                    <div className="flex-1" />
                                    <div
                                      className={`w-20 h-5 bg-${themeColor}-500/20 rounded-full`}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Public Navbar ---
const PublicNavbar = () => {
  const [showSupport, setShowSupport] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-[#09090B]/90 backdrop-blur-xl border-b border-white/5 h-16 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" : "bg-transparent h-24 border-b border-transparent"}`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-full flex items-center justify-between relative">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <div className="w-10 h-10 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl blur-[8px] opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative w-full h-full bg-[#1A1B23] backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 shadow-lg">
              <span className="font-black text-xl text-white tracking-tighter">
                E
              </span>
            </div>
          </div>
          <span className="font-bold text-lg md:text-xl text-white tracking-tight flex items-center gap-2">
            Enterprise
            <span className="text-indigo-400 font-mono text-[10px] md:text-xs font-bold tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase">
              OS
            </span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
          {["Services", "Features"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="hover:text-white transition-colors duration-200"
            >
              {item}
            </a>
          ))}
          <button
            onClick={() => setShowSupport(!showSupport)}
            className={`flex items-center gap-2 transition-colors duration-200 ${showSupport ? "text-indigo-400" : "hover:text-white"}`}
          >
            <LifeBuoy size={16} /> Support
          </button>
        </div>

        <div className="flex items-center gap-4">
          {admin ? (
            <>
              <Link to="/enterprise/dashboard" className="hidden sm:block">
                <button className="px-6 py-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all hover:bg-indigo-500/20 active:scale-95">
                  Dashboard
                </button>
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="p-2 text-zinc-400 hover:text-white transition-all active:scale-95"
              >
                <LogOut size={20} strokeWidth={2} />
              </button>
            </>
          ) : (
            <Link to="/login">
              <button className="px-6 py-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all hover:bg-indigo-500/20 active:scale-95">
                Login
              </button>
            </Link>
          )}
        </div>

        <AnimatePresence>
          {showSupport && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 w-screen h-screen bg-black/40 backdrop-blur-sm"
                onClick={() => setShowSupport(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute top-24 right-4 md:right-6 w-[calc(100vw-32px)] md:w-[380px] bg-[#09090B]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-5 z-50"
              >
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                  <div>
                    <h4 className="text-base font-semibold text-white flex items-center gap-2">
                      <LifeBuoy size={18} className="text-indigo-400" /> Support
                      Team
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1">
                      Connect directly with our developers
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSupport(false)}
                    className="text-zinc-500 hover:text-white transition-colors bg-white/5 p-1.5 rounded-lg"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                  {supportDevelopers.map((dev) => (
                    <a
                      key={dev.id}
                      href={`https://wa.me/${dev.whatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl transition-all group hover:bg-white/5 border border-transparent hover:border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-[#25D366]/20 group-hover:text-[#25D366] transition-colors">
                          <MessageCircle size={18} />
                        </div>
                        <div className="text-left">
                          <span className="block text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                            {dev.name}
                          </span>
                          <span className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{" "}
                            Online
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-zinc-600 group-hover:text-white transition-colors"
                      />
                    </a>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

// --- ANIMATED DASHBOARD COMPONENT ---
const AnimatedDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % 4);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 0, width: "w-16" },
    { id: 1, width: "w-20" },
    { id: 2, width: "w-24" },
    { id: 3, width: "w-16" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-5xl mx-auto mb-32 relative perspective-1000"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent rounded-3xl blur-2xl" />
      <div className="relative bg-[#18181B]/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden aspect-[16/9] md:aspect-[21/9] flex flex-col">
        <div className="h-12 border-b border-white/5 flex items-center px-6 gap-4 bg-white/[0.02]">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/50" />
            <div className="w-3 h-3 rounded-full bg-amber-500/50" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
          </div>
          <div className="flex-1" />
          <div className="w-64 h-6 bg-white/5 rounded-md" />
          <div className="w-8 h-8 rounded-full bg-white/10 ml-4" />
        </div>

        <div className="flex-1 p-6 flex gap-6 overflow-hidden">
          <div className="w-48 hidden md:flex flex-col gap-2 border-r border-white/5 pr-6">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className="relative h-10 rounded-lg flex items-center px-3 gap-3 cursor-default"
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="sidebarActive"
                    className="absolute inset-0 bg-indigo-500/20 border border-indigo-500/30 rounded-lg"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <div
                  className={`w-4 h-4 rounded shadow-sm relative z-10 transition-colors duration-300 ${activeTab === tab.id ? "bg-indigo-400" : "bg-white/10"}`}
                />
                <div
                  className={`h-2.5 rounded-full relative z-10 transition-colors duration-300 ${tab.width} ${activeTab === tab.id ? "bg-indigo-100" : "bg-white/20"}`}
                />
              </div>
            ))}
          </div>

          <div className="flex-1 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col gap-6"
              >
                {activeTab === 0 && (
                  <>
                    <div className="flex gap-4 h-24 shrink-0">
                      {[
                        { color: "bg-indigo-500/20", delay: 0 },
                        { color: "bg-blue-500/20", delay: 0.1 },
                        {
                          color: "bg-emerald-500/20",
                          delay: 0.2,
                          hideSm: true,
                        },
                      ].map((card, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: card.delay }}
                          className={`flex-1 bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col justify-between ${card.hideSm ? "hidden sm:flex" : ""}`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg ${card.color} mb-2`}
                          />
                          <div className="w-1/2 h-3 bg-white/10 rounded" />
                        </motion.div>
                      ))}
                    </div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex-1 bg-white/5 rounded-xl border border-white/5 p-5 flex flex-col gap-4 overflow-hidden"
                    >
                      <div className="w-32 h-4 bg-white/10 rounded shrink-0" />
                      <div className="flex-1 border-t border-white/5 pt-4 flex items-end gap-3">
                        {[30, 50, 40, 70, 60, 90, 80].map((h, i) => (
                          <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ delay: 0.4 + i * 0.05 }}
                            className="flex-1 bg-gradient-to-t from-indigo-500/40 to-indigo-400/10 rounded-t-md border-t border-indigo-400/50"
                          />
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}

                {activeTab === 1 && (
                  <div className="flex-1 bg-white/5 rounded-xl border border-white/5 p-5 flex flex-col gap-4 overflow-hidden">
                    <div className="w-40 h-5 bg-white/10 rounded mb-2 shrink-0" />
                    <div className="flex flex-col gap-3">
                      {[1, 2, 3, 4].map((row, i) => (
                        <motion.div
                          key={row}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="h-14 rounded-lg bg-white/5 border border-white/5 flex items-center px-4 gap-4 shrink-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-white/10" />
                          <div className="w-32 h-3 bg-white/10 rounded" />
                          <div className="flex-1" />
                          <div className="w-16 h-4 bg-emerald-500/20 border border-emerald-500/30 rounded-full" />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 2 && (
                  <div className="flex-1 flex gap-4 overflow-hidden">
                    {[1, 2, 3].map((col, i) => (
                      <motion.div
                        key={col}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`flex-1 bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col gap-3 ${i === 2 ? "hidden sm:flex" : ""}`}
                      >
                        <div className="w-20 h-4 bg-white/10 rounded mb-2 shrink-0" />
                        {[1, 2].map((card) => (
                          <div
                            key={card}
                            className="h-24 bg-white/5 rounded-lg border border-white/5 p-3 flex flex-col gap-2 shrink-0"
                          >
                            <div className="w-full h-3 bg-white/10 rounded" />
                            <div className="w-2/3 h-3 bg-white/10 rounded" />
                            <div className="mt-auto flex justify-between">
                              <div className="w-6 h-6 rounded-full bg-white/10" />
                              <div className="w-12 h-4 bg-white/5 rounded" />
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    ))}
                  </div>
                )}

                {activeTab === 3 && (
                  <div className="flex-1 flex gap-6 overflow-hidden">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-1/3 bg-white/5 rounded-xl border border-white/5 p-6 flex flex-col items-center gap-4 hidden sm:flex"
                    >
                      <div className="w-24 h-24 rounded-full bg-indigo-500/20 border-4 border-white/5 mt-4" />
                      <div className="w-32 h-4 bg-white/10 rounded" />
                      <div className="w-20 h-3 bg-white/5 rounded" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex-1 bg-white/5 rounded-xl border border-white/5 p-6 flex flex-col gap-6"
                    >
                      <div className="w-40 h-5 bg-white/10 rounded shrink-0" />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-10 bg-white/5 rounded-lg border border-white/5" />
                        <div className="h-10 bg-white/5 rounded-lg border border-white/5" />
                        <div className="h-10 bg-white/5 rounded-lg border border-white/5 col-span-2" />
                      </div>
                      <div className="mt-auto h-10 w-32 bg-indigo-500/20 border border-indigo-500/30 rounded-lg self-end shrink-0" />
                    </motion.div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#09090B] to-transparent pointer-events-none" />
      </div>
    </motion.div>
  );
};

// --- Main Landing Page ---
const Landing = () => {
  const { admin } = useAuth();
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "auto";
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col font-sans overflow-x-hidden relative selection:bg-indigo-500/30">
      <PublicNavbar />

      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80vw] md:w-[1000px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      <main className="flex-1 pt-32 pb-20 px-4 md:px-6 relative z-10 w-full">
        <div className="max-w-7xl mx-auto text-center w-full">
          {/* HERO SECTION */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="mb-24 max-w-5xl mx-auto mt-8 relative"
          >
            <motion.div
              variants={fadeUpVariant}
              className="flex justify-center mb-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="text-zinc-300 text-xs font-medium tracking-wide font-mono uppercase">
                  System Operational · v2.0 Live
                </span>
              </div>
            </motion.div>

            <motion.h1
              variants={fadeUpVariant}
              className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter mb-6 text-white leading-[1.1]"
            >
              Unified Industrial <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">
                Intelligence
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUpVariant}
              className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-normal leading-relaxed mb-10"
            >
              Securely orchestrate the manufacturing floor and track your global
              logistics fleet with our state-of-the-art enterprise architecture.
            </motion.p>

            <motion.div
              variants={fadeUpVariant}
              className="flex flex-col sm:flex-row justify-center items-center gap-4 px-4"
            >
              <Link
                to={admin ? "/enterprise/dashboard" : "/login"}
                className="w-full sm:w-auto"
              >
                <button className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-zinc-200 text-[#09090B] rounded-xl text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                  Get Started <ArrowRight size={16} />
                </button>
              </Link>
              <button
                onClick={() => setIsGuideOpen(true)}
                className="w-full sm:w-auto px-8 py-3.5 bg-zinc-900/50 hover:bg-zinc-800 border border-white/10 text-white rounded-xl text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 backdrop-blur-md cursor-pointer z-20 group"
              >
                <BookOpen
                  size={18}
                  className="text-indigo-400 group-hover:scale-110 transition-transform"
                />{" "}
                Take a Tour
              </button>
            </motion.div>
          </motion.div>

          <AnimatedDashboard />

          {/* Core Modules Cards */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-40 max-w-5xl mx-auto px-4"
          >
            <PortalCard
              title="Enterprise Hub"
              desc="Comprehensive oversight of production cycles, dynamic inventory, and active workforce tracking grids."
              icon={Factory}
              theme="indigo"
              link={admin ? "/enterprise/dashboard" : "/login"}
            />
            <PortalCard
              title="Transport Node"
              desc="Real-time geo-tracking of heavy fleet logistics, automated fuel analytics, and route auditing."
              icon={Truck}
              theme="blue"
              link={admin ? "/transportation/dashboard" : "/login"}
            />
          </motion.div>

          {/* PREMIUM SERVICES SECTION */}
          <motion.section
            id="services"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="mb-40 px-4 max-w-7xl mx-auto scroll-mt-32"
          >
            <motion.div
              variants={fadeUpVariant}
              className="text-center mb-16 md:mb-20"
            >
              <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest font-mono mb-4 block">
                Physical Infrastructure
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tighter">
                Core Services
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              <ServiceCard
                icon={Building2}
                title="Brick Manufacturing"
                desc="Premium quality Fly Ash Bricks and Paver Blocks manufactured in our state-of-the-art facility ensuring high strength and durability."
              />
              <ServiceCard
                icon={Construction}
                title="Earthmovers & JCB"
                desc="Reliable heavy machinery rentals including JCBs and excavators for construction, digging, and site preparation projects."
              />
              <ServiceCard
                icon={Tractor}
                title="Heavy Logistics"
                desc="A robust fleet of trucks and heavy vehicles providing safe, timely, and efficient transportation of materials across regions."
              />
            </div>
          </motion.section>

          {/* BENTO GRID ARCHITECTURE SECTION */}
          <motion.section
            id="features"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="mb-40 px-4 max-w-6xl mx-auto scroll-mt-32"
          >
            <motion.div variants={fadeUpVariant} className="text-left mb-12">
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
                Architecture & Features
              </h2>
              <p className="text-zinc-400 mt-4 text-lg">
                Enterprise-grade systems designed for absolute scale.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <BentoCard
                className="md:col-span-2"
                title="Enterprise Security"
                desc="Granular role-based access controls and encrypted session management ensure your operational data remains strictly confidential and compliant."
                icon={ShieldCheck}
                glowColor="bg-indigo-500/20"
                iconColor="text-indigo-400"
                hoverBorder="group-hover:border-t-indigo-500"
              />
              <BentoCard
                className="md:col-span-1"
                title="Real-Time Sync"
                desc="State mutations and logistics updates propagate across your organization instantly."
                icon={Zap}
                glowColor="bg-blue-500/20"
                iconColor="text-blue-400"
                hoverBorder="group-hover:border-t-blue-500"
              />
              <BentoCard
                className="md:col-span-1"
                title="Deep Analytics"
                desc="Visual throughput charting and efficiency auditing for continuous improvement."
                icon={BarChart3}
                glowColor="bg-indigo-500/20"
                iconColor="text-indigo-400"
                hoverBorder="group-hover:border-t-indigo-500"
              />
              <BentoCard
                className="md:col-span-2"
                title="Unified Workforce Matrix"
                desc="Centralized node for tracking shift attendance, streaming payroll calculations, and managing human resource allocations effortlessly."
                icon={Users}
                glowColor="bg-blue-500/20"
                iconColor="text-blue-400"
                hoverBorder="group-hover:border-t-blue-500"
              />
            </div>
          </motion.section>
        </div>
      </main>

      <PublicFooter />

      {/* RENDER THE INTERACTIVE ADMIN GUIDE MODAL HERE */}
      <AdminGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
};

// --- Portal Card ---
const PortalCard = ({ title, desc, icon: Icon, theme, link }) => {
  const themes = {
    indigo: "hover:border-indigo-500/30 hover:bg-indigo-500/[0.02]",
    blue: "hover:border-blue-500/30 hover:bg-blue-500/[0.02]",
  };
  return (
    <motion.div variants={fadeUpVariant} className="h-full relative group">
      <Link to={link} className="block h-full relative z-10">
        <div
          className={`p-8 md:p-10 h-full rounded-[2.5rem] bg-[#121214] border border-white/5 transition-all duration-300 overflow-hidden relative flex flex-col justify-start ${themes[theme]}`}
        >
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 text-white mb-8 group-hover:scale-110 transition-transform duration-500">
              <Icon size={28} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-tighter">
              {title}
            </h3>
            <p className="text-zinc-400 text-base leading-relaxed font-medium mb-12">
              {desc}
            </p>
          </div>
          <div className="mt-auto relative z-10 flex items-center gap-2 text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-widest">
            Explore Module{" "}
            <ChevronRight
              size={16}
              className="transition-transform group-hover:translate-x-1"
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

// --- Upgraded Service Card ---
const ServiceCard = ({ icon: Icon, title, desc }) => (
  <motion.div
    variants={fadeUpVariant}
    className="group relative p-8 md:p-10 rounded-[2rem] bg-[#0c0c0e] border border-white/5 hover:border-white/10 transition-all duration-500 flex flex-col items-start overflow-hidden shadow-xl"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="w-14 h-14 rounded-2xl bg-[#18181B] border border-white/10 flex items-center justify-center text-zinc-400 mb-8 transition-all duration-500 group-hover:text-white group-hover:border-white/20 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] relative z-10">
      <Icon size={26} strokeWidth={1.5} />
    </div>
    <h3 className="text-xl font-bold text-white mb-4 tracking-tight relative z-10">
      {title}
    </h3>
    <p className="text-sm font-medium text-zinc-500 leading-relaxed relative z-10">
      {desc}
    </p>
    <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
  </motion.div>
);

// --- New Bento Box Component ---
const BentoCard = ({
  className,
  title,
  desc,
  icon: Icon,
  glowColor,
  iconColor,
  hoverBorder,
}) => (
  <motion.div
    variants={fadeUpVariant}
    className={`relative group p-8 md:p-10 rounded-[2rem] bg-[#0c0c0e] border border-white/5 overflow-hidden flex flex-col transition-all duration-500 border-t-2 border-t-transparent ${hoverBorder} ${className}`}
  >
    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
    <div
      className={`absolute top-0 right-0 w-64 h-64 ${glowColor} blur-[100px] rounded-full pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500`}
    />
    <div
      className={`w-12 h-12 mb-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${iconColor} relative z-10 shadow-inner group-hover:scale-110 transition-transform duration-500`}
    >
      <Icon size={24} strokeWidth={1.5} />
    </div>
    <div className="relative z-10 mt-auto">
      <h4 className="text-xl font-bold text-white mb-3 tracking-tight">
        {title}
      </h4>
      <p className="text-zinc-400 text-sm font-medium leading-relaxed">
        {desc}
      </p>
    </div>
  </motion.div>
);

// --- Professional Corporate Footer ---
const PublicFooter = () => {
  const addressQuery = encodeURIComponent(
    "Sundarpur, Chandaka, Khordha, Odisha",
  );
  const mapUrl = `https://maps.google.com/maps?q=${addressQuery}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  return (
    <footer className="bg-[#09090B] border-t border-white/5 pt-20 pb-8 px-6 relative z-20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-24 flex flex-col lg:flex-row gap-16 justify-between items-center">
          <div className="flex-1 text-center lg:text-left">
            <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
              Operation Center
            </h3>
            <p className="text-zinc-400 mb-8 max-w-md mx-auto lg:mx-0 font-medium">
              Track your fleet and manage assets from our central command hub.
            </p>
            <div className="inline-flex items-center gap-3 bg-white/5 px-5 py-3 rounded-xl border border-white/10">
              <MapPin size={20} className="text-zinc-400" />
              <p className="text-sm font-medium text-zinc-300">
                At-Sundarpur, PO/PS-Chandaka, Dist-Khordha
              </p>
            </div>
          </div>
          <div className="flex-1 w-full max-w-lg">
            <div className="w-full h-[300px] rounded-3xl border border-white/10 overflow-hidden relative bg-[#121214]">
              <iframe
                src={mapUrl}
                width="100%"
                height="100%"
                style={{
                  border: 0,
                  filter:
                    "invert(90%) hue-rotate(180deg) brightness(85%) contrast(110%) sepia(10%) grayscale(50%)",
                }}
                allowFullScreen=""
                loading="lazy"
                title="Location"
                className="w-full h-full opacity-60 hover:opacity-100 transition-opacity duration-500 grayscale hover:grayscale-0"
              ></iframe>
            </div>
          </div>
        </div>
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-widest font-mono text-zinc-500">
          <p>Enterprise OS // v2.0</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-zinc-300 transition-colors cursor-pointer">
              Sys_Log
            </span>
            <span className="hover:text-zinc-300 transition-colors cursor-pointer">
              Security
            </span>
            <p>Developed BY Centurions27</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Landing;
