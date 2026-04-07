/**
 * InvoiceList.jsx — Production-ready Sales Ledger
 * ─────────────────────────────────────────────────────────────────────────────
 * UX Contract:
 * • Navigation INTO this page → zero reads (L1 or L2 hit)
 * • Manual Sync button        → triggers a fresh L3 fetch
 * • Search / Filter buttons   → manual-trigger only, no debounce
 * • Status change             → optimistic UI, 1 read + 2 writes
 * • Delete                    → optimistic UI, 1 read + 2 writes
 * • Load More                 → cursor-based, max 2000 records
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import invoiceService, { MAX_DISPLAY } from "../../services/invoiceService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  FileText,
  Plus,
  Eye,
  Trash2,
  Edit,
  History,
  Search,
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
  AlertTriangle,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION VARIANTS
// ─────────────────────────────────────────────────────────────────────────────
const pageVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut", staggerChildren: 0.08 },
  },
};
const blockVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};
const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2 } },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const prevMonthStr = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const fmtDateLong = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) +
      ", " +
      new Date(iso).toLocaleTimeString("en-GB")
    : "";

const fmtDateShort = (iso) =>
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

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

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
  <div className="bg-[#0A0A0C] border border-white/5 p-6 rounded-2xl shadow-xl relative overflow-hidden group hover:border-white/10 transition-colors">
    <div className="flex justify-between items-start mb-4">
      <span className="text-[11px] uppercase font-bold tracking-[0.1em] text-zinc-500">
        {title}
      </span>
      <div
        className={`p-2 rounded-xl ${bg} ${color} border ${border} shadow-inner`}
      >
        {icon}
      </div>
    </div>
    <div className="flex items-end justify-between mt-2">
      <div className="text-3xl font-mono font-bold text-white tracking-tight">
        {loading ? (
          <span className="animate-pulse text-zinc-700">₹ ----</span>
        ) : (
          `₹ ${Number(amount ?? 0).toLocaleString("en-IN")}`
        )}
      </div>
      {!loading && (
        <div className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-zinc-300">
          {count} {count === 1 ? "Inv" : "Invs"}
        </div>
      )}
    </div>
  </div>
);

// Animated typewriter placeholder search input
const SearchInput = ({
  value,
  onChange,
  onKeyDown,
  onSearch,
  onClear,
  theme,
}) => {
  const phrases = useRef([
    "Search by client name...",
    "Search by invoice number...",
    "Search INV-1001...",
    "Find records instantly...",
  ]);
  const [ph, setPh] = useState("");
  const [idx, setIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const cur = phrases.current[idx];
    const t = setTimeout(
      () => {
        if (!deleting) {
          setPh(cur.substring(0, ph.length + 1));
          if (ph.length === cur.length)
            setTimeout(() => setDeleting(true), 1500);
        } else {
          setPh(cur.substring(0, ph.length - 1));
          if (ph.length === 0) {
            setDeleting(false);
            setIdx((i) => (i + 1) % phrases.current.length);
          }
        }
      },
      deleting ? 40 : 80,
    );
    return () => clearTimeout(t);
  }, [ph, deleting, idx]);

  const hasValue = value?.trim().length > 0;
  return (
    <div className="flex items-center gap-2 w-full lg:max-w-md">
      <div className="relative flex-1">
        <Search
          size={18}
          className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${value ? theme.primaryText : "text-zinc-500"}`}
        />
        <input
          type="text"
          placeholder={ph}
          className="w-full bg-[#121214] border border-white/10 hover:border-white/20 rounded-xl pl-12 pr-10 py-3 text-sm text-white font-medium outline-none focus:border-indigo-500/50 shadow-inner transition-all"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-md transition-all"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onSearch}
        disabled={!hasValue}
        className={`h-12 px-6 rounded-xl text-sm font-bold transition-all ${
          hasValue
            ? `bg-gradient-to-r ${theme.gradientBg} text-white shadow-lg shadow-indigo-500/20 hover:brightness-110`
            : "bg-[#121214] border border-white/5 text-zinc-600 cursor-not-allowed"
        }`}
      >
        Search
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const InvoiceList = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const location = useLocation();
  const urlHighlightId = new URLSearchParams(location.search).get("highlight");

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
      ? "focus:border-cyan-500/50"
      : "focus:border-indigo-500/50",
    gradientBg: isTransport
      ? "from-cyan-600 to-blue-600"
      : "from-indigo-600 to-purple-600",
  };

  // ── State — seeded from L1 cache to avoid loading flash on navigation ─────
  const cache = invoiceService.cache;
  const [invoices, setInvoices] = useState(cache.isDirty ? [] : cache.data);
  const [stats, setStats] = useState(
    cache.stats ?? {
      total: { amt: 0, count: 0 },
      paid: { amt: 0, count: 0 },
      pending: { amt: 0, count: 0 },
      cancelled: { amt: 0, count: 0 },
    },
  );
  const [loading, setLoading] = useState(cache.isDirty);
  const [loadingStats, setLoadingStats] = useState(!cache.stats);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncState, setSyncState] = useState(
    cache.isDirty ? "REQUIRED" : "UP_TO_DATE",
  );
  const [hasMore, setHasMore] = useState(cache.hasMore);
  const [lastDoc, setLastDoc] = useState(cache.lastDoc);

  // Filter state — seeded from last-used filters in L1
  const [searchTerm, setSearchTerm] = useState(cache.filters?.search ?? "");
  const [filterStatus, setFilterStatus] = useState(
    cache.filters?.status ?? "All",
  );
  const [filterAmount, setFilterAmount] = useState(
    cache.filters?.amount ?? "All",
  );
  const [filterDate, setFilterDate] = useState(cache.filters?.date ?? "All");
  const [filterExactDate, setFilterExactDate] = useState(
    cache.filters?.exactDate ?? "",
  );

  // Modal state
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [warningTip, setWarningTip] = useState(null);
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    name: "",
  });
  const [isWipeOpen, setIsWipeOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState(null);
  const [backupMonth, setBackupMonth] = useState(prevMonthStr);
  const [backupStatus, setBackupStatus] = useState({
    disabled: false,
    label: "Download Backup",
    timeLeft: "",
  });
  const [wipeStatus, setWipeStatus] = useState({
    disabled: false,
    timeLeft: "",
  });

  // Stable refs so callbacks don't capture stale filter values
  const searchRef = useRef(searchTerm);
  const statusRef = useRef(filterStatus);
  const amountRef = useRef(filterAmount);
  const dateRef = useRef(filterDate);
  const exactDateRef = useRef(filterExactDate);

  useEffect(() => {
    searchRef.current = searchTerm;
  }, [searchTerm]);
  useEffect(() => {
    statusRef.current = filterStatus;
  }, [filterStatus]);
  useEffect(() => {
    amountRef.current = filterAmount;
  }, [filterAmount]);
  useEffect(() => {
    dateRef.current = filterDate;
  }, [filterDate]);
  useEffect(() => {
    exactDateRef.current = filterExactDate;
  }, [filterExactDate]);

  const currentFilters = useCallback(
    () => ({
      search: searchRef.current,
      status: statusRef.current,
      amount: amountRef.current,
      date: dateRef.current,
      exactDate: exactDateRef.current,
    }),
    [],
  );

  const activeFilterCount =
    [filterStatus, filterAmount, filterDate].filter((f) => f !== "All").length +
    (filterExactDate ? 1 : 0);

  // ── Lock status refresh (localStorage reads — zero Firestore) ─────────────
  useEffect(() => {
    const refresh = () => {
      const ws = invoiceService.getWipeLockStatus();
      setWipeStatus({ disabled: ws.locked, timeLeft: ws.timeLeft });
      const bs = invoiceService.getBackupLockStatus(backupMonth);
      setBackupStatus({
        disabled: bs.locked,
        label: bs.label,
        timeLeft: bs.timeLeft,
      });
    };
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [backupMonth, isWipeOpen]);

  // ── Data loading ───────────────────────────────────────────────────────────
  const loadData = useCallback(
    async (filters, cursorDoc = null, opts = {}) => {
      const { silent = false } = opts;
      const isLoadMore = !!cursorDoc;

      if (isLoadMore) setLoadingMore(true);
      else if (!silent) setSyncState("SYNCING");

      try {
        const res = await invoiceService.getAllInvoices(filters, cursorDoc);

        if (res.fromCache && !isLoadMore) {
          setSyncState("UP_TO_DATE");
          return;
        }

        if (isLoadMore) {
          // Component reads merged L1 list directly
          setInvoices([...invoiceService.cache.data]);
        } else {
          setInvoices(res.data ?? []);
        }

        setLastDoc(res.lastVisible ?? null);
        setHasMore(res.hasMore ?? false);
        if (!isLoadMore) setSyncState("UP_TO_DATE");
      } catch (err) {
        setSyncState("ERROR");
        if ((err?.message ?? "").toLowerCase().includes("index"))
          toast.error("Firebase index required. Check the console.");
        else toast.error("Failed to load invoices.");
      } finally {
        setLoadingMore(false);
        setLoading(false);
      }
    },
    [toast],
  );

  const loadStats = useCallback(async (silent = false) => {
    if (!silent) setLoadingStats(true);
    try {
      const s = await invoiceService.getInvoiceStats();
      setStats(s);
    } catch {
      /* ignore — service degrades gracefully */
    } finally {
      if (!silent) setLoadingStats(false);
    }
  }, []);

  // ── Initial load (on mount) ────────────────────────────────────────────────
  useEffect(() => {
    const cf = currentFilters();
    const c = invoiceService.cache;
    const filtersMatch = JSON.stringify(c.filters) === JSON.stringify(cf);

    // Full L1 hit → zero reads
    if (!c.isDirty && !invoiceService.isCacheStale() && filtersMatch) {
      setInvoices(c.data);
      setHasMore(c.hasMore);
      setLastDoc(c.lastDoc);
      setLoading(false);
      setSyncState("UP_TO_DATE");

      if (c.stats && !invoiceService.isStatsCacheStale()) {
        setStats(c.stats);
        setLoadingStats(false);
        return;
      }
      loadStats(true);
      return;
    }

    // L1 miss → fetch from L2/L3
    loadData(cf);
    loadStats(invoices.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Highlight on URL param ─────────────────────────────────────────────────
  useEffect(() => {
    if (!urlHighlightId || loading) return;
    setActiveHighlight(urlHighlightId);
    const scroll = setTimeout(() => {
      document
        .getElementById(urlHighlightId)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 400);
    const clear = setTimeout(() => setActiveHighlight(null), 3500);
    return () => {
      clearTimeout(scroll);
      clearTimeout(clear);
    };
  }, [urlHighlightId, loading]);

  // ── Sync handlers ──────────────────────────────────────────────────────────
  const handleManualSync = useCallback(() => {
    invoiceService.clearCache();
    const cf = currentFilters();
    loadData(cf);
    loadStats();
  }, [currentFilters, loadData, loadStats]);

  const handleCheckSync = useCallback(async () => {
    setSyncState("SYNCING");
    const status = await invoiceService.checkSyncStatus();
    setSyncState(status);
  }, []);

  // ── Search / Filter handlers ───────────────────────────────────────────────
  const executeSearch = useCallback(
    (term) => {
      const newFilters = {
        search: term,
        status: "All",
        amount: "All",
        date: "All",
        exactDate: "",
      };
      setFilterStatus("All");
      setFilterAmount("All");
      setFilterDate("All");
      setFilterExactDate("");
      loadData(newFilters);
    },
    [loadData],
  );

  const executeFilter = useCallback(() => {
    const newFilters = {
      search: "",
      status: statusRef.current,
      amount: amountRef.current,
      date: dateRef.current,
      exactDate: exactDateRef.current,
    };
    setSearchTerm("");
    loadData(newFilters);
  }, [loadData]);

  const clearFilters = useCallback(() => {
    const newFilters = {
      search: searchRef.current,
      status: "All",
      amount: "All",
      date: "All",
      exactDate: "",
    };
    setFilterStatus("All");
    setFilterAmount("All");
    setFilterDate("All");
    setFilterExactDate("");
    loadData(newFilters);
  }, [loadData]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || !lastDoc || invoices.length >= MAX_DISPLAY) return;
    loadData(currentFilters(), lastDoc);
  }, [hasMore, lastDoc, invoices.length, currentFilters, loadData]);

  // ── Status change (optimistic) ─────────────────────────────────────────────
  const handleStatusChange = useCallback(
    async (id, newStatus) => {
      // Optimistic L1 patch
      setInvoices((prev) =>
        prev.map((i) => (i._id === id ? { ...i, status: newStatus } : i)),
      );

      const inv = invoiceService.cache.data.find((i) => i._id === id);
      const amt =
        Number(String(inv?.grandTotal ?? 0).replace(/[^0-9.-]+/g, "")) || 0;
      const oldKey = (inv?.status ?? "pending").toLowerCase();
      const newKey = newStatus.toLowerCase();

      setStats((s) => {
        const n = JSON.parse(JSON.stringify(s));
        if (n[oldKey]?.count > 0) {
          n[oldKey].amt = Math.max(0, n[oldKey].amt - amt);
          n[oldKey].count -= 1;
        }
        if (n[newKey]) {
          n[newKey].amt += amt;
          n[newKey].count += 1;
        }
        return n;
      });

      try {
        await invoiceService.updateStatus(
          id,
          newStatus,
          admin?.data ?? admin ?? {},
        );
        toast.success(`Status → ${newStatus}`);
      } catch {
        toast.error("Failed to update status — reverting.");
        setInvoices([...invoiceService.cache.data]);
        loadStats(true);
      }
    },
    [admin, toast, loadStats],
  );

  // ── Delete (optimistic) ────────────────────────────────────────────────────
  const executeDelete = useCallback(async () => {
    const id = deleteModal.id;
    const inv = invoices.find((i) => i._id === id);
    setDeleteModal({ isOpen: false, id: null });
    if (!inv) return;

    const amt = Number(String(inv.grandTotal).replace(/[^0-9.-]+/g, "")) || 0;
    const bucket = (inv.status ?? "pending").toLowerCase();

    setInvoices((prev) => prev.filter((i) => i._id !== id));
    setStats((s) => {
      const n = JSON.parse(JSON.stringify(s));
      n.total.amt = Math.max(0, n.total.amt - amt);
      n.total.count = Math.max(0, n.total.count - 1);
      if (n[bucket]?.count > 0) {
        n[bucket].amt = Math.max(0, n[bucket].amt - amt);
        n[bucket].count -= 1;
      }
      return n;
    });

    try {
      await invoiceService.deleteInvoice(id, admin?.data ?? admin ?? {});
      toast.info("Invoice deleted.");
    } catch (err) {
      toast.error(err.message ?? "Failed to delete.");
      setInvoices([...invoiceService.cache.data]);
      loadStats(true);
    }
  }, [deleteModal.id, invoices, admin, toast, loadStats]);

  // ── Wipe all ───────────────────────────────────────────────────────────────
  const handleWipeAll = useCallback(async () => {
    if (isManager || !deletePassword)
      return toast.error("Verification failed.");
    setWiping(true);
    try {
      const res = await invoiceService.deleteAllInvoices({
        password: deletePassword,
        email: (admin?.data ?? admin ?? {}).email,
        user: admin?.data ?? admin ?? {},
      });
      toast.success(
        res.message,
        res.isPartial ? { duration: 8000 } : undefined,
      );
      setIsWipeOpen(false);
      setDeletePassword("");
      setInvoices([]);
      setStats({
        total: { amt: 0, count: 0 },
        paid: { amt: 0, count: 0 },
        pending: { amt: 0, count: 0 },
        cancelled: { amt: 0, count: 0 },
      });
      loadData({
        search: "",
        status: "All",
        amount: "All",
        date: "All",
        exactDate: "",
      });
    } catch (err) {
      toast.error(err.message ?? "Wipe failed.");
    } finally {
      setWiping(false);
    }
  }, [isManager, deletePassword, admin, toast, loadData]);

  // ── Backup ─────────────────────────────────────────────────────────────────
  const handleBackup = useCallback(async () => {
    if (!backupMonth) return toast.error("Select a month.");
    toast.info(`Preparing backup for ${backupMonth}…`, { duration: 4000 });
    try {
      const {
        data,
        hasMore: more,
        part,
      } = await invoiceService.getFullBackupByMonth(backupMonth);
      if (!data.length) return toast.info("No records found for this month.");

      const header =
        "Date,Invoice No,Client Name,SubTotal,GST Rate,Grand Total,Status";
      const rows = data.map((inv) =>
        [
          inv.date
            ? `\t${new Date(inv.date).toLocaleDateString("en-GB")}`
            : "-",
          `"${String(inv.invoiceNumber ?? "").replace(/^INV-/i, "")}"`,
          `"${inv.client?.name ?? ""}"`,
          inv.subTotal ?? 0,
          `${inv.gstRate ?? 0}%`,
          inv.grandTotal ?? 0,
          `"${inv.status ?? ""}"`,
        ].join(","),
      );

      const csv = "\uFEFF" + [header, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = more
        ? `Invoices_${backupMonth}_Part${part}.csv`
        : `Invoices_${backupMonth}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      if (more)
        toast.success(
          `Part ${part} downloaded. Resume Part ${part + 1} tomorrow.`,
          { duration: 8000 },
        );
      else toast.success("Backup complete!");
    } catch (err) {
      toast.error(err.message ?? "Backup failed.");
    }
  }, [backupMonth, toast]);

  // ── Misc helpers ───────────────────────────────────────────────────────────
  const openHistory = useCallback(
    (inv) =>
      setHistoryModal({
        isOpen: true,
        data: Array.isArray(inv?.editHistory)
          ? [...inv.editHistory].reverse()
          : [],
        name: `${String(inv?.invoiceNumber ?? "").replace(/^INV-/i, "")} — ${inv?.client?.name}`,
      }),
    [],
  );

  const showWarning = useCallback((id) => {
    setWarningTip(id);
    setTimeout(() => setWarningTip(null), 2500);
  }, []);

  const baseRoute = isTransport
    ? "/transportation/invoices"
    : "/enterprise/invoices";

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading && invoices.length === 0)
    return (
      <div className="w-full min-h-[80vh] flex flex-col items-center justify-center">
        <Loader />
        <p className="text-zinc-500 mt-4 font-mono text-[10px] font-bold uppercase tracking-widest animate-pulse">
          Loading Invoices…
        </p>
      </div>
    );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-12 px-4 print:w-full print:max-w-none print:m-0 print:p-0 relative font-sans text-zinc-100 max-w-[1400px] mx-auto"
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <motion.div
        variants={blockVariants}
        className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 print:hidden pt-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-4 tracking-tight whitespace-nowrap">
            <div
              className={`p-3 rounded-xl bg-gradient-to-br ${theme.gradientBg} text-white shadow-lg`}
            >
              <FileText size={26} />
            </div>{" "}
            Sales Ledger
          </h1>
          <p className="text-zinc-400 text-xs font-medium uppercase tracking-[0.15em] mt-2 ml-1">
            Enterprise Analytics Report
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full xl:w-auto">
          {/* Sync button */}
          <button
            type="button"
            onClick={
              syncState === "REQUIRED" || syncState === "ERROR"
                ? handleManualSync
                : handleCheckSync
            }
            disabled={syncState === "SYNCING" || syncState === "UP_TO_DATE"}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
              syncState === "SYNCING"
                ? "border-white/5 bg-white/5 text-zinc-400 cursor-wait"
                : syncState === "ERROR"
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                  : syncState === "REQUIRED"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                    : "border-emerald-500/10 bg-[#0A0A0C] text-emerald-500 opacity-50 cursor-default"
            }`}
          >
            {syncState === "SYNCING" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : syncState === "ERROR" ? (
              <XCircle size={14} />
            ) : syncState === "REQUIRED" ? (
              <AlertTriangle size={14} />
            ) : (
              <CheckCircle2 size={14} />
            )}
            {syncState === "SYNCING"
              ? "Syncing…"
              : syncState === "ERROR"
                ? "Retry Sync"
                : syncState === "REQUIRED"
                  ? "Updates Available"
                  : "Data Up To Date"}
          </button>

          {/* Database / Wipe */}
          <div className="relative flex-1 sm:flex-none">
            <button
              type="button"
              onClick={() =>
                isManager ? showWarning("wipe-all") : setIsWipeOpen(true)
              }
              disabled={wipeStatus.disabled}
              className={`flex w-full items-center justify-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-5 py-2.5 rounded-xl hover:bg-rose-500 hover:text-white font-bold text-sm transition-all shadow-sm ${isManager || wipeStatus.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <AlertOctagon size={16} /> Database
            </button>
            <AnimatePresence>
              {warningTip === "wipe-all" && (
                <motion.div
                  key="tip-wipe"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute top-full mt-2 right-0 z-[100]"
                >
                  <div className="bg-[#0A0A0C] border border-red-500/30 text-red-400 text-xs uppercase tracking-widest font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 w-max shadow-2xl">
                    🚫 Admin Access Required
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Record Sale */}
          <Link to={`${baseRoute}/create`} className="flex-1 sm:flex-none">
            <button
              type="button"
              className={`flex w-full items-center justify-center gap-2 bg-gradient-to-r ${theme.gradientBg} text-white px-6 py-2.5 rounded-xl hover:brightness-110 font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all`}
            >
              <Plus size={18} /> Record Sale
            </button>
          </Link>
        </div>
      </motion.div>

      {/* ── STAT CARDS ─────────────────────────────────────────────────────── */}
      <motion.div
        variants={blockVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 print:hidden"
      >
        <StatCard
          title="Total Revenue"
          amount={stats.total.amt}
          count={stats.total.count}
          icon={<Activity size={18} />}
          color={theme.primaryText}
          bg={theme.primaryBg}
          border={theme.primaryBorder}
          loading={loadingStats}
        />
        <StatCard
          title="Total Paid"
          amount={stats.paid.amt}
          count={stats.paid.count}
          icon={<CheckCircle2 size={18} />}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
          border="border-emerald-500/20"
          loading={loadingStats}
        />
        <StatCard
          title="Pending Amount"
          amount={stats.pending.amt}
          count={stats.pending.count}
          icon={<Clock size={18} />}
          color="text-amber-400"
          bg="bg-amber-500/10"
          border="border-amber-500/20"
          loading={loadingStats}
        />
        <StatCard
          title="Cancelled / Lost"
          amount={stats.cancelled.amt}
          count={stats.cancelled.count}
          icon={<XCircle size={18} />}
          color="text-rose-400"
          bg="bg-rose-500/10"
          border="border-rose-500/20"
          loading={loadingStats}
        />
      </motion.div>

      {/* ── WIPE MODAL ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isWipeOpen && !isManager && (
          <motion.div
            key="modal-wipe"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden"
          >
            <div
              className="absolute inset-0"
              onClick={() => !wiping && setIsWipeOpen(false)}
            />
            <motion.div
              variants={modalVariants}
              className="bg-[#0A0A0C] border border-white/10 shadow-2xl rounded-2xl w-full max-w-[520px] relative z-10 overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-start gap-4">
                <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl shrink-0">
                  <AlertOctagon size={26} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-rose-500 tracking-tight">
                    Database Management
                  </h2>
                  <p className="text-zinc-400 text-sm mt-1 font-medium">
                    Export data securely or permanently erase all records.
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Backup section */}
                <div className="bg-[#121214] border border-white/5 rounded-xl overflow-hidden relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                  <div className="p-5 pl-6">
                    <div className="flex items-center gap-2 text-amber-500 mb-1.5">
                      <ShieldAlert size={16} />
                      <span className="text-xs font-bold tracking-wide">
                        Step 1: Secure Data Export
                      </span>
                    </div>
                    <p className="text-zinc-400 text-xs mb-4 font-medium">
                      Download a complete CSV backup of your records.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="month"
                        value={backupMonth}
                        onChange={(e) => setBackupMonth(e.target.value)}
                        style={{ colorScheme: "dark" }}
                        className="bg-[#0A0A0C] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none w-full sm:w-44 focus:border-amber-500/50 transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleBackup}
                        disabled={backupStatus.disabled}
                        className={`flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/5 rounded-lg px-4 py-2 text-sm font-bold transition-all ${backupStatus.disabled ? "text-zinc-600 cursor-not-allowed" : "text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30"}`}
                      >
                        <Download size={16} /> {backupStatus.label}
                      </button>
                    </div>
                    {backupStatus.timeLeft && (
                      <p className="text-[10px] text-amber-500/80 mt-3 font-mono tracking-widest uppercase">
                        {backupStatus.timeLeft}
                      </p>
                    )}
                  </div>
                </div>

                {/* Wipe section */}
                <div className="bg-[#121214] border border-white/5 rounded-xl overflow-hidden relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                  <div className="p-5 pl-6">
                    <div className="text-rose-500 mb-1.5">
                      <span className="text-xs font-bold tracking-wide">
                        Step 2: Confirm Deletion
                      </span>
                    </div>
                    <p className="text-zinc-400 text-xs mb-4 font-medium">
                      This action{" "}
                      <span className="text-rose-500 font-bold">CANNOT</span> be
                      undone. All data will be wiped.
                    </p>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Enter admin password…"
                        className="w-full bg-[#0A0A0C] border border-white/10 focus:border-rose-500/50 rounded-lg px-4 py-3 text-sm text-white outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-[#121214] border-t border-white/5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsWipeOpen(false);
                    setDeletePassword("");
                    setShowPassword(false);
                  }}
                  disabled={wiping}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleWipeAll}
                  disabled={wiping || !deletePassword}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {wiping && <RefreshCcw size={16} className="animate-spin" />}
                  {wiping ? "Wiping…" : "Permanently Wipe"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TABLE CARD ─────────────────────────────────────────────────────── */}
      <motion.div
        variants={blockVariants}
        className="bg-[#0A0A0C] rounded-2xl shadow-2xl border border-white/5 overflow-hidden print:shadow-none print:border-none print:bg-white"
      >
        {/* Toolbar */}
        <div className="flex flex-col gap-5 p-5 border-b border-white/5 bg-[#121214] print:hidden">
          <div className="w-full max-w-xl">
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchTerm.trim())
                  executeSearch(searchTerm);
              }}
              onSearch={() => {
                if (searchTerm.trim()) executeSearch(searchTerm);
              }}
              onClear={() => {
                setSearchTerm("");
                executeFilter();
              }}
              theme={theme}
            />
          </div>

          <div className="flex items-center flex-wrap gap-4 w-full">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 px-2 shrink-0">
              <Filter size={16} /> Filters
            </div>

            {/* Status */}
            <div className="relative shrink-0">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`appearance-none bg-[#0A0A0C] border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium text-white hover:border-white/20 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
              />
            </div>

            {/* Amount */}
            <div className="relative shrink-0">
              <select
                value={filterAmount}
                onChange={(e) => {
                  setFilterAmount(e.target.value);
                  if (e.target.value !== "All") {
                    setFilterDate("All");
                    setFilterExactDate(""); 
                  }
                }}
                className={`appearance-none bg-[#0A0A0C] border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium text-white hover:border-white/20 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
              >
                <option value="All">Any Amount</option>
                <option value="Under10k">Under ₹10,000</option>
                <option value="10k-50k">₹10k – ₹50k</option>
                <option value="Above50k">Above ₹50,000</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
              />
            </div>

            {/* Date range */}
            <div className="relative shrink-0">
              <select
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value);
                  if (e.target.value !== "All") {
                    setFilterAmount("All"); 
                    setFilterExactDate("");
                  }
                }}
                className={`appearance-none bg-[#0A0A0C] border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium text-white hover:border-white/20 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
              >
                <option value="All">Timeline: All</option>
                <option value="Last7Days">Last 7 Days</option>
                <option value="Last30Days">Last 30 Days</option>
                <option value="ThisMonth">This Month</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
              />
            </div>

            {/* Exact date */}
            <div className="relative flex items-center shrink-0">
              <Calendar
                size={16}
                className={`absolute left-4 pointer-events-none transition-colors ${filterExactDate ? theme.primaryText : "text-zinc-500"}`}
              />
              <input
                type="date"
                value={filterExactDate}
                onChange={(e) => {
                  setFilterExactDate(e.target.value);
                  if (e.target.value) {
                    setFilterDate("All");
                    setFilterAmount("All"); 
                  }
                }}
                style={{ colorScheme: "dark" }}
                className={`appearance-none bg-[#0A0A0C] border rounded-xl pl-11 pr-4 py-2.5 text-sm font-medium outline-none cursor-pointer transition-all ${theme.primaryFocus} ${filterExactDate ? `${theme.primaryBorder} text-white` : "border-white/10 text-zinc-300 hover:border-white/20"}`}
              />
            </div>

            {/* Apply */}
            <button
              type="button"
              disabled={activeFilterCount === 0 || searchTerm.length > 0}
              onClick={executeFilter}
              className={`h-10 px-5 rounded-xl flex items-center gap-2 font-bold text-sm shrink-0 transition-all ${
                activeFilterCount === 0 || searchTerm.length > 0
                  ? "bg-white/5 border border-white/5 text-zinc-600 cursor-not-allowed"
                  : `bg-gradient-to-r ${theme.gradientBg} text-white shadow-lg shadow-indigo-500/20 hover:brightness-110`
              }`}
            >
              <Filter size={16} /> Apply Filters
            </button>

            {/* Clear */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-10 px-4 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 hover:border-rose-500 font-bold text-sm shrink-0 flex items-center gap-1.5 transition-all"
              >
                <X size={16} /> Clear {activeFilterCount}
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div
          className={`overflow-x-auto custom-scrollbar transition-opacity duration-300 ${syncState === "SYNCING" ? "opacity-50 pointer-events-none" : ""}`}
        >
          <table className="w-full text-left min-w-max print:min-w-0">
            <thead className="bg-white/[0.02] text-zinc-400 text-[11px] uppercase tracking-[0.15em] font-semibold border-b border-white/10 print:bg-white print:text-black">
              <tr>
                <th className="py-5 px-6 whitespace-nowrap">
                  Invoice # & Date
                </th>
                <th className="py-5 px-5 whitespace-nowrap min-w-[250px]">
                  Client / Customer Party
                </th>
                <th className="py-5 px-5 whitespace-nowrap">Total Amount</th>
                <th className="py-5 px-5 whitespace-nowrap">Status</th>
                <th className="py-5 px-6 text-right whitespace-nowrap print:hidden">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="text-sm print:divide-gray-200 divide-y divide-white/5">
              {invoices.map((inv) => (
                <tr
                  key={inv._id}
                  id={inv._id}
                  className={`transition-colors duration-200 print:text-black ${
                    activeHighlight === inv._id
                      ? isTransport
                        ? "bg-cyan-500/10"
                        : "bg-indigo-500/10"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  <td className="py-4 px-6 align-middle">
                    <div
                      className={`font-mono font-bold whitespace-nowrap print:text-black ${theme.primaryText}`}
                    >
                      {String(inv.invoiceNumber ?? "").replace(/^INV-/i, "") ||
                        "N/A"}
                    </div>
                    <div className="text-zinc-500 text-xs mt-1 whitespace-nowrap font-medium print:text-gray-500">
                      {inv.date
                        ? new Date(inv.date).toLocaleDateString("en-GB")
                        : "Unknown"}
                    </div>
                  </td>

                  <td className="py-4 px-5 align-middle whitespace-nowrap">
                    <div className="font-semibold text-white whitespace-nowrap print:text-black tracking-wide">
                      {inv.client?.name ?? "Unknown"}
                    </div>
                    {Array.isArray(inv.editHistory) &&
                      inv.editHistory.length > 0 && (
                        <div
                          onClick={() => openHistory(inv)}
                          className="mt-2 inline-flex flex-col gap-0.5 cursor-pointer bg-white/5 hover:bg-white/10 border border-white/5 px-2 py-1.5 rounded-lg transition-all w-max print:hidden group/btn"
                        >
                          <div className="text-[10px] font-mono text-zinc-300 flex items-center gap-1.5 uppercase tracking-widest font-bold leading-none">
                            <History
                              size={12}
                              className="text-zinc-400 group-hover/btn:-rotate-12 transition-transform"
                            />
                            {inv.editHistory[inv.editHistory.length - 1]
                              ?.role ?? "ADMIN"}
                          </div>
                          <span className="text-zinc-500 text-[9px] ml-4 font-medium tracking-wide">
                            {fmtDateShort(
                              inv.editHistory[inv.editHistory.length - 1]?.at,
                            )}
                          </span>
                        </div>
                      )}
                  </td>

                  <td className="py-4 px-5 font-bold text-white font-mono text-[15px] align-middle whitespace-nowrap print:text-black tracking-wide">
                    ₹ {(Number(inv.grandTotal) || 0).toLocaleString("en-IN")}
                  </td>

                  <td className="py-4 px-5 align-middle whitespace-nowrap">
                    <select
                      value={inv.status}
                      onChange={(e) =>
                        handleStatusChange(inv._id, e.target.value)
                      }
                      className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border outline-none cursor-pointer transition-colors print:appearance-none print:border-none print:bg-transparent print:text-black ${
                        inv.status === "Paid"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : inv.status === "Cancelled"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}
                    >
                      <option
                        value="Pending"
                        className="bg-[#121214] text-amber-400"
                      >
                        Pending
                      </option>
                      <option
                        value="Paid"
                        className="bg-[#121214] text-emerald-400"
                      >
                        Paid
                      </option>
                      <option
                        value="Cancelled"
                        className="bg-[#121214] text-rose-400"
                      >
                        Cancelled
                      </option>
                    </select>
                  </td>

                  <td className="py-4 px-6 md:pr-6 align-middle print:hidden">
                    <div className="flex justify-end gap-2 items-center relative">
                      <Link
                        to={`${baseRoute}/view/${inv._id}`}
                        className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                        title="View PDF"
                      >
                        <Eye size={18} />
                      </Link>
                      <Link
                        to={`${baseRoute}/edit/${inv._id}`}
                        className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </Link>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            isManager
                              ? showWarning(inv._id)
                              : setDeleteModal({ isOpen: true, id: inv._id })
                          }
                          className={`p-2 rounded-xl transition-all ${isManager ? "text-zinc-600 bg-white/5 opacity-50 cursor-not-allowed" : "text-zinc-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10"}`}
                        >
                          <Trash2 size={18} />
                        </button>
                        <AnimatePresence>
                          {warningTip === inv._id && (
                            <motion.div
                              key={`tip-${inv._id}`}
                              initial={{ opacity: 0, y: 10, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="absolute bottom-full right-0 mb-2 z-[9999]"
                            >
                              <div className="bg-[#0A0A0C] border border-red-500/30 shadow-2xl text-red-400 text-[10px] uppercase tracking-wider font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 w-max">
                                🚫 Access Denied
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}

              {invoices.length === 0 && !loading && syncState !== "SYNCING" && (
                <tr>
                  <td
                    colSpan="5"
                    className="p-12 text-center text-zinc-500 text-sm font-medium print:text-black"
                  >
                    No invoices match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination footer */}
          {invoices.length > 0 && (
            <div className="flex flex-col items-center justify-center p-8 gap-4 border-t border-white/5 bg-[#0A0A0C] print:hidden">
              <div className="text-zinc-500 text-xs font-bold uppercase tracking-[0.15em]">
                Showing {invoices.length} records
              </div>
              {hasMore && invoices.length < MAX_DISPLAY && (
                <Button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant="outline"
                  className="rounded-full px-8 py-3 border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all font-semibold shadow-lg"
                >
                  {loadingMore ? (
                    <Loader2 size={18} className="animate-spin mr-2.5" />
                  ) : (
                    <ChevronDown size={18} className="mr-2.5" />
                  )}
                  {loadingMore ? "Loading…" : "Load Next 50 Invoices"}
                </Button>
              )}
              {invoices.length >= MAX_DISPLAY && (
                <div className="text-amber-400 text-xs font-bold bg-amber-500/10 px-5 py-3 rounded-xl border border-amber-500/20 text-center max-w-lg tracking-wide">
                  Display limit reached (2,000 records). Use search or filters
                  to find older records.
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── HISTORY MODAL ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {historyModal.isOpen && (
          <motion.div
            key="modal-history"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden"
          >
            <div
              className="absolute inset-0"
              onClick={() =>
                setHistoryModal({ isOpen: false, data: [], name: "" })
              }
            />
            <motion.div
              variants={modalVariants}
              className="bg-[#0A0A0C] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#121214]">
                <h3 className="text-xl font-bold text-white flex items-center gap-3 tracking-tight">
                  <History size={20} className={theme.primaryText} /> Log:{" "}
                  <span className="text-zinc-400 text-sm ml-1 truncate max-w-[200px]">
                    {historyModal.name}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setHistoryModal({ isOpen: false, data: [], name: "" })
                  }
                  className="text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all shrink-0"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 custom-scrollbar bg-[#0A0A0C]">
                {historyModal.data.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-6 font-medium">
                    No edit history available.
                  </p>
                ) : (
                  historyModal.data.map((edit, i) => (
                    <div
                      key={i}
                      className={`bg-[#121214] border ${i === 0 ? theme.primaryBorder : "border-white/5"} rounded-xl p-5 flex items-center justify-between relative overflow-hidden`}
                    >
                      {i === 0 && (
                        <div
                          className={`absolute left-0 top-0 w-1 h-full ${theme.primaryBg}`}
                        />
                      )}
                      <div className="flex items-center gap-4 pl-1">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl uppercase ${i === 0 ? `${theme.primaryBg} ${theme.primaryText}` : "bg-white/5 text-zinc-400 border border-white/5"}`}
                        >
                          {(edit.role ?? "A").charAt(0)}
                        </div>
                        <div>
                          <div
                            className={`font-bold uppercase tracking-widest text-[13px] ${i === 0 ? "text-white" : "text-zinc-300"}`}
                          >
                            {edit.role ?? "Admin"}
                          </div>
                          <div className="text-zinc-500 text-[11px] font-mono lowercase mt-0.5">
                            {edit.by}
                          </div>
                          <div
                            className={`text-[11px] font-mono mt-1.5 tracking-wider font-semibold ${i === 0 ? theme.primaryText : "text-zinc-400"}`}
                          >
                            {fmtDateLong(edit.at)}
                          </div>
                        </div>
                      </div>
                      {i === 0 && (
                        <div
                          className={`${theme.primaryBg} border ${theme.primaryBorder} ${theme.primaryText} text-[10px] px-3.5 py-1.5 rounded-lg font-bold tracking-[0.15em] uppercase shrink-0 shadow-sm`}
                        >
                          LATEST
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRM ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Delete Invoice?"
        message="This action cannot be undone. The invoice will be permanently removed."
        confirmText="Delete"
        isDestructive
      />
    </motion.div>
  );
};

export default InvoiceList;