import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import stockService, { memoryCache } from "../../services/stockService";
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
  AlertCircle,
} from "lucide-react";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const defaultFilters = { search: "", category: "All", stockLevel: "All" };

const StockList = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const [syncState, setSyncState] = useState("syncing"); // synced, syncing, error

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const urlHighlightId = searchParams.get("highlight");
  const [activeHighlight, setActiveHighlight] = useState(null);

  const [pendingFilters, setPendingFilters] = useState(defaultFilters);
  const [activeFilters, setActiveFilters] = useState(defaultFilters);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stockToDelete, setStockToDelete] = useState(null);

  // Backup & Wipe State
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    itemName: "",
  });

  const [wipeState, setWipeState] = useState({ count: 0, lockedUntil: null });
  const [isWipeLocked, setIsWipeLocked] = useState(false);
  const [wipeLockTimeRemaining, setWipeLockTimeRemaining] = useState("");

  const { toast } = useUI();
  const { admin } = useAuth();
  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";

  const RECORDS_PER_PAGE = 50;
  const SCROLL_LIMIT = 5000;

  const hasUnappliedChanges =
    JSON.stringify(pendingFilters) !== JSON.stringify(activeFilters);
  const hasAnyFilters =
    pendingFilters.search !== "" ||
    pendingFilters.category !== "All" ||
    pendingFilters.stockLevel !== "All";

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

  // --- MAIN FETCH ---
  const fetchStocks = async (
    filtersToApply,
    isLoadMore = false,
    forceRefresh = false,
  ) => {
    if (isLoadMore) setLoadingMore(true);
    else {
      setLoading(true);
      setSyncState("syncing");
    }

    try {
      const response = await stockService.getAllStocks(
        filtersToApply,
        isLoadMore ? lastDoc : null,
        RECORDS_PER_PAGE,
        forceRefresh,
      );

      const fetchedDataLength = response?.data?.length || 0;
      const newHasMore = response.hasMore;
      const newData = isLoadMore
        ? [...stocks, ...(response?.data || [])]
        : response?.data || [];

      setStocks(newData);
      setLastDoc(response.lastVisible || null);
      setHasMore(newHasMore);
      setLoadedCount((prev) =>
        isLoadMore ? prev + fetchedDataLength : fetchedDataLength,
      );

      setSyncState("synced");
    } catch (error) {
      setSyncState("error");
      toast.error("Failed to load inventory data.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchStocks(activeFilters, false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = () => {
    setActiveFilters(pendingFilters);
    fetchStocks(pendingFilters, false, false);
  };

  const handleClearFilters = () => {
    setPendingFilters(defaultFilters);
    setActiveFilters(defaultFilters);
    fetchStocks(defaultFilters, false, false);
  };

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

  // 🚀 OPTIMIZED: 0-Read RAM Export
  const handleFullBackup = async () => {
    try {
      setIsExporting(true);

      const allData = memoryCache.data;

      if (!allData || allData.length === 0) {
        toast.error("No data loaded in view to export.");
        setIsExporting(false);
        return;
      }

      if (memoryCache.hasMore) {
        toast.warning(
          "Exporting loaded records. Scroll down to load more before exporting for a complete backup.",
          { autoClose: 6000 },
        );
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
        `Fast_Backup_Stock_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(
        `Exported ${allData.length} records successfully (0 Server Reads)!`,
      );
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
            onClick={() => fetchStocks(activeFilters, false, true)}
            disabled={syncState === "synced"}
            className={`h-10 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all shrink-0 ${
              syncState === "synced"
                ? "bg-transparent border border-zinc-800/40 text-zinc-500 cursor-not-allowed opacity-40 pointer-events-none"
                : syncState === "error"
                  ? "bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                  : "bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
            }`}
          >
            <RefreshCcw
              size={14}
              className={syncState === "syncing" ? "animate-spin" : ""}
            />
            <span className="hidden sm:inline-block">
              {syncState === "synced"
                ? "Up to Date"
                : syncState === "error"
                  ? "Retry Fetch"
                  : "Sync Required"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => !isManager && setIsDeleteAllOpen(true)}
            className={`h-10 px-4 border border-rose-900/50 text-white bg-[#0f0709] hover:bg-rose-950/60 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-colors shrink-0 ${isManager ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <AlertOctagon size={14} className="text-rose-500" />
            <span className="hidden sm:inline-block whitespace-nowrap">
              Database
            </span>
          </button>

          <Link to="/enterprise/stock/add" className="shrink-0">
            <button className="h-10 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex justify-center items-center transition-colors whitespace-nowrap shadow-sm">
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
          <div className="flex w-full md:w-[320px] group shrink-0 gap-2">
            <div className="relative w-full">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                placeholder="Search item names..."
                className="w-full bg-[#111116] border border-zinc-800/80 rounded-lg pl-10 pr-4 py-2 text-xs text-white outline-none focus:border-indigo-500/50 shadow-sm"
                value={pendingFilters.search}
                onChange={(e) =>
                  setPendingFilters((prev) => ({
                    ...prev,
                    search: e.target.value,
                  }))
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto hide-scrollbar pb-1 md:pb-0 shrink-0">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mr-1 shrink-0">
              <Filter size={12} /> Filters
            </div>

            <div className="relative shrink-0">
              <select
                value={pendingFilters.category}
                onChange={(e) =>
                  setPendingFilters((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                className="appearance-none bg-[#111116] border border-zinc-800/80 rounded-lg pl-4 pr-8 py-2 text-[11px] md:text-xs font-semibold text-zinc-300 outline-none cursor-pointer focus:border-indigo-500/50 shadow-sm"
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
                value={pendingFilters.stockLevel}
                onChange={(e) =>
                  setPendingFilters((prev) => ({
                    ...prev,
                    stockLevel: e.target.value,
                    search: "",
                  }))
                }
                className="appearance-none bg-[#111116] border border-zinc-800/80 rounded-lg pl-4 pr-8 py-2 text-[11px] md:text-xs font-semibold text-zinc-300 outline-none cursor-pointer focus:border-indigo-500/50 shadow-sm"
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

            <AnimatePresence mode="popLayout">
              {hasUnappliedChanges && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={handleApplyFilters}
                  className="shrink-0 px-4 py-2 text-[11px] md:text-xs rounded-lg flex items-center gap-1 text-white bg-indigo-600 hover:bg-indigo-500 transition-colors font-bold shadow-sm"
                >
                  Apply
                </motion.button>
              )}
              {hasAnyFilters && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={handleClearFilters}
                  className="shrink-0 px-3 py-2 text-[11px] md:text-xs rounded-lg flex items-center gap-1 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors font-bold shadow-sm"
                >
                  <X size={12} /> Clear
                </motion.button>
              )}
            </AnimatePresence>
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
                  className={`transition-colors duration-300 group ${activeHighlight === stock._id ? "bg-indigo-500/[0.08]" : "hover:bg-[#111116]"}`}
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
                        <History size={10} className="text-zinc-400" />
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
                onClick={() => fetchStocks(activeFilters, true)}
                disabled={loadingMore}
                className="bg-[#16161a] text-zinc-300 border border-zinc-800 hover:bg-[#1a1a24] hover:text-white px-6 py-2.5 text-xs rounded-xl transition-all flex items-center justify-center min-w-[160px] font-bold shadow-sm"
              >
                {loadingMore && (
                  <RefreshCcw size={14} className="animate-spin mr-2" />
                )}
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

      {/* WIPE & EXPORT MODAL */}
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
                      Export current view or permanently erase records.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-5">
                {/* 🚀 OPTIMIZED EXPORT UI (No Date Picker Needed) */}
                <div className="bg-[#151210] border border-amber-900/30 rounded-xl p-5 relative overflow-hidden shadow-inner">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
                  <div className="pl-2">
                    <h3 className="text-amber-500 font-bold text-sm flex items-center gap-2 mb-1.5">
                      <ShieldAlert size={16} /> Step 1: Secure Fast Export
                    </h3>
                    <p className="text-zinc-400 text-[11px] mb-4 leading-relaxed font-medium">
                      Download a complete CSV backup of the records currently
                      loaded in your view. (Costs 0 Server Reads).
                    </p>
                    <button
                      onClick={handleFullBackup}
                      disabled={isExporting}
                      className="w-full py-2.5 rounded-lg text-xs font-bold border flex items-center justify-center bg-[#0a0a0c] border-indigo-900/50 hover:bg-[#111116] hover:border-indigo-500/50 text-indigo-400 shadow-sm"
                    >
                      {!isExporting && (
                        <Download size={14} className="mr-1.5" />
                      )}
                      {isExporting
                        ? "Processing..."
                        : "Download Loaded Records"}
                    </button>
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
