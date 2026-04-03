import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import invoiceService from "../../services/invoiceService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  FileText,
  Plus,
  Eye,
  Search,
  Trash2,
  Edit,
  History,
  X,
  Filter,
  AlertOctagon,
  ShieldAlert,
  EyeOff,
  RefreshCcw,
  ChevronDown,
  Calendar,
  Loader2,
  CheckCircle2,
  Download,
  Activity,
  Clock,
  XCircle,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const getPreviousMonthString = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const pageVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut", staggerChildren: 0.1 },
  },
};
const blockVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
const modalBackdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};
const modalContentVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2 } },
};

const AnimatedSearchInput = ({
  value,
  onChange,
  onKeyDown,
  onSearch,
  onClear,
  theme,
}) => {
  const placeholders = [
    "Search by client name...",
    "Search by invoice number...",
    "Search INV-1001...",
    "Find records instantly...",
  ];
  const [placeholderText, setPlaceholderText] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(
      () => {
        const currentString = placeholders[placeholderIndex];
        if (!isDeleting) {
          setPlaceholderText(
            currentString.substring(0, placeholderText.length + 1),
          );
          if (placeholderText.length === currentString.length)
            setTimeout(() => setIsDeleting(true), 1500);
        } else {
          setPlaceholderText(
            currentString.substring(0, placeholderText.length - 1),
          );
          if (placeholderText.length === 0) {
            setIsDeleting(false);
            setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
          }
        }
      },
      isDeleting ? 40 : 80,
    );
    return () => clearTimeout(timeout);
  }, [placeholderText, isDeleting, placeholderIndex]);

  const hasValue = value && value.trim().length > 0;

  return (
    <div className="flex items-center gap-2 w-full lg:max-w-md shrink-0">
      <div className="relative flex-1 group">
        <Search
          size={16}
          className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${value ? theme.primaryText : "text-zinc-500"}`}
        />
        <input
          type="text"
          placeholder={placeholderText}
          className="w-full bg-[#121214] border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-zinc-100 outline-none transition-all focus:border-zinc-600"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onSearch}
        disabled={!hasValue}
        className={`h-10 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${hasValue ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20" : "bg-[#121214] border border-zinc-800/60 text-zinc-600 cursor-not-allowed"}`}
      >
        Search
      </button>
    </div>
  );
};

const StatCard = ({
  title,
  amount,
  count,
  icon,
  color,
  bg,
  border,
  loading,
}) => (
  <div
    className={`bg-[#09090B] border border-zinc-800/60 p-5 rounded-2xl shadow-lg relative overflow-hidden group`}
  >
    <div className="flex justify-between items-start mb-2">
      <div
        className={`text-[10px] uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1.5`}
      >
        {title}
      </div>
      <div className={`p-1.5 rounded-lg ${bg} ${color} border ${border}`}>
        {icon}
      </div>
    </div>
    <div className="flex items-end justify-between mt-1">
      <div className="text-2xl font-mono font-bold text-white">
        {loading ? (
          <span className="animate-pulse text-zinc-700">₹ ----</span>
        ) : (
          `₹ ${Number(amount || 0).toLocaleString("en-IN")}`
        )}
      </div>
      {!loading && (
        <div
          className={`text-xs font-bold px-2 py-1 rounded-md bg-zinc-800/50 ${color}`}
        >
          {count} {count === 1 ? "Inv" : "Invs"}
        </div>
      )}
    </div>
  </div>
);

const InvoiceList = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const location = useLocation();

  const cached = invoiceService.cache;
  const defaultStats = {
    total: { amt: 0, count: 0 },
    paid: { amt: 0, count: 0 },
    pending: { amt: 0, count: 0 },
    cancelled: { amt: 0, count: 0 },
  };

  const [invoices, setInvoices] = useState(!cached.isDirty ? cached.data : []);
  const [stats, setStats] = useState(
    !cached.isDirty && cached.stats ? cached.stats : defaultStats,
  );
  const [loading, setLoading] = useState(
    invoices.length === 0 && cached.isDirty,
  );
  const [loadingStats, setLoadingStats] = useState(
    cached.isDirty || !cached.stats,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncError, setSyncError] = useState(false);

  const [lastDoc, setLastDoc] = useState(
    !cached.isDirty ? cached.lastDoc : null,
  );
  const [hasMore, setHasMore] = useState(
    !cached.isDirty ? cached.hasMore : false,
  );
  const [loadingMore, setLoadingMore] = useState(false);

  const [searchTerm, setSearchTerm] = useState(
    !cached.isDirty ? cached.filters?.search || "" : "",
  );
  const [filterStatus, setFilterStatus] = useState(
    !cached.isDirty ? cached.filters?.status || "All" : "All",
  );
  const [filterAmount, setFilterAmount] = useState(
    !cached.isDirty ? cached.filters?.amount || "All" : "All",
  );
  const [filterDate, setFilterDate] = useState(
    !cached.isDirty ? cached.filters?.date || "All" : "All",
  );
  const [filterExactDate, setFilterExactDate] = useState(
    !cached.isDirty ? cached.filters?.exactDate || "" : "",
  );

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [warningTooltip, setWarningTooltip] = useState(null);
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    itemName: "",
  });
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [backupMonth, setBackupMonth] = useState(getPreviousMonthString());
  const [backupStatus, setBackupStatus] = useState({
    disabled: false,
    text: "Download Backup",
    timeLeft: "",
  });
  const [wipeStatus, setWipeStatus] = useState({
    disabled: false,
    text: "Database",
    timeLeft: "",
  });

  const searchParams = new URLSearchParams(location.search);
  const urlHighlightId = searchParams.get("highlight");
  const [activeHighlight, setActiveHighlight] = useState(null);

  const isTransport = (
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname
  ).includes("/transportation");
  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";

  const theme = {
    primaryText: isTransport ? "text-cyan-400" : "text-indigo-400",
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
  };

  useEffect(() => {
    const checkLockout = () => {
      const lockKey = `backup_lock_${backupMonth}`;
      const lockTime = localStorage.getItem(lockKey);
      const resumeData = localStorage.getItem(`backup_resume_${backupMonth}`);
      const hours24 = 24 * 60 * 60 * 1000;

      if (lockTime) {
        const elapsed = Date.now() - parseInt(lockTime, 10);
        if (elapsed < hours24) {
          const remaining = hours24 - elapsed;
          const h = Math.floor(remaining / (1000 * 60 * 60));
          const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          setBackupStatus({
            disabled: true,
            text: resumeData ? "Resume Locked" : "Backup Locked",
            timeLeft: `Available in ${h}h ${m}m`,
          });
        } else {
          localStorage.removeItem(lockKey);
          setBackupStatus({
            disabled: false,
            text: resumeData ? "Resume Backup" : "Download Backup",
            timeLeft: "",
          });
        }
      } else {
        setBackupStatus({
          disabled: false,
          text: resumeData ? "Resume Backup" : "Download Backup",
          timeLeft: "",
        });
      }

      const wipeLockTime = localStorage.getItem("wipe_lock");
      if (wipeLockTime) {
        const wipeElapsed = Date.now() - parseInt(wipeLockTime, 10);
        if (wipeElapsed < hours24) {
          const wipeRem = hours24 - wipeElapsed;
          const wh = Math.floor(wipeRem / (1000 * 60 * 60));
          const wm = Math.floor((wipeRem % (1000 * 60 * 60)) / (1000 * 60));
          setWipeStatus({
            disabled: true,
            text: "Wipe Locked",
            timeLeft: `Locked for ${wh}h ${wm}m`,
          });
        } else {
          localStorage.removeItem("wipe_lock");
          setWipeStatus({ disabled: false, text: "Database", timeLeft: "" });
        }
      } else {
        setWipeStatus({ disabled: false, text: "Database", timeLeft: "" });
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 60000);
    return () => clearInterval(interval);
  }, [backupMonth, isDeleteAllOpen]);

  const activeDropdownFiltersCount =
    [filterStatus, filterAmount, filterDate].filter((f) => f !== "All").length +
    (filterExactDate ? 1 : 0);
  const activeFiltersCount = activeDropdownFiltersCount + (searchTerm ? 1 : 0);

  const fetchStats = async (isSilent = false) => {
    if (!isSilent) setLoadingStats(true);
    try {
      const data = await invoiceService.getInvoiceStats();
      setStats(data);
      invoiceService.cache.stats = data;
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      if (!isSilent) setLoadingStats(false);
    }
  };

  const loadData = useCallback(
    async (filtersToUse, isLoadMore = false) => {
      if (isLoadMore) setLoadingMore(true);
      else {
        setInvoices([]);
        setIsRefreshing(true);
      }
      setSyncError(false);

      try {
        const response = await invoiceService.getAllInvoices(
          filtersToUse,
          isLoadMore ? lastDoc : null,
        );
        let newData = isLoadMore
          ? [...invoices, ...(response.data || [])]
          : response.data || [];
        setInvoices(newData);
        setLastDoc(response.lastVisible || null);
        const newHasMore = response.data && response.data.length === 50;
        setHasMore(newHasMore);

        invoiceService.cache = {
          ...invoiceService.cache,
          data: newData,
          lastDoc: response.lastVisible,
          hasMore: newHasMore,
          filters: filtersToUse,
          isDirty: false,
        };
      } catch (error) {
        setSyncError(true);
        if (error.message && error.message.toLowerCase().includes("index"))
          toast.error("Firebase Index required!");
      } finally {
        setIsRefreshing(false);
        setLoadingMore(false);
        setLoading(false);
      }
    },
    [invoices, lastDoc, toast],
  );

  const handleApplyFilters = useCallback(
    (explicitSearch = null) => {
      const searchToUse = explicitSearch !== null ? explicitSearch : searchTerm;
      const newFilters = {
        status: filterStatus,
        search: searchToUse,
        amount: filterAmount,
        date: filterDate,
        exactDate: filterExactDate,
      };
      loadData(newFilters, false);
    },
    [
      filterStatus,
      searchTerm,
      filterAmount,
      filterDate,
      filterExactDate,
      loadData,
    ],
  );

  useEffect(() => {
    const currentFilters = {
      status: filterStatus,
      search: searchTerm,
      amount: filterAmount,
      date: filterDate,
      exactDate: filterExactDate,
    };
    const filtersMatch =
      JSON.stringify(invoiceService.cache.filters) ===
      JSON.stringify(currentFilters);

    if (!invoiceService.cache.isDirty && filtersMatch) {
      setInvoices(invoiceService.cache.data);
      setLoading(false);
      if (invoiceService.cache.stats) {
        setStats(invoiceService.cache.stats);
        setLoadingStats(false);
        return;
      }
    }

    handleApplyFilters();
    fetchStats(invoices.length > 0);
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

  const formatModalDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }) +
        ", " +
        new Date(iso).toLocaleTimeString("en-GB")
      : "";
  const formatInlineDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }) +
        ", " +
        new Date(iso).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  const handleStatusChange = async (id, newStatus) => {
    const invToUpdate = invoices.find((i) => i._id === id);
    if (!invToUpdate) return;

    const amt =
      Number(String(invToUpdate.grandTotal).replace(/[^0-9.-]+/g, "")) || 0;
    const oldStatus = (invToUpdate.status || "pending").toLowerCase();
    const targetStatus = newStatus.toLowerCase();

    const originalInvoices = [...invoices];
    const newInvoices = invoices.map((inv) =>
      inv._id === id ? { ...inv, status: newStatus } : inv,
    );

    setInvoices(newInvoices);
    setStats((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (next[oldStatus] && next[oldStatus].count > 0) {
        next[oldStatus].amt = Math.max(0, next[oldStatus].amt - amt);
        next[oldStatus].count -= 1;
      }
      if (next[targetStatus]) {
        next[targetStatus].amt += amt;
        next[targetStatus].count += 1;
      }
      invoiceService.cache.stats = next;
      return next;
    });

    invoiceService.cache.data = newInvoices;

    try {
      await invoiceService.updateStatus(
        id,
        newStatus,
        admin?.data || admin || { email: "Unknown", role: "admin" },
      );
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update status");
      setInvoices(originalInvoices);
      invoiceService.cache.data = originalInvoices;
      fetchStats(true);
    }
  };

  const handleDeleteClick = (id) => setDeleteModal({ isOpen: true, id });
  const handleDisabledClick = (id) => {
    setWarningTooltip(id);
    setTimeout(() => setWarningTooltip(null), 2500);
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    const targetId = deleteModal.id;
    const invToDelete = invoices.find((i) => i._id === targetId);
    setDeleteModal({ isOpen: false, id: null });
    if (!invToDelete) return;

    const amt =
      Number(String(invToDelete.grandTotal).replace(/[^0-9.-]+/g, "")) || 0;
    const statusStr = (invToDelete.status || "pending").toLowerCase();

    const previousInvoices = [...invoices];
    const newInvoices = invoices.filter((inv) => inv._id !== targetId);

    setInvoices(newInvoices);
    setStats((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next.total.amt = Math.max(0, next.total.amt - amt);
      next.total.count = Math.max(0, next.total.count - 1);
      if (next[statusStr] && next[statusStr].count > 0) {
        next[statusStr].amt = Math.max(0, next[statusStr].amt - amt);
        next[statusStr].count -= 1;
      }
      invoiceService.cache.stats = next;
      return next;
    });

    invoiceService.cache.data = newInvoices;

    try {
      await invoiceService.deleteInvoice(targetId, admin?.data || admin || {});
      toast.info("Invoice deleted successfully");
    } catch (error) {
      toast.error(error.message || "Failed to delete invoice");
      setInvoices(previousInvoices);
      invoiceService.cache.data = previousInvoices;
      fetchStats(true);
    }
  };

  const openHistory = (inv) =>
    setHistoryModal({
      isOpen: true,
      data: Array.isArray(inv?.editHistory)
        ? [...inv.editHistory].reverse()
        : [],
      itemName: `${String(inv?.invoiceNumber || "").replace(/^INV-/i, "")} - ${inv?.client?.name}`,
    });

  const handleFullBackup = async () => {
    try {
      if (!backupMonth) return toast.error("Please select a month.");
      toast.info(`Fetching secure backup for ${backupMonth}...`, {
        duration: 4000,
      });
      const result = await invoiceService.getFullBackupByMonth(backupMonth);
      const { data: allData, hasMore, part } = result;
      if (allData.length === 0)
        return toast.info(`No records found for ${backupMonth}.`);

      const headers = [
        "Date,Invoice No,Client Name,SubTotal,GST Rate,Grand Total,Status",
      ];
      const rows = allData.map(
        (inv) =>
          `${inv.date ? `\t${new Date(inv.date).toLocaleDateString("en-GB")}` : "-"},"${String(inv.invoiceNumber || "").replace(/^INV-/i, "")}","${inv.client?.name || ""}",${inv.subTotal || 0},${inv.gstRate || 0}%,${inv.grandTotal || 0},"${inv.status || ""}"`,
      );
      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute(
        "download",
        part > 1
          ? `Full_Backup_Invoices_${backupMonth}_Part${part}.csv`
          : `Full_Backup_Invoices_${backupMonth}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (hasMore) {
        localStorage.setItem(
          `backup_lock_${backupMonth}`,
          Date.now().toString(),
        );
        toast.success(
          `Part ${part} Downloaded! Backup locked. Resume Part ${part + 1} tomorrow.`,
          { duration: 8000 },
        );
        setIsDeleteAllOpen(false);
      } else {
        toast.success(`Backup for ${backupMonth} downloaded securely!`);
        localStorage.setItem(`backup_invoices_${backupMonth}`, "true");
      }
    } catch (e) {
      toast.error("Backup failed.");
    }
  };

  const handleWipeAll = async () => {
    if (isManager || !deletePassword)
      return toast.error("Verification failed.");
    setWiping(true);
    try {
      const response = await invoiceService.deleteAllInvoices({
        password: deletePassword,
        email: (admin?.data || admin || {}).email,
        user: admin?.data || admin || {},
      });
      if (response.isPartial)
        toast.success(response.message, { duration: 8000 });
      else toast.success(response.message);
      setIsDeleteAllOpen(false);
      setDeletePassword("");
      setShowPassword(false);

      setFilterStatus("All");
      setFilterAmount("All");
      setFilterDate("All");
      setFilterExactDate("");
      setSearchTerm("");
      loadData(
        {
          status: "All",
          amount: "All",
          date: "All",
          exactDate: "",
          search: "",
        },
        false,
      );
    } catch (error) {
      toast.error(error.message || "Incorrect Admin Password.");
    } finally {
      setWiping(false);
    }
  };

  if (loading && invoices.length === 0)
    return (
      <div className="w-full h-full min-h-[80vh] flex flex-col items-center justify-center">
        <Loader />
        <p className="text-zinc-500 mt-4 font-mono text-[10px] font-bold uppercase tracking-widest animate-pulse">
          Loading Invoices...
        </p>
      </div>
    );

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-10 px-4 print:w-full print:max-w-none print:m-0 print:p-0 relative"
    >
      <motion.div
        variants={blockVariants}
        className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5 print:hidden pt-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div
              className={`p-2 rounded-xl bg-[#09090B] border border-zinc-800 ${theme.primaryText}`}
            >
              <FileText size={24} />
            </div>
            Sales Ledger
          </h1>
          <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-widest mt-1 ml-1">
            Advanced Report
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${syncError ? "border-rose-500/20 bg-rose-500/10 text-rose-500" : isRefreshing ? "border-zinc-800/60 bg-zinc-900/50 text-zinc-400" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-500 opacity-60"}`}
            >
              {isRefreshing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : syncError ? (
                <XCircle size={12} />
              ) : (
                <CheckCircle2 size={12} />
              )}
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {isRefreshing
                  ? "Syncing..."
                  : syncError
                    ? "Sync Error"
                    : "Up To Date"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                invoiceService.clearCache();
                handleApplyFilters();
                fetchStats();
              }}
              disabled={isRefreshing}
              className="p-2 bg-[#09090B] border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:text-white transition-all text-zinc-500"
              title="Manual Refresh"
            >
              <RefreshCcw
                size={14}
                className={isRefreshing ? "animate-spin text-white" : ""}
              />
            </button>
          </div>

          <div className="relative flex-1 sm:flex-none">
            <button
              type="button"
              onClick={() =>
                isManager
                  ? (() => {
                      setWarningTooltip("wipe-all");
                      setTimeout(() => setWarningTooltip(null), 2500);
                    })()
                  : setIsDeleteAllOpen(true)
              }
              disabled={wipeStatus.disabled}
              className={`flex w-full items-center justify-center gap-2 bg-[#1a0f14] border border-[#3f1d24] text-rose-100 px-4 py-2 rounded-xl hover:bg-[#2d121a] hover:border-rose-500/50 transition-all font-bold text-sm h-10 ${isManager || wipeStatus.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <AlertOctagon size={16} className="text-rose-500" />{" "}
              {wipeStatus.text}
            </button>
            <AnimatePresence>
              {warningTooltip === "wipe-all" && (
                <motion.div
                  key="tooltip-wipe-all"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute top-full mt-2 right-0 z-[100]"
                >
                  <div className="bg-[#09090B] border border-red-500/30 shadow-xl text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                    <span className="bg-red-500/20 p-1 rounded-md text-[10px] leading-none">
                      🚫
                    </span>{" "}
                    Admin Access Required
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link
            to={`${isTransport ? "/transportation/invoices/create" : "/enterprise/invoices/create"}`}
            className="flex-1 sm:flex-none"
          >
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-xl hover:bg-indigo-500 transition-all font-bold text-sm h-10 border-none shadow-lg shadow-indigo-500/20"
            >
              <Plus size={16} /> Record Sale
            </button>
          </Link>
        </div>
      </motion.div>

      <motion.div
        variants={blockVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden"
      >
        <StatCard
          title="Total Revenue"
          amount={stats.total.amt}
          count={stats.total.count}
          icon={<Activity size={16} />}
          color={theme.primaryText}
          bg={theme.primaryBg}
          border={theme.primaryBorder}
          loading={loadingStats}
        />
        <StatCard
          title="Total Paid"
          amount={stats.paid.amt}
          count={stats.paid.count}
          icon={<CheckCircle2 size={16} />}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
          border="border-emerald-500/20"
          loading={loadingStats}
        />
        <StatCard
          title="Pending Amount"
          amount={stats.pending.amt}
          count={stats.pending.count}
          icon={<Clock size={16} />}
          color="text-amber-400"
          bg="bg-amber-500/10"
          border="border-amber-500/20"
          loading={loadingStats}
        />
        <StatCard
          title="Cancelled/Lost"
          amount={stats.cancelled.amt}
          count={stats.cancelled.count}
          icon={<XCircle size={16} />}
          color="text-rose-400"
          bg="bg-rose-500/10"
          border="border-rose-500/20"
          loading={loadingStats}
        />
      </motion.div>

      <AnimatePresence>
        {isDeleteAllOpen && !isManager && (
          <motion.div
            key="modal-database-wipe"
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden"
          >
            <div
              className="absolute inset-0"
              onClick={() => !wiping && setIsDeleteAllOpen(false)}
            />
            <motion.div
              variants={modalContentVariants}
              className="bg-[#121214] border border-zinc-800/60 shadow-2xl rounded-2xl w-full max-w-[500px] relative z-10 overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-zinc-800/60 flex items-start gap-4">
                <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl shrink-0">
                  <AlertOctagon size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-rose-500">
                    Database Management
                  </h2>
                  <p className="text-zinc-500 text-xs mt-1">
                    Export data or permanently erase records.
                  </p>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="bg-[#18181b] border border-zinc-800/60 rounded-xl overflow-hidden relative shadow-inner">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
                  <div className="p-5 pl-6">
                    <div className="flex items-center gap-2 text-amber-500 mb-1.5">
                      <ShieldAlert size={16} />{" "}
                      <span className="text-xs font-bold tracking-wide">
                        Step 1: Secure Data Export
                      </span>
                    </div>
                    <p className="text-zinc-400 text-xs mb-4">
                      Download a complete CSV backup of your records.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="month"
                        value={backupMonth}
                        onChange={(e) => setBackupMonth(e.target.value)}
                        style={{ colorScheme: "dark" }}
                        className="bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none w-full sm:w-40 transition-all focus:border-amber-500/50"
                      />
                      <button
                        type="button"
                        onClick={handleFullBackup}
                        disabled={backupStatus.disabled}
                        className={`flex-1 flex items-center justify-center gap-2 bg-[#09090b] border border-zinc-800 rounded-lg px-4 py-2 text-sm font-bold transition-all ${backupStatus.disabled ? "text-zinc-600 cursor-not-allowed" : "text-indigo-400 hover:bg-zinc-800/50 hover:text-indigo-300"}`}
                      >
                        <Download size={16} /> {backupStatus.text}
                      </button>
                    </div>
                    {backupStatus.timeLeft && (
                      <p className="text-[10px] text-amber-500/80 mt-3 font-mono tracking-widest uppercase">
                        {backupStatus.timeLeft}
                      </p>
                    )}
                  </div>
                </div>
                <div className="bg-[#18181b] border border-zinc-800/60 rounded-xl overflow-hidden relative shadow-inner">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
                  <div className="p-5 pl-6">
                    <div className="text-rose-500 mb-1.5">
                      <span className="text-xs font-bold tracking-wide">
                        Step 2: Confirm Deletion
                      </span>
                    </div>
                    <p className="text-zinc-400 text-xs mb-4">
                      This action{" "}
                      <span className="text-rose-500 font-bold">CANNOT</span> be
                      undone. All data will be wiped.
                    </p>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Enter admin password..."
                        className="w-full bg-[#09090b] border border-zinc-800 focus:border-rose-500/50 rounded-lg px-4 py-3 text-sm text-zinc-100 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-5 bg-[#18181b] border-t border-zinc-800/60 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteAllOpen(false);
                    setDeletePassword("");
                  }}
                  disabled={wiping}
                  className="px-6 py-2 rounded-lg text-sm font-bold text-zinc-400 hover:text-white border border-transparent hover:border-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleWipeAll}
                  disabled={wiping || !deletePassword}
                  className="px-6 py-2 rounded-lg text-sm font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {wiping && <RefreshCcw size={16} className="animate-spin" />}{" "}
                  {wiping ? "Wiping..." : "Permanently Wipe"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={blockVariants}
        className="bg-[#09090B] rounded-2xl shadow-xl border border-zinc-800/60 overflow-hidden relative print:shadow-none print:border-none print:bg-white"
      >
        <div className="flex flex-col gap-4 p-4 border-b border-zinc-800/60 bg-[#0c0c0e] print:hidden">
          <div className="w-full max-w-lg">
            <AnimatedSearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchTerm.trim())
                  handleApplyFilters(searchTerm);
              }}
              onSearch={() => {
                if (searchTerm.trim()) handleApplyFilters(searchTerm);
              }}
              onClear={() => {
                setSearchTerm("");
                loadData(
                  {
                    status: filterStatus,
                    amount: filterAmount,
                    date: filterDate,
                    exactDate: filterExactDate,
                    search: "",
                  },
                  false,
                );
              }}
              theme={theme}
            />
          </div>

          <div className="flex items-center flex-wrap gap-3 w-full pb-1">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-2 shrink-0">
              <Filter size={14} /> Filters
            </div>

            <div className="relative group shrink-0">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`appearance-none bg-[#121214] border border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
              >
                <option value="All" className="bg-[#09090B]">
                  All Status
                </option>
                <option value="Pending" className="bg-[#09090B]">
                  Pending
                </option>
                <option value="Paid" className="bg-[#09090B]">
                  Paid
                </option>
                <option value="Cancelled" className="bg-[#09090B]">
                  Cancelled
                </option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
              />
            </div>

            <div className="relative group shrink-0">
              <select
                value={filterAmount}
                onChange={(e) => setFilterAmount(e.target.value)}
                className={`appearance-none bg-[#121214] border border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
              >
                <option value="All" className="bg-[#09090B]">
                  Any Amount
                </option>
                <option value="Under10k" className="bg-[#09090B]">
                  Under ₹10,000
                </option>
                <option value="10k-50k" className="bg-[#09090B]">
                  ₹10k - ₹50k
                </option>
                <option value="Above50k" className="bg-[#09090B]">
                  Above ₹50,000
                </option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
              />
            </div>

            <div className="relative group shrink-0">
              <select
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value);
                  if (e.target.value !== "All") setFilterExactDate("");
                }}
                className={`appearance-none bg-[#121214] border border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
              >
                <option value="All" className="bg-[#09090B]">
                  Timeline: All
                </option>
                <option value="Last7Days" className="bg-[#09090B]">
                  Last 7 Days
                </option>
                <option value="Last30Days" className="bg-[#09090B]">
                  Last 30 Days
                </option>
                <option value="ThisMonth" className="bg-[#09090B]">
                  This Month
                </option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
              />
            </div>

            <div className="relative group flex items-center shrink-0">
              <div
                className={`absolute left-4 flex items-center justify-center pointer-events-none transition-colors ${filterExactDate ? theme.primaryText : "text-zinc-500"}`}
              >
                <Calendar size={14} />
              </div>
              <input
                type="date"
                value={filterExactDate}
                onChange={(e) => {
                  setFilterExactDate(e.target.value);
                  if (e.target.value) setFilterDate("All");
                }}
                style={{ colorScheme: "dark" }}
                className={`appearance-none bg-[#121214] border rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium outline-none cursor-pointer transition-all ${theme.primaryFocus} ${filterExactDate ? `${theme.primaryBg} ${theme.primaryBorder} text-indigo-100` : "border-zinc-800 text-zinc-300 hover:border-zinc-700"}`}
              />
            </div>

            <button
              type="button"
              disabled={activeDropdownFiltersCount === 0}
              onClick={() => handleApplyFilters()}
              className={`h-9 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold text-xs shrink-0 ${activeDropdownFiltersCount === 0 ? "bg-[#121214] border border-zinc-800/60 text-zinc-600 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"}`}
            >
              <Filter size={14} /> Apply Filters
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFilterStatus("All");
                  setFilterAmount("All");
                  setFilterDate("All");
                  setFilterExactDate("");
                  setSearchTerm("");
                  loadData(
                    {
                      status: "All",
                      amount: "All",
                      date: "All",
                      exactDate: "",
                      search: "",
                    },
                    false,
                  );
                }}
                className="h-9 px-3 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-1.5 font-bold text-xs shrink-0 border border-rose-500/20 hover:border-rose-500"
              >
                <X size={14} /> Clear {activeFiltersCount}
              </button>
            )}
          </div>
        </div>

        <div
          className={`overflow-x-auto pb-0 custom-scrollbar print:overflow-visible print:w-full transition-opacity duration-300 ${isRefreshing ? "opacity-50 pointer-events-none" : "opacity-100"}`}
        >
          <table className="w-full text-left min-w-max print:min-w-0">
            <thead className="bg-[#09090B] text-zinc-500 text-[10px] uppercase tracking-widest font-bold print:bg-white print:text-black border-b border-zinc-800/60">
              <tr>
                <th className="p-5 md:pl-6 whitespace-nowrap">
                  Invoice # & Date
                </th>
                <th className="p-5 whitespace-nowrap min-w-[200px]">Client</th>
                <th className="p-5 whitespace-nowrap">Total Amount</th>
                <th className="p-5 whitespace-nowrap">Status</th>
                <th className="p-5 md:pr-6 text-right whitespace-nowrap print:hidden">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="text-sm print:divide-gray-200">
              {invoices.map((inv) => (
                <tr
                  key={inv._id}
                  id={inv._id}
                  className={`transition-colors duration-200 group print:text-black border-b border-zinc-800/40 last:border-0 ${activeHighlight === inv._id ? `${isTransport ? "bg-cyan-500/10" : "bg-indigo-500/10"}` : "hover:bg-[#151518]"}`}
                >
                  <td className="p-5 md:pl-6 align-middle">
                    <div
                      className={`font-mono font-bold whitespace-nowrap print:text-black ${theme.primaryText}`}
                    >
                      {inv.invoiceNumber
                        ? String(inv.invoiceNumber).replace(/^INV-/i, "")
                        : "N/A"}
                    </div>
                    <div className="text-zinc-500 text-[10px] mt-1 whitespace-nowrap font-medium tracking-wide print:text-gray-500">
                      {inv.date
                        ? new Date(inv.date).toLocaleDateString("en-GB")
                        : "Unknown Date"}
                    </div>
                  </td>
                  <td className="p-5 align-middle">
                    <div className="font-medium text-zinc-100 whitespace-nowrap print:text-black">
                      {inv.client?.name || "Unknown"}
                    </div>
                    {Array.isArray(inv.editHistory) &&
                      inv.editHistory.length > 0 && (
                        <div
                          onClick={() => openHistory(inv)}
                          className="mt-1.5 inline-flex flex-col gap-0.5 cursor-pointer bg-zinc-800/40 hover:bg-zinc-700/60 border border-zinc-700/50 p-1.5 rounded-lg transition-all w-max print:hidden group/btn"
                        >
                          <div className="text-[9px] font-mono text-zinc-300 flex items-center gap-1 uppercase tracking-widest font-bold leading-none">
                            <History
                              size={10}
                              className="text-zinc-400 group-hover/btn:-rotate-12 transition-transform"
                            />{" "}
                            {inv.editHistory[inv.editHistory.length - 1]
                              ?.role || "ADMIN"}
                          </div>
                          <span className="text-zinc-500 text-[8px] ml-4 font-medium">
                            {formatInlineDate(
                              inv.editHistory[inv.editHistory.length - 1]?.at,
                            )}
                          </span>
                        </div>
                      )}
                  </td>
                  <td className="p-5 font-bold text-white font-mono align-middle whitespace-nowrap print:text-black">
                    ₹ {(Number(inv.grandTotal) || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="p-5 align-middle whitespace-nowrap">
                    <select
                      value={inv.status}
                      onChange={(e) =>
                        handleStatusChange(inv._id, e.target.value)
                      }
                      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1.5 rounded-md border outline-none cursor-pointer transition-colors print:appearance-none print:border-none print:bg-transparent print:text-black ${inv.status === "Paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : inv.status === "Cancelled" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}
                    >
                      <option
                        value="Pending"
                        className="bg-[#09090B] text-amber-400"
                      >
                        Pending
                      </option>
                      <option
                        value="Paid"
                        className="bg-[#09090B] text-emerald-400"
                      >
                        Paid
                      </option>
                      <option
                        value="Cancelled"
                        className="bg-[#09090B] text-rose-400"
                      >
                        Cancelled
                      </option>
                    </select>
                  </td>
                  <td className="p-5 md:pr-6 align-middle overflow-visible print:hidden">
                    <div className="flex justify-end gap-1.5 items-center relative overflow-visible">
                      <Link
                        to={`${isTransport ? `/transportation/invoices/view/${inv._id}` : `/enterprise/invoices/view/${inv._id}`}`}
                        className={`p-1.5 text-zinc-500 hover:${theme.primaryText} ${theme.primaryHoverBg} rounded-md transition-colors`}
                        title="View PDF"
                      >
                        <Eye size={16} />
                      </Link>
                      <Link
                        to={`${isTransport ? `/transportation/invoices/edit/${inv._id}` : `/enterprise/invoices/edit/${inv._id}`}`}
                        className={`p-1.5 text-zinc-500 hover:${theme.primaryText} ${theme.primaryHoverBg} rounded-md transition-colors`}
                        title="Edit Invoice"
                      >
                        <Edit size={16} />
                      </Link>
                      <div className="relative overflow-visible">
                        <button
                          type="button"
                          onClick={() =>
                            isManager
                              ? handleDisabledClick(inv._id)
                              : handleDeleteClick(inv._id)
                          }
                          className={`p-1.5 rounded-md transition-colors ${isManager ? "text-zinc-600 opacity-50 cursor-not-allowed" : "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"}`}
                        >
                          <Trash2 size={16} />
                        </button>
                        <AnimatePresence>
                          {warningTooltip === inv._id && (
                            <motion.div
                              key={`tooltip-${inv._id}`}
                              initial={{ opacity: 0, y: 10, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="absolute bottom-full right-0 mb-2 z-[9999]"
                            >
                              <div className="bg-[#09090B] border border-red-500/30 shadow-2xl text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                                <span className="bg-red-500/20 p-1 rounded text-[8px] leading-none">
                                  🚫
                                </span>{" "}
                                Access Denied
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && !loading && !isRefreshing && (
                <tr>
                  <td
                    colSpan="5"
                    className="p-10 text-center text-zinc-500 text-sm italic print:text-black"
                  >
                    No invoices match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {invoices.length > 0 && (
            <div className="flex flex-col items-center justify-center p-6 gap-3 border-t border-zinc-800/60 bg-[#09090B] print:hidden">
              <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                Showing {invoices.length} records
              </div>
              {hasMore && invoices.length < 5000 && (
                <Button
                  type="button"
                  onClick={() =>
                    loadData(
                      {
                        status: filterStatus,
                        search: searchTerm,
                        amount: filterAmount,
                        date: filterDate,
                        exactDate: filterExactDate,
                      },
                      true,
                    )
                  }
                  disabled={loadingMore}
                  variant="outline"
                  className="rounded-full px-6 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all shadow-sm"
                >
                  {loadingMore ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : (
                    <ChevronDown size={16} className="mr-2" />
                  )}{" "}
                  {loadingMore ? "Loading..." : "Load Next 50 Invoices"}
                </Button>
              )}
              {invoices.length >= 5000 && (
                <div className="text-amber-500 text-xs font-bold bg-amber-500/10 px-4 py-2 rounded-lg border border-amber-500/20 w-full text-center max-w-lg mt-2">
                  Display Limit Reached (5,000 records). Use Search/Filters to
                  find older records to preserve performance.
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {historyModal.isOpen && (
          <motion.div
            key="modal-history-log"
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden"
          >
            <motion.div
              variants={modalContentVariants}
              className="bg-[#09090B] border border-zinc-800/60 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative Z-50"
            >
              <div className="p-5 border-b border-zinc-800/60 flex justify-between items-center bg-[#09090B]">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <History size={18} className={theme.primaryText} /> Log
                  History:{" "}
                  <span className="text-zinc-300 text-sm ml-1">
                    {historyModal.itemName}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setHistoryModal({ isOpen: false, data: [], itemName: "" })
                  }
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
                {historyModal.data.map((edit, idx) => (
                  <div
                    key={idx}
                    className={`bg-zinc-900/30 border ${idx === 0 ? theme.primaryBorder : "border-zinc-800"} rounded-xl p-4 flex items-center justify-between relative overflow-hidden group ${theme.primaryHoverBorder} transition-colors`}
                  >
                    {idx === 0 && (
                      <div
                        className={`absolute left-0 top-0 w-1 h-full ${theme.primaryBg}`}
                      ></div>
                    )}
                    <div className="flex items-center gap-4 pl-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg uppercase ${idx === 0 ? `${theme.primaryBg} ${theme.primaryText}` : "bg-zinc-800/50 text-zinc-400"}`}
                      >
                        {edit.role ? edit.role.charAt(0) : "A"}
                      </div>
                      <div>
                        <div
                          className={`font-bold uppercase tracking-widest text-sm ${idx === 0 ? "text-white" : "text-zinc-400"}`}
                        >
                          {edit.role || "Admin"}
                        </div>
                        <div className="text-zinc-500 text-[10px] font-mono lowercase">
                          {edit.by}
                        </div>
                        <div
                          className={`text-[10px] font-mono mt-1 tracking-wider ${idx === 0 ? theme.primaryText : "text-zinc-500"}`}
                        >
                          {formatModalDate(edit.at)}
                        </div>
                      </div>
                    </div>
                    {idx === 0 && (
                      <div
                        className={`${theme.primaryBg} border ${theme.primaryBorder} ${theme.primaryText} text-[10px] px-3 py-1 rounded-md font-bold tracking-widest uppercase`}
                      >
                        LATEST
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Delete Invoice?"
        message="Are you sure you want to delete this invoice?"
        confirmText="Delete"
        isDestructive={true}
      />
    </motion.div>
  );
};

export default InvoiceList;
