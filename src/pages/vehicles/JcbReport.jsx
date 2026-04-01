import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import jcbService from "../../services/jcbService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  FileText,
  Search,
  Trash2,
  Edit2,
  Truck,
  Filter,
  History,
  X,
  ChevronDown,
  Calendar,
  Download,
  AlertOctagon,
  ShieldAlert,
  Eye,
  EyeOff,
  User,
  Phone,
  MapPin,
  RefreshCcw,
  CheckCircle2,
} from "lucide-react";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Button from "../../components/common/Button";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";

const getPreviousMonthString = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
};

const defaultFilters = {
  search: "",
  vehicleFilter: "All",
  dateFilter: "All",
  exactDate: "",
};

const JcbReport = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [filters, setFilters] = useState(defaultFilters);

  const [logs, setLogs] = useState(
    () => jcbService.getCachedLogs(defaultFilters) || [],
  );
  const [loading, setLoading] = useState(
    () => !jcbService.getCachedLogs(defaultFilters),
  );

  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  const [isSynced, setIsSynced] = useState(true);

  const searchParams = new URLSearchParams(location.search);
  const urlHighlightId = searchParams.get("highlight");
  const [activeHighlight, setActiveHighlight] = useState(null);

  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const theme = {
    primaryText: isTransport ? "text-[#38bdf8]" : "text-indigo-400",
    primaryBg: isTransport ? "bg-[#0c4a6e]/30" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-[#0284c7]/30" : "border-indigo-500/20",
    primaryFocus: isTransport
      ? "focus:border-[#0ea5e9]/50 focus:ring-1 focus:ring-[#0ea5e9]/50"
      : "focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50",
    glowOrb: isTransport ? "bg-[#0ea5e9]/5" : "bg-indigo-500/5",
  };

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [warningTooltip, setWarningTooltip] = useState(null);
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: null,
    itemName: "",
  });

  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wiping, setWiping] = useState(false);

  const [backupMonth, setBackupMonth] = useState(getPreviousMonthString());
  const [showBackupWarning, setShowBackupWarning] = useState(null);

  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";

  // 🚀 CHECK SYNC STATUS EVERY 2 SECONDS
  useEffect(() => {
    const checkSync = () => {
      const globalLastUpdate = parseInt(
        localStorage.getItem("jcb_last_update") || "0",
        10,
      );
      if (globalLastUpdate > jcbService.getLastFetchTime()) setIsSynced(false);
    };
    const interval = setInterval(checkSync, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkBackupNeeded = async () => {
      const prevMonth = getPreviousMonthString();

      if (!localStorage.getItem(`backup_jcb_${prevMonth}`)) {
        try {
          const q = jcbService.query(
            jcbService.collection(db, "jcb_logs"),
            jcbService.where("date", ">=", prevMonth),
            jcbService.where("date", "<=", prevMonth + "\uf8ff"),
            jcbService.limit(1),
          );
          const snap = await jcbService.getDocs(q);

          if (!snap.empty) {
            setShowBackupWarning(prevMonth);
          }
        } catch (error) {
          console.error("Failed to check backup status:", error);
        }
      }
    };

    checkBackupNeeded();
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

  // 🚀 100% CACHED FETCH LOGIC
  const fetchLogs = async (isLoadMore = false, force = false) => {
    if (isLoadMore) setLoadingMore(true);
    else if (logs.length === 0 || force) setLoading(true);

    try {
      const response = await jcbService.getLogs(
        filters,
        isLoadMore ? lastDoc : null,
        50,
        force,
      );

      if (isLoadMore) {
        setLogs((prev) => [...prev, ...(response.data || [])]);
        setLoadedCount((prev) => prev + (response.data?.length || 0));
      } else {
        setLogs(response.data || []);
        setLoadedCount(response.data?.length || 0);
        setIsSynced(true);
      }

      setLastDoc(response.lastVisible || null);
      setHasMore(response.data && response.data.length === 50);
    } catch (error) {
      if (error.message && error.message.toLowerCase().includes("index")) {
        toast.error("Firebase Index required! Check browser console.");
      } else {
        toast.error("Failed to load report data.");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLogs(false);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [filters]);

  const handleDisabledClick = (action) => {
    setWarningTooltip(action);
    setTimeout(() => setWarningTooltip(null), 2500);
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      const currentUser = admin?.data || admin || {};
      await jcbService.deleteLog(deleteModal.id, currentUser);
      toast.success("JCB record deleted successfully");
      fetchLogs(false, true);
    } catch (error) {
      toast.error(error.message || "Failed to delete record");
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const openHistory = (log) => {
    const sortedHistory = log.editHistory ? [...log.editHistory].reverse() : [];
    setHistoryModal({
      isOpen: true,
      data: sortedHistory,
      itemName: `${log.customerName} (JCB)`,
    });
  };

  const activeFiltersCount =
    [filters.vehicleFilter, filters.dateFilter].filter((f) => f !== "All")
      .length +
    (filters.exactDate ? 1 : 0) +
    (filters.search ? 1 : 0);

  // 🚀 SMART BACKUP WITH 10,000 CHUNK LIMIT
  const handleFullBackup = async (monthToFetch = backupMonth) => {
    try {
      if (!monthToFetch) return toast.error("Please select a month to backup.");

      const today = new Date().toISOString().split("T")[0];
      let dlMeta = JSON.parse(
        localStorage.getItem(`backup_jcb_${monthToFetch}_meta`) ||
          '{"date":"","count":0,"lastId":null}',
      );

      if (dlMeta.date === today && dlMeta.count >= 10000)
        return toast.error(
          "Daily Download Limit (10,000) reached. Next batch available tomorrow.",
        );
      if (dlMeta.date !== today) {
        dlMeta.date = today;
        dlMeta.count = 0;
      }

      const fetchLimit = 10000 - dlMeta.count;
      toast.info(`Fetching secure backup... (Allowance left: ${fetchLimit})`);

      const qConstraints = [
        jcbService.where("date", ">=", monthToFetch),
        jcbService.where("date", "<=", monthToFetch + "\uf8ff"),
        jcbService.orderBy("date"),
        jcbService.limit(fetchLimit),
      ];

      if (dlMeta.lastId) {
        const lastDocRef = await getDoc(doc(db, "jcb_logs", dlMeta.lastId));
        if (lastDocRef.exists())
          qConstraints.push(jcbService.startAfter(lastDocRef));
      }

      const q = jcbService.query(
        jcbService.collection(db, "jcb_logs"),
        ...qConstraints,
      );
      const snapshot = await jcbService.getDocs(q);

      if (snapshot.empty)
        return toast.info(
          `All records for ${monthToFetch} downloaded completely.`,
        );

      const headers = [
        "Date",
        "Vehicle No",
        "Customer Name",
        "Phone",
        "Location",
        "Start Time",
        "End Time",
        "Total Hours",
        "Total Minutes",
        "Total Mins (Agg)",
      ];

      const rows = snapshot.docs.map((document) => {
        const log = document.data();
        let dateStr = log.date
          ? `\t${new Date(log.date).toLocaleDateString("en-GB")}`
          : "-";
        return `${dateStr},"${log.vehicleNo}","${log.customerName}","${log.phone}","${log.location}","${log.startTime}","${log.endTime}",${log.totalHours},${log.totalMinutes},${log.totalMins}`;
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute(
        "download",
        `Backup_JCB_${monthToFetch}_Part${Math.floor(dlMeta.count / 10000) + 1}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      dlMeta.count += snapshot.size;
      dlMeta.lastId = snapshot.docs[snapshot.docs.length - 1].id;
      localStorage.setItem(
        `backup_jcb_${monthToFetch}_meta`,
        JSON.stringify(dlMeta),
      );

      if (snapshot.size === fetchLimit)
        toast.warning(
          "10,000 Limit reached. System remembered the state. Download the next batch tomorrow.",
        );
      else {
        toast.success(`Backup completed (${snapshot.size} records)!`);
        localStorage.setItem(`backup_jcb_${monthToFetch}`, "true");
        if (showBackupWarning === monthToFetch) setShowBackupWarning(null);
      }
    } catch (e) {
      console.error(e);
      toast.error("Backup failed.");
    }
  };

  const handleWipeAll = async () => {
    if (isManager || !deletePassword)
      return toast.error("Verification failed.");
    setWiping(true);
    try {
      const currentUser = admin?.data || admin || {};
      const response = await jcbService.deleteAllLogs({
        password: deletePassword,
        email: currentUser.email,
        user: currentUser,
      });
      if (response.warning) toast.warning(response.warning);
      else toast.success("JCB database cleared successfully.");
      setIsDeleteAllOpen(false);
      setDeletePassword("");
      setShowPassword(false);
      fetchLogs(false, true);
    } catch (error) {
      toast.error(error.message || "Incorrect Admin Password.");
    } finally {
      setWiping(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 relative space-y-8 px-2 sm:px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
          >
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              JCB Working Report
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] mt-1 text-zinc-500">
              Advanced Analytics
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => fetchLogs(false, true)}
            disabled={isSynced || loading}
            className={`flex items-center gap-2 h-[44px] px-4 w-full sm:w-auto justify-center rounded-xl font-bold text-xs tracking-wider transition-all duration-500 ${isSynced ? "opacity-40 pointer-events-none text-emerald-500 bg-emerald-500/5 border border-emerald-500/10" : "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse"}`}
          >
            {isSynced ? (
              <CheckCircle2 size={16} />
            ) : (
              <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            )}
            {isSynced ? "Database Up to Date" : "Update Detected: Sync Now"}
          </Button>

          <div className="relative w-full sm:w-auto">
            <button
              onClick={() =>
                isManager
                  ? handleDisabledClick("wipe-all")
                  : setIsDeleteAllOpen(true)
              }
              className={`h-[44px] w-full sm:w-auto flex items-center justify-center gap-2 px-5 rounded-xl transition-all text-xs font-bold border border-rose-500/30 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 ${isManager ? "opacity-50 !cursor-not-allowed" : ""}`}
            >
              <AlertOctagon size={16} /> Wipe Database
            </button>
            {warningTooltip === "wipe-all" && (
              <div className="absolute top-full mt-2 right-0 md:left-1/2 md:-translate-x-1/2 z-[100] animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-[#09090B] border border-red-500/30 shadow-xl text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                  🚫 Admin Access Required
                </div>
              </div>
            )}
          </div>
          <Link
            to="/transportation/jcb"
            className="w-full sm:w-auto h-[44px] px-6 text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap bg-[#0ea5e9] hover:bg-[#0284c7] text-white"
          >
            Back to Tracker
          </Link>
        </div>
      </div>

      {/* 🚀 SMART BACKUP WARNING */}
      {showBackupWarning && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 fade-in shadow-[0_0_20px_rgba(245,158,11,0.1)] w-full">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/20 p-2.5 rounded-full text-amber-500">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h4 className="text-amber-400 font-bold text-sm tracking-wide">
                Monthly Data Backup Required
              </h4>
              <p className="text-amber-100/60 text-xs mt-0.5">
                You haven't downloaded the JCB logs backup for{" "}
                <strong>
                  {new Date(showBackupWarning + "-01").toLocaleString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
                . Download it now to keep records secure.
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleFullBackup(showBackupWarning)}
            variant="outline"
            className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10 whitespace-nowrap"
          >
            <Download size={14} className="mr-2" /> Download Backup
          </Button>
        </div>
      )}

      <div className="bg-[#09090B] rounded-3xl border overflow-visible shadow-2xl border-zinc-800/60">
        <div className="p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 rounded-t-3xl bg-zinc-900/10 border-zinc-800/60">
          <div className="relative w-full sm:w-80 xl:w-96 group">
            <Search
              size={18}
              className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${filters.search ? theme.primaryText : "text-zinc-500"}`}
            />
            {/* 🚀 UI LOCK: Search clears Date Range */}
            <input
              type="text"
              placeholder="Search customer name..."
              className="w-full bg-transparent border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-sm text-zinc-100 outline-none transition-all focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 placeholder:text-zinc-600"
              value={filters.search}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  search: e.target.value,
                  dateFilter: "All",
                })
              }
            />
          </div>
          {/* EXPORT BUTTON COMPLETELY REMOVED FROM HERE */}
        </div>

        <div className="p-4 border-b bg-[#09090B] flex flex-wrap items-center gap-4 relative z-20 border-zinc-800/60">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1 border-r border-zinc-800 mr-2 text-zinc-500">
            <Filter size={16} /> FILTERS
            {activeFiltersCount > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${theme.primaryBg} ${theme.primaryText}`}
              >
                {activeFiltersCount}
              </span>
            )}
          </div>

          <div className="relative group">
            <select
              value={filters.vehicleFilter}
              onChange={(e) =>
                setFilters({ ...filters, vehicleFilter: e.target.value })
              }
              className="appearance-none bg-transparent border border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-xs font-medium text-zinc-300 outline-none cursor-pointer transition-all hover:border-zinc-700 focus:border-[#0ea5e9]/50 focus:ring-1 focus:ring-[#0ea5e9]/50"
            >
              <option value="All" className="bg-[#09090B] text-zinc-300">
                All Vehicles
              </option>
              <option value="OD02AT6907" className="bg-[#09090B] text-white">
                OD02AT6907
              </option>
              <option value="OD02XA7407" className="bg-[#09090B] text-white">
                OD02XA7407
              </option>
              <option value="OD02AJ3507" className="bg-[#09090B] text-white">
                OD02AJ3507
              </option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
            />
          </div>

          {/* 🚀 UI LOCK: Date Range clears Search */}
          <div className="relative group">
            <select
              value={filters.dateFilter}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  dateFilter: e.target.value,
                  exactDate: "",
                  search: "",
                })
              }
              className="appearance-none bg-transparent border border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-xs font-medium text-zinc-300 outline-none cursor-pointer transition-all hover:border-zinc-700 focus:border-[#0ea5e9]/50 focus:ring-1 focus:ring-[#0ea5e9]/50"
            >
              <option value="All">Timeline: All</option>
              <option value="Today">Today</option>
              <option value="Last7Days">Last 7 Days</option>
              <option value="ThisMonth">This Month</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
            />
          </div>

          <div className="relative group flex items-center">
            <div
              className={`absolute left-3 flex items-center justify-center pointer-events-none transition-colors ${filters.exactDate ? theme.primaryText : "text-zinc-500"}`}
            >
              <Calendar size={14} />
            </div>
            <input
              type="date"
              value={filters.exactDate}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  exactDate: e.target.value,
                  dateFilter: "All",
                })
              }
              style={{ colorScheme: "dark" }}
              className={`appearance-none bg-transparent border rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium outline-none cursor-pointer transition-all hover:border-zinc-700 focus:border-[#0ea5e9]/50 focus:ring-1 focus:ring-[#0ea5e9]/50 ${filters.exactDate ? "text-white" : "text-zinc-500"}`}
            />
          </div>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              onClick={() =>
                setFilters({
                  search: "",
                  vehicleFilter: "All",
                  dateFilter: "All",
                  exactDate: "",
                })
              }
              className="!px-3 !py-1.5 !text-xs !rounded-full !ml-auto md:!ml-2 flex items-center gap-1.5"
            >
              <X size={14} /> Clear All
            </Button>
          )}
        </div>

        <div className="overflow-x-auto pb-4 custom-scrollbar min-h-[400px]">
          {loading && !loadingMore ? (
            <div className="flex justify-center items-center h-64">
              <Loader />
            </div>
          ) : (
            <>
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-transparent text-zinc-500 text-[10px] uppercase font-bold tracking-[0.15em] border-b border-zinc-800/60">
                    <th className="py-4 px-6 whitespace-nowrap">
                      Date & Vehicle
                    </th>
                    <th className="py-4 px-6 whitespace-nowrap">
                      Customer Info
                    </th>
                    <th className="py-4 px-6 whitespace-nowrap">Time Log</th>
                    <th className="py-4 px-6 text-right whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-sm">
                  {logs.map((log) => {
                    const hasEdits =
                      log.editHistory && log.editHistory.length > 0;
                    const latestLog = hasEdits
                      ? log.editHistory[log.editHistory.length - 1]
                      : null;

                    return (
                      <tr
                        key={log._id}
                        id={log._id}
                        // (Keep your onClick here if it's the Tracker file)
                        className={`transition-all duration-1000 ease-out group ${
                          activeHighlight === log._id
                            ? `${isTransport ? "bg-[#0ea5e9]/[0.08] shadow-[inset_0_0_20px_rgba(14,165,233,0.05)]" : "bg-indigo-500/[0.08] shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]"}`
                            : "hover:bg-zinc-800/30"
                        }`}
                      >
                        <td className="p-5 px-6 align-top">
                          <p
                            className={`text-[11px] font-mono text-zinc-400 mb-1.5`}
                          >
                            {new Date(log.date).toLocaleDateString("en-GB")}
                          </p>
                          <p className="font-bold text-white text-md uppercase tracking-wide flex items-center gap-2">
                            <Truck size={14} className={`text-zinc-500`} />{" "}
                            {log.vehicleNo}
                          </p>
                          {hasEdits && (
                            <div
                              onClick={() => openHistory(log)}
                              className={`mt-3 flex items-center gap-1.5 bg-zinc-800/50 border border-zinc-700/50 px-2 py-1 rounded-lg cursor-pointer w-max hover:opacity-80 transition-opacity`}
                            >
                              <History size={10} className="text-zinc-400" />
                              <span
                                className={`text-[9px] font-bold text-zinc-300 uppercase tracking-widest`}
                              >
                                {latestLog.role || "ADMIN"}
                              </span>
                              {log.editHistory.length > 1 && (
                                <span className="bg-zinc-700/50 text-zinc-300 px-1 py-0.5 rounded text-[8px] ml-1">
                                  +{log.editHistory.length - 1} MORE
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-5 px-6 align-top">
                          <div className="font-bold text-white text-md tracking-wide flex items-center gap-2 mb-1.5">
                            <User size={14} className="text-zinc-500" />{" "}
                            {log.customerName}
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5 mb-1.5">
                            <Phone size={10} className="text-zinc-600" />{" "}
                            {log.phone}
                          </div>
                          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 uppercase tracking-wider">
                            <MapPin size={10} className="text-zinc-600" />{" "}
                            {log.location}
                          </div>
                        </td>
                        <td className="p-5 px-6 align-top">
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] bg-zinc-800/50 border border-zinc-700/50 px-2.5 py-1 rounded text-zinc-300 font-mono w-max tracking-wider">
                              {log.startTime} to {log.endTime}
                            </span>
                            <span
                              className={`text-lg font-black ${theme.primaryText} font-mono tracking-wider`}
                            >
                              {log.totalHours}h {log.totalMinutes}m
                            </span>
                          </div>
                        </td>
                        <td className="p-5 px-6 text-right align-top">
                          <div className="flex justify-end gap-2 items-center relative mt-1">
                            <button
                              onClick={() =>
                                navigate("/transportation/jcb", {
                                  state: { editLog: log },
                                })
                              }
                              className={`p-2 text-zinc-500 hover:${theme.primaryText} hover:bg-zinc-800/50 rounded-lg transition-colors`}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() =>
                                isManager
                                  ? handleDisabledClick(log._id)
                                  : setDeleteModal({
                                      isOpen: true,
                                      id: log._id,
                                    })
                              }
                              className={`p-2 rounded-lg transition-colors ${isManager ? "text-zinc-600 opacity-50 cursor-not-allowed" : "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"}`}
                            >
                              <Trash2 size={16} />
                            </button>
                            {warningTooltip === log._id && (
                              <div className="absolute top-full right-0 mt-2 z-[9999] bg-[#09090B] border border-red-500/30 text-red-400 text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max shadow-xl">
                                🚫 Access Denied
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {logs.length === 0 && (
                    <tr>
                      <td
                        colSpan="4"
                        className="p-12 text-center text-zinc-500 italic"
                      >
                        No JCB records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* 🚀 5000 PAGINATION LOCK */}
              {hasMore && loadedCount < 5000 && logs.length > 0 && (
                <div className="flex justify-center p-6 border-t border-zinc-800/60">
                  <Button
                    onClick={() => fetchLogs(true)}
                    disabled={loadingMore}
                    variant="outline"
                    className="text-zinc-400 border-zinc-700 hover:text-white hover:bg-zinc-800/50"
                  >
                    {loadingMore ? (
                      <RefreshCcw size={16} className="animate-spin mr-2" />
                    ) : null}
                    {loadingMore
                      ? "Loading..."
                      : `Load Next 50 Records (Loaded: ${loadedCount})`}
                  </Button>
                </div>
              )}

              {loadedCount >= 5000 && (
                <div className="p-6 border-t border-zinc-800/60 flex justify-center">
                  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-6 py-4 rounded-xl text-center max-w-md animate-in fade-in slide-in-from-bottom-2 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                    <AlertOctagon
                      className="mx-auto mb-2 opacity-80"
                      size={24}
                    />
                    <h4 className="font-bold text-sm mb-1">
                      Display Limit Reached
                    </h4>
                    <p className="text-[11px] font-medium text-amber-200/60 leading-relaxed">
                      To preserve system performance and Firebase Read limits,
                      infinite scrolling stops at 5,000 records. Please utilize
                      the Search and Filters at the top to precisely locate
                      older records.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Delete Record?"
        message="Are you sure you want to permanently delete this JCB record?"
        confirmText="Delete"
        isDestructive={true}
      />

      {/* 🛑 SECURE WIPE DATA MODAL */}
      {isDeleteAllOpen && !isManager && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => !wiping && setIsDeleteAllOpen(false)}
          />
          <div className="bg-[#09090B] border border-red-900/30 shadow-2xl rounded-3xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col p-8">
            <div className="flex items-center gap-3 text-red-500 mb-6">
              <AlertOctagon size={28} />
              <h2 className="text-xl font-black tracking-wide">
                Wipe Database
              </h2>
            </div>

            <div className="bg-amber-500/10 border border-yellow-600/30 rounded-2xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  size={20}
                  className="text-yellow-500 shrink-0 mt-0.5"
                />
                <div className="w-full">
                  <h3 className="text-yellow-500 font-bold text-sm mb-1">
                    Backup Recommendation
                  </h3>
                  <p className="text-zinc-400 text-xs mb-3 leading-relaxed">
                    Download backup before wiping.{" "}
                    <strong className="text-amber-400">
                      Limit: 10,000 records/day.
                    </strong>{" "}
                    If you exceed this, the system will save your progress, and
                    you can download the rest tomorrow.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                    <input
                      type="month"
                      value={backupMonth}
                      onChange={(e) => setBackupMonth(e.target.value)}
                      style={{ colorScheme: "dark" }}
                      className="w-full sm:w-32 bg-zinc-900/50 border border-yellow-500/30 rounded-xl px-3 py-2.5 text-xs text-zinc-200 outline-none transition-all"
                    />
                    <button
                      onClick={() => handleFullBackup(backupMonth)}
                      className="w-full sm:flex-1 py-2.5 bg-transparent border border-yellow-600/40 text-yellow-500 hover:bg-yellow-500/10 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <Download size={14} /> Download Backup
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-red-400/80 text-sm mb-4">
              This action will{" "}
              <strong className="text-red-500">PERMANENTLY DELETE ALL</strong>{" "}
              JCB records. Please enter your Admin password to confirm.
            </p>
            <div className="relative mb-8">
              <input
                type={showPassword ? "text" : "password"}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter admin password..."
                className="w-full bg-[#09090B] border border-zinc-800 focus:border-red-500/50 rounded-xl pl-4 pr-10 py-3 text-zinc-100 outline-none transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="flex justify-end gap-3 items-center">
              <button
                onClick={() => {
                  setIsDeleteAllOpen(false);
                  setDeletePassword("");
                }}
                disabled={wiping}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWipeAll}
                disabled={wiping || !deletePassword.trim()}
                className={`h-11 px-6 rounded-xl text-sm font-bold border transition-colors flex items-center justify-center gap-2 ${
                  wiping || !deletePassword.trim()
                    ? "border-rose-900/30 text-rose-500/50 bg-rose-950/20 cursor-not-allowed"
                    : "border-rose-500/30 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                }`}
              >
                {wiping ? (
                  <RefreshCcw size={16} className="animate-spin" />
                ) : null}{" "}
                {wiping ? "Wiping..." : "Confirm Wipe"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 HISTORY MODAL REFINED UI */}
      {historyModal.isOpen && historyModal.data && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() =>
              setHistoryModal({ isOpen: false, data: null, itemName: "" })
            }
          />
          <div
            className={`bg-[#09090B] border ${theme.primaryBorder} rounded-3xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200`}
          >
            <div
              className={`flex items-center justify-between p-5 border-b ${theme.primaryBorder} ${theme.primaryBg} shrink-0`}
            >
              <div className="flex items-center gap-2 text-white font-bold tracking-wide text-sm">
                <History size={16} className={theme.primaryText} /> Log History:{" "}
                <span className={`${theme.primaryText} font-normal`}>
                  {historyModal.itemName}
                </span>
              </div>
              <button
                onClick={() =>
                  setHistoryModal({ isOpen: false, data: null, itemName: "" })
                }
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-3">
              {historyModal.data.map((log, index) => (
                <div
                  key={index}
                  className={`bg-[#09090B] border ${index === 0 ? theme.primaryBorder : "border-zinc-800"} rounded-xl p-4 flex items-center justify-between relative overflow-hidden`}
                >
                  {index === 0 && (
                    <div
                      className={`absolute left-0 top-0 w-1 h-full ${theme.primaryBg}`}
                    ></div>
                  )}
                  <div className="flex items-center gap-4 pl-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${index === 0 ? `${theme.primaryBg} ${theme.primaryText}` : "bg-zinc-800 text-zinc-500"}`}
                    >
                      {(log.role || "A")[0].toUpperCase()}
                    </div>
                    <div>
                      <h4
                        className={`font-bold tracking-widest uppercase text-sm ${index === 0 ? "text-white" : "text-zinc-500"}`}
                      >
                        {log.role || "ADMIN"}
                      </h4>
                      <p className="text-zinc-500 text-[10px] font-mono mt-0.5">
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
                        })}
                      </p>
                    </div>
                  </div>
                  {index === 0 && (
                    <div className="bg-indigo-500/10 border-indigo-500/20 text-indigo-400 text-[10px] font-bold px-3 py-1 rounded-lg tracking-widest uppercase border">
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

export default JcbReport;
