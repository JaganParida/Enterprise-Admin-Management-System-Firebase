import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import employeeService, {
  validateFilters,
} from "../../services/employeeService";
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
  AlertTriangle,
  Info,
} from "lucide-react";
import Button from "../../components/common/Button";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { collection, getDocs, query, limit, where } from "firebase/firestore";
import { db } from "../../config/firebase";
import { motion, AnimatePresence } from "framer-motion";

const MAX_RECORDS_LIMIT = 2000;

const getPreviousMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const EmployeeListSkeleton = () => (
  <div className="space-y-8 pb-10 flex flex-col w-full">
    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 w-full">
      <div>
        <div className="h-9 w-64 bg-zinc-800/60 rounded-lg animate-pulse mb-3"></div>
        <div className="h-4 w-72 bg-zinc-800/40 rounded-md animate-pulse"></div>
      </div>
      <div className="flex gap-3">
        <div className="h-11 w-36 bg-zinc-800/60 rounded-xl animate-pulse"></div>
        <div className="h-11 w-36 bg-zinc-800/60 rounded-xl animate-pulse"></div>
      </div>
    </div>
    <div className="bg-[#09090B] rounded-2xl border border-zinc-800/60 p-4 h-[76px] w-full animate-pulse flex justify-between items-center">
      <div className="h-11 w-[32rem] bg-zinc-800/50 rounded-xl"></div>
      <div className="flex gap-3">
        <div className="h-8 w-24 bg-zinc-800/50 rounded-full"></div>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="bg-[#09090B] border border-zinc-800/60 rounded-2xl p-6 h-[260px] animate-pulse flex flex-col"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="h-12 w-12 rounded-xl bg-zinc-800/50"></div>
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-lg bg-zinc-800/40"></div>
            </div>
          </div>
          <div className="mt-2">
            <div className="h-5 w-40 bg-zinc-800/60 rounded mb-2"></div>
            <div className="flex gap-2 mb-4">
              <div className="h-4 w-24 bg-zinc-800/40 rounded"></div>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="h-3 w-32 bg-zinc-800/40 rounded"></div>
            <div className="h-3 w-48 bg-zinc-800/40 rounded"></div>
          </div>
          <div className="mt-auto pt-4 border-t border-zinc-800/50 flex justify-between">
            <div className="h-4 w-20 bg-zinc-800/40 rounded"></div>
            <div className="h-4 w-20 bg-zinc-800/50 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

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
  const toastRef = useRef(toast);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [localFilterStatus, setLocalFilterStatus] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [localFilterSalary, setLocalFilterSalary] = useState("All");
  const [filterSalary, setFilterSalary] = useState("All");
  const [filterConflictWarning, setFilterConflictWarning] = useState("");

  const hasUnappliedChanges =
    localSearchTerm !== searchTerm ||
    localFilterStatus !== filterStatus ||
    localFilterSalary !== filterSalary;

  const initialFilters = { status: "All", search: "", salary: "All" };
  const [employees, setEmployees] = useState(
    () => employeeService.getCachedEmployees(initialFilters) || [],
  );
  const [dynamicFilterStats, setDynamicFilterStats] = useState(null);
  const [loading, setLoading] = useState(
    () => !employeeService.getCachedEmployees(initialFilters),
  );

  const [syncStatus, setSyncStatus] = useState(() =>
    employeeService.checkSyncStatus(),
  );

  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(() => employees.length || 0);
  const lastDocRef = useRef(null);

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

  // 🚀 FIXED BACKUP CHECK LOGIC
  useEffect(() => {
    const checkBackupNeeded = async () => {
      const prevMonth = getPreviousMonth(); // e.g., "2026-03"
      if (!localStorage.getItem(`backup_employees_${prevMonth}`)) {
        try {
          // Calculate exact start and end of that specific month
          const [year, month] = prevMonth.split("-").map(Number);
          const lastDay = new Date(year, month, 0).getDate();
          const start = `${prevMonth}-01T00:00:00.000Z`;
          const end = `${prevMonth}-${String(lastDay).padStart(2, "0")}T23:59:59.999Z`;

          // Query strictly for records created in that month
          const q = query(
            collection(db, "employees"),
            where("createdAt", ">=", start),
            where("createdAt", "<=", end),
            limit(1),
          );

          const snap = await getDocs(q);

          if (!snap.empty) {
            setShowBackupWarning(prevMonth);
          } else {
            // Silently dismiss for empty months
            localStorage.setItem(`backup_employees_${prevMonth}`, "true");
          }
        } catch (error) {
          console.warn("Backup check failed:", error);
        }
      }
    };
    checkBackupNeeded();
  }, []);

  const fetchEmployees = useCallback(
    async (isLoadMore = false, forceSync = false, passedLastDoc = null) => {
      if (isLoadMore) {
        setLoadingMore(true);
      } else if (forceSync) {
        setSyncStatus("syncing");
        setLoading(true);
      } else {
        const cached = employeeService.getCachedEmployees({
          status: filterStatus,
          search: searchTerm,
          salary: filterSalary,
        });
        if (!cached) setLoading(true);
      }

      try {
        const filters = {
          status: filterStatus,
          search: searchTerm,
          salary: filterSalary,
        };
        const validation = validateFilters(filters);
        if (!validation.valid) {
          setFilterConflictWarning(validation.reason);
          return;
        }

        const isFiltered =
          filterStatus !== "All" || !!searchTerm || filterSalary !== "All";
        const listPromise = employeeService.getAllEmployees(
          filters,
          isLoadMore ? passedLastDoc : null,
          50,
          forceSync,
        );
        const statsPromise =
          !isLoadMore && isFiltered
            ? employeeService.getDynamicViewStats(filters)
            : Promise.resolve(null);

        const [response, statsResult] = await Promise.all([
          listPromise,
          statsPromise,
        ]);

        if (isLoadMore) {
          setEmployees((prev) => [...prev, ...(response.data || [])]);
          setLoadedCount((prev) => prev + (response.data?.length || 0));
        } else {
          setDynamicFilterStats(isFiltered ? statsResult : null);
          setEmployees(response.data || []);
          setLoadedCount(response.data?.length || 0);
        }

        const newLastDoc = response.lastVisible || null;
        setLastDoc(newLastDoc);
        lastDocRef.current = newLastDoc;
        setHasMore(!!(response.data && response.data.length === 50));
        setSyncStatus("up-to-date");
      } catch (error) {
        if (
          error.message?.includes("requires an index") ||
          error.message?.includes("index is needed")
        ) {
          toastRef.current.error(
            "Database index missing for this filter combination.",
          );
          setFilterConflictWarning(
            "This specific filter combination requires a database index. Please clear one filter.",
          );
        } else if (error.message?.includes("cannot be used together")) {
          setFilterConflictWarning(error.message);
        } else {
          toastRef.current.error("Failed to load employee list");
        }
        setSyncStatus("error");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filterStatus, searchTerm, filterSalary],
  );

  useEffect(() => {
    fetchEmployees(false, false, null);
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
    const pending = {
      status: localFilterStatus,
      search: localSearchTerm,
      salary: localFilterSalary,
    };
    const validation = validateFilters(pending);
    if (!validation.valid) {
      setFilterConflictWarning(validation.reason);
      return;
    }
    setFilterConflictWarning("");
    setSearchTerm(localSearchTerm);
    setFilterStatus(localFilterStatus);
    setFilterSalary(localFilterSalary);
  };

  const handleClearAll = () => {
    setFilterConflictWarning("");
    setLocalSearchTerm("");
    setSearchTerm("");
    setLocalFilterStatus("All");
    setFilterStatus("All");
    setLocalFilterSalary("All");
    setFilterSalary("All");
  };

  const handleLocalSearchChange = (val) => {
    setLocalSearchTerm(val);
    if (val.trim() !== "" && localFilterSalary !== "All") {
      setLocalFilterSalary("All");
      setFilterSalary("All");
      setFilterConflictWarning(
        "Salary filter auto-cleared to allow Name Search.",
      );
      setTimeout(() => setFilterConflictWarning(""), 4000);
    }
  };

  const handleLocalSalaryChange = (val) => {
    setLocalFilterSalary(val);
    if (val !== "All" && localSearchTerm.trim() !== "") {
      setLocalSearchTerm("");
      setSearchTerm("");
      setFilterConflictWarning(
        "Name Search auto-cleared to allow Salary Filter.",
      );
      setTimeout(() => setFilterConflictWarning(""), 4000);
    }
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
      await employeeService.deleteEmployee(
        deleteModal.id,
        currentUser,
        empToDelete,
      );
      setEmployees((prev) => prev.filter((e) => e._id !== deleteModal.id));
      setLoadedCount((prev) => prev - 1);

      if (dynamicFilterStats && empToDelete) {
        setDynamicFilterStats((prev) => ({
          count: prev.count - 1,
          baseSalarySum:
            prev.baseSalarySum - Number(empToDelete.initialSalary || 0),
          salaryTakenSum:
            prev.salaryTakenSum - Number(empToDelete.salaryTaken || 0),
          isFallback: prev.isFallback,
        }));
      }
      toastRef.current.info("Employee removed successfully");
    } catch (error) {
      toastRef.current.error(error.message || "Failed to remove employee");
      fetchEmployees(false, true, null);
    } finally {
      setDeleteModal({ isOpen: false, id: null, name: "" });
    }
  };

  // 🚀 FIXED DOWNLOAD BACKUP LOGIC
  const handleFullBackup = async (monthToFetch = backupMonth) => {
    try {
      if (!monthToFetch)
        return toastRef.current.error("Please select a month to backup.");
      const lastDocKey = `backup_last_doc_${monthToFetch}_emp`;
      const savedLastDocId = localStorage.getItem(lastDocKey);
      toastRef.current.info(`Preparing backup for ${monthToFetch}...`);

      const res = await employeeService.getBackupChunk(
        monthToFetch,
        1000,
        savedLastDocId,
      );

      if (res.data.length === 0) {
        // Clear the warning permanently even if 0 records are found
        localStorage.setItem(`backup_employees_${monthToFetch}`, "true");
        localStorage.removeItem(lastDocKey);
        if (showBackupWarning === monthToFetch) setShowBackupWarning(null);

        return toastRef.current.info(
          `No records found for ${monthToFetch}. Warning cleared.`,
        );
      }

      const headers = [
        "Name",
        "Position",
        "Phone",
        "Address",
        "Status",
        "Base Salary",
        "Salary Taken",
      ];
      const rows = res.data.map((emp) =>
        [
          `"${emp.name || ""}"`,
          `"${emp.position || ""}"`,
          `"${emp.phone || ""}"`,
          `"${emp.address || ""}"`,
          `"${emp.status || "Active"}"`,
          Number(emp.initialSalary || emp.baseSalary || 0),
          Number(emp.salaryTaken || 0),
        ].join(","),
      );

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Employees_Backup_${monthToFetch}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (res.lastDocId) {
        localStorage.setItem(lastDocKey, res.lastDocId);
      }

      if (res.wasLimited) {
        toastRef.current.warning(
          `Daily backup limit reached. Resume tomorrow to get more records.`,
        );
      } else {
        toastRef.current.success(
          `Downloaded ${res.data.length.toLocaleString()} records!`,
        );
        if (res.data.length < 1000) {
          localStorage.setItem(`backup_employees_${monthToFetch}`, "true");
          localStorage.removeItem(lastDocKey);
          if (showBackupWarning === monthToFetch) setShowBackupWarning(null);
        }
      }
    } catch (error) {
      toastRef.current.error(error.message || "Failed to generate backup.");
    }
  };

  const handleWipeAll = async () => {
    if (isManager || !deletePassword)
      return toastRef.current.error("Verification failed.");
    setWiping(true);
    try {
      const currentUser = admin?.data || admin || {};
      const res = await employeeService.deleteAllEmployees({
        password: deletePassword,
        email: currentUser.email,
        user: currentUser,
      });
      if (res.isPartial) toastRef.current.warning(res.message);
      else toastRef.current.success(res.message);

      setIsDeleteAllOpen(false);
      setDeletePassword("");
      setShowPassword(false);
      fetchEmployees(false, true, null);
    } catch (error) {
      toastRef.current.error(error.message || "Incorrect Admin Password.");
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
    if (type === "Aadhar" && number.length === 12) return "[Aadhaar Redacted]";
    return number;
  };

  if (loading && employees.length === 0) return <EmployeeListSkeleton />;

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
            </div>
            Employee Directory
          </h1>
          <p className="text-zinc-500 text-sm mt-1 ml-1">
            Manage your workforce and staff details.
          </p>
        </div>

        <div className="flex gap-3 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 items-center">
          <Button
            variant="ghost"
            onClick={() => fetchEmployees(false, true, null)}
            disabled={syncStatus === "up-to-date" || syncStatus === "syncing"}
            className={`flex items-center gap-2 h-11 px-4 w-full sm:w-auto justify-center rounded-xl font-bold text-xs tracking-wider transition-all duration-500 ${
              syncStatus === "up-to-date"
                ? "opacity-40 pointer-events-none text-emerald-500 bg-emerald-500/5 border border-emerald-500/10"
                : syncStatus === "error"
                  ? "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30"
                  : "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 animate-pulse"
            }`}
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
                  : syncStatus === "error"
                    ? "Retry Sync"
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
              <AlertOctagon size={16} />
              <span className="hidden sm:inline">Wipe Database</span>
            </Button>
            {warningTooltip === "wipe-all" && (
              <div className="absolute top-full mt-2 right-0 z-[100] animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-[#09090B] border border-red-500/30 shadow-xl text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                  <span className="bg-red-500/20 p-1 rounded-md">🚫</span> Admin
                  Access Required
                </div>
              </div>
            )}
          </div>

          <Link
            to={
              isTransport
                ? "/transportation/employees/add"
                : "/enterprise/employees/add"
            }
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
          className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/20 p-2.5 rounded-full text-amber-500">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h4 className="text-amber-400 font-bold text-sm">
                Monthly Data Backup Required
              </h4>
              <p className="text-amber-100/60 text-xs mt-0.5">
                No backup downloaded for{" "}
                <strong>
                  {new Date(showBackupWarning + "-01").toLocaleString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
                .
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

      <AnimatePresence>
        {filterConflictWarning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertTriangle
              size={16}
              className="text-amber-400 mt-0.5 shrink-0"
            />
            <div className="flex-1">
              <p className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-0.5">
                Notice
              </p>
              <p className="text-amber-100/70 text-xs leading-relaxed">
                {filterConflictWarning}
              </p>
            </div>
            <button
              onClick={() => setFilterConflictWarning("")}
              className="text-amber-500/60 hover:text-amber-400 transition-colors p-1"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.form
        onSubmit={handleApplyAll}
        variants={itemVariants}
        className="bg-[#09090B] rounded-2xl shadow-xl border border-zinc-800/60 overflow-hidden flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 p-4 relative"
      >
        <div className="flex w-full xl:w-[32rem]">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by name (Enter or click Search)..."
              className={`w-full h-11 bg-zinc-900/50 border border-zinc-800 rounded-l-xl pl-5 pr-10 py-2.5 text-sm text-zinc-100 outline-none transition-all ${theme.primaryFocus}`}
              value={localSearchTerm}
              onChange={(e) => handleLocalSearchChange(e.target.value)}
            />
            {localSearchTerm && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearchTerm("");
                  setSearchTerm("");
                  setFilterConflictWarning("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1.5 rounded-md transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className={`h-11 px-5 rounded-r-xl font-bold text-xs tracking-wider transition-all flex items-center gap-2 border-y border-r border-transparent ${localSearchTerm !== searchTerm ? `${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder} hover:brightness-110` : "bg-zinc-800/50 text-zinc-500 border-zinc-800 cursor-default"}`}
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

          <div className="relative">
            <select
              value={localFilterStatus}
              onChange={(e) => setLocalFilterStatus(e.target.value)}
              className={`appearance-none bg-transparent border border-zinc-800 rounded-full pl-4 pr-10 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
            />
          </div>

          <div className="relative">
            <select
              value={localFilterSalary}
              onChange={(e) => handleLocalSalaryChange(e.target.value)}
              className={`appearance-none bg-transparent border border-zinc-800 rounded-full pl-4 pr-10 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
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

          {hasUnappliedChanges ? (
            <button
              type="submit"
              className={`h-9 px-5 rounded-full font-bold text-xs tracking-widest transition-all flex items-center gap-1.5 border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder} hover:brightness-110 animate-pulse`}
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
        {activeFiltersCount > 0 && !loading && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#111116] border border-zinc-800/60 rounded-2xl overflow-hidden"
          >
            <div className="p-4 flex flex-wrap gap-6 items-center">
              <div className="flex items-center gap-2 border-r border-zinc-800/80 pr-6">
                <Sigma size={16} className={theme.primaryText} />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Filter Stats
                </span>
              </div>
              {!dynamicFilterStats ? (
                <div className="text-zinc-500 text-xs font-mono flex items-center gap-2">
                  <Info size={12} /> Stats offline
                </div>
              ) : (
                <>
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
                </>
              )}
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
              />
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
                >
                  <History size={18} />
                </button>
                <Link
                  to={
                    isTransport
                      ? `/transportation/employees/edit/${emp._id}`
                      : `/enterprise/employees/edit/${emp._id}`
                  }
                >
                  <button
                    className={`p-2 rounded-lg text-zinc-500 hover:${theme.primaryText} ${theme.primaryHoverBg} transition-colors`}
                  >
                    <Edit size={18} />
                  </button>
                </Link>
                <div className="relative">
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
                  {warningTooltip === emp._id && (
                    <div className="absolute top-full mt-2 right-0 z-[100] animate-in fade-in zoom-in-95 duration-200">
                      <div className="bg-[#09090B] border border-red-500/30 text-red-400 text-[10px] uppercase font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                        <span className="bg-red-500/20 p-1 rounded-md">🚫</span>{" "}
                        Admin Only
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="relative z-10 flex-1 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-1">
                {emp.name || "Unknown Employee"}
              </h3>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                  {emp.position || "N/A"}
                </p>
                <span
                  className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase border ${getStatusStyle(emp.status)}`}
                >
                  {emp.status || "Active"}
                </span>
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
              <div className="mt-5 pt-4 border-t border-zinc-800/60">
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
                <div className="flex justify-between items-center">
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
          {activeFiltersCount > 0 && (
            <p className="text-zinc-500 text-sm mt-1">
              Try clearing your filters or searching a different name.
            </p>
          )}
        </motion.div>
      )}

      {hasMore && loadedCount < MAX_RECORDS_LIMIT && employees.length > 0 && (
        <motion.div variants={itemVariants} className="flex justify-center p-6">
          <Button
            onClick={() => fetchEmployees(true, false, lastDocRef.current)}
            disabled={loadingMore}
            variant="outline"
            className="text-zinc-400 border-zinc-700 hover:text-white hover:bg-zinc-800/50"
          >
            {loadingMore && (
              <RefreshCcw size={16} className="animate-spin mr-2" />
            )}
            {loadingMore
              ? "Loading..."
              : `Load Next 50 (Loaded: ${loadedCount})`}
          </Button>
        </motion.div>
      )}

      {loadedCount >= MAX_RECORDS_LIMIT && (
        <motion.div variants={itemVariants} className="p-6 flex justify-center">
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-6 py-4 rounded-xl text-center max-w-md">
            <AlertOctagon className="mx-auto mb-2 opacity-80" size={24} />
            <h4 className="font-bold text-sm mb-1">Display Limit Reached</h4>
            <p className="text-[11px] font-medium text-amber-200/60 leading-relaxed">
              Infinite scrolling stops at 2,000 records to preserve performance.
              Use Search or Filters to locate older records.
            </p>
          </div>
        </motion.div>
      )}

      {historyModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#09090B] border border-zinc-800/60 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-zinc-800/60 flex justify-between items-center">
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
                    className={`flex justify-between items-center bg-zinc-900/30 p-4 rounded-xl border ${idx === 0 ? theme.primaryBorder : "border-zinc-800"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm uppercase ${idx === 0 ? `${theme.primaryBg} border ${theme.primaryBorder} ${theme.primaryText}` : "bg-zinc-800/50 text-zinc-400"}`}
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
                        className={`text-[9px] ${theme.primaryBg} ${theme.primaryText} px-2 py-1 rounded-md uppercase font-black tracking-widest border ${theme.primaryBorder}`}
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
              className="absolute -top-14 right-0 text-zinc-500 hover:text-white bg-[#09090B] hover:bg-zinc-800 p-2.5 rounded-full border border-zinc-800/60 pointer-events-auto"
            >
              <X size={20} />
            </button>
            <div
              className={`w-full bg-[#09090B] rounded-3xl border ${theme.primaryBorder} p-8 relative overflow-hidden ${theme.shadowGlow} pointer-events-auto`}
            >
              <div
                className={`absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full pointer-events-none ${theme.glowOrb}`}
              />
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
                  className={`w-14 h-14 rounded-2xl ${theme.primaryBg} flex items-center justify-center border ${theme.primaryBorder}`}
                >
                  <CreditCard className={theme.primaryText} size={28} />
                </div>
              </div>
              <div className="relative z-10 mb-8 bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800">
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
          <div className="bg-[#09090B] border border-red-900/50 shadow-[0_0_40px_rgba(220,38,38,0.15)] rounded-2xl w-full max-w-lg relative z-10 p-6 sm:p-8">
            <div className="flex items-center gap-3 text-red-500 mb-6">
              <AlertOctagon size={28} />
              <h2 className="text-xl font-bold">Wipe Employee Database</h2>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  size={20}
                  className="text-amber-500 shrink-0 mt-0.5"
                />
                <div className="w-full">
                  <h3 className="text-amber-500 font-bold text-sm mb-1">
                    Step 1 — Download Backup First
                  </h3>
                  <p className="text-amber-100/60 text-xs mb-3 leading-relaxed">
                    Up to 2,500 records/day. Your resume pointer is saved in
                    your browser — if the daily limit is hit, return tomorrow
                    and the download will continue exactly where it left off.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                    <input
                      type="month"
                      value={backupMonth}
                      onChange={(e) => setBackupMonth(e.target.value)}
                      style={{ colorScheme: "dark" }}
                      className="w-full sm:w-36 bg-zinc-900/50 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none"
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleFullBackup(backupMonth)}
                      className="w-full sm:flex-1 h-9 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/30"
                    >
                      <Download size={14} className="mr-2" /> Download Backup
                    </Button>
                  </div>
                  {localStorage.getItem(
                    `backup_last_doc_${backupMonth}_emp`,
                  ) && (
                    <p className="text-amber-300/70 text-[10px] font-mono mt-2 flex items-center gap-1">
                      <RefreshCcw size={10} /> Resume pointer found — next
                      download continues from last position.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <p className="text-red-100/70 text-sm mb-4">
              Step 2 — Enter Admin password to permanently delete ALL records.{" "}
              <strong className="text-red-500">This cannot be undone.</strong>{" "}
              Up to 2,500 records wiped per day.
            </p>
            <div className="relative mb-8">
              <input
                type={showPassword ? "text" : "password"}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter Admin password..."
                className="w-full bg-zinc-900/50 border border-red-900/30 focus:border-red-500/50 rounded-xl px-4 py-3 text-red-100 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-red-100/30 hover:text-red-100/60"
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
                className="h-11 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleWipeAll}
                disabled={wiping || !deletePassword}
                className="h-11 rounded-xl flex items-center gap-2"
              >
                {wiping && <RefreshCcw size={16} className="animate-spin" />}
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
