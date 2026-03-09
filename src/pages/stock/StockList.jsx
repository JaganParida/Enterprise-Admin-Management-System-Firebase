import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Input from "../../components/common/Input";

const StockList = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStockLevel, setFilterStockLevel] = useState("All");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stockToDelete, setStockToDelete] = useState(null);

  // Delete All State
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [wiping, setWiping] = useState(false);

  const [warningTooltip, setWarningTooltip] = useState(null);
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    itemName: "",
  });

  const { toast } = useUI();
  const { admin } = useAuth();

  // Role Detection
  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data } = await stockService.getAllStocks();
        setStocks(data || []);
      } catch (error) {
        console.error("Error fetching stocks:", error);
        toast.error("Failed to load inventory data.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [toast]);

  const refreshStocks = async () => {
    try {
      const { data } = await stockService.getAllStocks();
      setStocks(data || []);
    } catch (error) {
      console.error("Error refreshing:", error);
    }
  };

  // ADVANCED FILTERING LOGIC
  const filteredStocks = stocks.filter((stock) => {
    const matchesSearch = stock.name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === "All" || stock.category === filterCategory;

    let matchesStockLevel = true;
    if (filterStockLevel !== "All") {
      const qty = Number(stock.quantity) || 0;
      if (filterStockLevel === "Low") matchesStockLevel = qty < 100;
      else if (filterStockLevel === "Medium")
        matchesStockLevel = qty >= 100 && qty <= 1000;
      else if (filterStockLevel === "High") matchesStockLevel = qty > 1000;
    }
    return matchesSearch && matchesCategory && matchesStockLevel;
  });

  const activeFiltersCount = [filterCategory, filterStockLevel].filter(
    (f) => f !== "All",
  ).length;

  // 🚀 STANDARD EXPORT
  const handleExport = () => {
    try {
      if (filteredStocks.length === 0) return toast.info("No items to export");
      const headers = [
        "Item Name,Category,Quantity,Unit,Unit Price,Total Value",
      ];
      const rows = filteredStocks.map((stock) => {
        const name = `"${stock.name || "Unknown"}"`;
        const category = stock.category || "Purchasing Item";
        const quantity = stock.quantity || 0;
        const unit = stock.unit || "-";
        const price = stock.price || 0;
        const total = Number(stock.quantity) * Number(stock.price) || 0;
        return `${name},${category},${quantity},${unit},${price},${total}`;
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Inventory_Filtered_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Filtered list exported successfully");
    } catch (error) {
      toast.error("Failed to export inventory");
    }
  };

  // 🚀 FULL BACKUP EXPORT
  const handleFullBackup = () => {
    try {
      if (stocks.length === 0) return toast.info("Database is already empty.");
      const headers = [
        "Item Name,Category,Quantity,Unit,Unit Price,Total Value",
      ];
      const rows = stocks.map((stock) => {
        const name = `"${stock.name || "Unknown"}"`;
        const category = stock.category || "Purchasing Item";
        const quantity = stock.quantity || 0;
        const unit = stock.unit || "-";
        const price = stock.price || 0;
        const total = Number(stock.quantity) * Number(stock.price) || 0;
        return `${name},${category},${quantity},${unit},${price},${total}`;
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `FULL_BACKUP_Inventory_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Full database backup downloaded securely!");
    } catch (error) {
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
      await stockService.deleteStock(stockToDelete._id);
      toast.success("Stock item deleted successfully.");
      refreshStocks();
    } catch (error) {
      console.error("Error deleting stock:", error);
      toast.error("Failed to delete item.");
    } finally {
      setIsDialogOpen(false);
      setStockToDelete(null);
    }
  };

  const handleWipeAll = async () => {
    if (isManager)
      return toast.error("Unauthorized: Only Admins can wipe data.");
    if (!deletePassword)
      return toast.error("Password is required to delete all items.");

    setWiping(true);
    try {
      await stockService.deleteAllStocks({ password: deletePassword });
      toast.success("All inventory records have been wiped.");
      setIsDeleteAllOpen(false);
      setDeletePassword("");
      refreshStocks();
    } catch (error) {
      console.error("Wipe Error:", error);
      toast.error(
        error.response?.data?.message || "Authentication failed. Wipe aborted.",
      );
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 border border-emerald-500/20">
              <Package size={24} />
            </div>
            Stock Inventory
          </h1>
          <p className="text-emerald-100/40 text-sm mt-1 ml-1">
            Track materials and finished goods.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Wipe Data Button */}
          <div className="relative">
            <button
              onClick={() =>
                isManager
                  ? handleDisabledClick("wipe-all")
                  : setIsDeleteAllOpen(true)
              }
              className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition-colors text-sm font-bold shadow-lg ${
                isManager
                  ? "bg-red-500/5 text-red-500/50 border-red-500/10 opacity-50 cursor-not-allowed"
                  : "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 shadow-red-900/20"
              }`}
            >
              <AlertOctagon size={16} /> Wipe Data
            </button>
            {warningTooltip === "wipe-all" && (
              <div className="absolute top-full mt-2 right-0 md:left-1/2 md:-translate-x-1/2 z-[9999] animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-[#050a08] border border-red-500/30 shadow-xl shadow-red-900/20 text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                  <span className="bg-red-500/20 p-1 rounded-md text-[10px] leading-none">
                    🚫
                  </span>{" "}
                  Admin Only
                </div>
                <div className="absolute -top-1 right-6 md:left-1/2 md:-translate-x-1/2 w-2 h-2 bg-[#050a08] border-t border-l border-red-500/30 rotate-45"></div>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            className="gap-2 text-xs border-emerald-900/30 hover:bg-emerald-900/10"
            onClick={handleExport}
          >
            <Download size={16} /> Export
          </Button>

          <Link to="/enterprise/stock/add">
            <Button className="gap-2 shadow-lg shadow-emerald-900/20">
              <Plus size={18} /> Add Stock
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-[#050a08] rounded-2xl shadow-xl border border-emerald-900/30 overflow-visible relative">
        {/* Top Search Bar */}
        <div className="p-5 border-b border-emerald-900/20 flex flex-col md:flex-row justify-between gap-4 items-center bg-[#020403]/50">
          <h2 className="text-lg font-bold text-white">All Items</h2>
          <div className="relative w-full md:w-80">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/30"
              size={16}
            />
            <input
              type="text"
              placeholder="Search items..."
              className="w-full bg-[#020403] border border-emerald-900/40 rounded-xl pl-9 pr-3 py-2.5 text-sm text-emerald-100 focus:border-emerald-500/50 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* E-COMMERCE STYLE FILTER BAR */}
        <div className="p-3 border-b border-emerald-900/20 flex flex-wrap items-center gap-3 bg-[#020403]/80">
          <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold uppercase tracking-wider px-2 border-r border-emerald-900/40 mr-2">
            <Filter size={14} /> Filters
            {activeFiltersCount > 0 && (
              <span className="bg-emerald-500 text-[#020403] px-1.5 rounded-full ml-1">
                {activeFiltersCount}
              </span>
            )}
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`text-xs px-3 py-1.5 rounded-full border outline-none cursor-pointer transition-colors ${filterCategory !== "All" ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-transparent border-emerald-900/40 text-emerald-100/60 hover:border-emerald-500/30"}`}
          >
            <option value="All" className="bg-[#050a08] text-emerald-100">
              All Categories
            </option>
            <option
              value="Purchasing Item"
              className="bg-[#050a08] text-emerald-100"
            >
              Purchasing Item
            </option>
            <option
              value="Finished Good"
              className="bg-[#050a08] text-emerald-100"
            >
              Finished Good
            </option>
            <option value="Other" className="bg-[#050a08] text-emerald-100">
              Other
            </option>
          </select>

          <select
            value={filterStockLevel}
            onChange={(e) => setFilterStockLevel(e.target.value)}
            className={`text-xs px-3 py-1.5 rounded-full border outline-none cursor-pointer transition-colors ${filterStockLevel !== "All" ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-transparent border-emerald-900/40 text-emerald-100/60 hover:border-emerald-500/30"}`}
          >
            <option value="All" className="bg-[#050a08] text-emerald-100">
              Any Stock Level
            </option>
            <option value="Low" className="bg-[#050a08] text-emerald-100">
              Low (&lt; 100)
            </option>
            <option value="Medium" className="bg-[#050a08] text-emerald-100">
              Medium (100 - 1000)
            </option>
            <option value="High" className="bg-[#050a08] text-emerald-100">
              High (&gt; 1000)
            </option>
          </select>

          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                setFilterCategory("All");
                setFilterStockLevel("All");
                setSearchTerm("");
              }}
              className="text-xs text-rose-400/80 hover:text-rose-400 underline underline-offset-2 ml-2 transition-colors flex items-center gap-1"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#020403] text-emerald-100/40 text-xs uppercase tracking-wider font-semibold">
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
            <tbody className="divide-y divide-emerald-900/20 text-sm">
              {filteredStocks.map((stock) => (
                <tr
                  key={stock._id}
                  className="hover:bg-emerald-900/10 transition-colors group"
                >
                  <td className="p-5 md:pl-6 align-middle">
                    <div className="font-medium text-emerald-100/90 group-hover:text-white whitespace-nowrap">
                      {stock.name}
                    </div>
                    {Array.isArray(stock.editHistory) &&
                    stock.editHistory.length > 0 ? (
                      <div
                        onClick={() => openHistory(stock)}
                        className="mt-2 inline-flex flex-col gap-0.5 cursor-pointer bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg transition-all w-max whitespace-nowrap"
                      >
                        <div className="text-[10px] font-mono text-emerald-400/90 flex items-center gap-1.5 uppercase tracking-widest font-bold">
                          <History size={10} />{" "}
                          {stock.editHistory[stock.editHistory.length - 1]
                            ?.role || "ADMIN"}
                          {stock.editHistory.length > 1 && (
                            <span className="bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded text-[8px] ml-1">
                              +{stock.editHistory.length - 1} MORE
                            </span>
                          )}
                        </div>
                        <span className="text-emerald-100/30 text-[9px] ml-4 font-medium">
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
                      <div className="text-[10px] font-mono text-emerald-400/70 font-bold mt-1.5 uppercase tracking-widest whitespace-nowrap w-max">
                        ✍️ {stock.lastEditedRole}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-5 align-middle whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                        stock.category === "Purchasing Item"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : stock.category === "Finished Good"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}
                    >
                      {stock.category || "Purchasing Item"}
                    </span>
                  </td>
                  <td className="p-5 font-bold text-white font-mono align-middle whitespace-nowrap">
                    {Number(stock.quantity).toLocaleString()}{" "}
                    <span className="text-xs font-normal text-emerald-100/40 ml-1">
                      {stock.unit || "-"}
                    </span>
                  </td>
                  <td className="p-5 text-emerald-100/60 align-middle whitespace-nowrap">
                    ₹ {Number(stock.price).toLocaleString()}
                  </td>
                  <td className="p-5 font-bold text-emerald-400 align-middle whitespace-nowrap">
                    ₹{" "}
                    {(
                      Number(stock.price) * Number(stock.quantity)
                    ).toLocaleString()}
                  </td>
                  <td className="p-5 md:pr-6 align-middle overflow-visible">
                    <div className="flex justify-end gap-2 items-center relative overflow-visible">
                      <Link
                        to={`/enterprise/stock/edit/${stock._id}`}
                        className="p-2 text-emerald-100/40 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
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
                          className={`p-2 rounded-lg transition-colors ${isManager ? "text-emerald-100/20 opacity-50 cursor-not-allowed hover:bg-red-500/5 hover:text-red-400/50" : "text-emerald-100/40 hover:text-red-400 hover:bg-red-500/10"}`}
                        >
                          <Trash2 size={18} />
                        </button>
                        {warningTooltip === stock._id && (
                          <div className="absolute bottom-full right-0 mb-2 z-[9999] animate-in fade-in zoom-in-95 duration-200">
                            <div className="bg-[#050a08] border border-red-500/30 shadow-xl shadow-red-900/20 text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                              <span className="bg-red-500/20 p-1 rounded-md text-[10px] leading-none">
                                🚫
                              </span>{" "}
                              Action Denied
                            </div>
                            <div className="absolute -bottom-1 right-3 w-2 h-2 bg-[#050a08] border-b border-r border-red-500/30 rotate-45"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStocks.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="p-10 text-center text-emerald-100/30 text-sm italic"
                  >
                    No stock items match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🚀 HISTORY MODAL (FIXED) */}
      {historyModal.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() =>
              setHistoryModal({ isOpen: false, data: [], itemName: "" })
            }
          />
          <div className="bg-[#050a08] border border-emerald-900/30 rounded-2xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-emerald-900/20 bg-[#020403]/50 shrink-0">
              <div className="flex items-center gap-2 text-white font-bold tracking-wide text-sm">
                <History size={16} className="text-emerald-500" />
                Edit History:{" "}
                <span className="text-emerald-400 font-normal">
                  {historyModal.itemName}
                </span>
              </div>
              <button
                onClick={() =>
                  setHistoryModal({ isOpen: false, data: [], itemName: "" })
                }
                className="text-emerald-100/40 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-3">
              {historyModal.data.map((log, index) => (
                <div
                  key={index}
                  className={`bg-[#020403] border ${index === 0 ? "border-emerald-500/30" : "border-emerald-900/10"} rounded-xl p-4 flex items-center justify-between relative overflow-hidden`}
                >
                  {index === 0 && (
                    <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500"></div>
                  )}
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${index === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-900/10 text-emerald-100/30"}`}
                    >
                      {(log.role || "A")[0].toUpperCase()}
                    </div>
                    <div>
                      <h4
                        className={`font-bold tracking-widest uppercase text-sm ${index === 0 ? "text-white" : "text-emerald-100/50"}`}
                      >
                        {log.role || "ADMIN"}
                      </h4>
                      <p className="text-emerald-100/20 text-[10px] font-mono mt-0.5">
                        {log.by || "system@enterprise.com"}
                      </p>
                      <p
                        className={`text-[10px] font-mono mt-1 ${index === 0 ? "text-emerald-400" : "text-emerald-100/30"}`}
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
                    <div className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-lg tracking-widest uppercase border">
                      LATEST
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🚀 UPGRADED SECURE DELETE ALL MODAL */}
      {isDeleteAllOpen && !isManager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#050a08] border border-red-900/50 rounded-2xl shadow-2xl shadow-red-900/20 w-full max-w-md p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full pointer-events-none"></div>

            <div className="flex items-center gap-3 mb-6 text-red-500">
              <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                <AlertOctagon size={24} />
              </div>
              <h3 className="text-xl font-bold">Wipe Inventory</h3>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mb-6 flex flex-col gap-4 relative z-10">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  className="text-amber-500 shrink-0 mt-0.5"
                  size={20}
                />
                <div>
                  <h4 className="text-amber-400 text-sm font-bold">
                    Recommended: Safe Backup
                  </h4>
                  <p className="text-amber-100/60 text-[11px] mt-1">
                    Download a CSV backup of all current inventory records.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleFullBackup}
                className="w-full flex items-center justify-center gap-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-bold py-2.5 rounded-lg transition-colors"
              >
                <Download size={14} /> Download Backup
              </button>
            </div>

            <p className="text-sm text-emerald-100/60 mb-4">
              Enter Admin password to confirm permanent deletion.
            </p>

            <Input
              type="password"
              placeholder="Admin password..."
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="bg-[#020403] border-red-900/30 focus:border-red-500/50 relative z-10"
            />

            <div className="flex justify-end gap-3 mt-8 relative z-10">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsDeleteAllOpen(false);
                  setDeletePassword("");
                }}
              >
                Cancel
              </Button>
              <button
                onClick={handleWipeAll}
                disabled={!deletePassword || wiping}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm transition-colors"
              >
                {wiping ? "Wiping..." : "Confirm Wipe"}
              </button>
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
