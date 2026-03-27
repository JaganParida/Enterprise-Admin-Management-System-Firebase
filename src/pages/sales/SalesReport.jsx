import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  ArrowRight,
  RefreshCcw,
  Database,
  CheckCircle,
  Lock,
} from "lucide-react";
import Loader from "../../components/common/Loader";
import Button from "../../components/common/Button";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import {
  collection,
  getDocs,
  query,
  where,
  limit,
  orderBy,
} from "firebase/firestore";
import { db } from "../../config/firebase";

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

const SalesReport = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useUI();
  const { admin } = useAuth();

  const [sales, setSales] = useState([]);
  const [rawDues, setRawDues] = useState([]);
  const [loading, setLoading] = useState(true);

  const [syncingStats, setSyncingStats] = useState(false);
  const [isStatsSynced, setIsStatsSynced] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    cash: 0,
    online: 0,
    pendingDues: 0,
  });

  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  const searchParams = new URLSearchParams(location.search);
  const urlHighlightId = searchParams.get("highlight");
  const [activeHighlight, setActiveHighlight] = useState(null);
  const processedHighlight = useRef(null);

  // 🚀 TAB CACHE REFS
  const fetchedTabs = useRef({ sales: false, dues: false });
  const prevFilters = useRef(null);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [activeTab, setActiveTab] = useState("all_sales");
  const [expandedCustomer, setExpandedCustomer] = useState(null);

  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wiping, setWiping] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    productFilter: "All",
    paymentMode: "All Status",
    amountFilter: "Any Amount",
    dateFilter: "All",
    exactDate: "",
  });
  const [backupMonth, setBackupMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );

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
    const checkLockStatus = () => {
      const resumeKey = `backup_resume_${backupMonth}`;
      const savedState = JSON.parse(localStorage.getItem(resumeKey) || "null");

      if (savedState) {
        setBackupResumePart(savedState.part + 1);
        if (savedState.lockedUntil && Date.now() < savedState.lockedUntil) {
          setIsBackupLocked(true);
          const diff = savedState.lockedUntil - Date.now();
          const hrs = Math.floor(diff / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setLockTimeRemaining(`${hrs}h ${mins}m`);
        } else {
          setIsBackupLocked(false);
        }
      } else {
        setBackupResumePart(null);
        setIsBackupLocked(false);
      }
    };

    checkLockStatus();
    const timer = setInterval(checkLockStatus, 60000);
    return () => clearInterval(timer);
  }, [backupMonth]);

  const groupedDuesUI = useMemo(() => {
    const map = {};
    rawDues.forEach((sale) => {
      const buyer = sale.buyerName || "Unknown Customer";
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
  }, [rawDues]);

  const fetchSales = async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);
    try {
      const s = await salesService.getStats();
      if (!isLoadMore) setStats(s);

      if (activeTab === "dues") {
        const response = await salesService.getCustomerDues(
          isLoadMore ? lastDoc : null,
        );
        setRawDues((prev) =>
          isLoadMore ? [...prev, ...response.data] : response.data,
        );
        setLoadedCount((prev) =>
          isLoadMore ? prev + response.data.length : response.data.length,
        );
        setLastDoc(response.lastVisible || null);
        setHasMore(response.data.length === 50);
        return;
      }

      const response = await salesService.getAllSales(
        filters,
        isLoadMore ? lastDoc : null,
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
      }

      setSales((prev) =>
        isLoadMore ? [...prev, ...response.data] : response.data,
      );
      setLoadedCount((prev) =>
        isLoadMore ? prev + response.data.length : response.data.length,
      );
      setLastDoc(response.lastVisible || null);
      setHasMore(response.data.length === 50);
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
        JSON.stringify(prevFilters.current) !== JSON.stringify(filters);
      if (activeTab === "all_sales") {
        if (filtersChanged || !fetchedTabs.current.sales) {
          fetchSales(false);
          fetchedTabs.current.sales = true;
          prevFilters.current = filters;
        }
      } else if (activeTab === "dues") {
        if (!fetchedTabs.current.dues) {
          fetchSales(false);
          fetchedTabs.current.dues = true;
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
      setIsStatsSynced(true);
      toast.success("Dashboard stats repaired!");
    } catch (e) {
      toast.error("Sync failed.");
    } finally {
      setSyncingStats(false);
    }
  };

  // 🚀 MASTERSTROKE: Optimistic Local Delete (0 Reads Required)
  const executeDelete = async () => {
    const idToDelete = deleteModal.id;

    // 1. Pehle bill dhoondho taaki stats minus kar sakein
    const saleToDelete =
      sales.find((s) => s._id === idToDelete) ||
      rawDues.find((s) => s._id === idToDelete);

    try {
      await salesService.deleteSale(idToDelete, admin?.data || admin || {});
      toast.success("Deleted successfully");

      // 2. Local State se hata do (No Firebase Fetch Needed!)
      setSales((prev) => prev.filter((s) => s._id !== idToDelete));
      setRawDues((prev) => prev.filter((s) => s._id !== idToDelete));
      setLoadedCount((prev) => (prev > 0 ? prev - 1 : 0));

      // 3. Stats Cards ko Locally Minus kar do
      if (saleToDelete) {
        const isCash = saleToDelete.paymentMode === "Cash";
        setStats((prev) => ({
          total: prev.total - (Number(saleToDelete.amount) || 0),
          cash: prev.cash - (isCash ? Number(saleToDelete.amountPaid) || 0 : 0),
          online:
            prev.online - (!isCash ? Number(saleToDelete.amountPaid) || 0 : 0),
          pendingDues: prev.pendingDues - (Number(saleToDelete.amountDue) || 0),
        }));
      }
    } catch (e) {
      toast.error("Delete failed");
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const parseProduct = (fullName) => {
    if (!fullName) return { name: "-", size: "No unit" };
    if (fullName.includes("(")) {
      const parts = fullName.split("(");
      return { name: parts[0].trim(), size: parts[1].replace(")", "").trim() };
    }
    return { name: fullName, size: "No unit" };
  };

  const handleFullBackup = async (monthToFetch = backupMonth) => {
    if (isBackupLocked)
      return toast.error(`Backup is locked. Please wait ${lockTimeRemaining}.`);

    try {
      if (!monthToFetch) return toast.error("Please select a month.");
      const QUOTA_LIMIT = 10000;
      const resumeKey = `backup_resume_${monthToFetch}`;
      const savedState = JSON.parse(localStorage.getItem(resumeKey) || "null");

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
        localStorage.removeItem(resumeKey);
        setBackupResumePart(null);
        setIsBackupLocked(false);
        return toast.success(
          `All records for ${monthToFetch} are fully downloaded!`,
        );
      }

      let csv =
        "\uFEFFDate,Challan No,Buyer Name,Vehicle No,Product,Quantity,Price/Qty,Total Amount,Paid,Due,Payment Mode\n";
      allData.forEach((s) => {
        const safeDate = formatDate(s.date);
        const excelSafeDate = `\t${safeDate}`;
        const excelSafeChallan = `\t${s.challanNo || ""}`;
        const excelSafeBuyer = `\t${s.buyerName || ""}`;
        const excelSafeVehicle = `\t${s.vehicleNo || ""}`;

        csv += `"${excelSafeDate}","${excelSafeChallan}","${excelSafeBuyer}","${excelSafeVehicle}","${s.productName || ""}",${s.quantity || 0},${s.pricePerQuantity || 0},${s.amount || 0},${s.amountPaid || 0},${s.amountDue || 0},"${s.paymentMode || ""}"\n`;
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
        localStorage.setItem(
          resumeKey,
          JSON.stringify({
            lastCreatedAt: currentLastCreatedAt,
            part: partNumber,
            lockedUntil: lockTime,
          }),
        );

        setBackupResumePart(partNumber + 1);
        setIsBackupLocked(true);
        setLockTimeRemaining("24h 0m");
        toast.warning(
          `Daily limit hit. Part ${partNumber} saved. System locked for 24 hours to protect quota.`,
          { autoClose: 8000 },
        );
      } else {
        localStorage.removeItem(resumeKey);
        setBackupResumePart(null);
        setIsBackupLocked(false);
        toast.success(
          `Backup Complete! All data for ${monthToFetch} is downloaded.`,
        );
      }
    } catch (e) {
      toast.error("Backup failed.");
      console.error(e);
    }
  };

  const handleWipeAll = async () => {
    if (isManager || !deletePassword) return;
    setWiping(true);
    try {
      await salesService.deleteAllSales({
        password: deletePassword,
        email: admin?.email,
        user: admin,
      });
      toast.success("Database cleared.");
      setIsDeleteAllOpen(false);
      setDeletePassword("");

      // Force Hard Refresh because database is empty now
      setSales([]);
      setRawDues([]);
      setStats({ total: 0, cash: 0, online: 0, pendingDues: 0 });
    } catch (e) {
      toast.error("Incorrect Password.");
    } finally {
      setWiping(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-10 relative space-y-8">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
          >
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Sales Ledger
            </h1>
            <p className="text-zinc-500 text-xs uppercase tracking-widest mt-0.5">
              Advanced Report
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="w-full lg:w-auto bg-[#09090B] p-1.5 rounded-2xl md:rounded-full border border-zinc-800/60 grid grid-cols-2 md:flex md:items-center gap-1">
            <button
              onClick={() => {
                setActiveTab("all_sales");
                setExpandedCustomer(null);
              }}
              className={`col-span-1 px-8 py-2 text-xs md:text-sm font-bold rounded-xl md:rounded-full transition-all ${activeTab === "all_sales" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"}`}
            >
              All Sales
            </button>
            <button
              onClick={() => setActiveTab("dues")}
              className={`col-span-1 px-8 py-2 text-xs md:text-sm font-bold rounded-xl md:rounded-full transition-all ${activeTab === "dues" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"}`}
            >
              Customer Dues
            </button>

            {/* 🚀 MANUAL REFRESH BUTTON */}
            <button
              onClick={() => {
                fetchedTabs.current = { sales: false, dues: false }; // Force cache clear
                fetchSales(false);
              }}
              className="col-span-2 md:col-span-1 flex items-center justify-center p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all ml-1"
            >
              <RefreshCcw
                size={16}
                className={
                  loading && !loadingMore ? "animate-spin text-indigo-400" : ""
                }
              />
            </button>
          </div>

          <div className="flex gap-3 w-full lg:w-auto">
            {!isManager && (
              <Button
                variant="outline"
                onClick={handleSyncStats}
                disabled={syncingStats || isStatsSynced}
                title={
                  isStatsSynced
                    ? "System Already Updated"
                    : "Click to Sync Stats"
                }
                className={`h-11 px-4 transition-all duration-500 ${
                  isStatsSynced
                    ? "opacity-40 pointer-events-none cursor-not-allowed bg-emerald-500/5 text-emerald-500 border-emerald-500/20"
                    : "opacity-100 cursor-pointer border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
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
                <span className="ml-2 hidden lg:block">
                  {syncingStats
                    ? "Syncing..."
                    : isStatsSynced
                      ? "Up to Date"
                      : "Sync Stats"}
                </span>
              </Button>
            )}

            <Button
              variant="module"
              onClick={() => !isManager && setIsDeleteAllOpen(true)}
              className={`h-11 px-5 border-red-500/40 text-red-400 bg-red-950/30 hover:bg-red-900/40 hover:border-red-400/60 ${isManager ? "opacity-50 !cursor-not-allowed" : ""}`}
            >
              <AlertOctagon size={16} /> Database Mgmt
            </Button>
            <Link
              to={isTransport ? "/transportation/sales" : "/enterprise/sales"}
            >
              <Button
                variant="primary"
                className="h-11 px-6 rounded-xl shadow-lg"
              >
                + Record Sale
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div
          className={`bg-[#09090B] border border-zinc-800/60 p-6 rounded-2xl relative overflow-hidden group border-transparent hover:border-zinc-700 transition-colors`}
        >
          <TrendingUp
            size={100}
            className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 ${theme.primaryText} transition-opacity`}
          />
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">
            Total Billed
          </p>
          <h3 className="text-2xl font-black text-white font-mono">
            ₹ {stats.total.toLocaleString()}
          </h3>
        </div>
        <div
          className={`bg-[#09090B] border border-zinc-800/60 p-6 rounded-2xl relative overflow-hidden group border-transparent hover:border-zinc-700 transition-colors`}
        >
          <Banknote
            size={100}
            className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 ${theme.primaryText} transition-opacity`}
          />
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">
            Cash Collected
          </p>
          <h3 className={`text-2xl font-black font-mono ${theme.primaryText}`}>
            ₹ {stats.cash.toLocaleString()}
          </h3>
        </div>
        <div className="bg-[#09090B] border border-zinc-800/60 p-6 rounded-2xl relative overflow-hidden group border-transparent hover:border-blue-500/30 transition-colors">
          <CreditCard
            size={100}
            className="absolute -right-4 -bottom-4 opacity-5 text-blue-500 group-hover:opacity-10 transition-opacity"
          />
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">
            Online Received
          </p>
          <h3 className="text-2xl font-black text-blue-400 font-mono">
            ₹ {stats.online.toLocaleString()}
          </h3>
        </div>
        <div className="bg-[#09090B] border border-zinc-800/60 p-6 rounded-2xl relative overflow-hidden group border-transparent hover:border-rose-500/30 transition-colors">
          <AlertCircle
            size={100}
            className="absolute -right-4 -bottom-4 opacity-5 text-rose-500 group-hover:opacity-10 transition-opacity"
          />
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">
            Total Pending Dues
          </p>
          <h3 className="text-2xl font-black text-rose-400 font-mono">
            ₹ {stats.pendingDues.toLocaleString()}
          </h3>
        </div>
      </div>

      <div className="bg-[#09090B] rounded-2xl border border-zinc-800/60 overflow-visible relative">
        {loading && !loadingMore && (
          <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-sm rounded-2xl">
            <Loader />
          </div>
        )}

        <div className="p-5 border-b border-zinc-800/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 rounded-t-2xl">
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
        </div>

        <div className="p-4 border-b border-zinc-800/60 bg-zinc-900/20 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-400 px-3 border-r border-zinc-800">
            <Filter size={16} /> Filters
          </div>
          {activeTab === "all_sales" && (
            <>
              <select
                value={filters.productFilter}
                onChange={(e) =>
                  setFilters({ ...filters, productFilter: e.target.value })
                }
                className={`bg-transparent border border-zinc-800 rounded-full px-4 py-1.5 text-xs text-zinc-400 outline-none ${theme.primaryFocus}`}
              >
                <option value="All" className="bg-[#09090B]">
                  All Products
                </option>
                <option value="Bricks (10 inch)" className="bg-[#09090B]">
                  Bricks (10 inch)
                </option>
                <option value="Bricks (9 inch)" className="bg-[#09090B]">
                  Bricks (9 inch)
                </option>
                <option value="Zig Zag (60mm)" className="bg-[#09090B]">
                  Zig Zag (60mm)
                </option>
                <option value="Hexagon" className="bg-[#09090B]">
                  Hexagon Tiles
                </option>
              </select>
              <select
                value={filters.paymentMode}
                onChange={(e) =>
                  setFilters({ ...filters, paymentMode: e.target.value })
                }
                className={`bg-transparent border border-zinc-800 rounded-full px-4 py-1.5 text-xs text-zinc-400 outline-none ${theme.primaryFocus}`}
              >
                <option value="All Status" className="bg-[#09090B]">
                  All Modes
                </option>
                <option value="Cash" className="bg-[#09090B]">
                  Cash
                </option>
                <option value="Online" className="bg-[#09090B]">
                  Online
                </option>
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
            className={`bg-transparent border border-zinc-800 rounded-full px-4 py-1.5 text-xs text-zinc-400 outline-none ${theme.primaryFocus}`}
          >
            <option value="All" className="bg-[#09090B]">
              All Time
            </option>
            <option value="Today" className="bg-[#09090B]">
              Today
            </option>
            <option value="Last7Days" className="bg-[#09090B]">
              Last 7 Days
            </option>
            <option value="ThisMonth" className="bg-[#09090B]">
              This Month
            </option>
          </select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={() =>
                setFilters({
                  search: "",
                  productFilter: "All",
                  paymentMode: "All Status",
                  amountFilter: "Any Amount",
                  dateFilter: "All",
                  exactDate: "",
                })
              }
              className="!px-3 !py-1.5 !text-xs !rounded-full flex items-center gap-1.5 ml-auto text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
            >
              <X size={14} /> Clear
            </Button>
          )}
        </div>

        {activeTab === "all_sales" && (
          <div className="overflow-x-auto pb-4 custom-scrollbar min-h-[400px]">
            <table className="w-full text-left min-w-[800px]">
              <thead className="text-zinc-500 text-[11px] uppercase font-bold tracking-widest border-b border-zinc-800/60">
                <tr>
                  <th className="p-5 pl-6">Date & Challan</th>
                  <th className="p-5">Buyer</th>
                  <th className="p-5">Item & Qty</th>
                  <th className="p-5">Financials</th>
                  <th className="p-5 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
                {sales.map((sale) => {
                  const { name } = parseProduct(sale.productName);
                  return (
                    <tr
                      key={sale._id}
                      id={sale._id}
                      className={`transition-all duration-700 ease-out group ${
                        activeHighlight === sale._id
                          ? isTransport
                            ? "bg-cyan-500/20 shadow-[inset_4px_0_0_0_#06b6d4]"
                            : "bg-indigo-500/20 shadow-[inset_4px_0_0_0_#6366f1]"
                          : "hover:bg-zinc-800/30"
                      }`}
                    >
                      <td className="p-5 pl-6">
                        <div className="font-mono text-zinc-400 text-xs mb-1.5">
                          {formatDate(sale.date)}
                        </div>
                        <div
                          className={`text-[11px] ${theme.primaryText} font-bold`}
                        >
                          {sale.challanNo || "NO CHALLAN"}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="font-bold text-white mb-1">
                          {sale.buyerName}
                        </div>
                        <div className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
                          <Truck size={14} /> {sale.vehicleNo}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="text-zinc-300 font-medium text-xs mb-1">
                          {name}
                        </div>
                        <div
                          className={`text-[10px] font-bold ${theme.primaryText} ${theme.primaryBg} border ${theme.primaryBorder} px-2 py-0.5 rounded inline-block`}
                        >
                          Qty: {sale.quantity}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="font-bold text-white font-mono text-[15px] mb-1.5">
                          Total: ₹{Number(sale.amount).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className={`${theme.primaryText} font-bold`}>
                            Paid: ₹
                            {Number(
                              sale.amountPaid || sale.amount,
                            ).toLocaleString()}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${sale.paymentMode === "Online" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"}`}
                          >
                            {sale.paymentMode}
                          </span>
                        </div>
                        {Number(sale.amountDue) > 0 && (
                          <div className="text-xs font-mono mt-1.5">
                            <span className="text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded inline-block text-[11px]">
                              Due: ₹{Number(sale.amountDue).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-5 pr-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            to={`${isTransport ? "/transportation" : "/enterprise"}/sales/edit/${sale._id}`}
                            className={`p-2 text-zinc-400 hover:${theme.primaryText} hover:bg-zinc-800 rounded-lg`}
                          >
                            <Edit size={16} />
                          </Link>
                          <button
                            onClick={() =>
                              !isManager &&
                              setDeleteModal({ isOpen: true, id: sale._id })
                            }
                            className={`p-2 rounded-lg ${isManager ? "text-zinc-600 cursor-not-allowed" : "text-zinc-400 hover:text-red-400 hover:bg-red-500/10"}`}
                          >
                            <Trash2 size={16} />
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

        {/* TAB 2: DUES */}
        {activeTab === "dues" && (
          <div className="p-4 custom-scrollbar min-h-[400px]">
            {groupedDuesUI.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <CheckCircle size={32} className="text-emerald-500 mb-4" />
                <h3 className="text-white font-bold">Zero Pending Dues!</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {groupedDuesUI.map((cust, idx) => {
                  const isExpanded = expandedCustomer === cust.buyerName;
                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border ${isExpanded ? "bg-[#09090B] border-rose-900/50" : "bg-zinc-900/10 border-zinc-800/60"}`}
                    >
                      <button
                        onClick={() =>
                          setExpandedCustomer(
                            isExpanded ? null : cust.buyerName,
                          )
                        }
                        className="w-full flex justify-between p-5 items-center"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-3 rounded-xl ${isExpanded ? "bg-rose-500/10 text-rose-400" : "bg-zinc-800/50 text-zinc-400"}`}
                          >
                            <Users size={24} />
                          </div>
                          <div className="text-left">
                            <h3
                              className={`text-lg font-bold ${isExpanded ? "text-white" : "text-zinc-300"}`}
                            >
                              {cust.buyerName}
                            </h3>
                            <p className="text-zinc-500 text-xs">
                              Pending in {cust.records.length} bill(s)
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-10">
                          <div className="text-right hidden sm:block">
                            <p className="text-zinc-500 text-[11px] font-bold mb-1">
                              Purchases
                            </p>
                            <p className="text-zinc-300 font-mono font-bold">
                              ₹ {cust.totalBillAmount.toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-rose-500/70 text-[11px] font-bold mb-1">
                              Total Due
                            </p>
                            <p className="text-rose-400 font-mono font-black text-xl">
                              ₹ {cust.totalDue.toLocaleString()}
                            </p>
                          </div>
                          <ChevronRight
                            size={20}
                            className={`text-zinc-600 transition-transform ${isExpanded ? "rotate-90 text-rose-400" : ""}`}
                          />
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-rose-900/20 p-5">
                          <table className="w-full text-left min-w-[700px]">
                            <thead className="text-zinc-500 text-[11px] uppercase border-b border-zinc-800/60">
                              <tr>
                                <th className="pb-3">Date</th>
                                <th className="pb-3">Challan</th>
                                <th className="pb-3">Item</th>
                                <th className="pb-3 text-right">Bill</th>
                                <th className="pb-3 text-right">Paid</th>
                                <th className="pb-3 text-right text-rose-400">
                                  Due
                                </th>
                                <th className="pb-3 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 text-sm">
                              {cust.records.map((record) => (
                                <tr
                                  key={record._id}
                                  className="hover:bg-rose-500/[0.05]"
                                >
                                  <td className="py-4 font-mono text-xs text-zinc-400">
                                    {formatDate(record.date)}
                                  </td>
                                  <td className="py-4 font-bold text-xs text-indigo-400">
                                    {record.challanNo}
                                  </td>
                                  <td className="py-4 text-xs text-zinc-300">
                                    {record.productName}
                                  </td>
                                  <td className="py-4 text-right font-mono">
                                    ₹{Number(record.amount).toLocaleString()}
                                  </td>
                                  <td className="py-4 text-right font-mono">
                                    ₹
                                    {Number(record.amountPaid).toLocaleString()}
                                  </td>
                                  <td className="py-4 text-right font-mono font-bold text-rose-400">
                                    ₹{Number(record.amountDue).toLocaleString()}
                                  </td>
                                  <td className="py-4 text-center">
                                    <Link
                                      to={`${isTransport ? "/transportation" : "/enterprise"}/sales/edit/${record._id}`}
                                      className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded text-[11px] font-bold uppercase"
                                    >
                                      Settle
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center p-6 border-t border-zinc-800/60">
            {loadedCount >= 5000 ? (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-bold">
                <AlertCircle size={20} /> View limit reached (5,000). Use
                Search.
              </div>
            ) : (
              <Button
                onClick={() => fetchSales(true)}
                disabled={loadingMore}
                variant="outline"
                className="text-zinc-400 border-zinc-700 hover:text-white px-8"
              >
                {loadingMore ? "Loading..." : `Load More (${loadedCount})`}
              </Button>
            )}
          </div>
        )}
      </div>

      {isDeleteAllOpen && !isManager && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => !wiping && setIsDeleteAllOpen(false)}
          />
          <div className="bg-[#09090B] border border-red-900/50 shadow-[0_0_50px_rgba(220,38,38,0.15)] rounded-2xl w-full max-w-xl relative z-10 overflow-hidden flex flex-col">
            <div className="bg-red-500/10 border-b border-red-500/20 p-6 flex items-center gap-3">
              <div className="bg-red-500/20 p-2 rounded-lg text-red-500">
                <AlertOctagon size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-red-500 tracking-wide">
                  Database Management
                </h2>
                <p className="text-red-400/70 text-xs mt-0.5">
                  Export data or permanently erase records.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                <div className="flex items-start gap-3">
                  <ShieldAlert
                    size={20}
                    className="text-amber-500 shrink-0 mt-0.5"
                  />
                  <div className="w-full">
                    <h3 className="text-amber-500 font-bold text-sm mb-1">
                      Step 1: Secure Data Export
                    </h3>

                    <p className="text-amber-100/60 text-xs mb-4 leading-relaxed">
                      {isBackupLocked ? (
                        <span className="flex items-center text-amber-500">
                          <Lock size={14} className="mr-1" /> 🛑 Daily download
                          quota reached. System locked for 24 hours to protect
                          database limits.
                        </span>
                      ) : backupResumePart ? (
                        `⚠️ You have an incomplete backup for this month. Please click resume to download Part ${backupResumePart}.`
                      ) : (
                        `Download a complete CSV backup of your records. The system will safely chunk downloads for large datasets to protect your limits.`
                      )}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                      <input
                        type="month"
                        value={backupMonth}
                        onChange={(e) => setBackupMonth(e.target.value)}
                        style={{ colorScheme: "dark" }}
                        disabled={isBackupLocked}
                        className="w-full sm:w-40 bg-black/50 border border-amber-500/30 rounded-lg px-3 py-2.5 text-sm text-amber-100 outline-none focus:border-amber-500/60 transition-all disabled:opacity-50"
                      />

                      <Button
                        variant="outline"
                        onClick={() => handleFullBackup(backupMonth)}
                        disabled={isBackupLocked}
                        className={`w-full sm:flex-1 h-10 rounded-lg transition-all ${
                          isBackupLocked
                            ? "bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed"
                            : backupResumePart
                              ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/50 font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                              : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/30"
                        }`}
                      >
                        {!isBackupLocked && (
                          <Download size={16} className="mr-2" />
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

              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                <h3 className="text-red-500 font-bold text-sm mb-1">
                  Step 2: Confirm Deletion
                </h3>
                <p className="text-red-100/60 text-xs mb-4">
                  This action <strong className="text-red-400">CANNOT</strong>{" "}
                  be undone. All data will be wiped. Enter your Admin password
                  to proceed.
                </p>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter admin password..."
                    className="w-full bg-black/50 border border-red-900/50 focus:border-red-500/50 rounded-lg px-4 py-3 text-red-100 outline-none transition-all placeholder:text-red-900/50 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500/50 hover:text-red-500 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/50 border-t border-zinc-800/60 p-4 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteAllOpen(false);
                  setDeletePassword("");
                }}
                disabled={wiping}
                className="h-10 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg px-6"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleWipeAll}
                disabled={wiping || !deletePassword}
                className="h-10 rounded-lg px-6 font-bold"
              >
                {wiping && (
                  <RefreshCcw size={16} className="animate-spin mr-2" />
                )}{" "}
                {wiping ? "Wiping Database..." : "Permanently Wipe"}
              </Button>
            </div>
          </div>
        </div>
      )}

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
