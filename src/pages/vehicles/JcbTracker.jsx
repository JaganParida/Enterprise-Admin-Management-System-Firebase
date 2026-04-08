import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import jcbService from "../../services/jcbService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Truck,
  Calendar,
  Save,
  Edit2,
  X,
  History,
  User,
  Phone,
  MapPin,
  Clock,
  Timer,
  CalendarDays,
  CheckCircle2,
  RefreshCcw,
  AlertOctagon,
} from "lucide-react";
import Button from "../../components/common/Button";

// 🚀 NEW JCB TRACKER SKELETON
const JcbTrackerSkeleton = () => (
  <div className="space-y-6 pb-10 px-2 sm:px-4 w-full animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
    {/* Header Skeleton */}
    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 animate-pulse"></div>
        <div>
          <div className="h-7 w-48 bg-zinc-800/60 rounded-lg animate-pulse mb-2"></div>
          <div className="h-3 w-40 bg-zinc-800/40 rounded-md animate-pulse"></div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
        <div className="h-[48px] w-full sm:w-40 rounded-xl bg-zinc-800/60 animate-pulse"></div>
        <div className="h-[48px] w-full sm:w-64 rounded-2xl bg-zinc-800/50 animate-pulse"></div>
      </div>
    </div>

    {/* Main Content Grid Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column - Form */}
      <div className="lg:col-span-5 bg-[#09090B] border border-zinc-800/60 p-6 md:p-8 rounded-3xl shadow-xl flex flex-col">
        <div className="h-6 w-40 bg-zinc-800/60 rounded-lg animate-pulse mb-6"></div>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="h-3 w-16 bg-zinc-800/40 mb-1.5 rounded animate-pulse"></div>
              <div className="h-[42px] w-full bg-zinc-800/50 rounded-xl animate-pulse"></div>
            </div>
            <div>
              <div className="h-3 w-20 bg-zinc-800/40 mb-1.5 rounded animate-pulse"></div>
              <div className="h-[42px] w-full bg-zinc-800/50 rounded-xl animate-pulse"></div>
            </div>
          </div>
          <div>
            <div className="h-3 w-24 bg-zinc-800/40 mb-1.5 rounded animate-pulse"></div>
            <div className="h-[42px] w-full bg-zinc-800/50 rounded-xl animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="h-3 w-24 bg-zinc-800/40 mb-1.5 rounded animate-pulse"></div>
              <div className="h-[42px] w-full bg-zinc-800/50 rounded-xl animate-pulse"></div>
            </div>
            <div>
              <div className="h-3 w-20 bg-zinc-800/40 mb-1.5 rounded animate-pulse"></div>
              <div className="h-[42px] w-full bg-zinc-800/50 rounded-xl animate-pulse"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 p-5 bg-zinc-900/30 border border-zinc-800/60 rounded-xl">
            <div>
              <div className="h-3 w-24 bg-zinc-800/40 mb-1.5 rounded animate-pulse"></div>
              <div className="h-[42px] w-full bg-zinc-800/50 rounded-xl animate-pulse"></div>
            </div>
            <div>
              <div className="h-3 w-20 bg-zinc-800/40 mb-1.5 rounded animate-pulse"></div>
              <div className="h-[42px] w-full bg-zinc-800/50 rounded-xl animate-pulse"></div>
            </div>
          </div>
          <div className="h-[72px] w-full bg-zinc-800/40 border border-zinc-800/60 rounded-xl animate-pulse mt-2"></div>
          <div className="h-11 w-full bg-zinc-800/60 rounded-xl animate-pulse mt-2"></div>
        </div>
      </div>

      {/* Right Column - Table */}
      <div className="lg:col-span-7">
        <div className="bg-[#09090B] border border-zinc-800/60 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-zinc-800/60 flex justify-between items-center bg-zinc-900/10">
            <div className="h-5 w-40 bg-zinc-800/60 rounded-lg animate-pulse"></div>
            <div className="h-7 w-20 bg-zinc-800/50 rounded-lg animate-pulse"></div>
          </div>
          <div className="p-2">
            <div className="flex justify-between items-center p-4 px-6 border-b border-zinc-800/60">
              <div className="h-3 w-20 bg-zinc-800/40 rounded animate-pulse w-[30%]"></div>
              <div className="h-3 w-20 bg-zinc-800/40 rounded animate-pulse w-[40%]"></div>
              <div className="h-3 w-16 bg-zinc-800/40 rounded animate-pulse w-[30%] flex justify-end"></div>
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex justify-between items-start p-4 px-6 border-b border-zinc-800/60"
              >
                <div className="w-[30%] pr-2">
                  <div className="h-3 w-16 bg-zinc-800/40 rounded animate-pulse mb-2.5"></div>
                  <div className="h-4 w-24 bg-zinc-800/60 rounded animate-pulse mb-2.5"></div>
                  <div className="h-5 w-20 bg-zinc-800/40 rounded-md animate-pulse"></div>
                </div>
                <div className="w-[40%] pr-2">
                  <div className="h-5 w-32 bg-zinc-800/50 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-20 bg-zinc-800/40 rounded animate-pulse mb-1.5"></div>
                  <div className="h-3 w-24 bg-zinc-800/40 rounded animate-pulse"></div>
                </div>
                <div className="w-[30%] flex flex-col justify-end items-end">
                  <div className="h-6 w-24 bg-zinc-800/50 rounded animate-pulse mb-2"></div>
                  <div className="h-6 w-16 bg-zinc-800/60 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const GlassInput = ({
  label,
  icon: Icon,
  type = "text",
  required,
  className = "",
  theme,
  ...props
}) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && (
      <label className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
    )}
    <div className="relative group">
      {Icon && (
        <div
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:${theme.primaryText} transition-colors pointer-events-none z-10`}
        >
          <Icon size={16} />
        </div>
      )}
      <input
        type={type}
        autoComplete="new-password"
        onWheel={(e) => e.target.blur()}
        className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-xl ${Icon ? "pl-10" : "pl-4"} pr-4 py-2.5 text-sm text-zinc-100 outline-none ${theme.primaryFocus} transition-all placeholder:text-zinc-600 [color-scheme:dark] ${className}`}
        required={required}
        {...props}
      />
    </div>
  </div>
);

