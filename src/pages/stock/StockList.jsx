import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import stockService from "../../services/stockService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Package,
  History,
  X,
  AlertOctagon,
  Filter,
  Download,
  ShieldAlert,
  Eye,
  EyeOff,
  RefreshCcw,
  ChevronDown,
  Calendar,
  AlertCircle,
} from "lucide-react";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { db } from "../../config/firebase";
import {
  collection,
  query,
  limit,
  orderBy,
  startAfter,
  getDocs,
  documentId,
  where,
} from "firebase/firestore";

const getPreviousMonthString = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// 🚀 IMMORTAL CACHE SYSTEM
const defaultFilters = { search: "", category: "All", stockLevel: "All" };
let globalStockCache = {
  logs: [],
  lastDoc: null,
  hasMore: false,
  loadedCount: 0,
  fetched: false,
  filters: { ...defaultFilters },
};

const StockList = () => {
  const [stocks, setStocks] = useState(globalStockCache.logs);
  const [loading, setLoading] = useState(!globalStockCache.fetched);
  const [lastDoc, setLastDoc] = useState(globalStockCache.lastDoc);
  const [hasMore, setHasMore] = useState(globalStockCache.hasMore);
  const [loadedCount, setLoadedCount] = useState(globalStockCache.loadedCount);
  const [loadingMore, setLoadingMore] = useState(false);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const urlHighlightId = searchParams.get("highlight");
  const [activeHighlight, setActiveHighlight] = useState(null);

  const [filters, setFilters] = useState(globalStockCache.filters);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stockToDelete, setStockToDelete] = useState(null);

  // Backup & Wipe State
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wiping, setWiping] = useState(false);

  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    itemName: "",
  });
  const [backupMonth, setBackupMonth] = useState(getPreviousMonthString());
  const [serverLockTime, setServerLockTime] = useState(null);
  const [backupResumePart, setBackupResumePart] = useState(null);
  const [isBackupLocked, setIsBackupLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // 🚀 New Wipe Limit States
  const [wipeState, setWipeState] = useState({ count: 0, lockedUntil: null });
  const [isWipeLocked, setIsWipeLocked] = useState(false);
  const [wipeLockTimeRemaining, setWipeLockTimeRemaining] = useState("");

  const { toast } = useUI();
  const { admin } = useAuth();
  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";
  const RECORDS_PER_PAGE = 50;
  const SCROLL_LIMIT = 5000;
  const hasActiveFilters =
    filters.search !== "" ||
    filters.category !== "All" ||
    filters.stockLevel !== "All";

  // --- WIPE LOCK EFFECT ---
  useEffect(() => {
    if (isDeleteAllOpen) {
      const fetchWipeState = async () => {
        const state = await stockService.getWipeState();
        if (state) setWipeState(state);
      };
      fetchWipeState();
    }
  }, [isDeleteAllOpen]);

  useEffect(() => {
    if (!wipeState.lockedUntil) {
      setIsWipeLocked(false);
      return;
    }
    const updateCountdown = () => {
      const diff = wipeState.lockedUntil - Date.now();
      if (diff > 0) {
        setIsWipeLocked(true);
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        setWipeLockTimeRemaining(`${hrs}h ${mins}m`);
      } else {
        setIsWipeLocked(false);
        setWipeState({ count: 0, lockedUntil: null });
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 60000);
    return () => clearInterval(timer);
  }, [wipeState.lockedUntil]);

  // --- BACKUP LOCK EFFECT ---
  useEffect(() => {
    if (isDeleteAllOpen) {
      const getLock = async () => {
        const state = await stockService.getBackupState(
          `stock_backup_${backupMonth}`,
        );
        if (state) {
          setBackupResumePart((state.part || 0) + 1);
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
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
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

  const fetchStocks = async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);
    try {
      const response = await stockService.getAllStocks(
        filters,
        isLoadMore ? lastDoc : null,
        RECORDS_PER_PAGE,
      );
      const fetchedDataLength = response?.data?.length || 0;
      const newHasMore = fetchedDataLength === RECORDS_PER_PAGE;
      const newData = isLoadMore
        ? [...stocks, ...(response?.data || [])]
        : response?.data || [];

      setStocks(newData);
      globalStockCache.logs = newData;
      setLastDoc(response.lastVisible || null);
      globalStockCache.lastDoc = response.lastVisible || null;
      setHasMore(newHasMore);
      globalStockCache.hasMore = newHasMore;
      setLoadedCount((prev) => {
        const n = isLoadMore ? prev + fetchedDataLength : fetchedDataLength;
        globalStockCache.loadedCount = n;
        return n;
      });
      globalStockCache.fetched = true;
    } catch (error) {
      toast.error("Failed to load inventory data.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const filtersChanged =
        JSON.stringify(globalStockCache.filters) !== JSON.stringify(filters);
      const needsRefresh =
        sessionStorage.getItem("stock_needs_refresh") === "true";
      if (needsRefresh) {
        sessionStorage.removeItem("stock_needs_refresh");
        fetchStocks(false);
      } else if (filtersChanged || !globalStockCache.fetched) {
        globalStockCache.filters = filters;
        fetchStocks(false);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [filters]);

  useEffect(() => {
    if (urlHighlightId && !loading) {
      setActiveHighlight(urlHighlightId);
      setTimeout(() => {
        const element = document.getElementById(urlHighlightId);
        if (element)
          element.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
      setTimeout(() => setActiveHighlight(null), 3500);
    }
  }, [urlHighlightId, loading]);

  const handleFullBackup = async (monthToFetch = backupMonth) => {
    if (isBackupLocked)
      return toast.error(
        `Daily Limit Reached. Locked for ${lockTimeRemaining}.`,
      );
    try {
      if (!monthToFetch) return toast.error("Please select a month to backup.");
      setIsExporting(true);
      const QUOTA_LIMIT = 10000;
      const BATCH_SIZE = 1000;
      const savedState = await stockService.getBackupState(
        `stock_backup_${monthToFetch}`,
      );
      let partNumber = savedState ? savedState.part + 1 : 1;
      let lastDocDate = savedState ? savedState.lastDate : null;
      let lastDocId = savedState ? savedState.lastId : null;

      toast.info(
        savedState
          ? `Resuming Backup Part ${partNumber}...`
          : `Starting Secure Backup...`,
      );
      let allData = [];
      let hasMoreToFetch = true;
      let currentLastDoc = null;

      while (hasMoreToFetch && allData.length < QUOTA_LIMIT) {
        let constraints = [
          where("createdAt", ">=", monthToFetch),
          where("createdAt", "<=", monthToFetch + "\uf8ff"),
          orderBy("createdAt", "asc"),
          orderBy(documentId(), "asc"),
          limit(BATCH_SIZE),
        ];
        if (currentLastDoc) constraints.push(startAfter(currentLastDoc));
        else if (lastDocDate && lastDocId)
          constraints.push(startAfter(lastDocDate, lastDocId));

        const q = query(collection(db, "stocks"), ...constraints);
        const snap = await getDocs(q);
        if (snap.empty) {
          hasMoreToFetch = false;
          break;
        }
        allData.push(...snap.docs.map((d) => d.data()));
        currentLastDoc = snap.docs[snap.docs.length - 1];
        if (snap.docs.length < BATCH_SIZE) hasMoreToFetch = false;
      }

      if (allData.length === 0) {
        await stockService.setBackupState(`stock_backup_${monthToFetch}`, null);
        setBackupResumePart(null);
        setServerLockTime(null);
        setIsExporting(false);
        return toast.success(`All records downloaded!`);
      }

      const headers = [
        "Item Name",
        "Category",
        "Quantity",
        "Unit",
        "Unit Price",
        "Total Value",
      ];
      const rows = allData.map(
        (stock) =>
          `"${stock.name || "-"}","${stock.category || "-"}","${stock.quantity || 0}","${stock.unit || "-"}","${stock.price || 0}","${Number(stock.quantity) * Number(stock.price) || 0}"`,
      );
      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Stock_Backup_${monthToFetch}_Part_${partNumber}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (hasMoreToFetch) {
        const lockTime = Date.now() + 24 * 60 * 60 * 1000;
        await stockService.setBackupState(`stock_backup_${monthToFetch}`, {
          lastDate: currentLastDoc.data().createdAt,
          lastId: currentLastDoc.id,
          part: partNumber,
          lockedUntil: lockTime,
        });
        setBackupResumePart(partNumber + 1);
        setServerLockTime(lockTime);
        toast.warning(
          `Daily limit (10,000) exceeded! Download next part tomorrow.`,
          { autoClose: 8000 },
        );
      } else {
        await stockService.setBackupState(`stock_backup_${monthToFetch}`, null);
        setBackupResumePart(null);
        setServerLockTime(null);
        toast.success(`Backup Complete for ${monthToFetch}!`);
      }
    } catch (e) {
      toast.error("Backup failed.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteClick = (stock) => {
    setStockToDelete(stock);
    setIsDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!stockToDelete) return;
    try {
      const currentUser = admin?.data || admin || {};
      await stockService.deleteStock(stockToDelete._id, currentUser);
      toast.success("Stock item deleted.");
      setStocks(stocks.filter((s) => s._id !== stockToDelete._id));
      globalStockCache.logs = globalStockCache.logs.filter(
        (s) => s._id !== stockToDelete._id,
      );
    } catch (error) {
      toast.error("Failed to delete.");
    } finally {
      setIsDialogOpen(false);
      setStockToDelete(null);
    }
  };

  const handleWipeAll = async () => {
    if (isManager || !deletePassword || isWipeLocked)
      return toast.error("Action not permitted.");
    setWiping(true);
    try {
      const currentUser = admin?.data || admin || {};
      const res = await stockService.deleteAllStocks({
        password: deletePassword,
        email: currentUser.email,
        user: currentUser,
      });

      if (res.locked) {
        toast.warning(res.message, { autoClose: 8000 });
        setWipeState((prev) => ({
          ...prev,
          lockedUntil: Date.now() + 24 * 60 * 60 * 1000,
        }));
      } else {
        toast.success(res.message);
      }

      setDeletePassword("");
      setShowPassword(false);
      setStocks([]);
      globalStockCache = {
        logs: [],
        lastDoc: null,
        hasMore: false,
        loadedCount: 0,
        fetched: true,
        filters: { ...defaultFilters },
      };
    } catch (error) {
      toast.error(error.message || "Wipe failed.");
    } finally {
      setWiping(false);
    }
  };

  const openHistory = (stock) => {
    const sortedHistory = Array.isArray(stock.editHistory)
      ? [...stock.editHistory].reverse()
      : [];
    setHistoryModal({
      isOpen: true,
      data: sortedHistory,
      itemName: stock.name,
    });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10 text-zinc-200 font-sans">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#09090b] border border-indigo-500/20 text-indigo-400 shadow-sm shrink-0">
            <Package size={20} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-none">
              Stock Inventory
            </h1>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mt-1">
              Track materials & goods
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto overflow-x-auto hide-scrollbar">
          <button
            type="button"
            onClick={() => !isManager && setIsDeleteAllOpen(true)}
            className={`h-10 px-4 border border-rose-900/50 text-white bg-[#0f0709] hover:bg-rose-950/60 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-colors shrink-0 ${isManager ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <AlertOctagon size={14} className="text-rose-500" />{" "}
            <span className="inline-block whitespace-nowrap">Database</span>
          </button>
          <Link to="/enterprise/stock/add" className="shrink-0">
            <button
              type="button"
              className="h-10 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex justify-center items-center transition-colors whitespace-nowrap shadow-sm"
            >
              <Plus size={16} className="mr-1" /> Add Stock
            </button>
          </Link>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="bg-[#0a0a0c] rounded-xl border border-zinc-800/60 overflow-hidden relative shadow-lg"
      >
        {loading && !loadingMore && (
          <div className="absolute inset-0 bg-[#0a0a0c]/80 z-[100] flex items-center justify-center backdrop-blur-sm rounded-xl">
            <Loader />
          </div>
        )}

        <div className="p-4 border-b border-zinc-800/60 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-[320px] group shrink-0">
            <Search
              size={14}
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${filters.search ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-400"}`}
            />
            <input
              type="text"
              placeholder="Search items..."
              className="w-full bg-[#111116] border border-zinc-800/80 rounded-full pl-10 pr-4 py-2 text-xs text-white outline-none transition-all focus:border-indigo-500/50 hover:border-zinc-700/80 placeholder:text-zinc-600 shadow-sm"
              value={filters.search}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  search: e.target.value,
                  stockLevel: "All",
                })
              }
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto hide-scrollbar pb-1 md:pb-0 shrink-0">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mr-1 shrink-0">
              <Filter size={12} /> Filters
            </div>

            <div className="relative shrink-0">
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters({ ...filters, category: e.target.value })
                }
                className="appearance-none bg-[#111116] border border-zinc-800/80 rounded-full pl-4 pr-8 py-2 text-[11px] md:text-xs font-semibold text-zinc-300 outline-none cursor-pointer focus:border-indigo-500/50 hover:bg-[#18181f] transition-all shadow-sm"
              >
                <option value="All">All Categories</option>
                <option value="Purchasing Item">Purchasing Item</option>
                <option value="Finished Good">Finished Good</option>
                <option value="Other">Other</option>
              </select>
              <ChevronDown
                size={12}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500"
              />
            </div>

            <div className="relative shrink-0">
              <select
                value={filters.stockLevel}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    stockLevel: e.target.value,
                    search: "",
                  })
                }
                className="appearance-none bg-[#111116] border border-zinc-800/80 rounded-full pl-4 pr-8 py-2 text-[11px] md:text-xs font-semibold text-zinc-300 outline-none cursor-pointer focus:border-indigo-500/50 hover:bg-[#18181f] transition-all shadow-sm"
              >
                <option value="All">Any Stock Level</option>
                <option value="Low">Low (&lt; 100)</option>
                <option value="Medium">Medium (100 - 1000)</option>
                <option value="High">High (&gt; 1000)</option>
              </select>
              <ChevronDown
                size={12}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500"
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => setFilters(defaultFilters)}
                className="shrink-0 px-3 py-2 text-[11px] md:text-xs rounded-full flex items-center gap-1 text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors font-bold ml-1 shadow-sm"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto hide-scrollbar min-h-[400px]">
          <table className="w-full text-left min-w-[800px] animate-in fade-in duration-300">
            <thead className="bg-transparent border-b border-zinc-800/40">
              <tr>
                <th className="py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Item Name
                </th>
                <th className="py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Category
                </th>
                <th className="py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Quantity
                </th>
                <th className="py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Unit Price
                </th>
                <th className="py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Total Value
                </th>
                <th className="py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right md:pr-8">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30 text-sm">
              {stocks.map((stock) => (
                <tr
                  key={stock._id}
                  id={stock._id}
                  className={`transition-colors duration-300 group border-l-4 ${activeHighlight === stock._id ? "bg-indigo-500/[0.08] border-indigo-500" : "border-transparent hover:bg-[#111116]"}`}
                >
                  <td className="py-4 px-5 align-middle">
                    <div className="font-bold text-white tracking-wide">
                      {stock.name}
                    </div>
                    {stock.editHistory && stock.editHistory.length > 0 && (
                      <button
                        onClick={() => openHistory(stock)}
                        className="mt-1.5 flex items-center gap-1 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/50 rounded px-2 py-0.5 transition-colors w-max"
                      >
                        <History size={10} className="text-zinc-400" />{" "}
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                          Edited
                        </span>
                      </button>
                    )}
                  </td>
                  <td className="py-4 px-5 align-middle">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide border ${stock.category === "Purchasing Item" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : stock.category === "Finished Good" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}
                    >
                      {stock.category || "Purchasing Item"}
                    </span>
                  </td>
                  <td className="py-4 px-5 font-bold text-white font-mono align-middle">
                    {Number(stock.quantity).toLocaleString()}{" "}
                    <span className="text-[10px] font-normal text-zinc-500">
                      {stock.unit || "-"}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-zinc-400 font-mono align-middle">
                    ₹ {Number(stock.price).toLocaleString()}
                  </td>
                  <td className="py-4 px-5 font-bold text-indigo-400 font-mono align-middle">
                    ₹{" "}
                    {(
                      Number(stock.price) * Number(stock.quantity)
                    ).toLocaleString()}
                  </td>
                  <td className="py-4 px-5 align-middle text-right md:pr-8">
                    <div className="flex justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                      <Link
                        to={`/enterprise/stock/edit/${stock._id}`}
                        className="p-1.5 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors"
                      >
                        <Edit size={14} />
                      </Link>
                      <button
                        onClick={() =>
                          isManager ? null : handleDeleteClick(stock)
                        }
                        className={`p-1.5 rounded-md transition-colors ${isManager ? "text-zinc-600 opacity-50 cursor-not-allowed" : "text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {stocks.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan="6"
                    className="p-16 text-center text-zinc-500 text-xs italic"
                  >
                    No stock items match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {hasMore && stocks.length > 0 && (
          <div className="flex justify-center p-5 border-t border-zinc-800/60 relative z-20 bg-[#0a0a0c]">
            {loadedCount >= SCROLL_LIMIT ? (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-2 rounded-lg flex items-center gap-2 text-[11px] font-bold">
                <AlertCircle size={14} /> View limit reached (5,000). Please use
                Filters.
              </div>
            ) : (
              <button
                onClick={() => fetchStocks(true)}
                disabled={loadingMore}
                className="bg-[#16161a] text-zinc-300 border border-zinc-800 hover:bg-[#1a1a24] hover:text-white px-6 py-2.5 text-xs rounded-xl transition-all flex items-center justify-center min-w-[160px] font-bold shadow-sm"
              >
                {loadingMore ? (
                  <RefreshCcw size={14} className="animate-spin mr-2" />
                ) : null}{" "}
                {loadingMore
                  ? "Loading..."
                  : `Load Next 50 (Showing ${loadedCount})`}
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* HISTORY MODAL */}
      <AnimatePresence>
        {historyModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
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
              className="bg-[#0e0e12] border border-zinc-800/60 rounded-2xl w-full max-w-sm relative z-10 overflow-hidden flex flex-col max-h-[80vh] shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-zinc-800/60 bg-[#161212] shrink-0">
                <div className="flex items-center gap-2 text-white font-bold tracking-wide text-xs">
                  <History size={16} className="text-indigo-400" />{" "}
                  {historyModal.itemName}
                </div>
                <button
                  onClick={() =>
                    setHistoryModal({ isOpen: false, data: [], itemName: "" })
                  }
                  className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                {historyModal.data.map((log, index) => (
                  <div
                    key={index}
                    className={`bg-[#121214] border ${index === 0 ? "border-amber-500/40 shadow-sm" : "border-zinc-800/80"} rounded-xl p-4 flex items-center justify-between relative overflow-hidden`}
                  >
                    {index === 0 && (
                      <div className="absolute left-0 top-0 w-1 h-full bg-amber-500"></div>
                    )}
                    <div className="flex items-center gap-3 pl-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${index === 0 ? "bg-amber-500/10 text-amber-400" : "bg-zinc-800/50 text-zinc-400"}`}
                      >
                        {(log.role || "A")[0].toUpperCase()}
                      </div>
                      <div>
                        <h4
                          className={`font-bold tracking-widest uppercase text-[11px] ${index === 0 ? "text-white" : "text-zinc-400"}`}
                        >
                          {log.role || "ADMIN"}
                        </h4>
                        <p className="text-zinc-500 text-[9px] font-mono mt-0.5">
                          {log.email || log.by || "admin@system.com"}
                        </p>
                        <p
                          className={`text-[9px] font-mono mt-1 ${index === 0 ? "text-amber-400" : "text-zinc-500"}`}
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
                      <div className="bg-amber-500/10 text-amber-400 text-[8px] font-bold px-2 py-0.5 rounded tracking-widest uppercase">
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

      {/* WIPE ALL MODAL */}
      <AnimatePresence>
        {isDeleteAllOpen && !isManager && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() =>
                !wiping && !isExporting && setIsDeleteAllOpen(false)
              }
            />
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#0e0e12] border border-rose-900/30 rounded-2xl w-full max-w-[500px] shadow-[0_0_60px_rgba(225,29,72,0.06)] flex flex-col relative z-10 overflow-hidden"
            >
              <div className="p-6 bg-[#161212] border-b border-rose-900/20">
                <div className="flex items-start gap-3">
                  <div className="bg-rose-950/40 p-3 rounded-xl border border-rose-900/50 text-rose-500 shadow-sm">
                    <AlertOctagon size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-wide text-rose-500 mb-1">
                      Database Management
                    </h2>
                    <p className="text-zinc-400 text-[11px] font-medium">
                      Export data or permanently erase records.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="bg-[#151210] border border-amber-900/30 rounded-xl p-5 relative overflow-hidden shadow-inner">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
                  <div className="pl-2">
                    <h3 className="text-amber-500 font-bold text-sm flex items-center gap-2 mb-1.5">
                      <ShieldAlert size={16} /> Step 1: Secure Data Export
                    </h3>
                    <p className="text-zinc-400 text-[11px] mb-4 leading-relaxed font-medium">
                      Download a complete CSV backup of your records. Max 10,000
                      records daily limit.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center gap-2.5">
                      <div className="relative w-full sm:w-[200px]">
                        <Calendar
                          size={14}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                        />
                        <input
                          type="month"
                          value={backupMonth}
                          onChange={(e) => setBackupMonth(e.target.value)}
                          style={{ colorScheme: "dark" }}
                          disabled={isBackupLocked || isExporting}
                          className="bg-[#0a0a0a] border border-zinc-800 focus:border-amber-500/50 rounded-lg pl-10 pr-3 py-2.5 text-xs font-bold text-zinc-200 w-full outline-none disabled:opacity-50"
                        />
                      </div>
                      <button
                        onClick={() => handleFullBackup(backupMonth)}
                        disabled={isBackupLocked || isExporting}
                        className={`w-full sm:flex-1 py-2.5 rounded-lg text-xs font-bold border flex items-center justify-center ${isBackupLocked ? "bg-[#0a0a0a] border-zinc-800 text-zinc-500 cursor-not-allowed opacity-60" : "bg-[#0a0a0c] border-indigo-900/50 hover:bg-[#111116] hover:border-indigo-500/50 text-indigo-400 shadow-sm"}`}
                      >
                        {!isBackupLocked && !isExporting && (
                          <Download size={14} className="mr-1.5" />
                        )}
                        {isExporting
                          ? "Processing Chunk..."
                          : isBackupLocked
                            ? `Locked: ${lockTimeRemaining}`
                            : backupResumePart
                              ? `Resume (Part ${backupResumePart})`
                              : "Download Backup"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-[#160d0d] border border-rose-900/30 rounded-xl p-5 relative overflow-hidden shadow-inner">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
                  <div className="pl-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-rose-500 font-bold text-sm">
                        Step 2: Confirm Deletion
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0a0a0c] text-rose-400 border border-rose-900/50">
                        Quota: {10000 - (wipeState.count || 0)} / 10000
                      </span>
                    </div>
                    <p className="text-zinc-400 text-[11px] mb-4 leading-relaxed font-medium">
                      This action{" "}
                      <strong className="font-bold text-rose-500">
                        CANNOT
                      </strong>{" "}
                      be undone. All data will be wiped in chunks of 500.
                    </p>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Enter admin password..."
                        disabled={isWipeLocked}
                        className="bg-[#0a0a0c] border border-zinc-800 focus:border-rose-500/50 rounded-lg px-4 py-2.5 w-full text-xs text-white outline-none disabled:opacity-40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
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
              <div className="bg-[#0e0e12] px-6 pb-6 pt-1 flex flex-col sm:flex-row justify-center sm:justify-end gap-2.5 rounded-b-2xl">
                <button
                  onClick={() => {
                    setIsDeleteAllOpen(false);
                    setDeletePassword("");
                  }}
                  disabled={wiping || isExporting}
                  className="bg-[#161618] text-zinc-400 hover:text-white px-6 py-2.5 rounded-lg text-xs font-bold w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWipeAll}
                  disabled={
                    wiping || !deletePassword || isExporting || isWipeLocked
                  }
                  className={`px-6 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 w-full sm:w-auto transition-all ${isWipeLocked ? "bg-[#0a0a0c] text-rose-900 border border-rose-900/50 cursor-not-allowed opacity-60" : "bg-[#2a1014] text-rose-500 hover:bg-rose-950 disabled:opacity-50"}`}
                >
                  {wiping && <RefreshCcw size={14} className="animate-spin" />}
                  {isWipeLocked
                    ? `Locked: ${wipeLockTimeRemaining}`
                    : wiping
                      ? "Wiping Database..."
                      : "Permanently Wipe"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Record"
        message={`Are you sure you want to permanently delete "${stockToDelete?.name}"?`}
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
};

export default StockList;
