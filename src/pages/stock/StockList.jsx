import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import stockService from "../../services/stockService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import { Plus, Edit, Trash2, Search, Package, History, X } from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const StockList = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stockToDelete, setStockToDelete] = useState(null);

  const [warningTooltip, setWarningTooltip] = useState(null);

  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    itemName: "",
  });

  const { toast } = useUI();
  const { admin } = useAuth();

  const isManager = admin?.data?.role === "manager";

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data } = await stockService.getAllStocks();
        setStocks(data);
      } catch (error) {
        console.error("Error fetching stocks:", error);
        toast.error("Failed to load inventory data.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const refreshStocks = async () => {
    try {
      const { data } = await stockService.getAllStocks();
      setStocks(data);
    } catch (error) {
      console.error("Error refreshing:", error);
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

  const openHistory = (stock) => {
    const sortedHistory = stock.editHistory
      ? [...stock.editHistory].reverse()
      : [];
    setHistoryModal({
      isOpen: true,
      data: sortedHistory,
      itemName: stock.name,
    });
  };

  const handleDisabledClick = (stockId) => {
    setWarningTooltip(stockId);
    setTimeout(() => {
      setWarningTooltip(null);
    }, 2500);
  };

  const filteredStocks = stocks.filter((stock) =>
    stock.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 border border-emerald-500/20">
              <Package size={24} />
            </div>
            Stock Inventory
          </h1>
          <p className="text-emerald-100/40 text-sm mt-1 ml-1">
            Track raw materials and finished goods.
          </p>
        </div>
        <Link to="/enterprise/stock/add">
          <Button className="gap-2 shadow-lg shadow-emerald-900/20">
            <Plus size={18} /> Add Stock
          </Button>
        </Link>
      </div>

      <div className="bg-[#050a08] rounded-2xl shadow-xl border border-emerald-900/30 overflow-hidden">
        <div className="p-6 border-b border-emerald-900/20 flex flex-col sm:flex-row justify-between gap-4 items-center">
          <h2 className="text-lg font-bold text-white">All Items</h2>
          <div className="relative w-full sm:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/30"
              size={16}
            />
            <input
              type="text"
              placeholder="Search items..."
              className="w-full bg-[#020403] border border-emerald-900/30 rounded-xl pl-9 pr-3 py-2 text-sm text-emerald-100 focus:border-emerald-500/50 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto pb-4">
          <table className="w-full text-left border-collapse min-w-max">
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

                    {/* 🛡️ ROLE-BASED HISTORY BADGE */}
                    {stock.editHistory && stock.editHistory.length > 0 ? (
                      <div
                        onClick={() => openHistory(stock)}
                        className="mt-2 inline-flex flex-col gap-0.5 cursor-pointer bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg transition-all w-max whitespace-nowrap"
                        title="Click to view full edit history"
                      >
                        <div className="text-[10px] font-mono text-emerald-400/90 flex items-center gap-1.5 uppercase tracking-widest font-bold">
                          <History size={10} />
                          {stock.editHistory[stock.editHistory.length - 1]
                            .role || "ADMIN"}

                          {stock.editHistory.length > 1 && (
                            <span className="bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded text-[8px] ml-1">
                              +{stock.editHistory.length - 1} MORE
                            </span>
                          )}
                        </div>
                        <span className="text-emerald-100/30 text-[9px] ml-4 font-medium">
                          {new Date(
                            stock.editHistory[stock.editHistory.length - 1].at,
                          ).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
                        stock.category === "Raw Material"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}
                    >
                      {stock.category}
                    </span>
                  </td>
                  <td className="p-5 font-bold text-white font-mono align-middle whitespace-nowrap">
                    {stock.quantity}{" "}
                    <span className="text-xs font-normal text-emerald-100/40 ml-1">
                      {stock.unit}
                    </span>
                  </td>
                  <td className="p-5 text-emerald-100/60 align-middle whitespace-nowrap">
                    ₹ {stock.price}
                  </td>
                  <td className="p-5 font-bold text-emerald-400 align-middle whitespace-nowrap">
                    ₹ {(stock.price * stock.quantity).toLocaleString()}
                  </td>
                  <td className="p-5 md:pr-6 align-middle">
                    <div className="flex justify-end gap-2 items-center">
                      <Link
                        to={`/enterprise/stock/edit/${stock._id}`}
                        className="p-2 text-emerald-100/40 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                      >
                        <Edit size={18} />
                      </Link>

                      <div className="relative flex items-center">
                        <button
                          onClick={() =>
                            isManager
                              ? handleDisabledClick(stock._id)
                              : handleDeleteClick(stock)
                          }
                          className={`p-2 rounded-lg transition-colors ${
                            isManager
                              ? "text-emerald-100/20 opacity-50 cursor-not-allowed hover:bg-red-500/5 hover:text-red-400/50"
                              : "text-emerald-100/40 hover:text-red-400 hover:bg-red-500/10"
                          }`}
                        >
                          <Trash2 size={18} />
                        </button>

                        {warningTooltip === stock._id && (
                          <div className="absolute bottom-full right-0 mb-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="bg-[#050a08] border border-red-500/30 shadow-xl shadow-red-900/20 text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                              <span className="bg-red-500/20 p-1 rounded-md text-[10px] leading-none">
                                🚫
                              </span>
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
                    className="p-8 text-center text-emerald-100/30 text-sm"
                  >
                    No stock items found. Add your first item!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {historyModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#050a08] border border-emerald-900/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-emerald-900/20 flex justify-between items-center bg-[#020403]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History size={18} className="text-emerald-500" />
                Log History:{" "}
                <span className="text-emerald-400 text-sm ml-1">
                  {historyModal.itemName}
                </span>
              </h3>
              <button
                onClick={() =>
                  setHistoryModal({ isOpen: false, data: [], itemName: "" })
                }
                className="text-emerald-100/40 hover:text-white p-1 hover:bg-emerald-500/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {historyModal.data.map((edit, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-[#020403] p-4 rounded-xl border border-emerald-900/20 relative overflow-hidden group hover:border-emerald-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-black text-sm uppercase shadow-inner">
                      {edit.role ? edit.role.charAt(0) : "A"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-100 uppercase tracking-widest">
                        {edit.role || "Admin"}
                      </p>
                      <p className="text-[9px] text-emerald-100/30 font-mono mt-0.5">
                        {edit.by}
                      </p>
                      <p className="text-[10px] text-emerald-400/60 font-mono mt-1">
                        {new Date(edit.at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  {idx === 0 && (
                    <span className="relative z-10 text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md uppercase font-black tracking-widest border border-emerald-500/20">
                      Latest
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Stock Item"
        message={`Are you sure you want to delete "${stockToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
};

export default StockList;