const GlassSelect = ({
  label,
  icon: Icon,
  required,
  className = "",
  children,
  theme,
  ...props
}) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && (
      <label className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
    )}
    <div className="relative group">
      {Icon && (
        <div
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:${theme.primaryText} transition-colors pointer-events-none z-10`}
        >
          <Icon size={16} />
        </div>
      )}
      <select
        className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-xl appearance-none ${Icon ? "pl-10" : "pl-4"} pr-10 py-2.5 text-sm text-zinc-100 outline-none transition-all shadow-inner cursor-pointer ${theme.primaryFocus} ${className}`}
        required={required}
        {...props}
      />
    </div>
  </div>
);

const defaultFilters = {
  search: "",
  vehicleFilter: "All",
  dateFilter: "All",
  exactDate: "",
};

const JcbTracker = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("logs");

  // 🚀 SYNCHRONOUS CACHE INITIALIZATION (No Loader Flicker)
  const [logs, setLogs] = useState(() => {
    const cached = jcbService.getCachedLogs(defaultFilters);
    return cached ? cached.slice(0, 10) : [];
  });
  const [loading, setLoading] = useState(
    () => !jcbService.getCachedLogs(defaultFilters),
  );
  const [syncStatus, setSyncStatus] = useState(() =>
    jcbService.getCachedLogs(defaultFilters) ? "up-to-date" : "syncing",
  );
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);

  const searchParams = new URLSearchParams(location.search);
  const urlHighlightId = searchParams.get("highlight");
  const [activeHighlight, setActiveHighlight] = useState(null);

  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");
  const basePath = isTransport ? "/transportation" : "/enterprise";

  const theme = {
    primaryText: isTransport ? "text-cyan-400" : "text-indigo-400",
    primaryBg: isTransport ? "bg-cyan-500/10" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-cyan-500/20" : "border-indigo-500/20",
    primaryFocus: isTransport
      ? "focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
      : "focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50",
    glowOrb: isTransport ? "bg-cyan-500/5" : "bg-indigo-500/5",
    tabActive: isTransport
      ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/20"
      : "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20",
  };

  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    itemName: "",
  });
  const initialForm = {
    date: new Date().toISOString().split("T")[0],
    vehicleNo: "",
    customerName: "",
    phone: "",
    location: "",
    startTime: "",
    endTime: "",
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const checkSync = () => {
      const globalLastUpdate = parseInt(
        localStorage.getItem("jcb_last_update") || "0",
        10,
      );
      if (globalLastUpdate > jcbService.getLastFetchTime())
        setSyncStatus("required");
    };
    const interval = setInterval(checkSync, 2000);
    return () => clearInterval(interval);
  }, []);

  // 🚀 OPTIMIZED FETCH: 0 Reads, NO Unconditional Loaders
  const fetchLogs = async (force = false) => {
    if (force || logs.length === 0) setSyncStatus("syncing");
    if (logs.length === 0 && !force) setLoading(true);

    try {
      const { data } = await jcbService.getLogs(
        defaultFilters,
        null,
        50,
        force,
      );
      setLogs(Array.isArray(data) ? data.slice(0, 10) : []);
      setSyncStatus("up-to-date");
    } catch (err) {
      toast.error("Failed to load records.");
      setSyncStatus("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (urlHighlightId && !loading) {
      setActiveHighlight(urlHighlightId);
      setTimeout(() => {
        const element = document.getElementById(urlHighlightId);
        if (element)
          element.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
      const timer = setTimeout(() => setActiveHighlight(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [urlHighlightId, loading]);

  useEffect(() => {
    if (location.state && location.state.editLog) {
      const log = location.state.editLog;
      setEditId(log._id);
      setFormData({
        date: log.date
          ? new Date(log.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        vehicleNo: log.vehicleNo || "",
        customerName: log.customerName || "",
        phone: log.phone || "",
        location: log.location || "",
        startTime: log.startTime || "",
        endTime: log.endTime || "",
      });
      setActiveTab("logs");
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const calculateDuration = (start, end) => {
    if (!start || !end) return { hours: 0, minutes: 0, totalMins: 0 };
    const [sH, sM] = start.split(":").map(Number);
    const [eH, eM] = end.split(":").map(Number);
    let totalMins = eH * 60 + eM - (sH * 60 + sM);
    if (totalMins < 0) totalMins += 24 * 60;
    return {
      hours: Math.floor(totalMins / 60),
      minutes: totalMins % 60,
      totalMins,
    };
  };

  const duration = calculateDuration(formData.startTime, formData.endTime);

  const daywiseSummary = useMemo(() => {
    const summary = {};
    logs.forEach((log) => {
      if (!summary[log.date]) summary[log.date] = { totalMins: 0, entries: 0 };
      summary[log.date].totalMins += Number(log.totalMins || 0);
      summary[log.date].entries += 1;
    });
    return Object.entries(summary)
      .map(([date, data]) => ({
        date,
        hours: Math.floor(data.totalMins / 60),
        minutes: data.totalMins % 60,
        entries: data.entries,
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [logs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (duration.totalMins <= 0)
      return toast.error("End time must be greater than Start time.");
    const phoneRegex = /^[0-9]{10}$/;
    if (formData.phone && !phoneRegex.test(formData.phone))
      return toast.error("Phone number must be exactly 10 digits.");

    setSubmitting(true);
    try {
      const currentUser = admin?.data || admin || {};
      const payload = {
        ...formData,
        totalHours: duration.hours,
        totalMinutes: duration.minutes,
        totalMins: duration.totalMins,
      };

      if (editId) {
        await jcbService.updateLog(editId, payload, currentUser);
        toast.success("Updated successfully!");
      } else {
        await jcbService.addLog(payload, currentUser);
        toast.success("Logged successfully!");
      }
      resetForm();
      fetchLogs(false);
    } catch (err) {
      toast.error("Failed to save record.");
    } finally {
      setSubmitting(false);
    }
  };

  const openHistory = (e, log) => {
    e.stopPropagation();
    const historyData = Array.isArray(log?.editHistory)
      ? [...log.editHistory].reverse()
      : [];
    setHistoryModal({
      isOpen: true,
      data: historyData,
      itemName: `${log?.customerName || "Unknown"} (JCB)`,
    });
  };
  const resetForm = () => {
    setEditId(null);
    setFormData(initialForm);
  };
  const handleRowClick = (e, id) => {
    if (
      e.target.closest("button") ||
      e.target.closest("a") ||
      e.target.closest(".history-btn")
    )
      return;
    navigate(`${basePath}/jcb/report?highlight=${id}`);
  };

  // 🚀 INTERCEPT FULL PAGE WITH SKELETON LOADER
  if ((loading || syncStatus === "syncing") && logs.length === 0)
    return <JcbTrackerSkeleton />;

  return (
    <div className="space-y-6 pb-10 px-2 sm:px-4">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
          >
            <Truck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              JCB Working Logs
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] mt-1 text-zinc-500">
              Track machinery working hours & locations.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          {/* 🚀 Smart Sync Button */}
          <Button
            variant="ghost"
            onClick={() => {
              setLogs([]); // Clear logs to trigger the skeleton loader
              setLoading(true);
              fetchLogs(true);
            }}
            disabled={syncStatus === "up-to-date" || syncStatus === "syncing"}
            className={`flex items-center gap-2 h-[48px] px-4 w-full sm:w-auto justify-center rounded-xl font-bold text-xs tracking-wider transition-all duration-500 ${syncStatus === "up-to-date" ? "opacity-40 pointer-events-none text-emerald-500 bg-emerald-500/5 border border-emerald-500/10" : syncStatus === "error" ? "text-rose-400 bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(243,64,84,0.2)] animate-pulse" : "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30"}`}
          >
            {syncStatus === "up-to-date" && <CheckCircle2 size={16} />}
            {syncStatus === "syncing" && (
              <RefreshCcw size={16} className="animate-spin" />
            )}
            {syncStatus === "error" && <AlertOctagon size={16} />}
            {syncStatus === "required" && <RefreshCcw size={16} />}
            {syncStatus === "up-to-date"
              ? "Database Up to Date"
              : syncStatus === "syncing"
                ? "Syncing..."
                : syncStatus === "error"
                  ? "DB Error"
                  : "Sync Required"}
          </Button>

          <div className="flex items-center gap-2 bg-[#09090B] p-1.5 rounded-2xl border border-zinc-800/60 w-full sm:w-auto h-[48px] shadow-inner">
            <button
              onClick={() => {
                setActiveTab("logs");
                resetForm();
              }}
              className={`px-5 h-full text-xs font-bold transition-all rounded-xl flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === "logs" ? theme.tabActive : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <Clock size={14} /> Active Logs
            </button>
            <button
              onClick={() => {
                setActiveTab("daywise");
                resetForm();
              }}
              className={`px-5 h-full text-xs font-bold transition-all rounded-xl flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === "daywise" ? theme.tabActive : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <CalendarDays size={14} /> Day-wise Summary
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 animate-in fade-in slide-in-from-left-4 duration-500 ease-out">
          <div
            className={`bg-[#09090B] border p-6 md:p-8 rounded-3xl shadow-xl transition-all duration-300 relative overflow-hidden ${editId ? `border-${isTransport ? "cyan" : "indigo"}-500/50 ring-1 ring-${isTransport ? "cyan" : "indigo"}-500/20` : "border-zinc-800/60"}`}
          >
            <div
              className={`absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full pointer-events-none ${theme.glowOrb}`}
            ></div>
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {editId ? (
                  <Edit2 size={18} className={theme.primaryText} />
                ) : (
                  <Timer size={18} className={theme.primaryText} />
                )}{" "}
                {editId ? "Update JCB Log" : "Log Working Hours"}
              </h3>
              {editId && (
                <Button
                  variant="ghost"
                  onClick={resetForm}
                  className="!px-3 !py-1 !text-[10px] text-rose-400 hover:text-rose-300 tracking-widest uppercase !h-auto"
                >
                  Cancel Edit
                </Button>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 relative z-10 animate-in fade-in zoom-in-[0.98] duration-500"
            >
              <div className="grid grid-cols-2 gap-4">
                <GlassInput
                  theme={theme}
                  label="Date"
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  icon={Calendar}
                  required
                />
                <GlassSelect
                  theme={theme}
                  label="Vehicle No."
                  name="vehicleNo"
                  value={formData.vehicleNo}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleNo: e.target.value })
                  }
                  icon={Truck}
                  required
                >
                  <option value="" className="bg-zinc-900 text-zinc-500">
                    Select...
                  </option>
                  <option value="OD02AT6907" className="bg-zinc-800 text-white">
                    OD02AT6907
                  </option>
                  <option value="OD02XA7407" className="bg-zinc-800 text-white">
                    OD02XA7407
                  </option>
                  <option value="OD02AJ3507" className="bg-zinc-800 text-white">
                    OD02AJ3507
                  </option>
                </GlassSelect>
              </div>
              <GlassInput
                theme={theme}
                label="Customer Name"
                placeholder="e.g. Ramesh Singh"
                value={formData.customerName}
                onChange={(e) =>
                  setFormData({ ...formData, customerName: e.target.value })
                }
                icon={User}
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <GlassInput
                  theme={theme}
                  label="Phone Number"
                  type="tel"
                  maxLength="10"
                  placeholder="10-digit number"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: e.target.value.replace(/[^0-9]/g, ""),
                    })
                  }
                  icon={Phone}
                  required
                />
                <GlassInput
                  theme={theme}
                  label="Location"
                  placeholder="Site / Village"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  icon={MapPin}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4 p-5 bg-zinc-900/30 border border-zinc-800/60 rounded-xl">
                <GlassInput
                  theme={theme}
                  label="Starting Time"
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  icon={Clock}
                  required
                />
                <GlassInput
                  theme={theme}
                  label="Ending Time"
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  icon={Clock}
                  required
                />
              </div>
              <div className="flex items-center gap-4 bg-[#09090B] p-4 rounded-xl border border-zinc-800/60 mt-2">
                <div className="flex-1 text-right pr-2">
                  <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold mb-1">
                    Calculated Duration
                  </p>
                  <p className="text-2xl font-black text-white font-mono flex items-baseline justify-end gap-1">
                    <span className={theme.primaryText}>{duration.hours}</span>
                    <span className="text-xs text-zinc-500 mr-2">h</span>
                    <span className={theme.primaryText}>
                      {duration.minutes}
                    </span>
                    <span className="text-xs text-zinc-500">m</span>
                  </p>
                </div>
              </div>
              <Button
                type="submit"
                disabled={submitting}
                variant="primary"
                className="w-full mt-2 rounded-xl"
              >
                {submitting ? (
                  <RefreshCcw
                    className="animate-spin mr-2 inline-block"
                    size={16}
                  />
                ) : null}
                {submitting
                  ? "Processing..."
                  : editId
                    ? "Update Entry"
                    : "Save Record"}
              </Button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 ease-out">
          <div className="bg-[#09090B] border border-zinc-800/60 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-zinc-800/60 flex justify-between items-center bg-zinc-900/10">
              <h3 className="font-bold text-white">
                {activeTab === "logs"
                  ? "Recent Working Logs"
                  : "Day-wise Summary"}
                {activeTab === "logs" && (
                  <span className="text-xs font-normal text-zinc-400 ml-2">
                    (Top 10)
                  </span>
                )}
              </h3>
              <Link to={`${basePath}/jcb/report`}>
                <Button
                  variant="outline"
                  className={`!px-3 !py-1.5 !text-[10px] uppercase tracking-widest !h-auto ${theme.primaryBg} ${theme.primaryText} border ${theme.primaryBorder} hover:opacity-80`}
                >
                  View All{" "}
                  {activeTab === "logs" ? logs.length : daywiseSummary.length}
                </Button>
              </Link>
            </div>

            <div className="overflow-x-auto max-h-[700px] custom-scrollbar p-2">
              {activeTab === "logs" ? (
                <table className="w-full text-left min-w-[550px] animate-in fade-in duration-300">
                  <thead className="sticky top-0 bg-[#09090B] text-[10px] uppercase font-bold text-zinc-500 tracking-[0.15em] z-10 shadow-sm border-b border-zinc-800/60">
                    <tr>
                      <th className="py-4 px-4 w-[30%]">Date & Vehicle</th>
                      <th className="py-4 px-4 w-[40%]">Customer Info</th>
                      <th className="py-4 px-4 text-right w-[30%]">Time Log</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-zinc-300 divide-y divide-zinc-800/60">
                    {logs.slice(0, 10).map((log) => {
                      const hasEdits =
                        log.editHistory && log.editHistory.length > 0;
                      const latestLog = hasEdits
                        ? log.editHistory[log.editHistory.length - 1]
                        : null;
                      return (
                        <tr
                          key={log._id}
                          id={log._id}
                          onClick={(e) => handleRowClick(e, log._id)}
                          className={`transition-all duration-1000 ease-out group cursor-pointer ${activeHighlight === log._id ? `${isTransport ? "bg-[#0ea5e9]/[0.08] shadow-[inset_0_0_20px_rgba(14,165,233,0.05)]" : "bg-indigo-500/[0.08] shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]"}` : "hover:bg-zinc-800/30"}`}
                        >
                          <td className="p-4 align-top">
                            <p className="text-[11px] font-mono text-zinc-400 mb-1">
                              {new Date(log.date).toLocaleDateString("en-GB")}
                            </p>
                            <p className="font-bold text-white text-md uppercase tracking-wide flex items-center gap-2">
                              <Truck size={14} className="text-zinc-500" />{" "}
                              {log.vehicleNo}
                            </p>
                            {hasEdits && (
                              <div
                                onClick={(e) => openHistory(e, log)}
                                className="history-btn mt-3 flex flex-col items-start w-max cursor-pointer hover:opacity-80 transition-opacity"
                              >
                                <div className="flex items-center gap-1.5 bg-zinc-800/50 border border-zinc-700/50 px-2 py-1 rounded-lg">
                                  <History
                                    size={10}
                                    className="text-zinc-400"
                                  />
                                  <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                                    {latestLog.role || "ADMIN"}
                                  </span>
                                  {log.editHistory.length > 1 && (
                                    <span className="bg-zinc-700/50 text-zinc-300 px-1 py-0.5 rounded text-[8px] ml-1">
                                      +{log.editHistory.length - 1} MORE
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-4 align-top">
                            <div className="font-bold text-white text-md tracking-wide flex items-center gap-2">
                              <User size={14} className="text-zinc-500" />{" "}
                              {log.customerName}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-mono mt-1 flex items-center gap-1.5">
                              <Phone size={10} className="text-zinc-600" />{" "}
                              {log.phone}
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1.5 uppercase tracking-wider">
                              <MapPin size={10} className="text-zinc-600" />{" "}
                              {log.location}
                            </div>
                          </td>
                          <td className="p-4 align-top text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="text-[10px] bg-zinc-800/50 border border-zinc-700/50 px-2 py-1 rounded text-zinc-400 font-mono w-max">
                                {log.startTime} to {log.endTime}
                              </span>
                              <span
                                className={`text-lg font-black font-mono tracking-wider mt-1 ${theme.primaryText}`}
                              >
                                {log.totalHours}h {log.totalMinutes}m
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {logs.length === 0 && (
                      <tr>
                        <td
                          colSpan="3"
                          className="p-12 text-center text-zinc-500 italic animate-in fade-in"
                        >
                          No JCB logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left min-w-[500px] animate-in fade-in duration-300">
                  <thead className="sticky top-0 bg-[#09090B] text-[10px] uppercase font-bold text-zinc-500 tracking-[0.15em] z-10 shadow-sm border-b border-zinc-800/60">
                    <tr>
                      <th className="py-4 px-6 w-[30%]">Date</th>
                      <th className="py-4 px-6 w-[30%] text-center">
                        Total Entries
                      </th>
                      <th className="py-4 px-6 text-right w-[40%]">
                        Total Working Hours
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-zinc-300 divide-y divide-zinc-800/60">
                    {daywiseSummary.map((day) => (
                      <tr
                        key={day.date}
                        className="hover:bg-zinc-800/30 group transition-colors"
                      >
                        <td className="p-5 px-6 font-mono text-xs text-zinc-400 align-middle">
                          {new Date(day.date).toLocaleDateString("en-GB")}
                        </td>
                        <td className="p-5 px-6 text-center align-middle">
                          <span className="bg-zinc-800/50 text-zinc-300 px-3 py-1 rounded-lg font-bold border border-zinc-700/50">
                            {day.entries}
                          </span>
                        </td>
                        <td className="p-5 px-6 text-right align-middle">
                          <div className="text-xl font-black text-white font-mono drop-shadow-sm">
                            <span className={theme.primaryText}>
                              {day.hours}
                            </span>
                            <span className="text-sm text-zinc-500 mr-2">
                              h
                            </span>
                            <span className={theme.primaryText}>
                              {day.minutes}
                            </span>
                            <span className="text-sm text-zinc-500">m</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {daywiseSummary.length === 0 && (
                      <tr>
                        <td
                          colSpan="3"
                          className="p-12 text-center text-zinc-500 italic animate-in fade-in"
                        >
                          No summary data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {historyModal.isOpen && historyModal.data && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() =>
              setHistoryModal({ isOpen: false, data: null, itemName: "" })
            }
          />
          <div className="bg-[#09090B] border border-zinc-800/60 rounded-3xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-[0.95] duration-300 ease-out">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800/60 bg-[#09090B] shrink-0">
              <div className="flex items-center gap-2 text-white font-bold tracking-wide text-sm">
                <History size={16} className={theme.primaryText} /> Log History:{" "}
                <span className="text-zinc-400 font-normal">
                  {historyModal.itemName}
                </span>
              </div>
              <button
                onClick={() =>
                  setHistoryModal({ isOpen: false, data: null, itemName: "" })
                }
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-3">
              {historyModal.data.map((log, index) => (
                <div
                  key={index}
                  className={`bg-zinc-900/30 border ${index === 0 ? theme.primaryBorder : "border-zinc-800"} rounded-xl p-4 flex items-center justify-between relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  {index === 0 && (
                    <div
                      className={`absolute left-0 top-0 w-1 h-full ${theme.primaryBg}`}
                    ></div>
                  )}
                  <div className="flex items-center gap-4 pl-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${index === 0 ? `${theme.primaryBg} ${theme.primaryText}` : "bg-zinc-800/50 text-zinc-400"}`}
                    >
                      {(log.role || "A")[0].toUpperCase()}
                    </div>
                    <div>
                      <h4
                        className={`font-bold tracking-widest uppercase text-sm ${index === 0 ? "text-white" : "text-zinc-400"}`}
                      >
                        {log.role || "ADMIN"}
                      </h4>
                      <p className="text-zinc-500 text-[10px] mt-0.5 font-mono">
                        {log.by || "admin@system.com"}
                      </p>
                      <p
                        className={`text-[10px] font-mono mt-1 ${index === 0 ? theme.primaryText : "text-zinc-600"}`}
                      >
                        {new Date(log.at).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  {index === 0 && (
                    <div
                      className={`${theme.primaryBg} ${theme.primaryBorder} ${theme.primaryText} text-[10px] font-bold px-3 py-1 rounded-lg tracking-widest uppercase border`}
                    >
                      LATEST
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JcbTracker;
