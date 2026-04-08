import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import maintenanceService from "../../services/maintenanceService";
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
  Wrench,
  Map,
  IndianRupee,
  RefreshCcw,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import Button from "../../components/common/Button";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";

// 🚀 NEW MAINTENANCE REPORT SKELETON
const MaintenanceReportSkeleton = () => (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 relative space-y-8 px-2 sm:px-4 w-full">
    {/* Header Skeleton */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-[46px] w-[46px] bg-zinc-800/60 rounded-xl animate-pulse"></div>
        <div>
          <div className="h-7 w-48 bg-zinc-800/60 rounded-lg animate-pulse mb-2"></div>
          <div className="h-3 w-32 bg-zinc-800/40 rounded-md animate-pulse"></div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto">
        <div className="h-[44px] w-full sm:w-32 bg-zinc-800/60 rounded-xl animate-pulse"></div>
        <div className="h-[44px] w-full sm:w-36 bg-zinc-800/60 rounded-xl animate-pulse"></div>
        <div className="h-[44px] w-full sm:w-40 bg-zinc-800/60 rounded-xl animate-pulse"></div>
      </div>
    </div>

    {/* Main Table Container Skeleton */}
    <div className="bg-[#09090B] rounded-3xl border border-zinc-800/60 overflow-hidden shadow-2xl flex flex-col">
      {/* Search & Reload Top Bar Skeleton */}
      <div className="p-5 border-b border-zinc-800/60 bg-zinc-900/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
        <div className="flex gap-2 w-full sm:w-auto flex-1 max-w-lg">
          <div className="h-[42px] w-full bg-zinc-800/50 rounded-xl animate-pulse"></div>
          <div className="h-[42px] w-24 bg-zinc-800/50 rounded-xl shrink-0 animate-pulse"></div>
        </div>
        <div className="h-[42px] w-28 bg-zinc-800/50 rounded-xl animate-pulse"></div>
      </div>

      {/* Dropdown Filters Skeleton */}
      <div className="p-4 border-b border-zinc-800/60 bg-[#09090B] flex flex-wrap items-center gap-4">
        <div className="h-6 w-20 bg-zinc-800/40 rounded-md animate-pulse"></div>
        <div className="h-[42px] w-32 bg-zinc-800/50 rounded-xl animate-pulse"></div>
        <div className="h-[42px] w-32 bg-zinc-800/50 rounded-xl animate-pulse"></div>
        <div className="h-[42px] w-36 bg-zinc-800/50 rounded-xl animate-pulse"></div>
        <div className="h-[34px] w-28 bg-zinc-800/50 rounded-xl animate-pulse"></div>
      </div>

      {/* Table Body Skeleton */}
      <div className="w-full min-w-[750px] overflow-x-auto custom-scrollbar">
        <div className="flex justify-between items-center bg-[#09090B] border-b border-zinc-800/60 p-5 px-6">
          <div className="h-3 w-24 bg-zinc-800/40 rounded animate-pulse"></div>
          <div className="h-3 w-24 bg-zinc-800/40 rounded animate-pulse"></div>
          <div className="h-3 w-24 bg-zinc-800/40 rounded animate-pulse text-right"></div>
          <div className="h-3 w-16 bg-zinc-800/40 rounded animate-pulse text-right"></div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex justify-between items-start p-5 px-6 border-b border-zinc-800/60 gap-4 group"
          >
            <div className="w-1/4">
              <div className="h-3 w-20 bg-zinc-800/40 rounded animate-pulse mb-3"></div>
              <div className="h-5 w-32 bg-zinc-800/60 rounded animate-pulse mb-3"></div>
              <div className="h-3 w-16 bg-zinc-800/40 rounded animate-pulse mb-3"></div>
              <div className="h-6 w-24 bg-zinc-800/40 rounded-lg animate-pulse"></div>
            </div>
            <div className="w-1/4">
              <div className="h-6 w-28 bg-zinc-800/50 rounded-md animate-pulse mb-2.5"></div>
              <div className="h-3 w-full bg-zinc-800/40 rounded animate-pulse mb-1.5"></div>
              <div className="h-3 w-3/4 bg-zinc-800/40 rounded animate-pulse"></div>
            </div>
            <div className="w-1/4 flex justify-end">
              <div className="h-6 w-24 bg-zinc-800/60 rounded animate-pulse mb-2"></div>
            </div>
            <div className="w-1/4 flex gap-2 justify-end items-start mt-1">
              <div className="h-8 w-8 bg-zinc-800/50 rounded-lg animate-pulse"></div>
              <div className="h-8 w-8 bg-zinc-800/50 rounded-lg animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const getPreviousMonthString = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const MaintenanceReport = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 🚀 ACTIVE DATABASE FILTERS (Triggers Fetch)
  const [filters, setFilters] = useState({
    search: "",
    amountFilter: "Any Amount",
    dateFilter: "All",
    exactDate: "",
  });

  // 🚀 LOCAL UI FILTERS (Decoupled from Database)
  const [localSearch, setLocalSearch] = useState("");
  const [localFilters, setLocalFilters] = useState({
    amountFilter: "Any Amount",
    dateFilter: "All",
    exactDate: "",
  });

  // INITIALIZE FROM CACHE
  const [logs, setLogs] = useState(
    () =>
      maintenanceService.getCachedLogs({
        search: "",
        amountFilter: "Any Amount",
        dateFilter: "All",
        exactDate: "",
      }) || [],
  );
  const [loading, setLoading] = useState(
    () =>
      !maintenanceService.getCachedLogs({
        search: "",
        amountFilter: "Any Amount",
        dateFilter: "All",
        exactDate: "",
      }),
  );
  const [syncStatus, setSyncStatus] = useState(() =>
    maintenanceService.getCachedLogs({
      search: "",
      amountFilter: "Any Amount",
      dateFilter: "All",
      exactDate: "",
    })
      ? "synced"
      : "syncing",
  );

  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

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

  useEffect(() => {
    const checkBackupNeeded = async () => {
      const prevMonth = getPreviousMonthString();
      if (!localStorage.getItem(`backup_maintenance_${prevMonth}`)) {
        try {
          const q = maintenanceService.query(
            maintenanceService.collection(db, "maintenances"),
            maintenanceService.where("date", ">=", prevMonth),
            maintenanceService.where("date", "<=", prevMonth + "\uf8ff"),
            maintenanceService.limit(1),
          );
          const snap = await maintenanceService.getDocs(q);
          if (!snap.empty) setShowBackupWarning(prevMonth);
        } catch (error) {
          console.error("Failed to check backup status:", error);
        }
      }
    };
    checkBackupNeeded();
  }, []);

  useEffect(() => {
    if (urlHighlightId && logs.length > 0) {
      setActiveHighlight(urlHighlightId);
      setTimeout(() => {
        const el = document.getElementById(urlHighlightId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
      const timer = setTimeout(() => setActiveHighlight(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [urlHighlightId, logs.length]);

  const fetchLogs = async (isLoadMore = false, force = false) => {
    if (isLoadMore) setLoadingMore(true);
    else if (logs.length === 0 || force) setSyncStatus("syncing");

    try {
      const response = await maintenanceService.getLogs(
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
        setSyncStatus("synced");
      }

      setLastDoc(response.lastVisible || null);
      setHasMore(response.data && response.data.length === 50);
    } catch (error) {
      if (!isLoadMore) setSyncStatus("error");
      toast.error("Failed to load report data.");
    } finally {
      setLoadingMore(false);
      setLoading(false);
    }
  };

  // 🚀 STRICT MANUAL TRIGGER - No more debounce
  useEffect(() => {
    fetchLogs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleDisabledClick = (action) => {
    setWarningTooltip(action);
    setTimeout(() => setWarningTooltip(null), 2500);
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      const currentUser = admin?.data || admin || {};
      // 🚀 Finding the exact log object to pass to service so it subtracts exact cost
      const logToDelete = logs.find((l) => l._id === deleteModal.id);

      if (logToDelete) {
        await maintenanceService.deleteLog(logToDelete, currentUser);
        toast.success("Maintenance record deleted successfully");
        fetchLogs(false);
      }
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
      itemName: `Maintenance for ${log.vehicleNo}`,
    });
  };

  const activeFiltersCount =
    [filters.amountFilter, filters.dateFilter].filter(
      (f) => f !== "Any Amount" && f !== "All",
    ).length +
    (filters.exactDate ? 1 : 0) +
    (filters.search ? 1 : 0);

  // 🚀 FIXED: CLEAR LOGS FIRST TO TRIGGER SKELETON LOADER
  const applySearch = () => {
    if (!localSearch.trim() && !filters.search) return;
    setLogs([]);
    setLoading(true);
    setFilters((prev) => ({
      ...prev,
      search: localSearch.trim(),
    }));
  };

  const applyFilters = () => {
    setLogs([]);
    setLoading(true);
    setFilters((prev) => ({
      ...prev,
      amountFilter: localFilters.amountFilter,
      dateFilter: localFilters.dateFilter,
      exactDate: localFilters.exactDate,
    }));
  };

  const clearAllFilters = () => {
    const reset = {
      search: "",
      amountFilter: "Any Amount",
      dateFilter: "All",
      exactDate: "",
    };
    setLocalSearch("");
    setLocalFilters(reset);
    setLogs([]);
    setLoading(true);
    setFilters(reset);
  };

  // 🚀 AUTO VERIFY & AUTO STOP VEHICLE NO FORMATTER
  const handleVehicleSearchChange = (e) => {
    let rawValue = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    let state = rawValue.slice(0, 2).replace(/[^A-Z]/g, "");
    let rto = rawValue.slice(2, 4).replace(/[^0-9]/g, "");
    let remainder = rawValue.slice(4);
    let middleChars = remainder.replace(/[^A-Z]/g, "").slice(0, 2);
    let lastDigits = remainder.replace(/[^0-9]/g, "").slice(0, 4);

    let formatted = state;
    if (state.length === 2 && rawValue.length > 2) {
      formatted += "-" + rto;
      if (rto.length === 2 && rawValue.length > 4) {
        formatted += "-";
        if (middleChars.length > 0) {
          formatted += middleChars;
          if (lastDigits.length > 0) formatted += "-" + lastDigits;
        } else {
          formatted += lastDigits;
        }
      }
    }

    if (formatted.length <= 13) {
      setLocalSearch(formatted);
      if (formatted.trim() === "") {
        setFilters((prev) => ({ ...prev, search: "" }));
      }
    }
  };

  const handleFullBackup = async (monthToFetch = backupMonth) => {
    try {
      if (!monthToFetch) return toast.error("Please select a month to backup.");

      const today = new Date().toISOString().split("T")[0];
      let dlMeta = JSON.parse(
        localStorage.getItem(`backup_maintenance_${monthToFetch}_meta`) ||
          '{"date":"","count":0,"lastId":null}',
      );

      if (dlMeta.date === today && dlMeta.count >= 5000)
        return toast.error(
          "Daily Download Limit (5,000) reached to protect database limits. Next batch available tomorrow.",
        );
      if (dlMeta.date !== today) {
        dlMeta.date = today;
        dlMeta.count = 0;
      }

      const fetchLimit = 5000 - dlMeta.count;
      toast.info(`Fetching secure backup... (Allowance left: ${fetchLimit})`);

      let qConstraints = [
        maintenanceService.where("date", ">=", monthToFetch),
        maintenanceService.where("date", "<=", monthToFetch + "\uf8ff"),
        maintenanceService.orderBy("date"),
        maintenanceService.limit(fetchLimit),
      ];

      if (dlMeta.lastId) {
        const lastDocRef = await getDoc(doc(db, "maintenances", dlMeta.lastId));
        if (lastDocRef.exists())
          qConstraints.push(maintenanceService.startAfter(lastDocRef));
      }

      const q = maintenanceService.query(
        maintenanceService.collection(db, "maintenances"),
        ...qConstraints,
      );
      const snapshot = await maintenanceService.getDocs(q);

      if (snapshot.empty)
        return toast.info(
          `All records for ${monthToFetch} downloaded completely.`,
        );

      const headers = [
        "Date",
        "Vehicle No",
        "Meter/Km",
        "Service Type",
        "Cost",
        "Description",
      ];
      const rows = snapshot.docs.map((document) => {
        const log = document.data();
        let dateStr = log.date
          ? `\t${new Date(log.date).toLocaleDateString("en-GB")}`
          : "-";
        return `${dateStr},"${log.vehicleNo || ""}","${log.meterKm || 0}","${log.serviceType || ""}","${log.cost || 0}","${log.description || ""}"`;
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute(
        "download",
        `Backup_Maintenance_${monthToFetch}_Part${Math.floor(dlMeta.count / 5000) + 1}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      dlMeta.count += snapshot.size;
      dlMeta.lastId = snapshot.docs[snapshot.docs.length - 1].id;
      localStorage.setItem(
        `backup_maintenance_${monthToFetch}_meta`,
        JSON.stringify(dlMeta),
      );

      if (snapshot.size === fetchLimit) {
        toast.warning(
          "5,000 Limit reached. System remembered the state. Download the next batch tomorrow.",
        );
      } else {
        toast.success(`Backup completed (${snapshot.size} records)!`);
        localStorage.setItem(`backup_maintenance_${monthToFetch}`, "true");
        if (showBackupWarning === monthToFetch) setShowBackupWarning(null);
      }
    } catch (e) {
      toast.error("Backup failed.");
    }
  };

  const handleWipeAll = async () => {
    if (isManager || !deletePassword.trim())
      return toast.error("Verification failed.");
    setWiping(true);
    try {
      const currentUser = admin?.data || admin || {};
      const response = await maintenanceService.deleteAllLogs({
        password: deletePassword,
        email: currentUser.email,
        user: currentUser,
      });
      if (response.warning) toast.warning(response.warning);
      else toast.success("Maintenance database cleared successfully.");
      setIsDeleteAllOpen(false);
      setDeletePassword("");
      setShowPassword(false);
      fetchLogs(false);
    } catch (error) {
      toast.error(error.message || "Incorrect Admin Password.");
    } finally {
      setWiping(false);
    }
  };

  const isFilterApplyDisabled =
    localFilters.amountFilter === "Any Amount" &&
    localFilters.dateFilter === "All" &&
    !localFilters.exactDate;

  // 🚀 INTERCEPT FULL PAGE WITH SKELETON LOADER
  if ((loading || syncStatus === "syncing") && logs.length === 0)
    return <MaintenanceReportSkeleton />;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 relative space-y-8 px-2 sm:px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
          >
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Maintenance Report
            </h1>
            <p className="text-xs uppercase tracking-widest mt-0.5 text-zinc-500">
              Advanced Analytics
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              setLogs([]);
              setLoading(true);
              fetchLogs(false, true);
            }}
            disabled={syncStatus === "synced" || syncStatus === "syncing"}
            className={`flex items-center gap-2 h-[44px] px-4 w-full sm:w-auto justify-center rounded-xl font-bold text-xs tracking-wider transition-all duration-700 ${syncStatus === "synced" ? "opacity-40 pointer-events-none text-emerald-500 bg-emerald-500/5 border border-emerald-500/10" : syncStatus === "error" ? "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 shadow-[0_0_15px_rgba(243,64,84,0.2)] animate-pulse" : "text-zinc-300 bg-zinc-800/40 border border-zinc-700/50"}`}
          >
            {syncStatus === "synced" && <CheckCircle2 size={16} />}
            {syncStatus === "syncing" && (
              <RefreshCcw size={16} className="animate-spin" />
            )}
            {syncStatus === "error" && <AlertOctagon size={16} />}
            {syncStatus === "synced"
              ? "Up to Date"
              : syncStatus === "syncing"
                ? "Syncing..."
                : "Sync Failed - Retry"}
          </Button>

          <div className="relative h-[44px] w-full sm:w-auto">
            <Button
              variant="module"
              onClick={() =>
                isManager
                  ? handleDisabledClick("wipe-all")
                  : setIsDeleteAllOpen(true)
              }
              className={`h-full w-full sm:w-auto flex items-center justify-center gap-2 px-4 rounded-xl transition-all text-xs font-bold border-rose-500/40 text-rose-400 bg-rose-950/30 hover:bg-rose-900/40 hover:border-rose-400/60 ${isManager ? "opacity-50 !cursor-not-allowed" : ""}`}
            >
              <AlertOctagon size={16} /> Wipe Database
            </Button>
            {warningTooltip === "wipe-all" && (
              <div className="absolute top-full mt-2 right-0 md:left-1/2 md:-translate-x-1/2 z-[100] animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-[#09090B] border border-red-500/30 shadow-xl text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                  <span className="bg-red-500/20 p-1 rounded-md text-[10px] leading-none">
                    🚫
                  </span>{" "}
                  Admin Access Required
                </div>
              </div>
            )}
          </div>
          <Link
            to={
              isTransport
                ? "/transportation/maintenance"
                : "/enterprise/maintenance"
            }
            className="w-full sm:w-auto"
          >
            <Button
              variant="primary"
              className="h-[44px] px-6 text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 w-full whitespace-nowrap"
            >
              Back to Tracker
            </Button>
          </Link>
        </div>
      </div>

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
                You haven't downloaded the maintenance backup for{" "}
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

      <div
        className={`bg-[#09090B] rounded-3xl border overflow-visible shadow-2xl border-zinc-800/60`}
      >
        <div
          className={`p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 rounded-t-3xl bg-zinc-900/10 border-zinc-800/60`}
        >
          {/* 🚀 DECOUPLED SEARCH INPUT & BUTTON WITH FORMATTER */}
          <div className="flex w-full sm:w-auto gap-2 flex-1 max-w-lg">
            <div className="relative w-full group">
              <Search
                size={16}
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${localSearch ? theme.primaryText : "text-zinc-500 group-hover:text-zinc-400"}`}
              />
              <input
                type="text"
                placeholder="Search vehicle no (OD-02...)"
                className={`w-full bg-[#09090B] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 outline-none transition-all shadow-inner uppercase ${theme.primaryFocus}`}
                value={localSearch}
                onChange={handleVehicleSearchChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applySearch();
                }}
              />
            </div>
            <Button
              onClick={applySearch}
              disabled={!localSearch.trim()}
              variant="primary"
              className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all tracking-wider ${!localSearch.trim() ? "opacity-30 cursor-not-allowed bg-zinc-800 text-zinc-500" : ""}`}
            >
              Search
            </Button>
          </div>

          {/* 🚀 MANUAL REFRESH SECTION BUTTON */}
          <Button
            onClick={() => {
              setLogs([]);
              setLoading(true);
              fetchLogs(false, true);
            }}
            disabled={syncStatus === "syncing"}
            variant="outline"
            title="Reload Section"
            className="px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all flex items-center gap-2"
          >
            <RefreshCcw
              size={14}
              className={syncStatus === "syncing" ? "animate-spin" : ""}
            />
            <span className="text-xs font-bold uppercase tracking-widest hidden sm:block">
              Reload
            </span>
          </Button>
        </div>

        <div
          className={`p-4 border-b bg-[#09090B] border-zinc-800/60 flex flex-wrap items-center gap-4 relative z-20`}
        >
          <div
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1 border-r border-zinc-800 mr-1 text-zinc-400`}
          >
            <Filter size={16} /> Filters{" "}
            {activeFiltersCount > 0 && (
              <span
                className={`ml-1 px-1.5 rounded ${theme.primaryBg} ${theme.primaryText}`}
              >
                {activeFiltersCount}
              </span>
            )}
          </div>
          <div className="relative group">
            <select
              value={localFilters.amountFilter}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  amountFilter: e.target.value,
                })
              }
              className={`appearance-none bg-[#09090B] border border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-xs font-medium text-zinc-300 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
            >
              <option value="Any Amount">Any Amount</option>
              <option value="Under ₹10k">&lt; ₹10,000</option>
              <option value="₹10k - ₹50k">₹10k - ₹50k</option>
              <option value="Over ₹50k">&gt; ₹50,000</option>
            </select>
            <ChevronDown
              size={14}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:${theme.primaryText}`}
            />
          </div>
          <div className="relative group">
            <select
              value={localFilters.dateFilter}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  dateFilter: e.target.value,
                  exactDate: "",
                })
              }
              className={`appearance-none bg-[#09090B] border border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-xs font-medium text-zinc-300 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
            >
              <option value="All">Timeline: All</option>
              <option value="Today">Today</option>
              <option value="Last7Days">Last 7 Days</option>
              <option value="ThisMonth">This Month</option>
            </select>
            <ChevronDown
              size={14}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:${theme.primaryText}`}
            />
          </div>
          <div className="relative group flex items-center">
            <div
              className={`absolute left-3 flex items-center justify-center pointer-events-none transition-colors ${localFilters.exactDate ? theme.primaryText : "text-zinc-500"}`}
            >
              <Calendar size={14} />
            </div>
            <input
              type="date"
              value={localFilters.exactDate}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  exactDate: e.target.value,
                  dateFilter: "All",
                })
              }
              style={{ colorScheme: "dark" }}
              className={`appearance-none bg-[#09090B] border rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium outline-none cursor-pointer transition-all ${theme.primaryFocus} ${localFilters.exactDate ? "text-white border-zinc-600" : "text-zinc-500 border-zinc-800"}`}
            />
          </div>

          {/* 🚀 DECOUPLED FILTER APPLY BUTTON */}
          <Button
            onClick={applyFilters}
            disabled={isFilterApplyDisabled}
            variant="outline"
            className={`px-4 py-1.5 h-10 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${isFilterApplyDisabled ? "opacity-30 cursor-not-allowed border-zinc-800 text-zinc-500" : `border-${isTransport ? "cyan" : "indigo"}-500/50 ${theme.primaryText} hover:${theme.primaryBg}`}`}
          >
            Apply Filters
          </Button>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              onClick={clearAllFilters}
              className="!px-3 !py-1.5 !text-xs !rounded-full !ml-auto md:!ml-2 flex items-center gap-1.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <X size={14} /> Clear All
            </Button>
          )}
        </div>

        <div className="overflow-x-auto pb-4 custom-scrollbar min-h-[400px]">
          <table className="w-full text-left min-w-[750px] animate-in fade-in duration-300">
            <thead
              className={`bg-[#09090B] text-zinc-500 text-[10px] uppercase font-bold tracking-[0.15em] border-b border-zinc-800`}
            >
              <tr>
                <th className="py-5 px-6 whitespace-nowrap">Vehicle Details</th>
                <th className="py-5 px-6 whitespace-nowrap">Service Info</th>
                <th className="py-5 px-6 text-right whitespace-nowrap">Cost</th>
                <th className="py-5 px-6 text-right whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="text-sm text-zinc-300 divide-y divide-zinc-800/60">
              {logs.map((log) => {
                const hasEdits = log.editHistory && log.editHistory.length > 0;
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
                    <td className="p-5 px-6 align-top">
                      <p className={`text-[11px] font-mono text-zinc-400 mb-1`}>
                        {new Date(log.date).toLocaleDateString("en-GB")}
                      </p>
                      <p className="font-bold text-white text-md uppercase tracking-wide flex items-center gap-2">
                        <Truck size={14} className={`text-zinc-500`} />{" "}
                        {log.vehicleNo || "N/A"}
                      </p>
                      {log.meterKm && (
                        <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                          <Map size={10} className="text-zinc-500" />{" "}
                          {log.meterKm} KM
                        </p>
                      )}
                      {hasEdits && (
                        <div
                          onClick={(e) => openHistory(e, log)}
                          className={`mt-3 flex items-center gap-1.5 bg-zinc-800/50 border border-zinc-700/50 px-2 py-1 rounded-lg cursor-pointer w-max hover:opacity-80 transition-opacity`}
                        >
                          <History size={10} className="text-zinc-400" />
                          <span
                            className={`text-[9px] font-bold text-zinc-300 uppercase tracking-widest`}
                          >
                            {latestLog.role || "ADMIN"}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-5 px-6 align-top">
                      <div
                        className={`text-xs text-zinc-200 mb-2 flex items-center gap-1.5 ${theme.primaryBg} w-max px-2.5 py-1 rounded-md font-medium border ${theme.primaryBorder} uppercase tracking-wide`}
                      >
                        <Wrench size={12} className={theme.primaryText} />{" "}
                        {log.serviceType || "Routine"}
                      </div>
                      {log.description && (
                        <div className="text-[10px] text-zinc-400 font-mono mt-1.5 line-clamp-2 pr-4">
                          {log.description}
                        </div>
                      )}
                    </td>
                    <td className="p-5 px-6 align-top text-right">
                      <p className="text-lg font-black text-white font-mono drop-shadow-sm mb-2">
                        ₹{(Number(log.cost) || 0).toLocaleString("en-IN")}
                      </p>
                    </td>
                    <td className="p-5 px-6 text-right align-top">
                      <div className="flex justify-end gap-2 items-center relative mt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              `${isTransport ? "/transportation/maintenance" : "/enterprise/maintenance"}`,
                              { state: { editLog: log } },
                            );
                          }}
                          className={`p-2 text-zinc-500 hover:${theme.primaryText} hover:bg-zinc-800/50 rounded-lg transition-colors`}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            isManager
                              ? handleDisabledClick(log._id)
                              : setDeleteModal({
                                  isOpen: true,
                                  id: log._id,
                                });
                          }}
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
              {logs.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan="4"
                    className="p-10 text-center text-zinc-500 italic"
                  >
                    No maintenance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

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
                ) : null}{" "}
                {loadingMore
                  ? "Loading..."
                  : `Load Next 50 Records (Loaded: ${loadedCount})`}
              </Button>
            </div>
          )}

          {loadedCount >= 5000 && (
            <div className="p-6 border-t border-zinc-800/60 flex justify-center">
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-6 py-4 rounded-xl text-center max-w-md animate-in fade-in slide-in-from-bottom-2 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                <AlertOctagon className="mx-auto mb-2 opacity-80" size={24} />
                <h4 className="font-bold text-sm mb-1">
                  Display Limit Reached
                </h4>
                <p className="text-[11px] font-medium text-amber-200/60 leading-relaxed">
                  To preserve system performance and Firebase Read limits,
                  infinite scrolling stops at 5,000 records. Please utilize the
                  Search and Filters at the top to precisely locate older
                  records.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Delete Record?"
        message="Are you sure you want to permanently delete this maintenance record?"
        confirmText="Delete"
        isDestructive={true}
      />

      {isDeleteAllOpen && !isManager && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => !wiping && setIsDeleteAllOpen(false)}
          />
          <div className="bg-[#09090B] border border-red-900/30 shadow-[0_0_40px_rgba(220,38,38,0.15)] rounded-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col p-6 sm:p-8">
            <div className="flex items-center gap-3 text-red-500 mb-6">
              <AlertOctagon size={24} />
              <h2 className="text-xl font-bold tracking-wide">Wipe Database</h2>
            </div>
            <div className="bg-amber-500/10 border border-yellow-600/30 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  size={20}
                  className="text-yellow-500 shrink-0 mt-0.5"
                />
                <div className="w-full">
                  <h3 className="text-yellow-500 font-bold text-sm mb-1">
                    Recommended: Safe Backup
                  </h3>
                  <p className="text-zinc-400 text-xs mb-3 leading-relaxed">
                    Download backup before wiping.{" "}
                    <strong className="text-amber-400">
                      Limit: 5,000 records/day.
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
            <p className="text-red-100/70 text-sm mb-4">
              This action will{" "}
              <strong className="text-red-500">PERMANENTLY DELETE ALL</strong>{" "}
              maintenance records. Please enter your Admin password to confirm.
            </p>
            <div className="relative mb-8">
              <input
                type={showPassword ? "text" : "password"}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter admin password..."
                className="w-full bg-[#09090B] border border-zinc-800 focus:border-red-500/50 rounded-xl px-4 py-3 text-zinc-200 outline-none transition-all text-sm"
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
                className={`h-11 px-6 rounded-xl text-sm font-bold border transition-colors flex items-center justify-center gap-2 ${wiping || !deletePassword.trim() ? "border-rose-900/30 text-rose-500/50 bg-rose-950/20 cursor-not-allowed" : "border-rose-500/30 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"}`}
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

export default MaintenanceReport;
