import React, {
  useState,
  useEffect,
  useMemo,
  lazy,
  Suspense,
  useCallback,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import electricService from "../../services/electricService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Zap,
  Activity,
  Save,
  Trash2,
  CheckCircle,
  AlertCircle,
  Edit2,
  X,
  Download,
  History,
  AlertOctagon,
  ShieldAlert,
  Eye,
  EyeOff,
  Clock,
  Search,
  Filter,
  Calendar,
  FileText,
  RefreshCcw,
  CheckCircle2,
  Sigma,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const BarChart = lazy(() => import("../../components/charts/BarChart"));
const ChartSkeleton = () => (
  <div className="w-full h-full bg-zinc-800/30 animate-pulse rounded-2xl border border-zinc-800/60"></div>
);

const MAX_RECORDS_LIMIT = 5000;

const getCurrentMonth = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
};

const getPreviousMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
};

const BillTableRow = React.memo(
  ({
    bill,
    theme,
    isTransport,
    activeHighlight,
    onEdit,
    onDeleteClick,
    onHistoryClick,
  }) => {
    const hasEdits = bill.editHistory && bill.editHistory.length > 0;
    return (
      <tr
        id={bill._id}
        className={`transition-all duration-1000 ease-out group border-l-4 ${activeHighlight === bill._id ? `${isTransport ? "bg-cyan-500/[0.08] shadow-[inset_0_0_20px_rgba(6,182,212,0.05)] border-cyan-500" : "bg-indigo-500/[0.08] shadow-[inset_0_0_20px_rgba(99,102,241,0.05)] border-indigo-500"}` : "border-transparent hover:bg-zinc-800/30"}`}
      >
        <td className="p-5 pl-6 align-middle">
          <div
            className={`${theme.primaryText} font-mono font-bold whitespace-nowrap mb-1 tracking-wider`}
          >
            {bill.caNumber || "N/A"}
          </div>
          <div className="text-zinc-300 font-bold whitespace-nowrap">
            {bill.month}
          </div>
          {hasEdits && (
            <div
              onClick={() => onHistoryClick(bill)}
              className="mt-2.5 flex flex-col gap-0.5 cursor-pointer bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 p-1.5 rounded-lg transition-all w-max whitespace-nowrap group/btn"
            >
              <div className="text-[10px] font-mono text-zinc-300 flex items-center gap-1 uppercase tracking-widest font-bold leading-none">
                <History
                  size={10}
                  className="text-zinc-400 group-hover/btn:-rotate-12 transition-transform"
                />{" "}
                {bill.editHistory[bill.editHistory.length - 1].role || "ADMIN"}
              </div>
            </div>
          )}
        </td>
        <td className="p-5 align-middle text-zinc-400 font-mono text-xs">
          {bill.billDate
            ? new Date(bill.billDate).toLocaleDateString("en-GB")
            : "-"}
        </td>
        <td className="p-5 align-middle text-right font-mono text-zinc-300">
          ₹{Number(bill.billAmount || 0).toLocaleString("en-IN")}
        </td>
        <td className="p-5 align-middle text-right font-mono text-rose-400/80">
          ₹{Number(bill.fineAmount || 0).toLocaleString("en-IN")}
        </td>
        <td className="p-5 text-right font-bold text-white align-middle whitespace-nowrap font-mono text-lg tracking-tight">
          ₹{Number(bill.totalAmount || 0).toLocaleString("en-IN")}
        </td>
        <td className="p-5 text-center align-middle">
          <span
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border inline-flex items-center gap-1.5 ${bill.status === "Paid" ? `${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}` : bill.status === "Overdue" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"}`}
          >
            {bill.status === "Paid" ? (
              <CheckCircle size={12} />
            ) : (
              <AlertCircle size={12} />
            )}{" "}
            {bill.status}
          </span>
        </td>
        <td className="p-5 pr-6 align-middle">
          <div className="flex justify-end gap-2 relative">
            <button
              onClick={() => onEdit(bill)}
              className={`p-2 text-zinc-500 transition-all rounded-xl ${theme.primaryHoverBorder} hover:${theme.primaryText} hover:bg-zinc-800/50`}
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={(e) => onDeleteClick(bill, e.currentTarget)}
              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  },
);

const ElectricBill = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("All");

  const [localSearch, setLocalSearch] = useState("");
  const [localMonth, setLocalMonth] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    amountFilter: "Any Amount",
    dateFilter: "All",
    exactMonth: "",
  });

  const [bills, setBills] = useState(
    () =>
      electricService.getCachedLogs({ status: activeTab, ...filters }) || [],
  );
  const [stats, setStats] = useState(
    () =>
      electricService.getCachedStats() || { paid: 0, pending: 0, overdue: 0 },
  );
  const [dynamicFilterStats, setDynamicFilterStats] = useState(null);

  const [loading, setLoading] = useState(
    () =>
      !(
        electricService.getCachedStats() &&
        electricService.getCachedLogs({ status: activeTab, ...filters })
      ),
  );
  const [syncStatus, setSyncStatus] = useState(() =>
    electricService.getCachedLogs({ status: activeTab, ...filters })
      ? "up-to-date"
      : "syncing",
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(bills.length);

  const searchParams = new URLSearchParams(location.search);
  const urlHighlightId = searchParams.get("highlight");
  const [activeHighlight, setActiveHighlight] = useState(null);

  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const theme = useMemo(
    () => ({
      primaryText: isTransport ? "text-blue-400" : "text-indigo-400",
      primaryBg: isTransport ? "bg-blue-500/10" : "bg-indigo-500/10",
      primaryBorder: isTransport
        ? "border-blue-500/20"
        : "border-indigo-500/20",
      primaryHoverBorder: isTransport
        ? "hover:border-blue-500/30"
        : "hover:border-indigo-500/30",
      primaryTabBg: isTransport ? "bg-blue-600" : "bg-indigo-600",
      primaryFocus: isTransport
        ? "focus:border-blue-500/50 focus:ring-blue-500/50"
        : "focus:border-indigo-500/50 focus:ring-indigo-500/50",
      glowOrb: isTransport ? "bg-blue-500/5" : "bg-indigo-500/5",
      chartPaid: isTransport ? "#3b82f6" : "#6366f1",
      chartPending: isTransport ? "#06b6d4" : "#3b82f6",
    }),
    [isTransport],
  );

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [editId, setEditId] = useState(null);
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

  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";

  const [formData, setFormData] = useState({
    caNumber: "",
    month: getCurrentMonth(),
    billDate: new Date().toISOString().split("T")[0],
    billAmount: "",
    fineAmount: "",
    status: "Pending",
  });
  const predictedAmount =
    (parseFloat(formData.billAmount) || 0) +
    (parseFloat(formData.fineAmount) || 0);

  const [backupMonth, setBackupMonth] = useState(getPreviousMonth());
  const [showBackupWarning, setShowBackupWarning] = useState(null);

  const applySearch = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      search: localSearch,
      amountFilter: "Any Amount",
      dateFilter: "All",
    }));
  }, [localSearch]);

  const applyMonthFilter = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      exactMonth: localMonth,
      dateFilter: "All",
    }));
  }, [localMonth]);

  useEffect(() => {
    const checkSync = () => {
      const globalLastUpdate = parseInt(
        localStorage.getItem("electric_last_update") || "0",
        10,
      );
      if (globalLastUpdate > electricService.getLastFetchTime())
        setSyncStatus("required");
    };
    const interval = setInterval(checkSync, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkBackupNeeded = async () => {
      const prevMonth = getPreviousMonth();
      if (!localStorage.getItem(`backup_electric_${prevMonth}`)) {
        try {
          const res = await electricService.getBackupChunk(prevMonth, 1);
          if (res.data.length > 0) setShowBackupWarning(prevMonth);
        } catch (error) {
          console.error("Failed backup check:", error);
        }
      }
    };
    checkBackupNeeded();
  }, []);

  const fetchBills = useCallback(
    async (isLoadMore = false, forceSync = false) => {
      const isCached = !!electricService.getCachedLogs({
        status: activeTab,
        ...filters,
      });

      if (isLoadMore) setLoadingMore(true);
      else if (forceSync) setSyncStatus("syncing");

      if (!isCached && !isLoadMore && !forceSync) {
        if (bills.length === 0) setLoading(true);
        else setIsRefreshing(true);
      }

      try {
        const isFiltered =
          activeTab !== "All" ||
          filters.search ||
          filters.exactMonth ||
          filters.amountFilter !== "Any Amount" ||
          filters.dateFilter !== "All";

        const listPromise = electricService.getBills(
          { status: activeTab, ...filters },
          isLoadMore ? lastDoc : null,
          50,
          forceSync,
        );

        let promises = [listPromise];

        if (!isLoadMore) {
          promises.push(electricService.getStats(forceSync));
          if (isFiltered) {
            promises.push(
              electricService.getDynamicViewStats({
                status: activeTab,
                ...filters,
              }),
            );
          }
        }

        const results = await Promise.all(promises);
        const response = results[0];

        if (!isLoadMore) {
          setStats(results[1]);
          if (isFiltered) setDynamicFilterStats(results[2] || null);
          else setDynamicFilterStats(null);
        }

        if (isLoadMore) {
          setBills((prev) => [...prev, ...(response.data || [])]);
          setLoadedCount((prev) => prev + (response.data?.length || 0));
        } else {
          setBills(response.data || []);
          setLoadedCount(response.data?.length || 0);
        }

        setLastDoc(response.lastVisible || null);
        setHasMore(response.data && response.data.length === 50);
        setSyncStatus("up-to-date");
      } catch (error) {
        toast.error("Failed to load data");
        setSyncStatus("error");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
        setLoadingMore(false);
      }
    },
    [activeTab, filters, lastDoc, bills.length],
  );

  useEffect(() => {
    fetchBills(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    filters.search,
    filters.exactMonth,
    filters.amountFilter,
    filters.dateFilter,
  ]);

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

  const activeFiltersCount =
    [filters.amountFilter, filters.dateFilter].filter(
      (f) => f !== "Any Amount" && f !== "All",
    ).length + (filters.exactMonth ? 1 : 0);

  const chartData = useMemo(() => {
    const allMonths = bills
      .map((b) => b.month)
      .filter((m) => m && m.trim() !== "");
    const uniqueMonths = [...new Set(allMonths)]
      .sort((a, b) => new Date(a) - new Date(b))
      .slice(-6);
    const formatMonth = (yyyy_mm) => {
      if (!yyyy_mm) return "Unknown";
      const [year, month] = yyyy_mm.split("-");
      return new Date(year, month - 1).toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      });
    };
    const getStatusSum = (month, status) =>
      bills
        .filter((b) => b.month === month && b.status === status)
        .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const formattedLabels =
      uniqueMonths.length > 0 ? uniqueMonths.map(formatMonth) : ["No Data"];
    return {
      labels: formattedLabels,
      datasets: [
        {
          label: "Paid",
          data:
            uniqueMonths.length > 0
              ? uniqueMonths.map((m) => getStatusSum(m, "Paid"))
              : [0],
          backgroundColor: theme.chartPaid,
          borderRadius: 4,
        },
        {
          label: "Pending",
          data:
            uniqueMonths.length > 0
              ? uniqueMonths.map((m) => getStatusSum(m, "Pending"))
              : [0],
          backgroundColor: theme.chartPending,
          borderRadius: 4,
        },
        {
          label: "Overdue",
          data:
            uniqueMonths.length > 0
              ? uniqueMonths.map((m) => getStatusSum(m, "Overdue"))
              : [0],
          backgroundColor: "#e11d48",
          borderRadius: 4,
        },
      ],
    };
  }, [bills, theme]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: "#a1a1aa",
            usePointStyle: true,
            font: { family: "monospace", size: 10 },
          },
        },
      },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: {
          stacked: true,
          grid: { color: "rgba(39, 39, 42, 0.3)", borderDash: [5, 5] },
        },
      },
    }),
    [],
  );

  const handleFullBackup = async (monthToFetch = backupMonth) => {
    try {
      if (!monthToFetch) return toast.error("Please select a month to backup.");
      const monthlyKey = `backup_count_${monthToFetch}_electric`;
      const downloadedCount = Number(localStorage.getItem(monthlyKey) || 0);
      if (downloadedCount >= 10000)
        return toast.error(
          "10,000 daily download limit reached. Try again tomorrow.",
        );

      toast.info(`Fetching secure backup chunk...`);
      const res = await electricService.getBackupChunk(
        monthToFetch,
        10000 - downloadedCount,
      );
      if (res.data.length === 0)
        return toast.info(`No more records found for ${monthToFetch}.`);

      const headers = [
        "CA Number",
        "Month",
        "Bill Date",
        "Bill Amount",
        "Fine Amount",
        "Total Amount",
        "Status",
      ];
      const rows = res.data.map(
        (bill) =>
          `"${bill.caNumber || "-"}","${bill.month || "-"}",${bill.billDate ? `\t${new Date(bill.billDate).toLocaleDateString("en-GB")}` : "-"},${bill.billAmount || 0},${bill.fineAmount || 0},${bill.totalAmount || 0},"${bill.status || "-"}"`,
      );
      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `Backup_Electric_${monthToFetch}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      localStorage.setItem(monthlyKey, downloadedCount + res.data.length);
      localStorage.setItem(
        `backup_last_doc_${monthToFetch}_electric`,
        res.lastDocId,
      );

      if (res.data.length === 10000 - downloadedCount)
        toast.warning("10,000 Limit reached. Download next batch tomorrow.");
      else {
        toast.success(`Downloaded ${res.data.length} records securely!`);
        localStorage.setItem(`backup_electric_${monthToFetch}`, "true");
        if (showBackupWarning === monthToFetch) setShowBackupWarning(null);
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
      const currentUser = admin?.data || admin || {};
      const response = await electricService.deleteAllBills({
        password: deletePassword,
        email: currentUser.email,
        user: currentUser,
      });
      if (response.isPartial) toast.warning(response.message);
      else toast.success(response.message);
      setIsDeleteAllOpen(false);
      setDeletePassword("");
      setShowPassword(false);
      fetchBills(false, true);
    } catch (error) {
      toast.error(error.message || "Incorrect Password.");
    } finally {
      setWiping(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const currentUser = admin?.data || admin || {};
      if (editId) {
        const oldBill = bills.find((b) => b._id === editId);
        const oldAmt = Number(oldBill?.totalAmount) || 0;
        const newAmt = predictedAmount;

        await electricService.updateBill(editId, formData, currentUser);
        if (oldBill) {
          setStats((prev) => ({
            ...prev,
            [oldBill.status.toLowerCase()]:
              prev[oldBill.status.toLowerCase()] - oldAmt,
            [formData.status.toLowerCase()]:
              prev[formData.status.toLowerCase()] + newAmt,
          }));
        }
        setBills((prev) =>
          prev.map((b) =>
            b._id === editId
              ? {
                  ...b,
                  ...formData,
                  totalAmount: newAmt,
                  billAmount: Number(formData.billAmount),
                  fineAmount: Number(formData.fineAmount),
                }
              : b,
          ),
        );
        toast.success("Bill updated successfully!");
      } else {
        const response = await electricService.addBill(formData, currentUser);
        const newBill = response.data;
        setStats((prev) => ({
          ...prev,
          [newBill.status.toLowerCase()]:
            prev[newBill.status.toLowerCase()] + newBill.totalAmount,
        }));
        if (activeTab === "All" || activeTab === newBill.status)
          setBills((prev) => [newBill, ...prev].slice(0, 50));
        toast.success("New bill recorded!");
      }
      resetForm();
    } catch (error) {
      toast.error("Failed to save bill");
      fetchBills(false, true);
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      const currentUser = admin?.data || admin || {};
      const billToDelete = bills.find((b) => b._id === deleteModal.id);
      await electricService.deleteBill(deleteModal.id, currentUser);
      if (billToDelete) {
        const amt = Number(billToDelete.totalAmount) || 0;
        setStats((prev) => ({
          ...prev,
          [billToDelete.status.toLowerCase()]:
            prev[billToDelete.status.toLowerCase()] - amt,
        }));
      }
      setBills((prev) => prev.filter((b) => b._id !== deleteModal.id));
      toast.info("Bill deleted successfully");
    } catch (error) {
      toast.error(error.message || "Failed to delete bill");
      fetchBills(false, true);
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const handleEdit = useCallback((bill) => {
    setEditId(bill._id);
    setFormData({
      caNumber: bill.caNumber || "",
      month: bill.month || getCurrentMonth(),
      billDate: bill.billDate
        ? new Date(bill.billDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      billAmount: bill.billAmount || "",
      fineAmount: bill.fineAmount || "",
      status: bill.status || "Pending",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleDeleteClick = useCallback(
    (bill) => {
      if (isManager) {
        setWarningTooltip(bill._id);
        setTimeout(() => setWarningTooltip(null), 2500);
      } else {
        setDeleteModal({ isOpen: true, id: bill._id });
      }
    },
    [isManager],
  );

  const openHistory = useCallback((bill) => {
    setHistoryModal({
      isOpen: true,
      data: Array.isArray(bill.editHistory)
        ? [...bill.editHistory].reverse()
        : [],
      itemName: `CA: ${bill.caNumber || "N/A"}`,
    });
  }, []);

  const resetForm = () => {
    setEditId(null);
    setFormData({
      caNumber: "",
      month: getCurrentMonth(),
      billDate: new Date().toISOString().split("T")[0],
      billAmount: "",
      fineAmount: "",
      status: "Pending",
    });
  };
  const handleCAChange = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val.length <= 12) setFormData({ ...formData, caNumber: val });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <div className="w-full h-full space-y-8 pb-10 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-20 w-full"
      >
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${theme.primaryBg} ${theme.primaryBorder}`}
            >
              <Zap className={theme.primaryText} size={28} />
            </div>{" "}
            Electricity Metrics
          </h1>
          <p className="text-zinc-400 mt-2 text-sm font-medium">
            Monitor factory power consumption & billing history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Button
            variant="ghost"
            onClick={() => fetchBills(false, true)}
            disabled={syncStatus === "up-to-date" || syncStatus === "syncing"}
            className={`flex items-center gap-2 h-[44px] px-4 w-full sm:w-auto justify-center rounded-xl font-bold text-xs tracking-wider transition-all duration-500 ${syncStatus === "up-to-date" ? "opacity-40 pointer-events-none text-emerald-500 bg-emerald-500/5 border border-emerald-500/10" : "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 animate-pulse"}`}
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
              : syncStatus === "syncing"
                ? "Syncing..."
                : syncStatus === "error"
                  ? "DB Error"
                  : "Sync Required"}
          </Button>

          <div className="relative">
            <Button
              variant="module"
              onClick={() =>
                isManager
                  ? (setWarningTooltip("wipe-all"),
                    setTimeout(() => setWarningTooltip(null), 2500))
                  : setIsDeleteAllOpen(true)
              }
              className={`h-11 px-5 border-rose-500/40 text-rose-400 bg-rose-950/30 hover:bg-rose-900/40 hover:border-rose-400/60 ${isManager ? "opacity-50 !cursor-not-allowed" : ""}`}
            >
              <AlertOctagon size={16} /> Wipe Data
            </Button>
            {warningTooltip === "wipe-all" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-full mt-2 right-0 md:left-1/2 md:-translate-x-1/2 z-[100]"
              >
                <div className="bg-[#09090B] border border-red-500/30 text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                  🚫 Admin Access Required
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {showBackupWarning && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
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
                You haven't downloaded the backup for{" "}
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

      {stats.overdue > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start sm:items-center gap-4 shadow-[0_0_20px_rgba(225,29,72,0.1)] w-full"
        >
          <div className="bg-rose-500/20 p-2.5 rounded-full text-rose-500 animate-pulse">
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 className="text-rose-400 font-bold text-sm tracking-wide">
              ⚠️ Payment Action Required
            </h4>
            <p className="text-rose-100/60 text-xs mt-1">
              You have overdue bills amounting to{" "}
              <strong className="text-rose-300 font-mono">
                ₹{stats.overdue.toLocaleString("en-IN")}
              </strong>
              . Please clear them immediately.
            </p>
          </div>
        </motion.div>
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full"
      >
        <motion.div
          variants={itemVariants}
          className={`bg-[#09090B] border border-zinc-800/60 p-6 rounded-2xl relative overflow-hidden group ${theme.primaryHoverBorder} transition-all`}
        >
          <div
            className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity ${theme.primaryText}`}
          >
            <CheckCircle size={100} />
          </div>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
            Total Paid
          </p>
          <h3
            className={`text-3xl font-black font-mono relative z-10 ${theme.primaryText}`}
          >
            ₹ {stats.paid.toLocaleString("en-IN")}
          </h3>
        </motion.div>
        <motion.div
          variants={itemVariants}
          className="bg-[#09090B] border border-zinc-800/60 p-6 rounded-2xl relative overflow-hidden group hover:border-cyan-500/30 transition-all"
        >
          <div className="absolute -right-4 -bottom-4 opacity-5 text-cyan-500 group-hover:opacity-10 transition-opacity">
            <Clock size={100} />
          </div>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
            Total Pending
          </p>
          <h3 className="text-3xl font-black text-cyan-400 font-mono relative z-10">
            ₹ {stats.pending.toLocaleString("en-IN")}
          </h3>
        </motion.div>
        <motion.div
          variants={itemVariants}
          className="bg-[#09090B] border border-zinc-800/60 p-6 rounded-2xl relative overflow-hidden group hover:border-rose-500/30 transition-all"
        >
          <div className="absolute -right-4 -bottom-4 opacity-5 text-rose-500 group-hover:opacity-10 transition-opacity">
            <AlertCircle size={100} />
          </div>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
            Total Overdue
          </p>
          <h3 className="text-3xl font-black text-rose-400 font-mono relative z-10">
            ₹ {stats.overdue.toLocaleString("en-IN")}
          </h3>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:items-stretch w-full"
      >
        <div className="lg:col-span-1 flex flex-col h-full w-full">
          <div
            className={`flex-1 flex flex-col justify-between w-full rounded-2xl shadow-lg border p-6 md:p-8 relative overflow-hidden transition-colors ${editId ? `bg-zinc-900/30 ${theme.primaryBorder}` : "bg-[#09090B] border-zinc-800/60"}`}
          >
            <div
              className={`absolute -top-10 -right-10 w-40 h-40 blur-[60px] rounded-full pointer-events-none ${theme.glowOrb}`}
            />
            <div className="flex items-center gap-3 mb-8 relative z-10 shrink-0">
              <div
                className={`p-3 rounded-xl border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
              >
                {editId ? <Edit2 size={24} /> : <Zap size={24} />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {editId ? "Update Bill" : "Record Bill"}
                </h3>
                <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mt-1">
                  Monthly Log
                </p>
              </div>
            </div>
            <form
              onSubmit={handleSubmit}
              className="space-y-6 relative z-10 flex-1 flex flex-col w-full"
            >
              <div className="space-y-5 flex-1">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                    Customer A/C No.
                  </label>
                  <input
                    type="text"
                    placeholder="12-digit CA Number"
                    maxLength={12}
                    value={formData.caNumber}
                    onChange={handleCAChange}
                    required
                    className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none transition-all font-mono tracking-wider placeholder:text-zinc-600 ${theme.primaryFocus}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                      Bill Month
                    </label>
                    <input
                      type="month"
                      value={formData.month}
                      onChange={(e) =>
                        setFormData({ ...formData, month: e.target.value })
                      }
                      required
                      className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none transition-all cursor-pointer ${theme.primaryFocus}`}
                      style={{ colorScheme: "dark" }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                      Bill Date
                    </label>
                    <input
                      type="date"
                      value={formData.billDate}
                      onChange={(e) =>
                        setFormData({ ...formData, billDate: e.target.value })
                      }
                      required
                      className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none transition-all cursor-pointer ${theme.primaryFocus}`}
                      style={{ colorScheme: "dark" }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.billAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, billAmount: e.target.value })
                      }
                      required
                      className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold outline-none transition-all placeholder:text-zinc-600 ${theme.primaryFocus}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                      Fine Amount
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.fineAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, fineAmount: e.target.value })
                      }
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-rose-400 font-bold outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all placeholder:text-zinc-600"
                    />
                  </div>
                </div>
                <div className="p-5 bg-zinc-900/30 rounded-2xl border border-zinc-800 space-y-4 mt-2 w-full">
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      Payment Status
                    </span>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className={`text-xs rounded-lg px-3 py-1.5 outline-none border font-bold cursor-pointer appearance-none transition-all ${formData.status === "Paid" ? `${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}` : formData.status === "Overdue" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"}`}
                    >
                      <option
                        className="bg-[#09090B] text-cyan-400"
                        value="Pending"
                      >
                        Pending
                      </option>
                      <option
                        className={`bg-[#09090B] ${theme.primaryText}`}
                        value="Paid"
                      >
                        Paid
                      </option>
                      <option
                        className="bg-[#09090B] text-rose-400"
                        value="Overdue"
                      >
                        Overdue
                      </option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Total Payable
                    </span>
                    <span className="text-2xl font-black text-white font-mono">
                      <span className="text-sm mr-1 font-bold text-zinc-400">
                        ₹
                      </span>
                      {predictedAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-6 mt-auto border-t border-zinc-800/60 w-full shrink-0">
                {editId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-transparent border border-zinc-800 text-zinc-400 hover:text-white transition-all hover:bg-zinc-800/50 flex items-center justify-center gap-2"
                  >
                    <X size={16} /> Cancel
                  </button>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving}
                  className="flex-1 rounded-xl text-xs uppercase tracking-widest"
                >
                  {saving ? (
                    <RefreshCcw size={16} className="animate-spin mr-2" />
                  ) : (
                    <Save size={16} className="mr-2" />
                  )}
                  {editId ? "Update Bill" : "Save Bill"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col h-full w-full">
          <div
            className={`flex-1 w-full p-6 md:p-8 rounded-2xl bg-[#09090B] border border-zinc-800/60 shadow-lg relative flex flex-col min-h-[450px] overflow-hidden ${theme.primaryHoverBorder} transition-all duration-500`}
          >
            <div
              className={`absolute top-0 right-0 p-8 w-64 h-64 blur-[80px] rounded-full pointer-events-none ${theme.glowOrb}`}
            />
            <div className="flex justify-between items-center mb-6 relative z-10 w-full shrink-0">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <div className={`p-2 rounded-lg ${theme.primaryBg}`}>
                  <Activity size={18} className={theme.primaryText} />
                </div>{" "}
                Trend
              </h3>
              <span className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-widest bg-zinc-800/30 px-3 py-1.5 rounded-lg border border-zinc-800/80">
                Last 6 Months
              </span>
            </div>
            <div className="relative flex-1 w-full min-h-0 z-10">
              <div className="absolute inset-0 w-full h-full [&>div]:!h-full [&>div]:!w-full [&_canvas]:!h-full [&_canvas]:!w-full">
                {bills.length > 0 ? (
                  <Suspense fallback={<ChartSkeleton />}>
                    <BarChart data={chartData} options={chartOptions} />
                  </Suspense>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-500 text-sm italic border border-dashed border-zinc-800/60 rounded-2xl">
                    No data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="w-full"
      >
        <div className="bg-[#09090B] rounded-2xl shadow-xl border border-zinc-800/60 overflow-hidden flex flex-col w-full relative">
          {loading && (
            <div className="absolute inset-0 bg-[#09090B]/80 z-50 flex items-center justify-center backdrop-blur-[2px]">
              <Loader />
            </div>
          )}

          <div className="p-6 md:p-8 border-b border-zinc-800/60 bg-[#09090B] flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5">
            <div className="bg-[#09090b] border border-zinc-800/80 rounded-full p-1 flex items-center h-10 w-full sm:w-auto overflow-x-auto shadow-sm shrink-0 hide-scrollbar">
              {[
                { id: "All", label: "All Bills", icon: FileText },
                { id: "Paid", label: "Paid", icon: CheckCircle },
                { id: "Pending", label: "Pending", icon: Clock },
                { id: "Overdue", label: "Overdue", icon: AlertCircle },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-5 h-full text-xs font-bold rounded-full transition-all tracking-wide whitespace-nowrap shrink-0 flex-1 sm:flex-none flex items-center justify-center gap-2 ${activeTab === tab.id ? "text-white" : "text-zinc-400 hover:text-white"}`}
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="elecTabIndicator"
                        className={`absolute inset-0 rounded-full ${theme.primaryTabBg} shadow-sm z-0`}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Icon size={14} /> {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-end">
              <div
                className={`relative flex-1 sm:w-[350px] group flex items-center bg-[#09090b] border border-zinc-800/80 rounded-full transition-all h-10 overflow-hidden ${theme.primaryFocus}`}
              >
                <Search
                  size={16}
                  className={`absolute left-4 transition-colors duration-300 ${localSearch ? theme.primaryText : "text-zinc-500"}`}
                />
                <input
                  type="text"
                  placeholder="Search CA Number (Press Enter)..."
                  className={`w-full bg-transparent pl-11 ${localSearch ? "pr-[115px]" : "pr-[90px]"} h-full text-sm text-zinc-100 outline-none placeholder:text-zinc-600 transition-all`}
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applySearch()}
                />
                <div className="absolute right-1 flex items-center gap-0.5">
                  <AnimatePresence>
                    {localSearch && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => {
                          setLocalSearch("");
                          if (filters.search) {
                            setFilters((prev) => ({
                              ...prev,
                              search: "",
                              amountFilter: "Any Amount",
                              dateFilter: "All",
                            }));
                          }
                        }}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-all"
                      >
                        <X size={14} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                  <button
                    onClick={applySearch}
                    disabled={loading || localSearch === filters.search}
                    className="flex items-center gap-1.5 h-8 px-4 text-[10px] font-bold tracking-widest uppercase rounded-full transition-all text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <Search size={12} /> Search
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-zinc-800/60 bg-zinc-900/20 flex flex-wrap items-center gap-4 relative z-20 w-full">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 px-3 py-1 border-r border-zinc-800 mr-1">
              <Filter size={16} /> Filters{" "}
              {activeFiltersCount > 0 && (
                <span
                  className={`ml-1 px-1.5 rounded border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
                >
                  {activeFiltersCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative group flex items-center">
                <div
                  className={`absolute left-3 flex items-center justify-center pointer-events-none transition-colors ${localMonth ? theme.primaryText : "text-zinc-500"}`}
                >
                  <Calendar size={14} />
                </div>
                <input
                  type="month"
                  value={localMonth}
                  onChange={(e) => setLocalMonth(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className={`appearance-none bg-[#09090B] border rounded-full pl-9 pr-4 py-1.5 text-xs font-medium outline-none cursor-pointer transition-all ${localMonth ? `text-zinc-100 ${theme.primaryBorder}` : "text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300"}`}
                />
              </div>

              <AnimatePresence>
                {localMonth !== filters.exactMonth && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: -10 }}
                  >
                    <Button
                      onClick={applyMonthFilter}
                      className={`h-8 px-4 rounded-full text-[10px] uppercase tracking-widest font-bold ${theme.primaryBg} ${theme.primaryText}`}
                    >
                      Apply
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={() => {
                  setLocalSearch("");
                  setLocalMonth("");
                  setFilters({
                    search: "",
                    amountFilter: "Any Amount",
                    dateFilter: "All",
                    exactMonth: "",
                  });
                }}
                className="text-xs font-bold text-zinc-500 hover:text-white underline ml-auto md:ml-2 transition-colors flex items-center gap-1.5"
              >
                <X size={14} /> Clear All
              </button>
            )}
          </div>

          <AnimatePresence>
            {dynamicFilterStats &&
              (activeFiltersCount > 0 || filters.search) &&
              !loading && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-[#111116] border-b border-zinc-800/60 overflow-hidden"
                >
                  <div className="p-4 flex flex-wrap gap-6 items-center">
                    <div className="flex items-center gap-2 border-r border-zinc-800/80 pr-6">
                      <Sigma size={16} className={theme.primaryText} />
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        Active Filter Data
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-xs">
                        Total Records:
                      </span>
                      <span className="text-white font-mono font-bold text-sm">
                        {dynamicFilterStats.count}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-xs">
                        Filtered Revenue:
                      </span>
                      <span
                        className={`font-mono font-bold text-sm ${theme.primaryText}`}
                      >
                        ₹
                        {Number(dynamicFilterStats.sum).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-xs">
                        Average Bill:
                      </span>
                      <span className="text-white font-mono font-bold text-sm">
                        ₹
                        {Number(dynamicFilterStats.avg).toLocaleString(
                          "en-IN",
                          { maximumFractionDigits: 0 },
                        )}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
          </AnimatePresence>

          <div className="relative w-full min-h-[300px]">
            {isRefreshing && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-[#09090B]/30 backdrop-blur-[1px] rounded-b-2xl"
              >
                <div className="bg-zinc-900/90 border border-zinc-800 shadow-2xl px-5 py-3 rounded-2xl flex items-center gap-3">
                  <RefreshCcw
                    size={18}
                    className={`animate-spin ${theme.primaryText}`}
                  />
                  <span className="text-zinc-200 text-xs font-bold uppercase tracking-widest">
                    Updating...
                  </span>
                </div>
              </motion.div>
            )}

            <div
              className={`overflow-x-auto w-full custom-scrollbar pb-4 transition-all duration-300 ${isRefreshing && !loading ? "opacity-30 pointer-events-none" : "opacity-100"}`}
            >
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-[#09090B] text-zinc-500 text-[10px] uppercase font-bold tracking-widest sticky top-0 z-10 border-b border-zinc-800/60">
                  <tr>
                    <th className="py-4 px-6">CA No. & Month</th>
                    <th className="py-4 px-5">Bill Date</th>
                    <th className="py-4 px-5 text-right">Bill Amt</th>
                    <th className="py-4 px-5 text-right">Fine</th>
                    <th className="py-4 px-5 text-right">Total Amount</th>
                    <th className="py-4 px-5 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-sm">
                  {bills.map((bill) => (
                    <BillTableRow
                      key={bill._id}
                      bill={bill}
                      theme={theme}
                      isTransport={isTransport}
                      activeHighlight={activeHighlight}
                      onEdit={handleEdit}
                      onDeleteClick={handleDeleteClick}
                      onHistoryClick={openHistory}
                    />
                  ))}
                </tbody>
              </table>

              {hasMore &&
                loadedCount < MAX_RECORDS_LIMIT &&
                bills.length > 0 && (
                  <div className="flex justify-center p-6 border-t border-zinc-800/60">
                    <Button
                      onClick={() => fetchBills(true)}
                      disabled={loadingMore}
                      variant="outline"
                      className="text-zinc-400 border-zinc-700 hover:text-white hover:bg-zinc-800/50"
                    >
                      {loadingMore ? (
                        <RefreshCcw size={16} className="animate-spin mr-2" />
                      ) : null}{" "}
                      {loadingMore
                        ? "Loading..."
                        : `Load Next 50 Bills (Loaded: ${loadedCount})`}
                    </Button>
                  </div>
                )}
              {loadedCount >= MAX_RECORDS_LIMIT && (
                <div className="p-6 border-t border-zinc-800/60 flex justify-center">
                  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-6 py-4 rounded-xl text-center max-w-md shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                    <AlertOctagon
                      className="mx-auto mb-2 opacity-80"
                      size={24}
                    />
                    <h4 className="font-bold text-sm mb-1">
                      Display Limit Reached
                    </h4>
                    <p className="text-[11px] font-medium text-amber-200/60 leading-relaxed">
                      To preserve system performance, infinite scrolling stops
                      at 5,000 records. Use filters to locate older bills.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isDeleteAllOpen && !isManager && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <div
              className="absolute inset-0"
              onClick={() => !wiping && setIsDeleteAllOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#09090B] border border-red-900/50 shadow-[0_0_40px_rgba(220,38,38,0.15)] rounded-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col p-6 sm:p-8"
            >
              <div className="flex items-center gap-3 text-red-500 mb-6">
                <AlertOctagon size={28} />
                <h2 className="text-xl font-bold tracking-wide">
                  Wipe Invoice Database
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
                      Before wiping, please download the backup. Limit: 10,000
                      daily.
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
                invoice records. Please enter your Admin password to confirm.
              </p>
              <div className="relative mb-8">
                <input
                  type={showPassword ? "text" : "password"}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your admin password..."
                  className="w-full bg-zinc-900/50 border border-red-900/30 focus:border-red-500/50 rounded-xl px-4 py-3 text-red-100 outline-none transition-all"
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {historyModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() =>
                setHistoryModal({ isOpen: false, data: [], itemName: "" })
              }
            />
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#09090B] border border-zinc-800/60 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-50 flex flex-col max-h-[80vh]"
            >
              <div className="p-5 border-b border-zinc-800/60 flex justify-between items-center bg-[#161212] shrink-0">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <History size={18} className={theme.primaryText} /> Log
                  History:{" "}
                  <span className="text-zinc-300 text-sm ml-1">
                    {historyModal.itemName}
                  </span>
                </h3>
                <button
                  onClick={() =>
                    setHistoryModal({ isOpen: false, data: [], itemName: "" })
                  }
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto space-y-3 custom-scrollbar">
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
                          {edit.email || edit.by || "admin@system.com"}
                        </div>
                        <div
                          className={`text-[10px] font-mono mt-1 tracking-wider ${idx === 0 ? theme.primaryText : "text-zinc-500"}`}
                        >
                          {new Date(edit.at).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                    {idx === 0 && (
                      <div
                        className={`${theme.primaryBg} ${theme.primaryBorder} ${theme.primaryText} text-[10px] px-3 py-1 rounded-md font-bold tracking-widest uppercase`}
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
    </div>
  );
};

export default ElectricBill;
