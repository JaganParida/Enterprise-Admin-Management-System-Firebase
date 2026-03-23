import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
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
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";
// 🚀 ADDED IMPORTS FOR MONTHLY BACKUP & DB CHECK
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../../config/firebase";

// 🚀 HELPER: Get Previous Month for Backup Warning (YYYY-MM format)
const getPreviousMonthString = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
};

const StockList = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination States
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // 🚀 Highlight Animation State
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const urlHighlightId = searchParams.get("highlight");
  const [activeHighlight, setActiveHighlight] = useState(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStockLevel, setFilterStockLevel] = useState("All");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stockToDelete, setStockToDelete] = useState(null);

  // Delete All State
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wiping, setWiping] = useState(false);

  const [warningTooltip, setWarningTooltip] = useState(null);
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    itemName: "",
  });

  const { toast } = useUI();
  const { admin } = useAuth();

  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const theme = {
    primaryText: isTransport ? "text-cyan-400" : "text-indigo-400",
    primaryBg: isTransport ? "bg-cyan-500/10" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-cyan-500/20" : "border-indigo-500/20",
    primaryHoverBorder: isTransport
      ? "hover:border-cyan-500/30"
      : "hover:border-indigo-500/30",
    primaryFocus: isTransport
      ? "focus:border-cyan-500/50 focus:ring-cyan-500/50"
      : "focus:border-indigo-500/50 focus:ring-indigo-500/50",
  };

  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";

  // 🚀 SMART BACKUP STATES
  const [backupMonth, setBackupMonth] = useState(getPreviousMonthString());
  const [showBackupWarning, setShowBackupWarning] = useState(null);

  // 🚀 UPDATED: Check Backend Database + Local Storage for Backup Warning
  useEffect(() => {
    const checkBackupNeeded = async () => {
      const prevMonth = getPreviousMonthString();

      // Agar local storage me backup verified nahi hai
      if (!localStorage.getItem(`backup_inventory_${prevMonth}`)) {
        try {
          // Check karo ki kya database me kam se kam 1 item exist karta hai
          const q = query(
            collection(db, "stocks"),
            limit(1), // Super fast backend check
          );
          const snap = await getDocs(q);

          // Agar data hai, toh hi warning dikhao
          if (!snap.empty) {
            setShowBackupWarning(prevMonth);
          }
        } catch (error) {
          console.error("Failed to check backup status:", error);
        }
      }
    };

    checkBackupNeeded();
  }, []);

  // 🚀 Fetch Logic with Pagination & Filters
  const fetchStocks = async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const response = await stockService.getAllStocks(
        {
          category: filterCategory,
          search: searchTerm,
          stockLevel: filterStockLevel,
        },
        isLoadMore ? lastDoc : null,
      );

      if (isLoadMore) {
        setStocks((prev) => [...prev, ...(response.data || [])]);
      } else {
        setStocks(response.data || []);
      }

      setLastDoc(response.lastVisible || null);
      setHasMore(response.data && response.data.length === 50);
    } catch (error) {
      if (error.message && error.message.toLowerCase().includes("index")) {
        toast.error("Firebase Index required! Check browser console.", {
          duration: 6000,
        });
      } else {
        toast.error("Failed to load inventory data.");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 🚀 Trigger Fetch on Filter Change
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchStocks(false);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, filterCategory, filterStockLevel]);

  // 🚀 Auto-Scroll & Low-Opacity Fade-Out Animation Logic
  useEffect(() => {
    if (urlHighlightId && !loading) {
      setActiveHighlight(urlHighlightId);

      setTimeout(() => {
        const element = document.getElementById(urlHighlightId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500);

      const timer = setTimeout(() => {
        setActiveHighlight(null);
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [urlHighlightId, loading]);

  // Client-Side Fallback Filtering (If multiple ranges used)
  const filteredStocks = useMemo(() => {
    return stocks.filter((stock) => {
      let matchesStockLevel = true;
      if (filterStockLevel !== "All") {
        const qty = Number(stock.quantity) || 0;
        if (filterStockLevel === "Low") matchesStockLevel = qty < 100;
        else if (filterStockLevel === "Medium")
          matchesStockLevel = qty >= 100 && qty <= 1000;
        else if (filterStockLevel === "High") matchesStockLevel = qty > 1000;
      }
      return matchesStockLevel;
    });
  }, [stocks, filterStockLevel]);

  const activeFiltersCount = [filterCategory, filterStockLevel].filter(
    (f) => f !== "All",
  ).length;

  // 🚀 ONLY EXPORTS VISIBLE DATA
  const handleExport = () => {
    try {
      if (filteredStocks.length === 0)
        return toast.info("No records to export.");

      const headers = [
        "Item Name",
        "Category",
        "Quantity",
        "Unit",
        "Unit Price",
        "Total Value",
      ];
      const rows = filteredStocks.map((stock) => {
        const name = `"${stock.name || "Unknown"}"`;
        const category = `"${stock.category || "Purchasing Item"}"`;
        const quantity = stock.quantity || 0;
        const unit = `"${stock.unit || "-"}"`;
        const price = stock.price || 0;
        const total = Number(stock.quantity) * Number(stock.price) || 0;
        return `${name},${category},${quantity},${unit},${price},${total}`;
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Stock_View_Report_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Visible records exported to CSV!");
    } catch (error) {
      toast.error("Failed to export report.");
    }
  };

  // 🚀 100% FULL DATABASE EXPORT (Bypasses Limit completely)
  const handleFullBackup = async (monthToFetch = backupMonth) => {
    try {
      if (!monthToFetch) return toast.error("Please select a month to backup.");
      toast.info(`Fetching 100% database for backup... Please wait.`);

      // Since Inventory does not have a "month" concept inherently, we take a full snapshot
      const q = query(collection(db, "stocks"));
      const snapshot = await getDocs(q);
      const allData = snapshot.docs.map((doc) => doc.data());

      if (allData.length === 0) return toast.info("Database is empty.");

      const headers = [
        "Item Name",
        "Category",
        "Quantity",
        "Unit",
        "Unit Price",
        "Total Value",
      ];
      const rows = allData.map((stock) => {
        const name = `"${stock.name || "Unknown"}"`;
        const category = `"${stock.category || "Purchasing Item"}"`;
        const quantity = stock.quantity || 0;
        const unit = `"${stock.unit || "-"}"`;
        const price = stock.price || 0;
        const total = Number(stock.quantity) * Number(stock.price) || 0;
        return `${name},${category},${quantity},${unit},${price},${total}`;
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Full_Backup_Inventory_Snapshot_${monthToFetch}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(
        `100% Backup snapshot for ${monthToFetch} downloaded securely!`,
      );

      // 🚀 Instantly removes the warning after successful backup
      localStorage.setItem(`backup_inventory_${monthToFetch}`, "true");
      if (showBackupWarning === monthToFetch) {
        setShowBackupWarning(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate full backup");
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
      toast.success("Stock item deleted successfully.");
      fetchStocks(false);
    } catch (error) {
      toast.error(error.message || "Failed to delete item.");
    } finally {
      setIsDialogOpen(false);
      setStockToDelete(null);
    }
  };

  const handleWipeAll = async () => {
    if (isManager || !deletePassword)
      return toast.error("Verification failed.");
    setWiping(true);
    try {
      const currentUser = admin?.data || admin || {};
      await stockService.deleteAllStocks({
        password: deletePassword,
        email: currentUser.email,
        user: currentUser,
      });
      toast.success("All inventory records have been wiped.");
      setIsDeleteAllOpen(false);
      setDeletePassword("");
      setShowPassword(false);
      fetchStocks(false);
    } catch (error) {
      toast.error(error.message || "Incorrect Admin Password.");
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

  const handleDisabledClick = (idOrAction) => {
    setWarningTooltip(idOrAction);
    setTimeout(() => setWarningTooltip(null), 2500);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <div
              className={`p-2.5 ${theme.primaryBg} rounded-xl border ${theme.primaryBorder}`}
            >
              <Package className={theme.primaryText} size={28} />
            </div>
            Stock Inventory
          </h1>
          <p className="text-zinc-400 mt-2 text-sm font-medium">
            Track materials and finished goods.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Button
              variant="module"
              onClick={() =>
                isManager
                  ? handleDisabledClick("wipe-all")
                  : setIsDeleteAllOpen(true)
              }
              className={`h-11 px-5 border-rose-500/40 text-rose-400 bg-rose-950/30 hover:bg-rose-900/40 hover:border-rose-400/60 ${isManager ? "opacity-50 !cursor-not-allowed" : ""}`}
            >
              <AlertOctagon size={16} /> Wipe Data
            </Button>
            {warningTooltip === "wipe-all" && (
              <div className="absolute top-full mt-2 right-0 md:left-1/2 md:-translate-x-1/2 z-[9999] animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-[#09090B] border border-red-500/30 text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                  <span className="bg-red-500/20 p-1 rounded-md text-[10px] leading-none">
                    🚫
                  </span>{" "}
                  Admin Only
                </div>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            className="h-11 px-5 gap-2 rounded-xl border-zinc-800 text-zinc-300 hover:bg-zinc-800/50 hover:text-white hover:border-zinc-700 transition-colors text-xs"
            onClick={handleExport}
          >
            <Download size={16} /> Export View
          </Button>
          <Link to="/enterprise/stock/add">
            <Button
              variant="primary"
              className="h-11 px-5 gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-900/20 active:scale-95 transition-all text-xs"
            >
              <Plus size={18} /> Add Stock
            </Button>
          </Link>
        </div>
      </div>

      {/* 🚀 SMART BACKUP WARNING */}
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
                You haven't downloaded the inventory snapshot for{" "}
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

      <div className="bg-[#09090B] rounded-2xl border border-zinc-800/60 overflow-visible relative">
        {loading && !loadingMore && (
          <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-sm rounded-2xl">
            <Loader />
          </div>
        )}
        <div className="p-5 border-b border-zinc-800/60 flex flex-col md:flex-row justify-between gap-4 items-center bg-[#09090B] rounded-t-2xl">
          <h2 className="text-lg font-bold text-white">All Items</h2>
          <div className="relative w-full md:w-80 group">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${searchTerm ? theme.primaryText : "text-zinc-500 group-hover:text-zinc-400"}`}
              size={16}
            />
            <input
              type="text"
              placeholder="Search items..."
              className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-zinc-100 outline-none transition-all ${theme.primaryFocus}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="p-3 border-b border-zinc-800/60 flex flex-wrap items-center gap-3 bg-zinc-900/20">
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-bold uppercase tracking-wider px-2 border-r border-zinc-800 mr-2">
            <Filter size={14} /> Filters{" "}
            {activeFiltersCount > 0 && (
              <span className="bg-indigo-500/20 text-indigo-400 px-1.5 rounded-full ml-1 border border-indigo-500/30">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <div className="relative group">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={`appearance-none bg-transparent border border-zinc-800 rounded-full pl-4 pr-10 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
            >
              <option value="All" className="bg-[#09090B]">
                All Categories
              </option>
              <option value="Purchasing Item" className="bg-[#09090B]">
                Purchasing Item
              </option>
              <option value="Finished Good" className="bg-[#09090B]">
                Finished Good
              </option>
              <option value="Other" className="bg-[#09090B]">
                Other
              </option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:text-zinc-400"
            />
          </div>
          <div className="relative group">
            <select
              value={filterStockLevel}
              onChange={(e) => setFilterStockLevel(e.target.value)}
              className={`appearance-none bg-transparent border border-zinc-800 rounded-full pl-4 pr-10 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
            >
              <option value="All" className="bg-[#09090B]">
                Any Stock Level
              </option>
              <option value="Low" className="bg-[#09090B]">
                Low (&lt; 100)
              </option>
              <option value="Medium" className="bg-[#09090B]">
                Medium (100 - 1000)
              </option>
              <option value="High" className="bg-[#09090B]">
                High (&gt; 1000)
              </option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:text-zinc-400"
            />
          </div>
          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                setFilterCategory("All");
                setFilterStockLevel("All");
                setSearchTerm("");
              }}
              className="text-xs font-bold text-zinc-500 hover:text-white underline underline-offset-2 ml-2 transition-colors flex items-center gap-1"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#09090B] text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                <th className="p-5 md:pl-6 whitespace-nowrap min-w-[220px]">
                  Item Name
                </th>
                <th className="p-5 whitespace-nowrap">Category</th>
                <th className="p-5 whitespace-nowrap">Quantity</th>
                <th className="p-5 whitespace-nowrap">Unit Price</th>
                <th className="p-5 whitespace-nowrap">Total Value</th>
                <th className="p-5 md:pr-6 text-right whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-sm">
              {filteredStocks.map((stock) => (
                <tr
                  key={stock._id}
                  id={stock._id}
                  className={`transition-all duration-1000 ease-out group border-l-4 ${
                    activeHighlight === stock._id
                      ? `${isTransport ? "bg-cyan-500/[0.08] shadow-[inset_0_0_20px_rgba(6,182,212,0.05)] border-cyan-500" : "bg-indigo-500/[0.08] shadow-[inset_0_0_20px_rgba(99,102,241,0.05)] border-indigo-500"}`
                      : "border-transparent hover:bg-zinc-800/30"
                  }`}
                >
                  <td className="p-5 md:pl-6 align-middle">
                    <div className="font-medium text-zinc-100 group-hover:text-white whitespace-nowrap">
                      {stock.name}
                    </div>
                    {Array.isArray(stock.editHistory) &&
                    stock.editHistory.length > 0 ? (
                      <div
                        onClick={() => openHistory(stock)}
                        className="mt-2 inline-flex flex-col gap-0.5 cursor-pointer bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 p-1.5 rounded-lg transition-all w-max whitespace-nowrap"
                      >
                        <div className="text-[10px] font-mono text-zinc-300 flex items-center gap-1.5 uppercase tracking-widest font-bold">
                          <History size={10} />{" "}
                          {stock.editHistory[stock.editHistory.length - 1]
                            ?.role || "ADMIN"}
                          {stock.editHistory.length > 1 && (
                            <span className="bg-zinc-700/50 text-zinc-300 px-1 py-0.5 rounded text-[8px] ml-1">
                              +{stock.editHistory.length - 1} MORE
                            </span>
                          )}
                        </div>
                        <span className="text-zinc-500 text-[9px] ml-4 font-medium">
                          {stock.editHistory[stock.editHistory.length - 1]?.at
                            ? new Date(
                                stock.editHistory[stock.editHistory.length - 1]
                                  .at,
                              ).toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                    ) : stock.lastEditedRole ? (
                      <div className="text-[10px] font-mono text-zinc-400 font-bold mt-1.5 uppercase tracking-widest whitespace-nowrap w-max">
                        ✍️ {stock.lastEditedRole}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-5 align-middle whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${stock.category === "Purchasing Item" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : stock.category === "Finished Good" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}
                    >
                      {stock.category || "Purchasing Item"}
                    </span>
                  </td>
                  <td className="p-5 font-bold text-white font-mono align-middle whitespace-nowrap">
                    {Number(stock.quantity).toLocaleString()}{" "}
                    <span className="text-xs font-normal text-zinc-500 ml-1">
                      {stock.unit || "-"}
                    </span>
                  </td>
                  <td className="p-5 text-zinc-400 align-middle whitespace-nowrap">
                    ₹ {Number(stock.price).toLocaleString()}
                  </td>
                  <td className="p-5 font-bold text-indigo-400 align-middle whitespace-nowrap">
                    ₹{" "}
                    {(
                      Number(stock.price) * Number(stock.quantity)
                    ).toLocaleString()}
                  </td>
                  <td className="p-5 md:pr-6 align-middle overflow-visible">
                    <div className="flex justify-end gap-2 items-center relative overflow-visible">
                      <Link
                        to={`/enterprise/stock/edit/${stock._id}`}
                        className="p-2 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                      >
                        <Edit size={18} />
                      </Link>
                      <div className="relative overflow-visible">
                        <button
                          onClick={() =>
                            isManager
                              ? handleDisabledClick(stock._id)
                              : handleDeleteClick(stock)
                          }
                          className={`p-2 rounded-lg transition-colors ${isManager ? "text-zinc-600 cursor-not-allowed hover:bg-red-500/5 hover:text-red-400/50" : "text-zinc-400 hover:text-red-400 hover:bg-red-500/10"}`}
                        >
                          <Trash2 size={18} />
                        </button>
                        {warningTooltip === stock._id && (
                          <div className="absolute bottom-full right-0 mb-2 z-[9999] animate-in fade-in zoom-in-95 duration-200">
                            <div className="bg-[#09090B] border border-red-500/30 text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                              <span className="bg-red-500/20 p-1 rounded-md text-[10px] leading-none">
                                🚫
                              </span>{" "}
                              Admin Only
                            </div>
                            <div className="absolute -bottom-1 right-3 w-2 h-2 bg-[#09090B] border-b border-r border-red-500/30 rotate-45"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStocks.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan="6"
                    className="p-10 text-center text-zinc-500 text-sm italic"
                  >
                    No stock items match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* 🚀 LOAD MORE BUTTON */}
          {hasMore && filteredStocks.length > 0 && (
            <div className="flex justify-center p-6 border-t border-zinc-800/60">
              <Button
                onClick={() => fetchStocks(true)}
                disabled={loadingMore}
                variant="outline"
                className="text-zinc-400 border-zinc-700 hover:text-white hover:bg-zinc-800/50"
              >
                {loadingMore ? (
                  <RefreshCcw size={16} className="animate-spin mr-2" />
                ) : null}{" "}
                {loadingMore ? "Loading..." : "Load Next 50 Records"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* HISTORY MODAL */}
      {historyModal.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() =>
              setHistoryModal({ isOpen: false, data: [], itemName: "" })
            }
          />
          <div className="bg-[#09090B] border border-zinc-800/60 rounded-2xl w-full max-w-md relative z-10 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800/60 bg-[#09090B] shrink-0">
              <div className="flex items-center gap-2 text-white font-bold tracking-wide text-sm">
                <History size={16} className="text-indigo-400" /> Edit History:{" "}
                <span className="text-indigo-300 font-normal">
                  {historyModal.itemName}
                </span>
              </div>
              <button
                onClick={() =>
                  setHistoryModal({ isOpen: false, data: [], itemName: "" })
                }
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-3">
              {historyModal.data.map((log, index) => (
                <div
                  key={index}
                  className={`bg-zinc-900/30 border ${index === 0 ? "border-indigo-500/30" : "border-zinc-800"} rounded-xl p-4 flex items-center justify-between relative overflow-hidden`}
                >
                  {index === 0 && (
                    <div className="absolute left-0 top-0 w-1 h-full bg-indigo-500"></div>
                  )}
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${index === 0 ? "bg-indigo-500/10 text-indigo-400" : "bg-zinc-800/50 text-zinc-400"}`}
                    >
                      {(log.role || "A")[0].toUpperCase()}
                    </div>
                    <div>
                      <h4
                        className={`font-bold tracking-widest uppercase text-sm ${index === 0 ? "text-white" : "text-zinc-400"}`}
                      >
                        {log.role || "ADMIN"}
                      </h4>
                      <p className="text-zinc-500 text-[10px] font-mono mt-0.5">
                        {log.email || log.by || "admin@system.com"}
                      </p>
                      <p
                        className={`text-[10px] font-mono mt-1 ${index === 0 ? "text-indigo-400" : "text-zinc-500"}`}
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
                    <div className="bg-indigo-500/10 border-indigo-500/20 text-indigo-400 text-[10px] font-bold px-3 py-1 rounded-lg tracking-widest uppercase border">
                      LATEST
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* UPGRADED SECURE DELETE ALL MODAL */}
      {isDeleteAllOpen && !isManager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div
            className="absolute inset-0"
            onClick={() => !wiping && setIsDeleteAllOpen(false)}
          />
          <div className="bg-[#09090B] border border-red-900/50 rounded-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col p-6 sm:p-8">
            <div className="flex items-center gap-3 text-red-500 mb-6">
              <AlertOctagon size={28} />
              <h2 className="text-xl font-bold tracking-wide">
                Wipe Inventory Database
              </h2>
            </div>

            {/* 🚀 UPDATED: WIPE MODAL BACKUP SECTION WITH MONTH SELECTOR */}
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
                      <Download size={14} className="mr-2" /> Download Snapshot
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-red-100/70 text-sm mb-4">
              This action will{" "}
              <strong className="text-red-500">PERMANENTLY DELETE ALL</strong>{" "}
              inventory records. Please enter your Admin password to confirm.
            </p>
            <div className="relative mb-8">
              <input
                type={showPassword ? "text" : "password"}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your admin password..."
                className="w-full bg-zinc-900/50 border border-red-900/30 focus:border-red-500/50 rounded-xl px-4 py-3 text-red-100 placeholder:text-red-100/20 outline-none transition-all"
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
                isLoading={wiping}
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

      {/* Single Item Delete Modal */}
      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Stock Item"
        message={`Are you sure you want to delete "${stockToDelete?.name}"?`}
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
};

export default StockList;
