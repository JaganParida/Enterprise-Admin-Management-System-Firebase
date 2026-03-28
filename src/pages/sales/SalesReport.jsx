import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import salesService from "../../services/salesService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  FileText,
  Search,
  Trash2,
  Edit,
  Truck,
  TrendingUp,
  Banknote,
  CreditCard,
  Filter,
  X,
  ChevronDown,
  Download,
  AlertCircle,
  Users,
  ChevronRight,
  AlertOctagon,
  ShieldAlert,
  Eye,
  EyeOff,
  RefreshCcw,
  Database,
  CheckCircle,
  Lock,
} from "lucide-react";
import Loader from "../../components/common/Loader";
import Button from "../../components/common/Button";
import ConfirmDialog from "../../components/common/ConfirmDialog";

// 🚀 SAFE DATE FORMATTER
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const dateOnly = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const [y, m, d] = dateOnly.split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
    return dateStr;
  } catch (e) {
    return dateStr;
  }
};

// 🚀 GLOBAL MEMORY CACHE
let globalReportCache = {
  sales: [],
  rawDues: [],
  stats: { total: 0, cash: 0, online: 0, pendingDues: 0 },
  salesLastDoc: null,
  duesLastDoc: null,
  salesHasMore: false,
  duesHasMore: false,
  salesLoadedCount: 0,
  duesLoadedCount: 0,
  fetchedTabs: { sales: false, dues: false },
  filters: {
    search: "",
    productFilter: "All",
    paymentMode: "All Status",
    amountFilter: "Any Amount",
    dateFilter: "All",
    exactDate: "",
  },
  isStatsSynced: true,
};

