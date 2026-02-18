import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import stockService from "../../services/stockService";
import { useUI } from "../../context/UIProvider";
import { Plus, Edit, Trash2, Search, Package } from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const StockList = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stockToDelete, setStockToDelete] = useState(null);

  const { toast } = useUI();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // ✅ REMOVED ARTIFICIAL TIMEOUT DELAY
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#020403] text-emerald-100/40 text-xs uppercase tracking-wider font-semibold">
                <th className="p-5 md:pl-6">Item Name</th>
                <th className="p-5">Category</th>
                <th className="p-5">Quantity</th>
                <th className="p-5">Unit Price</th>
                <th className="p-5">Total Value</th>
                <th className="p-5 md:pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/20 text-sm">
              {filteredStocks.map((stock) => (
                <tr
                  key={stock._id}
                  className="hover:bg-emerald-900/10 transition-colors group"
                >
                  <td className="p-5 md:pl-6 font-medium text-emerald-100/90 group-hover:text-white">
                    {stock.name}
                  </td>
                  <td className="p-5">
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
                  <td className="p-5 font-bold text-white font-mono">
                    {stock.quantity}{" "}
                    <span className="text-xs font-normal text-emerald-100/40 ml-1">
                      {stock.unit}
                    </span>
                  </td>
                  <td className="p-5 text-emerald-100/60">₹ {stock.price}</td>
                  <td className="p-5 font-bold text-emerald-400">
                    ₹ {(stock.price * stock.quantity).toLocaleString()}
                  </td>
                  <td className="p-5 md:pr-6 text-right flex justify-end gap-2">
                    <Link
                      to={`/enterprise/stock/edit/${stock._id}`}
                      className="p-2 text-emerald-100/40 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                    >
                      <Edit size={18} />
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(stock)}
                      className="p-2 text-emerald-100/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
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
