import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import employeeService from "../../services/employeeService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Users,
  Plus,
  Phone,
  MapPin,
  Trash2,
  User,
  Edit,
  History,
  X,
  CreditCard,
  ShieldCheck,
  Search,
  Filter,
  AlertOctagon,
  ShieldAlert,
  EyeOff,
  Download,
  ChevronDown,
  RefreshCcw,
  Eye,
  CheckCircle2,
  Sigma,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../../config/firebase";
import { motion, AnimatePresence } from "framer-motion";

const MAX_RECORDS_LIMIT = 5000;

const getPreviousMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const EmployeeList = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const location = useLocation();

  // Fully Decoupled Local UI States vs Applied Database States
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [localFilterStatus, setLocalFilterStatus] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const [localFilterSalary, setLocalFilterSalary] = useState("All");
  const [filterSalary, setFilterSalary] = useState("All");

  const hasUnappliedChanges =
    localSearchTerm !== searchTerm ||
    localFilterStatus !== filterStatus ||
    localFilterSalary !== filterSalary;

  const [employees, setEmployees] = useState(
    () =>
      employeeService.getCachedEmployees({
        status: filterStatus,
        search: searchTerm,
        salary: filterSalary,
      }) || [],
  );
  const [dynamicFilterStats, setDynamicFilterStats] = useState(null);
  const [loading, setLoading] = useState(
    () =>
      !employeeService.getCachedEmployees({
        status: filterStatus,
        search: searchTerm,
        salary: filterSalary,
      }),
  );

  const [syncStatus, setSyncStatus] = useState(() =>
    employeeService.getCachedEmployees({
      status: filterStatus,
      search: searchTerm,
      salary: filterSalary,
    })
      ? "up-to-date"
      : "syncing",
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(employees.length);

  const searchParams = new URLSearchParams(location.search);
  const highlightId = searchParams.get("highlight");
  const [activeHighlight, setActiveHighlight] = useState(highlightId);

  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const theme = {
    primaryText: isTransport ? "text-cyan-400" : "text-indigo-400",
    primaryTextMuted: isTransport ? "text-cyan-500" : "text-indigo-500",
    primaryBg: isTransport ? "bg-cyan-500/10" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-cyan-500/20" : "border-indigo-500/20",
    primaryHoverBorder: isTransport
      ? "hover:border-cyan-500/30"
      : "hover:border-indigo-500/30",
    primaryHoverBg: isTransport
      ? "hover:bg-cyan-500/10"
      : "hover:bg-indigo-500/10",
    primaryFocus: isTransport
      ? "focus:border-cyan-500/50 focus:ring-cyan-500/50"
      : "focus:border-indigo-500/50 focus:ring-indigo-500/50",
    glowOrb: isTransport ? "bg-cyan-500/5" : "bg-indigo-500/5",
    glowOrbHover: isTransport
      ? "group-hover:bg-cyan-500/10"
      : "group-hover:bg-indigo-500/10",
    shadowGlow: isTransport
      ? "shadow-[0_0_50px_rgba(6,182,212,0.15)]"
      : "shadow-[0_0_50px_rgba(99,102,241,0.15)]",
    dropShadowGlow: isTransport
      ? "drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]"
      : "drop-shadow-[0_0_15px_rgba(99,102,241,0.4)]",
  };

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    id: null,
    name: "",
  });
  const [warningTooltip, setWarningTooltip] = useState(null);
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    itemName: "",
  });
  const [idModal, setIdModal] = useState({ isOpen: false, data: null });
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [backupMonth, setBackupMonth] = useState(getPreviousMonth());
  const [showBackupWarning, setShowBackupWarning] = useState(null);

  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";

  useEffect(() => {
    const checkSync = () => {
      const globalLastUpdate = parseInt(
        localStorage.getItem("emp_last_update") || "0",
        10,
      );
      if (globalLastUpdate > employeeService.getLastFetchTime())
        setSyncStatus("required");
    };
    const interval = setInterval(checkSync, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkBackupNeeded = async () => {
      const prevMonth = getPreviousMonth();
      if (!localStorage.getItem(`backup_employees_${prevMonth}`)) {
        try {
          const q = query(collection(db, "employees"), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) setShowBackupWarning(prevMonth);
        } catch (error) {
          console.error("Failed to check backup status:", error);
        }
      }
    };
    checkBackupNeeded();
  }, []);

  const fetchEmployees = useCallback(
    async (isLoadMore = false, forceSync = false) => {
      if (isLoadMore) setLoadingMore(true);
      else if (forceSync || employees.length === 0) setSyncStatus("syncing");

      if (employees.length === 0 && !isLoadMore && !forceSync) setLoading(true);

      try {
        const filters = {
          status: filterStatus,
          search: searchTerm,
          salary: filterSalary,
        };
        const listPromise = employeeService.getAllEmployees(
          filters,
          isLoadMore ? lastDoc : null,
          50,
          forceSync,
        );
        let promises = [listPromise];

        const isFiltered =
          filterStatus !== "All" || searchTerm || filterSalary !== "All";
        if (!isLoadMore && isFiltered)
          promises.push(employeeService.getDynamicViewStats(filters));

        const results = await Promise.all(promises);
        const response = results[0];

        if (!isLoadMore) setDynamicFilterStats(isFiltered ? results[1] : null);

        if (isLoadMore) {
          setEmployees((prev) => [...prev, ...(response.data || [])]);
          setLoadedCount((prev) => prev + (response.data?.length || 0));
        } else {
          setEmployees(response.data || []);
          setLoadedCount(response.data?.length || 0);
        }

        setLastDoc(response.lastVisible || null);
        setHasMore(response.data && response.data.length === 50);
        setSyncStatus("up-to-date");
      } catch (error) {
        toast.error("Failed to load employee list");
        setSyncStatus("error");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filterStatus, searchTerm, filterSalary, lastDoc, employees.length, toast],
  );

  useEffect(() => {
    fetchEmployees(false);
  }, [searchTerm, filterStatus, filterSalary, fetchEmployees]);

  useEffect(() => {
    if (highlightId && !loading) {
      setActiveHighlight(highlightId);
      setTimeout(() => {
        const element = document.getElementById(highlightId);
        if (element)
          element.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
      const timer = setTimeout(() => {
        setActiveHighlight(null);
        window.history.replaceState({}, "", location.pathname);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightId, loading, location.pathname]);

  const handleApplyAll = (e) => {
    e?.preventDefault();
    setSearchTerm(localSearchTerm);
    setFilterStatus(localFilterStatus);
    setFilterSalary(localFilterSalary);
  };

  const handleClearAll = () => {
    setLocalSearchTerm("");
    setSearchTerm("");
    setLocalFilterStatus("All");
    setFilterStatus("All");
    setLocalFilterSalary("All");
    setFilterSalary("All");
  };

  const activeFiltersCount =
    [filterStatus, filterSalary].filter((f) => f !== "All").length +
    (searchTerm ? 1 : 0);

  const handleDeleteClick = (id, name) =>
    setDeleteModal({ isOpen: true, id, name });
  const handleDisabledClick = (action) => {
    setWarningTooltip(action);
    setTimeout(() => setWarningTooltip(null), 2500);
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      const currentUser = admin?.data || admin || {};
      const empToDelete = employees.find((e) => e._id === deleteModal.id);

      await employeeService.deleteEmployee(deleteModal.id, currentUser);
      setEmployees((prev) => prev.filter((e) => e._id !== deleteModal.id));

      if (dynamicFilterStats && empToDelete) {
        setDynamicFilterStats((prev) => ({
          count: prev.count - 1,
          baseSalarySum:
            prev.baseSalarySum - Number(empToDelete.initialSalary || 0),
          salaryTakenSum:
            prev.salaryTakenSum - Number(empToDelete.salaryTaken || 0),
        }));
      }
      toast.info("Employee removed successfully");
    } catch (error) {
      toast.error(error.message || "Failed to remove employee");
      fetchEmployees(false, true);
    } finally {
      setDeleteModal({ isOpen: false, id: null, name: "" });
    }
  };

  const handleFullBackup = async (monthToFetch = backupMonth) => {
    try {
      if (!monthToFetch) return toast.error("Please select a month to backup.");

      const monthlyKey = `backup_count_${monthToFetch}_emp`;
      const lastDocKey = `backup_last_doc_${monthToFetch}_emp`;

      const downloadedCount = Number(localStorage.getItem(monthlyKey) || 0);
      const savedLastDocId = localStorage.getItem(lastDocKey);

      if (downloadedCount >= 10000)
        return toast.error(
          "10,000 daily download limit reached. Try again tomorrow.",
        );

      toast.info(`Fetching secure backup chunk for ${monthToFetch}...`);

      const res = await employeeService.getBackupChunk(
        monthToFetch,
        10000 - downloadedCount,
        savedLastDocId,
      );

      if (res.data.length === 0)
        return toast.info(`No more records found for ${monthToFetch}.`);

      const headers = [
        "Name",
        "Position",
        "Phone",
        "Address",
        "Status",
        "Base Salary",
        "Salary Taken",
      ];

      const rows = res.data.map((emp) => {
        const name = `"${emp.name || ""}"`;
        const position = `"${emp.position || ""}"`;
        const phone = `"${emp.phone || ""}"`;
        const address = `"${emp.address || ""}"`;
        const status = `"${emp.status || "Active"}"`;
        const baseSalary = Number(emp.initialSalary || emp.baseSalary || 0);
        const salaryTaken = Number(emp.salaryTaken || 0);
        return `${name},${position},${phone},${address},${status},${baseSalary},${salaryTaken}`;
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Employees_Backup_${monthToFetch}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      localStorage.setItem(monthlyKey, downloadedCount + res.data.length);
      if (res.lastDocId) {
        localStorage.setItem(lastDocKey, res.lastDocId);
      }

      if (res.data.length === 10000 - downloadedCount) {
        toast.warning("10,000 Limit reached. Download next batch tomorrow.");
      } else {
        toast.success(`Downloaded ${res.data.length} records securely!`);
        localStorage.setItem(`backup_employees_${monthToFetch}`, "true");
        localStorage.removeItem(lastDocKey);
        if (showBackupWarning === monthToFetch) setShowBackupWarning(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate backup.");
    }
  };

  const handleWipeAll = async () => {
    if (isManager || !deletePassword)
      return toast.error("Verification failed.");
    setWiping(true);
    try {
      const currentUser = admin?.data || admin || {};
      const res = await employeeService.deleteAllEmployees({
        password: deletePassword,
        email: currentUser.email,
        user: currentUser,
      });
      if (res.isPartial) toast.warning(res.message);
      else toast.success(res.message);

      setIsDeleteAllOpen(false);
      setDeletePassword("");
      setShowPassword(false);
      fetchEmployees(false, true);
    } catch (error) {
      toast.error(error.message || "Incorrect Admin Password.");
    } finally {
      setWiping(false);
    }
  };

  const openHistory = (emp) =>
    setHistoryModal({
      isOpen: true,
      data: emp.editHistory ? [...emp.editHistory].reverse() : [],
      itemName: emp.name,
    });

  const getStatusStyle = (status) => {
    switch (status) {
      case "Active":
        return `${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`;
      case "Inactive":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "On Leave":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return `${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`;
    }
  };

  const formatIdNumber = (type, number) => {
    if (!number) return "N/A";
    if (type === "Aadhar" && number.length === 12)
      return number.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
    return number;
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10 relative"
    >
      <motion.div
        variants={itemVariants}
        className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div
              className={`p-2 rounded-lg border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
            >
              <Users size={24} />
            </div>{" "}
            Employee Directory
          </h1>
          <p className="text-zinc-500 text-sm mt-1 ml-1">
            Manage your workforce and staff details.
          </p>
        </div>
        <div className="flex gap-3 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 items-center">
          <Button
            variant="ghost"
            onClick={() => fetchEmployees(false, true)}
            disabled={syncStatus === "up-to-date" || syncStatus === "syncing"}
            className={`flex items-center gap-2 h-11 px-4 w-full sm:w-auto justify-center rounded-xl font-bold text-xs tracking-wider transition-all duration-500 ${syncStatus === "up-to-date" ? "opacity-40 pointer-events-none text-emerald-500 bg-emerald-500/5 border border-emerald-500/10" : "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 animate-pulse"}`}
          >
            {syncStatus === "up-to-date" ? (
              <CheckCircle2 size={16} />
            ) : (
              <RefreshCcw
                size={16}
                className={syncStatus === "syncing" ? "animate-spin" : ""}
              />
            )}
            <span className="hidden sm:inline">
              {syncStatus === "up-to-date"
                ? "DB Synced"
                : syncStatus === "syncing"
                  ? "Syncing"
                  : "Sync Required"}
            </span>
          </Button>

          <div className="relative">
            <Button
              variant="module"
              onClick={() =>
                isManager
                  ? handleDisabledClick("wipe-all")
                  : setIsDeleteAllOpen(true)
              }
              className={`h-11 flex items-center gap-2 px-4 transition-all text-xs font-bold border-rose-500/40 text-rose-400 bg-rose-950/30 hover:bg-rose-900/40 hover:border-rose-400/60 whitespace-nowrap ${isManager ? "opacity-50 !cursor-not-allowed" : ""}`}
            >
              <AlertOctagon size={16} />{" "}
              <span className="hidden sm:inline">Wipe Database</span>
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
            to={`${isTransport ? "/transportation/employees/add" : "/enterprise/employees/add"}`}
          >
            <Button
              variant="primary"
              className="h-11 gap-2 shadow-lg whitespace-nowrap text-xs"
            >
              <Plus size={16} /> Add Employee
            </Button>
          </Link>
        </div>
      </motion.div>

      {showBackupWarning && (
        <motion.div
          variants={itemVariants}
          className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(245,158,11,0.1)] w-full"
        >
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/20 p-2.5 rounded-full text-amber-500">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h4 className="text-amber-400 font-bold text-sm tracking-wide">
                Monthly Data Backup Required
              </h4>
              <p className="text-amber-100/60 text-xs mt-0.5">
                You haven't downloaded the staff database snapshot for{" "}
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
        </motion.div>
      )}

      {/* 🚀 Unified Search & Filter Form with Enhanced Iconography */}
      <motion.form
        onSubmit={handleApplyAll}
        variants={itemVariants}
        className="bg-[#09090B] rounded-2xl shadow-xl border border-zinc-800/60 overflow-hidden flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 p-4 relative"
      >
        {loading && !loadingMore && (
          <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-sm">
            <Loader />
          </div>
        )}

        <div className="flex w-full xl:w-[32rem] shadow-sm">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by name (Press Enter)..."
              className={`w-full h-11 bg-zinc-900/50 border border-zinc-800 rounded-l-xl pl-5 pr-10 py-2.5 text-sm text-zinc-100 outline-none transition-all ${theme.primaryFocus}`}
              value={localSearchTerm}
              onChange={(e) => {
                const val = e.target.value;
                setLocalSearchTerm(val);

                if (val.trim() !== "") {
                  setLocalFilterSalary("All");
                } else {
                  if (searchTerm !== "") {
                    setSearchTerm("");
                  }
                }
              }}
            />
            {/* Clear Input Cross Icon */}
            {localSearchTerm && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearchTerm("");
                  setSearchTerm("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1.5 rounded-md transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {/* Search Action Button with Icon */}
          <button
            type="submit"
            className={`h-11 px-5 rounded-r-xl font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 border-y border-r border-transparent ${
              localSearchTerm !== searchTerm
                ? `${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder} hover:brightness-110 shadow-lg`
                : "bg-zinc-800/50 text-zinc-500 border-zinc-800 cursor-default"
            }`}
          >
            <Search size={14} /> SEARCH
          </button>
        </div>

        <div className="flex items-center gap-3 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 px-2 border-r border-zinc-800 mr-1">
            <Filter size={14} /> Filter{" "}
            {activeFiltersCount > 0 && (
              <span
                className={`px-1.5 rounded-full ml-1 border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
              >
                {activeFiltersCount}
              </span>
            )}
          </div>

          <div className="relative group">
            <select
              value={localFilterStatus}
              onChange={(e) => setLocalFilterStatus(e.target.value)}
              className={`appearance-none bg-transparent border border-zinc-800 rounded-full pl-4 pr-10 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
            >
              <option value="All" className="bg-[#09090B]">
                Status: All
              </option>
              <option value="Active" className="bg-[#09090B]">
                Active
              </option>
              <option value="On Leave" className="bg-[#09090B]">
                On Leave
              </option>
              <option value="Inactive" className="bg-[#09090B]">
                Inactive
              </option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:text-zinc-400"
            />
          </div>

          <div className="relative group">
            <select
              value={localFilterSalary}
              onChange={(e) => {
                setLocalFilterSalary(e.target.value);
                if (e.target.value !== "All") {
                  setLocalSearchTerm("");
                }
              }}
              className={`appearance-none bg-transparent border border-zinc-800 rounded-full pl-4 pr-10 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
            >
              <option value="All" className="bg-[#09090B]">
                Salary: All
              </option>
              <option value="No Salary Taken" className="bg-[#09090B]">
                Unpaid
              </option>
              <option value="Under ₹10k" className="bg-[#09090B]">
                &lt; ₹10k
              </option>
              <option value="₹10k - ₹50k" className="bg-[#09090B]">
                ₹10k - ₹50k
              </option>
              <option value="Over ₹50k" className="bg-[#09090B]">
                &gt; ₹50k
              </option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
            />
          </div>

          {/* 🚀 Dynamic Apply with Check Icon / Clear Action */}
          {hasUnappliedChanges ? (
            <button
              type="submit"
              className={`h-9 px-5 rounded-full font-bold text-xs tracking-widest transition-all flex items-center justify-center gap-1.5 border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder} hover:brightness-110 shadow-lg animate-pulse`}
            >
              <CheckCircle2 size={14} /> APPLY
            </button>
          ) : (
            activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                onClick={handleClearAll}
                className="!h-9 !px-4 !rounded-full !text-xs flex items-center gap-1.5 text-zinc-500 hover:text-white"
              >
                <X size={14} /> Clear All
              </Button>
            )
          )}
        </div>
      </motion.form>

      <AnimatePresence>
        {dynamicFilterStats && activeFiltersCount > 0 && !loading && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#111116] border border-zinc-800/60 rounded-2xl overflow-hidden shadow-lg"
          >
            <div className="p-4 flex flex-wrap gap-6 items-center">
              <div className="flex items-center gap-2 border-r border-zinc-800/80 pr-6">
                <Sigma size={16} className={theme.primaryText} />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Filter Stats
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 text-xs">Total People:</span>
                <span className="text-white font-mono font-bold text-sm">
                  {dynamicFilterStats.count}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 text-xs">
                  Total Base Salary:
                </span>
                <span className="font-mono font-bold text-sm text-zinc-300">
                  ₹
                  {Number(dynamicFilterStats.baseSalarySum).toLocaleString(
                    "en-IN",
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 text-xs">
                  Total Salary Paid:
                </span>
                <span
                  className={`font-mono font-bold text-sm ${theme.primaryText}`}
                >
                  ₹
                  {Number(dynamicFilterStats.salaryTakenSum).toLocaleString(
                    "en-IN",
                  )}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {employees.map((emp) => (
          <div
            key={emp._id}
            id={emp._id}
            className={`bg-[#09090B] border rounded-2xl p-6 transition-all duration-700 group relative flex flex-col ${activeHighlight === emp._id ? `animate-pulse bg-white/5 ring-1 ${isTransport ? "ring-cyan-500/50" : "ring-indigo-500/50"} border-transparent` : `border-zinc-800/60 ${theme.primaryHoverBorder}`}`}
          >
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <div
                className={`absolute top-0 right-0 w-24 h-24 blur-2xl rounded-full transition-colors ${theme.glowOrb} ${theme.glowOrbHover}`}
              ></div>
            </div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 text-zinc-300">
                <User size={24} />
              </div>
              <div className="flex gap-2 items-center">
                {emp.idNumber && (
                  <button
                    onClick={() => setIdModal({ isOpen: true, data: emp })}
                    className={`p-2 rounded-lg text-zinc-500 hover:${theme.primaryText} ${theme.primaryHoverBg} transition-colors`}
                    title="View Govt ID"
                  >
                    <CreditCard size={18} />
                  </button>
                )}
                <button
                  onClick={() => openHistory(emp)}
                  className={`p-2 rounded-lg text-zinc-500 hover:${theme.primaryText} ${theme.primaryHoverBg} transition-colors`}
                  title="View Edit History"
                >
                  <History size={18} />
                </button>
                <Link
                  to={`${isTransport ? `/transportation/employees/edit/${emp._id}` : `/enterprise/employees/edit/${emp._id}`}`}
                >
                  <button
                    className={`p-2 rounded-lg text-zinc-500 hover:${theme.primaryText} ${theme.primaryHoverBg} transition-colors`}
                  >
                    <Edit size={18} />
                  </button>
                </Link>
                <div className="relative flex items-center">
                  <button
                    onClick={() =>
                      isManager
                        ? handleDisabledClick(emp._id)
                        : handleDeleteClick(emp._id, emp.name)
                    }
                    className={`p-2 rounded-lg transition-colors ${isManager ? "text-zinc-600 opacity-50 cursor-not-allowed" : "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex-1 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-1">
                {emp.name || "Unknown Employee"}
              </h3>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                    {emp.position || "N/A"}
                  </p>
                  <span
                    className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase border ${getStatusStyle(emp.status)}`}
                  >
                    {emp.status || "Active"}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm text-zinc-500 flex-1">
                <div className="flex items-center gap-3">
                  <Phone size={14} className="text-zinc-600 min-w-[14px]" />
                  {emp.phone || "No phone"}
                </div>
                <div className="flex items-center gap-3 line-clamp-1">
                  <MapPin size={14} className="text-zinc-600 min-w-[14px]" />
                  {emp.address || "No address"}
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-zinc-800/60 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Initial Salary
                  </span>
                  <span className={`font-mono font-bold ${theme.primaryText}`}>
                    ₹{" "}
                    {Number(
                      emp.initialSalary || emp.baseSalary || 0,
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Salary Taken
                  </span>
                  <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    ₹ {Number(emp.salaryTaken || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {employees.length === 0 && !loading && (
        <motion.div
          variants={itemVariants}
          className="p-16 text-center w-full flex flex-col items-center border border-zinc-800/60 rounded-2xl bg-[#09090B]"
        >
          <div className="w-16 h-16 rounded-full bg-zinc-800/50 border border-zinc-800 flex items-center justify-center text-zinc-500 mx-auto mb-4">
            <Users size={28} />
          </div>
          <h3 className="text-white font-bold text-lg mb-1">
            No Employees Found
          </h3>
        </motion.div>
      )}

      {hasMore && loadedCount < MAX_RECORDS_LIMIT && employees.length > 0 && (
        <motion.div variants={itemVariants} className="flex justify-center p-6">
          <Button
            onClick={() => fetchEmployees(true)}
            disabled={loadingMore}
            variant="outline"
            className="text-zinc-400 border-zinc-700 hover:text-white hover:bg-zinc-800/50"
          >
            {loadingMore ? (
              <RefreshCcw size={16} className="animate-spin mr-2" />
            ) : null}{" "}
            {loadingMore
              ? "Loading..."
              : `Load Next 50 (Loaded: ${loadedCount})`}
          </Button>
        </motion.div>
      )}

      {loadedCount >= MAX_RECORDS_LIMIT && (
        <motion.div variants={itemVariants} className="p-6 flex justify-center">
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-6 py-4 rounded-xl text-center max-w-md shadow-[0_0_20px_rgba(245,158,11,0.1)]">
            <AlertOctagon className="mx-auto mb-2 opacity-80" size={24} />
            <h4 className="font-bold text-sm mb-1">Display Limit Reached</h4>
            <p className="text-[11px] font-medium text-amber-200/60 leading-relaxed">
              To preserve system performance, infinite scrolling stops at 5,000
              records. Use filters to locate older records.
            </p>
          </div>
        </motion.div>
      )}

      {historyModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#09090B] border border-zinc-800/60 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-zinc-800/60 flex justify-between items-center bg-[#09090B]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History size={18} className={theme.primaryText} /> Log:{" "}
                <span className="text-zinc-300 text-sm ml-1">
                  {historyModal.itemName}
                </span>
              </h3>
              <button
                onClick={() =>
                  setHistoryModal({ isOpen: false, data: [], itemName: "" })
                }
                className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800/50 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {historyModal.data.length > 0 ? (
                historyModal.data.map((edit, idx) => (
                  <div
                    key={idx}
                    className={`flex justify-between items-center bg-zinc-900/30 p-4 rounded-xl border relative overflow-hidden group ${theme.primaryHoverBorder} transition-colors ${idx === 0 ? theme.primaryBorder : "border-zinc-800"}`}
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm uppercase ${idx === 0 ? `${theme.primaryBg} border ${theme.primaryBorder} ${theme.primaryText} shadow-inner` : "bg-zinc-800/50 text-zinc-400"}`}
                      >
                        {edit.role ? edit.role.charAt(0) : "A"}
                      </div>
                      <div>
                        <p
                          className={`text-sm font-bold uppercase tracking-widest ${idx === 0 ? "text-white" : "text-zinc-400"}`}
                        >
                          {edit.role || "Admin"}
                        </p>
                        <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
                          {edit.by}
                        </p>
                        <p
                          className={`text-[10px] font-mono mt-1 ${idx === 0 ? theme.primaryText : "text-zinc-600"}`}
                        >
                          {new Date(edit.at).toLocaleString("en-GB")}
                        </p>
                      </div>
                    </div>
                    {idx === 0 && (
                      <span
                        className={`relative z-10 text-[9px] ${theme.primaryBg} ${theme.primaryText} px-2 py-1 rounded-md uppercase font-black tracking-widest border ${theme.primaryBorder}`}
                      >
                        Latest
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-zinc-500 text-sm py-4">
                  No edit history available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {idModal.isOpen && idModal.data && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setIdModal({ isOpen: false, data: null })}
          />
          <div className="relative w-full max-w-sm flex flex-col items-center animate-in zoom-in-95 duration-300 pointer-events-none">
            <button
              onClick={() => setIdModal({ isOpen: false, data: null })}
              className="absolute -top-14 right-0 text-zinc-500 hover:text-white transition-colors bg-[#09090B] hover:bg-zinc-800 p-2.5 rounded-full border border-zinc-800/60 pointer-events-auto shadow-lg shadow-zinc-900/20"
            >
              <X size={20} />
            </button>
            <div
              className={`w-full bg-[#09090B] rounded-3xl border ${theme.primaryBorder} p-8 relative overflow-hidden ${theme.shadowGlow} pointer-events-auto`}
            >
              <div
                className={`absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full pointer-events-none ${theme.glowOrb}`}
              ></div>
              <div
                className={`absolute -top-10 -right-10 rotate-12 pointer-events-none ${theme.primaryTextMuted} opacity-5`}
              >
                <ShieldCheck size={200} />
              </div>
              <div className="flex justify-between items-start relative z-10 mb-8">
                <div>
                  <p
                    className={`${theme.primaryTextMuted} font-black text-[10px] tracking-[0.3em] uppercase mb-1`}
                  >
                    Republic of India
                  </p>
                  <h2 className="text-2xl font-black text-white tracking-widest uppercase">
                    {idModal.data.idType || "ID Card"}
                  </h2>
                </div>
                <div
                  className={`w-14 h-14 rounded-2xl ${theme.primaryBg} flex items-center justify-center border ${theme.primaryBorder} shadow-inner`}
                >
                  <CreditCard className={theme.primaryText} size={28} />
                </div>
              </div>
              <div className="relative z-10 mb-8 bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 shadow-inner">
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2">
                  ID Number
                </p>
                <p
                  className={`${theme.primaryText} font-mono text-[22px] font-black tracking-widest ${theme.dropShadowGlow} break-all`}
                >
                  {formatIdNumber(idModal.data.idType, idModal.data.idNumber)}
                </p>
              </div>
              <div className="flex justify-between items-end relative z-10 pt-4 border-t border-zinc-800/60">
                <div>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">
                    Employee Name
                  </p>
                  <p className="text-zinc-100 font-bold tracking-wider uppercase text-lg">
                    {idModal.data.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">
                    Join Date
                  </p>
                  <p className={`${theme.primaryText} font-mono font-bold`}>
                    {idModal.data.joinDate
                      ? new Date(idModal.data.joinDate).toLocaleDateString(
                          "en-GB",
                        )
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteAllOpen && !isManager && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => !wiping && setIsDeleteAllOpen(false)}
          />
          <div className="bg-[#09090B] border border-red-900/50 shadow-[0_0_40px_rgba(220,38,38,0.15)] rounded-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col p-6 sm:p-8">
            <div className="flex items-center gap-3 text-red-500 mb-6">
              <AlertOctagon size={28} />
              <h2 className="text-xl font-bold tracking-wide">
                Wipe Employee Database
              </h2>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  size={20}
                  className="text-amber-500 shrink-0 mt-0.5"
                />
                <div className="w-full">
                  <h3 className="text-amber-500 font-bold text-sm mb-1">
                    Recommended: Safe Backup
                  </h3>
                  <p className="text-amber-100/60 text-xs mb-3 leading-relaxed">
                    Before wiping, please download the backup for a specific
                    month to prevent browser crash.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                    <input
                      type="month"
                      value={backupMonth}
                      onChange={(e) => setBackupMonth(e.target.value)}
                      style={{ colorScheme: "dark" }}
                      className="w-full sm:w-32 bg-zinc-900/50 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none transition-all"
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleFullBackup(backupMonth)}
                      className="w-full sm:flex-1 h-9 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/30"
                    >
                      <Download size={14} className="mr-2" /> Download Backup
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-red-100/70 text-sm mb-4">
              This action will{" "}
              <strong className="text-red-500">PERMANENTLY DELETE ALL</strong>{" "}
              employee records. Please enter Admin password.
            </p>
            <div className="relative mb-8">
              <input
                type={showPassword ? "text" : "password"}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-zinc-900/50 border border-red-900/30 focus:border-red-500/50 rounded-xl px-4 py-3 text-red-100 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-red-100/30 hover:text-red-100/60 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteAllOpen(false);
                  setDeletePassword("");
                }}
                disabled={wiping}
                className="h-11 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleWipeAll}
                disabled={wiping || !deletePassword}
                className="h-11 rounded-xl flex items-center gap-2"
              >
                {wiping ? (
                  <RefreshCcw size={16} className="animate-spin" />
                ) : null}{" "}
                {wiping ? "Wiping..." : "Confirm Wipe"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, name: "" })}
        onConfirm={executeDelete}
        title="Remove Employee?"
        message={`Are you sure you want to remove ${deleteModal.name}? This cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        isDestructive={true}
      />
    </motion.div>
  );
};

export default EmployeeList;