const SalesReport = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useUI();
  const { admin } = useAuth();

  const [sales, setSales] = useState(globalReportCache.sales);
  const [rawDues, setRawDues] = useState(globalReportCache.rawDues);
  const [stats, setStats] = useState(globalReportCache.stats);

  const [salesHasMore, setSalesHasMore] = useState(
    globalReportCache.salesHasMore,
  );
  const [duesHasMore, setDuesHasMore] = useState(globalReportCache.duesHasMore);
  const [salesLoadedCount, setSalesLoadedCount] = useState(
    globalReportCache.salesLoadedCount,
  );
  const [duesLoadedCount, setDuesLoadedCount] = useState(
    globalReportCache.duesLoadedCount,
  );

  const [isStatsSynced, setIsStatsSynced] = useState(
    globalReportCache.isStatsSynced,
  );
  const [loading, setLoading] = useState(!globalReportCache.fetchedTabs.sales);
  const [syncingStats, setSyncingStats] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const urlHighlightId = searchParams.get("highlight");
  const [activeHighlight, setActiveHighlight] = useState(null);
  const processedHighlight = useRef(null);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [activeTab, setActiveTab] = useState("all_sales");
  const [expandedCustomer, setExpandedCustomer] = useState(null);

  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wiping, setWiping] = useState(false);

  const [filters, setFilters] = useState(globalReportCache.filters);
  const [backupMonth, setBackupMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );

  const [serverLockTime, setServerLockTime] = useState(null);
  const [backupResumePart, setBackupResumePart] = useState(null);
  const [isBackupLocked, setIsBackupLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState("");

  const isTransport =
    typeof window !== "undefined"
      ? location.pathname.includes("/transportation")
      : false;

  const theme = {
    primaryText: isTransport ? "text-cyan-400" : "text-indigo-400",
    primaryBg: isTransport ? "bg-cyan-500/10" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-cyan-500/20" : "border-indigo-500/20",
    primaryHoverBorder: isTransport
      ? "hover:border-cyan-500/30"
      : "hover:border-indigo-500/30",
    primaryHoverBg: isTransport
      ? "hover:bg-cyan-500/20"
      : "hover:bg-indigo-500/20",
    primaryFocus: isTransport
      ? "focus:border-cyan-500/50 focus:ring-cyan-500/50"
      : "focus:border-indigo-500/50 focus:ring-indigo-500/50",
  };

  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";
  const hasActiveFilters =
    filters.search !== "" ||
    filters.productFilter !== "All" ||
    filters.paymentMode !== "All Status" ||
    filters.amountFilter !== "Any Amount" ||
    filters.dateFilter !== "All" ||
    filters.exactDate !== "";

  useEffect(() => {
    if (isDeleteAllOpen) {
      const getLock = async () => {
        const state = await salesService.getBackupState(backupMonth);
        if (state) {
          setBackupResumePart(state.part + 1);
          setServerLockTime(state.lockedUntil || null);
        } else {
          setBackupResumePart(null);
          setServerLockTime(null);
        }
      };
      getLock();
    }
  }, [isDeleteAllOpen, backupMonth]);

  useEffect(() => {
    if (!serverLockTime) {
      setIsBackupLocked(false);
      return;
    }
    const updateCountdown = () => {
      const diff = serverLockTime - Date.now();
      if (diff > 0) {
        setIsBackupLocked(true);
        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setLockTimeRemaining(`${hrs}h ${mins}m`);
      } else {
        setIsBackupLocked(false);
        setServerLockTime(null);
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 60000);
    return () => clearInterval(timer);
  }, [serverLockTime]);

  const groupedDuesUI = useMemo(() => {
    const map = {};
    const searchLower = filters.search?.toLowerCase() || "";
    rawDues.forEach((sale) => {
      const buyer = sale.buyerName || "Unknown Customer";
      if (searchLower && !buyer.toLowerCase().includes(searchLower)) return;

      if (!map[buyer])
        map[buyer] = {
          buyerName: buyer,
          totalDue: 0,
          totalBillAmount: 0,
          records: [],
        };
      map[buyer].totalDue += Number(sale.amountDue) || 0;
      map[buyer].totalBillAmount += Number(sale.amount) || 0;
      map[buyer].records.push(sale);
    });
    return Object.values(map).sort((a, b) => b.totalDue - a.totalDue);
  }, [rawDues, filters.search]);

  const fetchSales = async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);
    try {
      const s = await salesService.getStats();
      if (!isLoadMore) {
        setStats(s);
        globalReportCache.stats = s;
      }

      if (activeTab === "dues") {
        let response;
        let fetchedDataLength = 0;

        if (filters.search) {
          const searchRes = await salesService.getAllSales(
            filters,
            isLoadMore ? globalReportCache.duesLastDoc : null,
          );
          const duesOnly = searchRes.data.filter(
            (item) => Number(item.amountDue) > 0,
          );
          response = { data: duesOnly, lastVisible: searchRes.lastVisible };
          fetchedDataLength = searchRes.data.length;
        } else {
          response = await salesService.getCustomerDues(
            isLoadMore ? globalReportCache.duesLastDoc : null,
          );
          fetchedDataLength = response.data.length;
        }

        const newData = isLoadMore
          ? [...rawDues, ...response.data]
          : response.data;
        const newCount = isLoadMore
          ? duesLoadedCount + response.data.length
          : response.data.length;
        const newDoc = response.lastVisible || null;
        const newHasMore = fetchedDataLength === 50;

        setRawDues(newData);
        globalReportCache.rawDues = newData;
        setDuesLoadedCount(newCount);
        globalReportCache.duesLoadedCount = newCount;
        globalReportCache.duesLastDoc = newDoc;
        setDuesHasMore(newHasMore);
        globalReportCache.duesHasMore = newHasMore;
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const response = await salesService.getAllSales(
        filters,
        isLoadMore ? globalReportCache.salesLastDoc : null,
      );

      if (!isLoadMore) {
        let isSynced = true;
        if (response.data.length > 0 && s.total === 0 && !hasActiveFilters)
          isSynced = false;
        else if (response.data.length === 0 && s.total > 0 && !hasActiveFilters)
          isSynced = false;
        else if (s.total < 0 || s.cash < 0 || s.online < 0 || s.pendingDues < 0)
          isSynced = false;
        setIsStatsSynced(isSynced);
        globalReportCache.isStatsSynced = isSynced;
      }

      const newData = isLoadMore ? [...sales, ...response.data] : response.data;
      const newCount = isLoadMore
        ? salesLoadedCount + response.data.length
        : response.data.length;
      const newDoc = response.lastVisible || null;
      const newHasMore = response.data.length === 50;

      setSales(newData);
      globalReportCache.sales = newData;
      setSalesLoadedCount(newCount);
      globalReportCache.salesLoadedCount = newCount;
      globalReportCache.salesLastDoc = newDoc;
      setSalesHasMore(newHasMore);
      globalReportCache.salesHasMore = newHasMore;
    } catch (e) {
      toast.error("Load failed");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const filtersChanged =
        JSON.stringify(globalReportCache.filters) !== JSON.stringify(filters);
      const needsRefresh =
        sessionStorage.getItem("report_needs_refresh") === "true";

      if (needsRefresh) {
        sessionStorage.removeItem("report_needs_refresh");
        globalReportCache.fetchedTabs = { sales: false, dues: false };
        fetchSales(false);
      } else {
        if (activeTab === "all_sales") {
          if (filtersChanged || !globalReportCache.fetchedTabs.sales) {
            fetchSales(false);
            globalReportCache.fetchedTabs.sales = true;
            globalReportCache.filters = filters;
          }
        } else if (activeTab === "dues") {
          if (filtersChanged || !globalReportCache.fetchedTabs.dues) {
            fetchSales(false);
            globalReportCache.fetchedTabs.dues = true;
            globalReportCache.filters = filters;
          }
        }
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [filters, activeTab]);

  useEffect(() => {
    if (
      urlHighlightId &&
      !loading &&
      processedHighlight.current !== urlHighlightId
    ) {
      processedHighlight.current = urlHighlightId;
      setActiveHighlight(urlHighlightId);
      setTimeout(() => {
        const element = document.getElementById(urlHighlightId);
        if (element)
          element.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
      setTimeout(() => setActiveHighlight(null), 3500);
      const params = new URLSearchParams(location.search);
      params.delete("highlight");
      navigate({ search: params.toString() }, { replace: true });
    }
  }, [urlHighlightId, loading, location.search, navigate]);

  const handleSyncStats = async () => {
    if (isStatsSynced) return;
    setSyncingStats(true);
    toast.info("Repairing stats...");
    try {
      const newStats = await salesService.recalculateStats();
      setStats(newStats);
      globalReportCache.stats = newStats;
      setIsStatsSynced(true);
      globalReportCache.isStatsSynced = true;
      toast.success("Dashboard stats repaired!");
    } catch (e) {
      toast.error("Sync failed.");
    } finally {
      setSyncingStats(false);
    }
  };

  const executeDelete = async () => {
    const idToDelete = deleteModal.id;
    const saleToDelete =
      sales.find((s) => s._id === idToDelete) ||
      rawDues.find((s) => s._id === idToDelete);

    try {
      await salesService.deleteSale(idToDelete, admin?.data || admin || {});
      toast.success("Deleted successfully");

      const newSales = sales.filter((s) => s._id !== idToDelete);
      const newDues = rawDues.filter((s) => s._id !== idToDelete);

      setSales(newSales);
      globalReportCache.sales = newSales;
      setRawDues(newDues);
      globalReportCache.rawDues = newDues;

      setSalesLoadedCount((prev) => {
        const n = prev > 0 ? prev - 1 : 0;
        globalReportCache.salesLoadedCount = n;
        return n;
      });
      setDuesLoadedCount((prev) => {
        const n = prev > 0 ? prev - 1 : 0;
        globalReportCache.duesLoadedCount = n;
        return n;
      });

      if (saleToDelete) {
        const isCash = saleToDelete.paymentMode === "Cash";
        setStats((prev) => {
          const n = {
            total: prev.total - (Number(saleToDelete.amount) || 0),
            cash:
              prev.cash - (isCash ? Number(saleToDelete.amountPaid) || 0 : 0),
            online:
              prev.online -
              (!isCash ? Number(saleToDelete.amountPaid) || 0 : 0),
            pendingDues:
              prev.pendingDues - (Number(saleToDelete.amountDue) || 0),
          };
          globalReportCache.stats = n;
          return n;
        });
      }
      sessionStorage.setItem("entry_needs_refresh", "true");
    } catch (e) {
      toast.error("Delete failed");
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const handleFullBackup = async (monthToFetch = backupMonth) => {
    if (isBackupLocked)
      return toast.error(`Backup is locked. Please wait ${lockTimeRemaining}.`);

    try {
      if (!monthToFetch) return toast.error("Please select a month.");
      const QUOTA_LIMIT = 10000;

      const savedState = await salesService.getBackupState(monthToFetch);

      let startTimestamp = savedState
        ? savedState.lastCreatedAt
        : `${monthToFetch}-01T00:00:00.000Z`;
      let partNumber = savedState ? savedState.part + 1 : 1;

      toast.info(
        savedState
          ? `Resuming Backup Part ${partNumber}...`
          : `Starting Secure Backup...`,
      );

      let allData = [];
      let hasMoreToFetch = true;
      let currentLastCreatedAt = null;

      // 🚨 FIX: Replaced direct Firebase query logic with an internal implementation
      // Ideally you should keep this query isolated to the service file, but it's safe here
      // as long as you import 'query', 'collection', 'where', 'orderBy', 'limit', 'getDocs' from firestore.

      while (hasMoreToFetch && allData.length < QUOTA_LIMIT) {
        const q = query(
          collection(db, "sales"),
          where("createdAt", ">", startTimestamp),
          where("createdAt", "<=", `${monthToFetch}-31T23:59:59.999Z`),
          orderBy("createdAt", "asc"),
          limit(1000),
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          hasMoreToFetch = false;
          break;
        }
        allData.push(...snap.docs.map((d) => d.data()));
        currentLastCreatedAt = snap.docs[snap.docs.length - 1].data().createdAt;
        startTimestamp = currentLastCreatedAt;
        if (snap.docs.length < 1000) hasMoreToFetch = false;
      }

      if (allData.length === 0) {
        await salesService.setBackupState(monthToFetch, null);
        setBackupResumePart(null);
        setServerLockTime(null);
        return toast.success(
          `All records for ${monthToFetch} are fully downloaded!`,
        );
      }

      let csv =
        "\uFEFFDate,Challan No,Buyer Name,Vehicle No,Product,Quantity,Price/Qty,Total Amount,Paid,Due,Payment Mode\n";
      allData.forEach((s) => {
        const safeDate = formatDate(s.date);
        csv += `"\t${safeDate}","\t${s.challanNo || ""}","\t${s.buyerName || ""}","\t${s.vehicleNo || ""}","${s.productName || ""}",${s.quantity || 0},${s.pricePerQuantity || 0},${s.amount || 0},${s.amountPaid || 0},${s.amountDue || 0},"${s.paymentMode || ""}"\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Sales_${monthToFetch}_Part_${partNumber}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (hasMoreToFetch) {
        const lockTime = Date.now() + 24 * 60 * 60 * 1000;
        await salesService.setBackupState(monthToFetch, {
          lastCreatedAt: currentLastCreatedAt,
          part: partNumber,
          lockedUntil: lockTime,
        });
        setBackupResumePart(partNumber + 1);
        setServerLockTime(lockTime);
        toast.warning(
          `Daily limit hit. Part ${partNumber} saved. Locked for 24 hours to protect quota.`,
          { autoClose: 8000 },
        );
      } else {
        await salesService.setBackupState(monthToFetch, null);
        setBackupResumePart(null);
        setServerLockTime(null);
        toast.success(`Backup Complete!`);
      }
    } catch (e) {
      toast.error("Backup failed.");
      console.error(e);
    }
  };

  // 🚀 FIX: Updated WIPE LOGIC WITH CORRECT PASSWORD & ANIMATION HANDLING
  const handleWipeAll = async () => {
    if (isManager || !deletePassword)
      return toast.error("Please enter admin password");

    setWiping(true); // 🟢 ANIMATION START

    try {
      const adminEmail = admin?.email || admin?.data?.email;
      if (!adminEmail) throw new Error("Could not verify admin email.");

      await salesService.deleteAllSales({
        password: deletePassword,
        email: adminEmail,
      });

      toast.success("Database cleared successfully.");
      setIsDeleteAllOpen(false);
      setDeletePassword("");

      const emptyState = {
        sales: [],
        rawDues: [],
        stats: { total: 0, cash: 0, online: 0, pendingDues: 0 },
      };

      setSales([]);
      setRawDues([]);
      setStats(emptyState.stats);
      setSalesLoadedCount(0);
      setDuesLoadedCount(0);
      setSalesHasMore(false);
      setDuesHasMore(false);

      globalReportCache = {
        ...globalReportCache,
        ...emptyState,
        salesLoadedCount: 0,
        duesLoadedCount: 0,
        salesHasMore: false,
        duesHasMore: false,
      };
    } catch (e) {
      toast.error(e.message || "Incorrect Password.");
      console.error(e);
    } finally {
      setWiping(false); // 🔴 ANIMATION STOP
    }
  };

  const forceRefresh = () => {
    globalReportCache.fetchedTabs = { sales: false, dues: false };
    fetchSales(false);
  };

  const parseProduct = (fullName) => {
    if (!fullName) return { name: "-", size: "No unit" };
    if (fullName.includes("(")) {
      const parts = fullName.split("(");
      return { name: parts[0].trim(), size: parts[1].replace(")", "").trim() };
    }
    return { name: fullName, size: "No unit" };
  };

  const currentHasMore = activeTab === "all_sales" ? salesHasMore : duesHasMore;
  const currentLoadedCount =
    activeTab === "all_sales" ? salesLoadedCount : duesLoadedCount;

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
    <div className="pb-10 relative space-y-8 overflow-x-hidden">
      {/* 🚀 SMOOTH HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
          >
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Sales Ledger
            </h1>
            <p className="text-zinc-500 text-xs uppercase tracking-widest mt-0.5">
              Advanced Report
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
          <div className="w-full sm:w-auto bg-[#09090B] p-1.5 rounded-2xl md:rounded-full border border-zinc-800/60 grid grid-cols-2 sm:flex sm:items-center gap-4 relative">
            <button
              type="button"
              onClick={() => {
                setActiveTab("all_sales");
                setExpandedCustomer(null);
              }}
              className={`col-span-1 px-4 md:px-8 py-2.5 md:py-2 text-xs md:text-sm font-bold rounded-xl md:rounded-full transition-all relative z-10 ${activeTab === "all_sales" ? "text-white" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"}`}
            >
              All Sales
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("dues")}
              className={`col-span-1 px-4 md:px-8 py-2.5 md:py-2 text-xs md:text-sm font-bold rounded-xl md:rounded-full transition-all relative z-10 ${activeTab === "dues" ? "text-white" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"}`}
            >
              Dues
            </button>

            <div
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] sm:w-[100px] md:w-[120px] rounded-xl md:rounded-full bg-indigo-600 transition-all duration-300 ease-out z-0 ${activeTab === "all_sales" ? "left-1.5" : "left-[calc(50%+4px)] sm:left-[110px] md:left-[130px]"}`}
            />

            <button
              type="button"
              onClick={forceRefresh}
              className="absolute sm:relative -top-12 sm:top-0 right-0 sm:right-auto flex items-center justify-center p-2.5 sm:p-2 rounded-full text-zinc-400 hover:text-white bg-zinc-900 sm:bg-transparent border sm:border-transparent border-zinc-800 hover:bg-zinc-800 transition-all sm:ml-1 z-10"
            >
              <RefreshCcw
                size={16}
                className={
                  loading && !loadingMore ? "animate-spin text-indigo-400" : ""
                }
              />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:flex gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            {!isManager && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSyncStats}
                disabled={syncingStats || isStatsSynced}
                title={
                  isStatsSynced
                    ? "System Already Updated"
                    : "Click to Sync Stats"
                }
                className={`h-11 px-2 md:px-4 col-span-1 transition-all duration-500 ${isStatsSynced ? "opacity-40 pointer-events-none cursor-not-allowed bg-emerald-500/5 text-emerald-500 border-emerald-500/20" : "opacity-100 cursor-pointer border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"}`}
              >
                {isStatsSynced ? (
                  <CheckCircle size={16} />
                ) : (
                  <Database
                    size={16}
                    className={
                      syncingStats ? "animate-pulse text-indigo-400" : ""
                    }
                  />
                )}
                <span className="ml-2 hidden sm:block text-xs md:text-sm">
                  {syncingStats
                    ? "Syncing..."
                    : isStatsSynced
                      ? "Updated"
                      : "Sync Stats"}
                </span>
              </Button>
            )}
            <Button
              type="button"
              variant="module"
              onClick={() => !isManager && setIsDeleteAllOpen(true)}
              className={`h-11 px-2 md:px-5 col-span-1 border-red-500/40 text-red-400 bg-red-950/30 hover:bg-red-900/40 hover:border-red-400/60 ${isManager ? "opacity-50 !cursor-not-allowed" : ""}`}
            >
              <AlertOctagon size={16} />{" "}
              <span className="hidden sm:block ml-2 text-xs md:text-sm">
                Database
              </span>
            </Button>
            <Link
              to={isTransport ? "/transportation/sales" : "/enterprise/sales"}
              className="col-span-2 sm:col-span-1"
            >
              <Button
                type="button"
                variant="primary"
                className="h-11 px-6 w-full rounded-xl shadow-lg whitespace-nowrap text-sm"
              >
                + Record Sale
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* 🚀 SMOOTH STAGGERED STATS */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6"
      >
        <motion.div
          variants={itemVariants}
          className="bg-[#09090B] border border-zinc-800/60 p-5 md:p-6 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition-colors shadow-xl"
        >
          <TrendingUp
            size={100}
            className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 ${theme.primaryText} transition-opacity`}
          />
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">
            Total Billed
          </p>
          <h3 className="text-xl md:text-2xl font-black text-white font-mono">
            ₹ {stats.total.toLocaleString()}
          </h3>
        </motion.div>
        <motion.div
          variants={itemVariants}
          className="bg-[#09090B] border border-zinc-800/60 p-5 md:p-6 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition-colors shadow-xl"
        >
          <Banknote
            size={100}
            className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 ${theme.primaryText} transition-opacity`}
          />
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">
            Cash Collected
          </p>
          <h3
            className={`text-xl md:text-2xl font-black font-mono ${theme.primaryText}`}
          >
            ₹ {stats.cash.toLocaleString()}
          </h3>
        </motion.div>
        <motion.div
          variants={itemVariants}
          className="bg-[#09090B] border border-zinc-800/60 p-5 md:p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition-colors shadow-xl"
        >
          <CreditCard
            size={100}
            className="absolute -right-4 -bottom-4 opacity-5 text-blue-500 group-hover:opacity-10 transition-opacity"
          />
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">
            Online Received
          </p>
          <h3 className="text-xl md:text-2xl font-black text-blue-400 font-mono">
            ₹ {stats.online.toLocaleString()}
          </h3>
        </motion.div>
        <motion.div
          variants={itemVariants}
          className="bg-[#09090B] border border-zinc-800/60 p-5 md:p-6 rounded-2xl relative overflow-hidden group hover:border-rose-500/30 transition-colors shadow-xl"
        >
          <AlertCircle
            size={100}
            className="absolute -right-4 -bottom-4 opacity-5 text-rose-500 group-hover:opacity-10 transition-opacity"
          />
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">
            Total Pending Dues
          </p>
          <h3 className="text-xl md:text-2xl font-black text-rose-400 font-mono">
            ₹ {stats.pendingDues.toLocaleString()}
          </h3>
        </motion.div>
      </motion.div>

      {/* 🚀 FILTER & SEARCH */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="bg-[#09090B] rounded-2xl border border-zinc-800/60 overflow-hidden relative shadow-2xl"
      >
        {loading && !loadingMore && (
          <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-sm rounded-2xl">
            <Loader />
          </div>
        )}

        <div className="p-4 md:p-5 border-b border-zinc-800/60 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-zinc-900/10">
          <div className="relative w-full sm:max-w-md group">
            <Search
              size={16}
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${filters.search ? theme.primaryText : "text-zinc-500"}`}
            />
            <input
              type="text"
              placeholder={
                activeTab === "all_sales"
                  ? "Search buyer..."
                  : "Search pending customers..."
              }
              className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 outline-none ${theme.primaryFocus}`}
              value={filters.search}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  search: e.target.value,
                  amountFilter: "Any Amount",
                  dateFilter: "All",
                })
              }
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs font-bold uppercase text-zinc-400 px-3 border-r border-zinc-800">
              <Filter size={14} /> Filters
            </div>

            {activeTab === "all_sales" && (
              <>
                <select
                  value={filters.productFilter}
                  onChange={(e) =>
                    setFilters({ ...filters, productFilter: e.target.value })
                  }
                  className={`flex-1 sm:flex-none bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 text-xs text-zinc-300 outline-none ${theme.primaryFocus}`}
                >
                  <option value="All">All Products</option>
                  <option value="Bricks (10 inch)">Bricks 10"</option>
                  <option value="Bricks (9 inch)">Bricks 9"</option>
                  <option value="Zig Zag (60mm)">Zig Zag</option>
                  <option value="Hexagon">Hexagon</option>
                </select>
                <select
                  value={filters.paymentMode}
                  onChange={(e) =>
                    setFilters({ ...filters, paymentMode: e.target.value })
                  }
                  className={`flex-1 sm:flex-none bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 text-xs text-zinc-300 outline-none ${theme.primaryFocus}`}
                >
                  <option value="All Status">All Modes</option>
                  <option value="Cash">Cash</option>
                  <option value="Online">Online</option>
                </select>
              </>
            )}
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
              className={`flex-1 sm:flex-none bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 text-xs text-zinc-300 outline-none ${theme.primaryFocus}`}
            >
              <option value="All">All Time</option>
              <option value="Today">Today</option>
              <option value="Last7Days">Last 7 Days</option>
              <option value="ThisMonth">This Month</option>
            </select>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  setFilters({
                    search: "",
                    productFilter: "All",
                    paymentMode: "All Status",
                    amountFilter: "Any Amount",
                    dateFilter: "All",
                    exactDate: "",
                  });
                }}
                className="!px-3 !py-1.5 !text-xs !rounded-full flex items-center gap-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 w-full sm:w-auto mt-2 sm:mt-0 justify-center"
              >
                <X size={12} /> Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* 🚀 TABLES */}
        {activeTab === "all_sales" && (
          <div className="overflow-x-auto pb-4 custom-scrollbar min-h-[400px]">
            <table className="w-full text-left min-w-[750px]">
              <thead className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest border-b border-zinc-800/60 bg-[#09090B]">
                <tr>
                  <th className="p-4 pl-6">Date & Challan</th>
                  <th className="p-4">Buyer Details</th>
                  <th className="p-4">Item & Qty</th>
                  <th className="p-4">Financials</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
                {sales.map((sale) => {
                  const { name } = parseProduct(sale.productName);
                  return (
                    <tr
                      key={sale._id}
                      id={sale._id}
                      className={`transition-all duration-300 ease-out group ${activeHighlight === sale._id ? (isTransport ? "bg-cyan-500/20 shadow-[inset_4px_0_0_0_#06b6d4]" : "bg-indigo-500/20 shadow-[inset_4px_0_0_0_#6366f1]") : "hover:bg-zinc-800/30"}`}
                    >
                      <td className="p-4 pl-6">
                        <div className="font-mono text-zinc-400 text-xs mb-1">
                          {formatDate(sale.date)}
                        </div>
                        <div
                          className={`text-[10px] ${theme.primaryText} font-bold tracking-wider`}
                        >
                          {sale.challanNo || "NO CHALLAN"}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white mb-1">
                          {sale.buyerName}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
                          <Truck size={12} /> {sale.vehicleNo}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-zinc-300 font-medium text-xs mb-1">
                          {name}
                        </div>
                        <div
                          className={`text-[10px] font-bold ${theme.primaryText} ${theme.primaryBg} border ${theme.primaryBorder} px-2 py-0.5 rounded inline-block`}
                        >
                          Qty: {sale.quantity}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white font-mono text-[13px] mb-1">
                          Total: ₹{Number(sale.amount).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                          <span className={`${theme.primaryText} font-bold`}>
                            Paid: ₹
                            {Number(
                              sale.amountPaid || sale.amount,
                            ).toLocaleString()}
                          </span>
                          <span
                            className={`font-bold uppercase px-1.5 py-0.5 rounded border ${sale.paymentMode === "Online" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"}`}
                          >
                            {sale.paymentMode}
                          </span>
                        </div>
                        {Number(sale.amountDue) > 0 && (
                          <div className="text-[10px] font-mono mt-1">
                            <span className="text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded inline-block">
                              Due: ₹{Number(sale.amountDue).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Link
                            to={`${isTransport ? "/transportation" : "/enterprise"}/sales/edit/${sale._id}`}
                            className={`p-2 text-zinc-400 hover:${theme.primaryText} hover:bg-zinc-800 rounded-lg transition-colors`}
                          >
                            <Edit size={14} />
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              !isManager &&
                              setDeleteModal({ isOpen: true, id: sale._id })
                            }
                            className={`p-2 rounded-lg transition-colors ${isManager ? "text-zinc-600 cursor-not-allowed" : "text-zinc-400 hover:text-red-400 hover:bg-red-500/10"}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {sales.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-16 text-center text-zinc-500 text-sm italic"
                    >
                      No sales found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 🚀 DUES TAB */}
        {activeTab === "dues" && (
          <div className="p-3 md:p-4 custom-scrollbar min-h-[400px]">
            {groupedDuesUI.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <CheckCircle size={32} className="text-emerald-500 mb-4" />
                <h3 className="text-white font-bold">Zero Pending Dues!</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:gap-4">
                {groupedDuesUI.map((cust, idx) => {
                  const isExpanded = expandedCustomer === cust.buyerName;
                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border transition-colors duration-300 overflow-hidden ${isExpanded ? "bg-[#09090B] border-rose-900/50" : "bg-zinc-900/20 border-zinc-800/60 hover:border-zinc-700"}`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCustomer(
                            isExpanded ? null : cust.buyerName,
                          )
                        }
                        className="w-full flex flex-col sm:flex-row sm:justify-between p-4 md:p-5 items-start sm:items-center gap-4"
                      >
                        <div className="flex items-center gap-3 md:gap-4">
                          <div
                            className={`p-2 md:p-3 rounded-xl transition-colors ${isExpanded ? "bg-rose-500/10 text-rose-400" : "bg-zinc-800/50 text-zinc-400"}`}
                          >
                            <Users size={20} className="md:w-6 md:h-6" />
                          </div>
                          <div className="text-left">
                            <h3
                              className={`text-base md:text-lg font-bold transition-colors ${isExpanded ? "text-white" : "text-zinc-300"}`}
                            >
                              {cust.buyerName}
                            </h3>
                            <p className="text-zinc-500 text-[10px] md:text-xs">
                              Pending in {cust.records.length} bill(s)
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-8 border-t border-zinc-800/60 sm:border-0 pt-3 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <p className="text-zinc-500 text-[10px] font-bold mb-0.5">
                              Total Bills
                            </p>
                            <p className="text-zinc-300 font-mono font-bold text-xs md:text-sm">
                              ₹ {cust.totalBillAmount.toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-rose-500/70 text-[10px] font-bold mb-0.5">
                              Total Due
                            </p>
                            <p className="text-rose-400 font-mono font-black text-base md:text-xl">
                              ₹ {cust.totalDue.toLocaleString()}
                            </p>
                          </div>
                          <ChevronRight
                            size={18}
                            className={`text-zinc-600 transition-transform duration-300 hidden sm:block ${isExpanded ? "rotate-90 text-rose-400" : ""}`}
                          />
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-rose-900/20 overflow-hidden"
                          >
                            <div className="p-0 sm:p-4 overflow-x-auto">
                              <table className="w-full text-left min-w-[650px]">
                                <thead className="text-zinc-500 text-[9px] md:text-[10px] uppercase border-b border-zinc-800/60 bg-zinc-900/30">
                                  <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Challan</th>
                                    <th className="p-3">Item</th>
                                    <th className="p-3 text-right">Bill</th>
                                    <th className="p-3 text-right">Paid</th>
                                    <th className="p-3 text-right text-rose-400">
                                      Due
                                    </th>
                                    <th className="p-3 text-center">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/60 text-xs md:text-sm">
                                  {cust.records.map((record) => (
                                    <tr
                                      key={record._id}
                                      className="hover:bg-rose-500/[0.05] transition-colors"
                                    >
                                      <td className="p-3 font-mono text-[10px] md:text-xs text-zinc-400">
                                        {formatDate(record.date)}
                                      </td>
                                      <td className="p-3 font-bold text-[10px] md:text-xs text-indigo-400">
                                        {record.challanNo}
                                      </td>
                                      <td className="p-3 text-[10px] md:text-xs text-zinc-300">
                                        {record.productName}
                                      </td>
                                      <td className="p-3 text-right font-mono text-[10px] md:text-xs">
                                        ₹
                                        {Number(record.amount).toLocaleString()}
                                      </td>
                                      <td className="p-3 text-right font-mono text-[10px] md:text-xs">
                                        ₹
                                        {Number(
                                          record.amountPaid,
                                        ).toLocaleString()}
                                      </td>
                                      <td className="p-3 text-right font-mono font-bold text-[10px] md:text-xs text-rose-400">
                                        ₹
                                        {Number(
                                          record.amountDue,
                                        ).toLocaleString()}
                                      </td>
                                      <td className="p-3 text-center">
                                        <Link
                                          to={`${isTransport ? "/transportation" : "/enterprise"}/sales/edit/${record._id}`}
                                          className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-colors hover:bg-rose-500/20 inline-block"
                                        >
                                          Settle
                                        </Link>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {currentHasMore && (
          <div className="flex justify-center p-6 border-t border-zinc-800/60">
            {currentLoadedCount >= 5000 ? (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-bold">
                <AlertCircle size={20} /> View limit reached (5,000). Use
                Search.
              </div>
            ) : (
              <Button
                type="button"
                onClick={() => fetchSales(true)}
                disabled={loadingMore}
                variant="outline"
                className="text-zinc-400 border-zinc-700 hover:text-white px-8 rounded-xl h-10"
              >
                {loadingMore
                  ? "Loading..."
                  : `Load More (${currentLoadedCount})`}
              </Button>
            )}
          </div>
        )}
      </motion.div>

      {/* 🚀 WIPE DATABASE MODAL */}
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
              className="bg-[#09090B] border border-red-900/50 shadow-[0_0_50px_rgba(220,38,38,0.15)] rounded-2xl w-full max-w-xl relative z-10 overflow-hidden flex flex-col"
            >
              <div className="bg-red-500/10 border-b border-red-500/20 p-5 md:p-6 flex items-center gap-3">
                <div className="bg-red-500/20 p-2 rounded-lg text-red-500">
                  <AlertOctagon size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-red-500 tracking-wide">
                    Database Management
                  </h2>
                  <p className="text-red-400/70 text-[10px] md:text-xs mt-0.5">
                    Export data or permanently erase records.
                  </p>
                </div>
              </div>

              <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Backup Block */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 md:p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                  <div className="flex items-start gap-3">
                    <ShieldAlert
                      size={18}
                      className="text-amber-500 shrink-0 mt-0.5"
                    />
                    <div className="w-full">
                      <h3 className="text-amber-500 font-bold text-xs md:text-sm mb-1">
                        Step 1: Secure Data Export
                      </h3>
                      <p className="text-amber-100/60 text-[10px] md:text-xs mb-4 leading-relaxed">
                        {isBackupLocked ? (
                          <span className="flex items-center text-amber-500">
                            <Lock size={12} className="mr-1" /> 🛑 Locked for 24
                            hours.
                          </span>
                        ) : backupResumePart ? (
                          `⚠️ Incomplete backup. Please resume Part ${backupResumePart}.`
                        ) : (
                          `Download a complete CSV backup of your records.`
                        )}
                      </p>
                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                        <input
                          type="month"
                          value={backupMonth}
                          onChange={(e) => setBackupMonth(e.target.value)}
                          style={{ colorScheme: "dark" }}
                          disabled={isBackupLocked}
                          className="w-full sm:w-40 bg-black/50 border border-amber-500/30 rounded-lg px-3 py-2 text-xs md:text-sm text-amber-100 outline-none focus:border-amber-500/60 transition-all disabled:opacity-50"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleFullBackup(backupMonth)}
                          disabled={isBackupLocked}
                          className={`w-full sm:flex-1 h-9 md:h-10 rounded-lg transition-all text-xs md:text-sm ${isBackupLocked ? "bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed" : backupResumePart ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/50 font-bold" : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/30"}`}
                        >
                          {!isBackupLocked && (
                            <Download size={14} className="mr-2" />
                          )}
                          {isBackupLocked
                            ? `Locked: Available in ${lockTimeRemaining}`
                            : backupResumePart
                              ? `Resume Backup (Part ${backupResumePart})`
                              : "Download Backup"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wipe Block */}
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 md:p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                  <h3 className="text-red-500 font-bold text-xs md:text-sm mb-1">
                    Step 2: Confirm Deletion
                  </h3>
                  <p className="text-red-100/60 text-[10px] md:text-xs mb-3 md:mb-4">
                    This action <strong className="text-red-400">CANNOT</strong>{" "}
                    be undone. All data will be wiped.
                  </p>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter admin password..."
                      className="w-full bg-black/50 border border-red-900/50 focus:border-red-500/50 rounded-lg px-3 md:px-4 py-2 md:py-3 text-red-100 outline-none transition-all placeholder:text-red-900/50 text-xs md:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-red-500/50 hover:text-red-500 transition-colors"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/50 border-t border-zinc-800/60 p-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDeleteAllOpen(false);
                    setDeletePassword("");
                  }}
                  disabled={wiping}
                  className="h-10 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg px-6 w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleWipeAll}
                  disabled={wiping || !deletePassword}
                  className="h-10 rounded-lg px-6 font-bold w-full sm:w-auto flex items-center justify-center transition-all"
                >
                  {wiping && (
                    <RefreshCcw size={14} className="animate-spin mr-2" />
                  )}
                  {wiping ? "Wiping Database..." : "Permanently Wipe"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Delete Sale?"
        message="Permanently delete this record?"
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
};
export default SalesReport;
