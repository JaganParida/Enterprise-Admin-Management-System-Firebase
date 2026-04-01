import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import vehicleService from "../../services/vehicleService";
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
  MapPin,
  Package,
  IndianRupee,
  ArrowRightCircle,
  User,
  RefreshCcw,
  CheckCircle2,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import {
  collection,
  getDocs,
  query,
  where,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../config/firebase";

// 🚀 FIXED: Added the missing constant for the 5,000 pagination lock
const MAX_RECORDS_LIMIT = 5000;

const getPreviousMonthString = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const VehicleReport = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("trips");

  const [filters, setFilters] = useState({
    search: "",
    amountFilter: "Any Amount",
    dateFilter: "All",
    exactDate: "",
  });

  const [logs, setLogs] = useState(
    () => vehicleService.getCachedLogs("trips", filters) || [],
  );
  const [expenses, setExpenses] = useState(
    () => vehicleService.getCachedLogs("expenses", filters) || [],
  );

  const [loading, setLoading] = useState(
    () => !vehicleService.getCachedLogs("trips", filters),
  );

  const [lastDocTrip, setLastDocTrip] = useState(null);
  const [hasMoreTrip, setHasMoreTrip] = useState(false);
  const [lastDocExp, setLastDocExp] = useState(null);
  const [hasMoreExp, setHasMoreExp] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // 🚀 5000 Limit Trackers
  const [loadedCountTrip, setLoadedCountTrip] = useState(logs.length);
  const [loadedCountExp, setLoadedCountExp] = useState(expenses.length);

  const [syncStatus, setSyncStatus] = useState("up-to-date");

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
    primaryText: isTransport ? "text-[#38bdf8]" : "text-indigo-400",
    primaryBg: isTransport ? "bg-[#0c4a6e]/30" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-[#0284c7]/30" : "border-indigo-500/20",
    primaryFocus: isTransport
      ? "focus:border-[#0ea5e9]/50 focus:ring-1 focus:ring-[#0ea5e9]/50"
      : "focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50",
    primaryTabBg: isTransport
      ? "bg-[#0ea5e9] text-white shadow-lg shadow-[#0ea5e9]/20"
      : "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20",
    iconColor: isTransport ? "text-[#38bdf8]" : "text-indigo-400",
  };

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    id: null,
    type: null,
  });
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
        localStorage.getItem("vehicle_last_update") || "0",
        10,
      );
      if (globalLastUpdate > vehicleService.getLastFetchTime())
        setSyncStatus("required");
    };
    const interval = setInterval(checkSync, 2000);
    return () => clearInterval(interval);
  }, []);

  // 🚀 CHECK IF MONTHLY BACKUP IS NEEDED
  useEffect(() => {
    const checkBackupNeeded = async () => {
      const prevMonth = getPreviousMonthString();
      if (!localStorage.getItem(`backup_vehicle_${prevMonth}`)) {
        try {
          const q = query(
            collection(db, "trips"),
            where("date", ">=", prevMonth),
            where("date", "<=", prevMonth + "\uf8ff"),
            limit(1),
          );
          const snap = await getDocs(q);
          if (!snap.empty) setShowBackupWarning(prevMonth);
        } catch (error) {
          console.error("Failed to check backup status:", error);
        }
      }
    };
    checkBackupNeeded();
  }, []);

  // 🚀 100% CACHED FETCH LOGIC
  const fetchLogs = useCallback(
    async (isLoadMore = false, forceSync = false) => {
      if (isLoadMore) setLoadingMore(true);
      else if (forceSync) setSyncStatus("syncing");
      else setLoading(true);

      try {
        if (activeTab === "trips") {
          const res = await vehicleService.getLogs(
            filters,
            isLoadMore ? lastDocTrip : null,
            50,
            forceSync,
          );
          if (isLoadMore) {
            setLogs((prev) => [...prev, ...(res.data || [])]);
            setLoadedCountTrip((prev) => prev + (res.data?.length || 0));
          } else {
            setLogs(res.data || []);
            setLoadedCountTrip(res.data?.length || 0);
          }
          setLastDocTrip(res.lastVisible || null);
          setHasMoreTrip(res.data && res.data.length === 50);
        } else {
          const res = await vehicleService.getExpenses(
            filters,
            isLoadMore ? lastDocExp : null,
            50,
            forceSync,
          );
          if (isLoadMore) {
            setExpenses((prev) => [...prev, ...(res.data || [])]);
            setLoadedCountExp((prev) => prev + (res.data?.length || 0));
          } else {
            setExpenses(res.data || []);
            setLoadedCountExp(res.data?.length || 0);
          }
          setLastDocExp(res.lastVisible || null);
          setHasMoreExp(res.data && res.data.length === 50);
        }
        setSyncStatus("up-to-date");
      } catch (error) {
        toast.error("Failed to load report data.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeTab, filters, lastDocTrip, lastDocExp, logs, expenses, toast],
  );

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLogs(false);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [filters, activeTab]);

  useEffect(() => {
    if (urlHighlightId && !loading) {
      setActiveHighlight(urlHighlightId);
      setTimeout(() => {
        const el = document.getElementById(urlHighlightId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
      const timer = setTimeout(() => setActiveHighlight(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [urlHighlightId, loading]);

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      const currentUser = admin?.data || admin || {};
      if (deleteModal.type === "trips") {
        await vehicleService.deleteLog(deleteModal.id, currentUser);
        toast.success("Trip record deleted.");
      } else {
        await vehicleService.deleteExpense(deleteModal.id, currentUser);
        toast.success("Expense deleted.");
      }
      fetchLogs(false, true);
    } catch (error) {
      toast.error(error.message || "Failed to delete record");
    } finally {
      setDeleteModal({ isOpen: false, id: null, type: null });
    }
  };

  const openHistory = (item, type) => {
    const sortedHistory = item.editHistory
      ? [...item.editHistory].reverse()
      : [];
    setHistoryModal({
      isOpen: true,
      data: sortedHistory,
      itemName: type === "trips" ? item.vehicleNo : item.reason,
    });
  };

  const currentDataList = activeTab === "trips" ? logs : expenses;
  const currentLoadedCount =
    activeTab === "trips" ? loadedCountTrip : loadedCountExp;

  // 🚀 SMART 10,000 CHUNKER FOR BACKUPS
  const handleFullBackup = async (monthToFetch = backupMonth) => {
    try {
      if (!monthToFetch) return toast.error("Please select a month to backup.");

      const monthlyKey = `backup_count_${monthToFetch}_${activeTab}`;
      const downloadedCount = Number(localStorage.getItem(monthlyKey) || 0);
      if (downloadedCount >= 10000) {
        return toast.error(
          "10,000 daily download limit reached. Try again tomorrow.",
        );
      }

      toast.info(`Fetching secure backup chunk...`);
      const res = await vehicleService.getBackupChunk(
        monthToFetch,
        activeTab,
        10000 - downloadedCount,
      );

      if (res.data.length === 0)
        return toast.info(`No more records found for ${monthToFetch}.`);

      let csvContent = "\uFEFF";
      if (activeTab === "trips") {
        const headers = [
          "Date",
          "Vehicle No",
          "Driver",
          "Loading Point",
          "Unloading Site",
          "Distance",
          "Item",
          "Quantity",
          "Rate",
          "Food",
          "Total",
          "Paid",
          "Due",
        ];
        const rows = res.data.map(
          (log) =>
            `${log.date ? `\t${new Date(log.date).toLocaleDateString("en-GB")}` : "-"},"${log.vehicleNo}","${log.driverName}","${log.loadingPoint}","${log.unloadingSite}",${log.distanceTravelled || 0},"${log.items}",${log.quantity},${log.rate},${log.foodCharge},${log.totalAmount},${log.amountPaid},${log.amountDue}`,
        );
        csvContent += [headers.join(","), ...rows].join("\n");
      } else {
        const headers = ["Date", "Reason", "Amount"];
        const rows = res.data.map(
          (exp) =>
            `${exp.date ? `\t${new Date(exp.date).toLocaleDateString("en-GB")}` : "-"},"${exp.reason}",${exp.amount}`,
        );
        csvContent += [headers.join(","), ...rows].join("\n");
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `Backup_${activeTab}_${monthToFetch}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      localStorage.setItem(monthlyKey, downloadedCount + res.data.length);
      localStorage.setItem(
        `backup_last_doc_${monthToFetch}_${activeTab}`,
        res.lastDocId,
      );

      if (res.data.length === 10000 - downloadedCount) {
        toast.warning(
          "10,000 Limit reached. Download the next batch tomorrow.",
        );
      } else {
        toast.success(`Securely downloaded ${res.data.length} records!`);
        localStorage.setItem(`backup_vehicle_${monthToFetch}`, "true");
        if (showBackupWarning === monthToFetch) setShowBackupWarning(null);
      }
    } catch (error) {
      toast.error("Failed to generate backup chunk.");
    }
  };

  // 🚀 SECURE WIPE DATABASE WITH 10,000 CHUNK LIMIT
  const handleWipeAll = async () => {
    if (isManager || !deletePassword.trim())
      return toast.error("Verification failed.");
    setWiping(true);
    try {
      const currentUser = admin?.data || admin || {};
      const res = await vehicleService.deleteAllLogs({
        password: deletePassword,
        email: currentUser.email,
        type: activeTab,
      });

      if (res.warning) toast.warning(res.warning);
      else
        toast.success(
          `Safely cleared ${res.deletedCount} ${activeTab === "trips" ? "Trip" : "Expense"} records.`,
        );

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

  const handleDisabledClick = (action) => {
    setWarningTooltip(action);
    setTimeout(() => setWarningTooltip(null), 2500);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 relative space-y-8 px-2 sm:px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border ${activeTab === "trips" ? `${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}` : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}
          >
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {activeTab === "trips" ? "Trip Logs Report" : "Expense Report"}
            </h1>
            <p
              className={`text-xs uppercase tracking-widest mt-0.5 ${activeTab === "trips" ? "text-zinc-500" : "text-rose-100/40"}`}
            >
              Advanced Analytics
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="ghost"
            onClick={() => fetchLogs(false, true)}
            disabled={syncStatus === "up-to-date" || syncStatus === "syncing"}
            className={`flex items-center gap-2 h-[44px] px-4 w-full sm:w-auto justify-center rounded-xl font-bold text-xs tracking-wider transition-all duration-500 ${syncStatus === "up-to-date" ? "opacity-40 pointer-events-none text-emerald-500 bg-emerald-500/5 border border-emerald-500/10" : "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse"}`}
          >
            {syncStatus === "up-to-date" ? (
              <CheckCircle2 size={16} />
            ) : (
              <RefreshCcw
                size={16}
                className={syncStatus === "syncing" ? "animate-spin" : ""}
              />
            )}
            {syncStatus === "up-to-date"
              ? "Database Up to Date"
              : "Sync Required"}
          </Button>

          <div className="flex items-center gap-2 bg-[#09090B] p-1.5 rounded-2xl border border-zinc-800/60 w-max h-[44px] shadow-inner">
            <button
              onClick={() => {
                setActiveTab("trips");
                setFilters({
                  search: "",
                  amountFilter: "Any Amount",
                  dateFilter: "All",
                  exactDate: "",
                });
              }}
              className={`px-5 h-full flex items-center text-xs font-bold rounded-xl transition-all ${activeTab === "trips" ? theme.primaryTabBg : "text-zinc-400 hover:text-white"}`}
            >
              Trips
            </button>
            <button
              onClick={() => {
                setActiveTab("expenses");
                setFilters({
                  search: "",
                  amountFilter: "Any Amount",
                  dateFilter: "All",
                  exactDate: "",
                });
              }}
              className={`px-5 h-full flex items-center text-xs font-bold rounded-xl transition-all ${activeTab === "expenses" ? "bg-rose-600 text-white shadow-lg shadow-rose-900/20" : "text-zinc-400 hover:text-white"}`}
            >
              Expenses
            </button>
          </div>

          <div className="flex gap-2">
            <div className="relative h-[44px] w-full sm:w-auto">
              <Button
                variant="module"
                onClick={() =>
                  isManager
                    ? handleDisabledClick("wipe-all")
                    : setIsDeleteAllOpen(true)
                }
                className={`h-full w-full flex items-center justify-center gap-2 px-4 rounded-xl transition-all text-xs font-bold border-rose-500/40 text-rose-400 bg-rose-950/30 hover:bg-rose-900/40 hover:border-rose-400/60 ${isManager ? "opacity-50 !cursor-not-allowed" : ""}`}
              >
                <AlertOctagon size={16} /> Wipe{" "}
                {activeTab === "trips" ? "Trips" : "Expenses"}
              </Button>
              {warningTooltip === "wipe-all" && (
                <div className="absolute top-full mt-2 right-0 z-[100] bg-[#09090B] border border-red-500/30 text-red-400 text-[10px] font-bold px-3 py-2 rounded-lg w-max shadow-xl">
                  🚫 Admin Access Required
                </div>
              )}
            </div>
            <Link
              to={isTransport ? "/transportation/logs" : "/enterprise/logs"}
              className="w-full sm:w-auto"
            >
              <Button
                variant="primary"
                className="h-[44px] px-6 text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 w-full whitespace-nowrap"
              >
                Add Entry
              </Button>
            </Link>
          </div>
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
                You haven't downloaded the{" "}
                {activeTab === "trips" ? "trip logs" : "expenses"} backup for{" "}
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
        className={`bg-[#09090B] rounded-3xl border overflow-visible shadow-2xl transition-colors duration-300 ${activeTab === "trips" ? "border-zinc-800/60" : "border-rose-900/30"}`}
      >
        <div
          className={`p-5 border-b flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5 rounded-t-3xl ${activeTab === "trips" ? "border-zinc-800/60 bg-zinc-900/10" : "border-rose-900/20 bg-rose-950/10"}`}
        >
          <div className="relative w-full xl:w-96 group">
            <Search
              size={16}
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${filters.search ? (activeTab === "trips" ? theme.primaryText : "text-rose-500") : "text-zinc-500 group-hover:text-zinc-400"}`}
            />
            <input
              type="text"
              placeholder={
                activeTab === "trips" ? "Search vehicle..." : "Search reason..."
              }
              className={`w-full bg-[#09090B] border rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 outline-none transition-all shadow-inner focus:ring-2 ${activeTab === "trips" ? "border-zinc-800 focus:border-zinc-700 focus:ring-zinc-800/50" : "border-rose-900/40 focus:ring-rose-500/50"}`}
              value={filters.search}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  search: e.target.value,
                  amountFilter: "Any Amount",
                  dateFilter: "All",
                  exactDate: "",
                })
              }
            />
          </div>
        </div>

        <div
          className={`p-4 border-b bg-[#09090B] flex flex-wrap items-center gap-4 relative z-20 ${activeTab === "trips" ? "border-zinc-800/60" : "border-rose-900/20"}`}
        >
          <div
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1 border-r mr-1 ${activeTab === "trips" ? "text-zinc-400 border-zinc-800" : "text-rose-500 border-rose-900/40"}`}
          >
            <Filter size={16} /> Filters
          </div>
          <div className="relative group">
            <select
              value={filters.amountFilter}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  amountFilter: e.target.value,
                  search: "",
                  dateFilter: "All",
                  exactDate: "",
                })
              }
              className={`appearance-none bg-[#09090B] border rounded-xl pl-4 pr-10 py-2.5 text-xs font-medium outline-none cursor-pointer transition-all ${activeTab === "trips" ? `border-zinc-800 text-zinc-400 ${theme.primaryFocus}` : "border-rose-900/40 text-rose-200 focus:border-rose-500/50"}`}
            >
              <option value="Any Amount">Any Amount</option>
              <option value="Under ₹10k">&lt; ₹10,000</option>
              <option value="₹10k - ₹50k">₹10k - ₹50k</option>
              <option value="Over ₹50k">&gt; ₹50,000</option>
            </select>
            <ChevronDown
              size={14}
              className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${activeTab === "trips" ? "text-zinc-500 group-hover:text-zinc-300" : "text-rose-500/50 group-hover:text-rose-400"}`}
            />
          </div>
          <div className="relative group">
            <select
              value={filters.dateFilter}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  dateFilter: e.target.value,
                  exactDate: "",
                  search: "",
                  amountFilter: "Any Amount",
                })
              }
              className={`appearance-none bg-[#09090B] border rounded-xl pl-4 pr-10 py-2.5 text-xs font-medium outline-none cursor-pointer transition-all ${activeTab === "trips" ? `border-zinc-800 text-zinc-400 ${theme.primaryFocus}` : "border-rose-900/40 text-rose-200 focus:border-rose-500/50"}`}
            >
              <option value="All">Timeline: All</option>
              <option value="Today">Today</option>
              <option value="Last7Days">Last 7 Days</option>
              <option value="ThisMonth">This Month</option>
            </select>
            <ChevronDown
              size={14}
              className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${activeTab === "trips" ? "text-zinc-500 group-hover:text-zinc-300" : "text-rose-500/50 group-hover:text-rose-400"}`}
            />
          </div>
          <div className="relative group flex items-center">
            <div
              className={`absolute left-3 flex items-center justify-center pointer-events-none transition-colors ${filters.exactDate ? (activeTab === "trips" ? theme.primaryText : "text-rose-500") : "text-zinc-500"}`}
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
                  search: "",
                  amountFilter: "Any Amount",
                })
              }
              style={{ colorScheme: "dark" }}
              className={`appearance-none bg-[#09090B] border rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium outline-none cursor-pointer transition-all ${activeTab === "trips" ? `border-zinc-800 ${theme.primaryFocus}` : "border-rose-900/40 focus:border-rose-500/50"} ${filters.exactDate ? "text-white" : "text-zinc-500"}`}
            />
          </div>
        </div>

        <div className="overflow-x-auto pb-4 custom-scrollbar min-h-[400px]">
          {loading && !loadingMore ? (
            <div className="flex justify-center items-center h-64">
              <Loader />
            </div>
          ) : activeTab === "trips" ? (
            <table className="w-full text-left min-w-[900px] animate-in fade-in duration-300">
              <thead className="bg-[#09090B] text-zinc-500 text-[10px] uppercase font-bold tracking-[0.15em] border-b border-zinc-800/60">
                <tr>
                  <th className="py-5 px-6 whitespace-nowrap">
                    Shipment Date & Vehicle
                  </th>
                  <th className="py-5 px-6">Route Details</th>
                  <th className="py-5 px-6">Cargo & Rate</th>
                  <th className="py-5 px-6 text-right">Financials</th>
                  <th className="py-5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-zinc-800/60">
                {currentDataList.map((log) => {
                  const hasEdits =
                    log.editHistory && log.editHistory.length > 0;
                  const latestLog = hasEdits
                    ? log.editHistory[log.editHistory.length - 1]
                    : null;
                  return (
                    <tr
                      key={log._id}
                      className={`transition-all duration-500 ease-out group ${activeHighlight === log._id ? `${isTransport ? "bg-[#0ea5e9]/[0.08] shadow-[inset_0_0_20px_rgba(14,165,233,0.05)]" : "bg-indigo-500/[0.08] shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]"}` : "hover:bg-zinc-800/30"}`}
                    >
                      <td className="p-4 align-top">
                        <p className="text-[11px] font-mono text-zinc-400 mb-1.5">
                          {log.date
                            ? new Date(log.date).toLocaleDateString("en-GB")
                            : "-"}
                        </p>
                        <p className="font-bold text-white text-md uppercase tracking-wider flex items-center gap-2">
                          <Truck size={14} className="text-zinc-500" />{" "}
                          {log.vehicleNo}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-1.5 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                          <User size={12} className="text-zinc-600" />{" "}
                          {log.driverName}
                        </p>
                        {hasEdits && (
                          <div
                            onClick={() => openHistory(log, "trips")}
                            className="mt-3 flex flex-col items-start w-max cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <div className="flex items-center gap-1.5 bg-zinc-800/50 border border-zinc-700/50 px-2 py-1 rounded-lg">
                              <History size={10} className="text-zinc-500" />
                              <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                                {latestLog.role || "ADMIN"}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-start gap-2">
                            <div
                              className={`mt-0.5 w-5 h-5 rounded-full ${theme.primaryBg} flex items-center justify-center border ${theme.primaryBorder} shrink-0`}
                            >
                              <MapPin size={10} className={theme.iconColor} />
                            </div>
                            <div>
                              <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-0.5">
                                Origin
                              </p>
                              <span className="text-xs font-semibold text-zinc-300">
                                {log.loadingPoint}
                              </span>
                            </div>
                          </div>
                          <div className="w-0.5 h-3 bg-zinc-800 ml-3"></div>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shrink-0">
                              <ArrowRightCircle
                                size={12}
                                className="text-rose-400"
                              />
                            </div>
                            <span className="text-xs font-semibold text-zinc-300">
                              {log.unloadingSite}
                            </span>
                            {log.distanceTravelled > 0 && (
                              <span className="text-[10px] text-zinc-500 font-mono ml-1">
                                ({log.distanceTravelled} km)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="text-xs text-zinc-300 mb-2 flex items-center gap-1.5 bg-zinc-800/50 w-max px-2.5 py-1 rounded-md font-medium border border-zinc-700/50 uppercase tracking-wide">
                          <Package size={12} className={theme.iconColor} />{" "}
                          {log.items} <span className="text-zinc-600">|</span>{" "}
                          {log.quantity} Qty
                        </div>
                        <div className="text-[11px] text-zinc-400 font-medium">
                          Rate:{" "}
                          <span className="font-bold text-white ml-1">
                            ₹{log.rate}
                          </span>
                        </div>
                        {log.foodCharge > 0 && (
                          <div className="text-[11px] text-zinc-400 font-medium mt-1">
                            Food:{" "}
                            <span className="font-bold text-white ml-1">
                              ₹{log.foodCharge}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-top text-right">
                        <p className="text-lg font-black text-white font-mono drop-shadow-sm">
                          ₹{log.totalAmount?.toLocaleString("en-IN")}
                        </p>
                        <div className="flex flex-col items-end gap-1.5 mt-2">
                          <span
                            className={`text-[10px] font-bold ${theme.primaryText} uppercase tracking-widest`}
                          >
                            Paid: ₹
                            {Number(log.amountPaid || 0).toLocaleString(
                              "en-IN",
                            )}
                          </span>
                          {log.amountDue > 0 && (
                            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 mt-0.5">
                              Due: ₹{log.amountDue?.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-5 px-6 text-right align-top">
                        <div className="flex justify-end gap-2 items-center relative mt-1">
                          <button
                            onClick={() =>
                              navigate(
                                `${isTransport ? "/transportation/logs" : "/enterprise/logs"}`,
                                { state: { editLog: log } },
                              )
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
                                    type: "trips",
                                  })
                            }
                            className={`p-2 rounded-lg transition-colors ${isManager ? "text-zinc-600 opacity-50 cursor-not-allowed" : "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {currentDataList.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-12 text-center text-zinc-500 italic"
                    >
                      No trip records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left min-w-[500px] animate-in fade-in duration-300">
              <thead className="sticky top-0 bg-transparent text-[10px] uppercase font-bold text-rose-100/40 tracking-[0.15em] z-10 border-b border-rose-900/20">
                <tr>
                  <th className="py-4 px-4 w-[30%]">Date</th>
                  <th className="py-4 px-4 w-[45%]">Reason</th>
                  <th className="py-4 px-4 text-right w-[15%]">Amount</th>
                  <th className="py-4 px-4 text-right w-[10%]">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-rose-900/10">
                {currentDataList.map((exp) => {
                  const hasEdits =
                    exp.editHistory && exp.editHistory.length > 0;
                  const latestLog = hasEdits
                    ? exp.editHistory[exp.editHistory.length - 1]
                    : null;
                  return (
                    <tr
                      key={exp._id}
                      className={`transition-all duration-500 ease-out group ${activeHighlight === exp._id ? `bg-rose-500/[0.08] shadow-[inset_0_0_20px_rgba(244,63,94,0.05)]` : "hover:bg-rose-900/10"}`}
                    >
                      <td className="p-4 align-top">
                        <div className="text-[11px] font-mono text-rose-400 mb-1.5">
                          {new Date(exp.date).toLocaleDateString("en-GB")}
                        </div>
                        {hasEdits && (
                          <div
                            onClick={() => openHistory(exp, "expenses")}
                            className="mt-2 flex flex-col items-start w-max cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <div className="flex items-center gap-1.5 bg-rose-950/30 border border-rose-900/50 px-2 py-1 rounded-lg">
                              <History size={10} className="text-rose-500" />
                              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">
                                {latestLog.role || "ADMIN"}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-top text-white font-medium capitalize">
                        {exp.reason}
                      </td>
                      <td className="p-4 align-top text-right">
                        <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg font-mono font-bold">
                          ₹{Number(exp.amount).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="p-4 text-right align-top">
                        <div className="flex justify-end gap-2 items-center relative mt-1">
                          <button
                            onClick={() =>
                              navigate(
                                `${isTransport ? "/transportation/logs" : "/enterprise/logs"}`,
                                { state: { editExpense: exp } },
                              )
                            }
                            className="p-2 text-rose-400/70 hover:text-rose-400 hover:bg-rose-900/30 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() =>
                              isManager
                                ? handleDisabledClick(exp._id)
                                : setDeleteModal({
                                    isOpen: true,
                                    id: exp._id,
                                    type: "expenses",
                                  })
                            }
                            className={`p-2 rounded-lg transition-colors ${isManager ? "text-rose-100/10 opacity-50 cursor-not-allowed" : "text-rose-400/70 hover:text-red-400 hover:bg-red-900/30"}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {currentDataList.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
                      className="p-12 text-center text-rose-100/30 italic"
                    >
                      No expenses recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* 🚀 LOAD MORE WITH LIMITS */}
          {((activeTab === "trips" &&
            hasMoreTrip &&
            loadedCountTrip < MAX_RECORDS_LIMIT) ||
            (activeTab === "expenses" &&
              hasMoreExp &&
              loadedCountExp < MAX_RECORDS_LIMIT)) &&
            currentDataList.length > 0 && (
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
                    : `Load Next 50 Records (Loaded: ${currentLoadedCount})`}
                </Button>
              </div>
            )}

          {currentLoadedCount >= MAX_RECORDS_LIMIT && (
            <div className="flex justify-center p-6 border-t border-zinc-800/60 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2 w-full max-w-lg justify-center shadow-lg">
                <ShieldAlert size={16} />{" "}
                <span>
                  You reached the limit of visible records. Try searching or
                  filtering safely.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, type: null })}
        onConfirm={executeDelete}
        title={`Delete ${deleteModal.type === "trips" ? "Trip" : "Expense"}?`}
        message="Are you sure you want to permanently delete this record?"
        confirmText="Delete Record"
        isDestructive={true}
      />

      {/* 🚀 SECURE WIPE MODAL */}
      {isDeleteAllOpen && !isManager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div
            className="absolute inset-0"
            onClick={() => !wiping && setIsDeleteAllOpen(false)}
          />
          <div className="bg-[#09090B] border border-red-900/50 rounded-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col p-6 sm:p-8 animate-in zoom-in-[0.95] duration-300 ease-out shadow-2xl">
            <div className="flex items-center gap-3 text-red-500 mb-6">
              <AlertOctagon size={24} />
              <h2 className="text-xl font-bold tracking-wide">
                Wipe{" "}
                {activeTab === "trips" ? "Trip Database" : "Expense Database"}
              </h2>
            </div>
            <div className="bg-amber-500/10 border border-yellow-600/30 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-2 text-yellow-500 font-bold mb-2 text-sm">
                <ShieldAlert size={18} />
                <h3>Safe Backup (10,000 monthly limit)</h3>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed mb-4">
                You are restricted to downloading 10,000 records daily per month
                selected.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                <input
                  type="month"
                  value={backupMonth}
                  onChange={(e) => setBackupMonth(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="w-full sm:w-32 bg-zinc-900/50 border border-yellow-500/30 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none transition-all"
                />
                <Button
                  variant="outline"
                  onClick={() => handleFullBackup(backupMonth)}
                  className="h-11 w-full sm:flex-1 text-yellow-500 border-yellow-600/40 hover:bg-yellow-500/10"
                >
                  <Download size={14} className="mr-2" /> Download Part
                </Button>
              </div>
            </div>
            <p className="text-red-100/70 text-sm mb-4">
              This action will{" "}
              <strong className="text-red-500">PERMANENTLY DELETE</strong>{" "}
              records in chunks. Note: Deletes are locked to 10,000 per 24
              hours.
            </p>
            <div className="relative mb-8">
              <input
                type={showPassword ? "text" : "password"}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your admin password..."
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
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteAllOpen(false);
                  setDeletePassword("");
                }}
                disabled={wiping}
                className="h-11 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
              >
                Cancel
              </Button>
              <button
                onClick={handleWipeAll}
                disabled={wiping || !deletePassword.trim()}
                className={`h-11 px-6 rounded-xl text-sm font-bold border transition-colors flex items-center justify-center gap-2 ${wiping || !deletePassword.trim() ? "border-rose-900/30 text-rose-500/50 bg-rose-950/20 cursor-not-allowed" : "border-rose-500/30 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"}`}
              >
                {wiping ? (
                  <RefreshCcw size={16} className="animate-spin" />
                ) : null}{" "}
                {wiping ? "Wiping..." : "Confirm Chunk Wipe"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {historyModal.isOpen && historyModal.data && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() =>
              setHistoryModal({ isOpen: false, data: null, itemName: "" })
            }
          />
          <div
            className={`bg-[#09090B] border ${activeTab === "trips" ? theme.primaryBorder : "border-rose-900/30"} rounded-3xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-[0.95] duration-300 ease-out`}
          >
            <div
              className={`flex items-center justify-between p-5 border-b ${activeTab === "trips" ? `${theme.primaryBorder} ${theme.primaryBg}` : "border-rose-900/20 bg-rose-900/10"} shrink-0`}
            >
              <div className="flex items-center gap-2 text-white font-bold tracking-wide text-sm">
                <History
                  size={16}
                  className={
                    activeTab === "trips" ? theme.primaryText : "text-rose-400"
                  }
                />{" "}
                Log History:{" "}
                <span
                  className={`${activeTab === "trips" ? theme.primaryText : "text-rose-400"} font-normal`}
                >
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
                  className={`bg-[#09090B] border ${index === 0 ? (activeTab === "trips" ? theme.primaryBorder : "border-rose-500/30") : "border-zinc-800"} rounded-xl p-4 flex items-center justify-between relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  {index === 0 && (
                    <div
                      className={`absolute left-0 top-0 w-1 h-full ${activeTab === "trips" ? theme.primaryBg : "bg-rose-500"}`}
                    ></div>
                  )}
                  <div className="flex items-center gap-4 pl-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${index === 0 ? (activeTab === "trips" ? `${theme.primaryBg} ${theme.primaryText}` : "bg-rose-500/10 text-rose-400") : "bg-zinc-800 text-zinc-500"}`}
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
                    </div>
                  </div>
                  {index === 0 && (
                    <div
                      className={`${activeTab === "trips" ? `${theme.primaryBg} ${theme.primaryBorder} ${theme.primaryText}` : "bg-rose-500/10 border-rose-500/20 text-rose-400"} text-[10px] font-bold px-3 py-1 rounded-lg tracking-widest uppercase border`}
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

export default VehicleReport;
