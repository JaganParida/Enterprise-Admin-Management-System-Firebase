import React, { useState, useEffect } from "react";
import cashService from "../../services/cashService";
import { useUI } from "../../context/UIProvider";
import {
  Wallet,
  Plus,
  Trash2,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Edit,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { Link } from "react-router-dom";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const CashBook = () => {
  const { toast } = useUI();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);

  const fetchCashLogs = async () => {
    try {
      // ✅ REMOVED ARTIFICIAL TIMEOUT
      const { data } = await cashService.getTransactions();

      setLogs(data);
      const income = data
        .filter((l) => l.type === "Income")
        .reduce((acc, curr) => acc + curr.amount, 0);
      const expense = data
        .filter((l) => l.type === "Expense")
        .reduce((acc, curr) => acc + curr.amount, 0);
      setStats({ income, expense, balance: income - expense });
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast.error("Failed to load cash logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashLogs();
  }, []);

  const handleDeleteClick = (id) => {
    setLogToDelete(id);
    setIsDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!logToDelete) return;

    try {
      await cashService.deleteTransaction(logToDelete);
      toast.info("Transaction deleted");
      fetchCashLogs();
    } catch (error) {
      toast.error("Failed to delete entry");
    } finally {
      setIsDialogOpen(false);
      setLogToDelete(null);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* LEFT: Balance Card */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-gradient-to-br from-emerald-900/80 to-[#050a08] rounded-2xl p-6 border border-emerald-500/30 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Wallet size={120} className="text-emerald-400" />
          </div>
          <h3 className="text-emerald-100/60 font-medium text-sm uppercase tracking-wider mb-1">
            Current Balance
          </h3>
          <h2 className="text-4xl font-bold text-white mb-6">
            ₹ {stats.balance.toLocaleString()}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm font-bold">
            <div className="bg-[#020403]/50 p-3 rounded-xl border border-emerald-900/30">
              <div className="flex items-center gap-2 text-emerald-400 uppercase mb-1">
                <ArrowUpRight size={14} /> Income
              </div>
              <p className="text-white">₹ {stats.income.toLocaleString()}</p>
            </div>
            <div className="bg-[#020403]/50 p-3 rounded-xl border border-emerald-900/30">
              <div className="flex items-center gap-2 text-rose-400 uppercase mb-1">
                <ArrowDownLeft size={14} /> Expense
              </div>
              <p className="text-white">₹ {stats.expense.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Quick Link to Add Entry */}
        <div className="bg-[#050a08] rounded-2xl shadow-xl border border-emerald-900/30 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
          <Link to="/enterprise/cash/add">
            <Button className="w-full gap-2 shadow-lg shadow-emerald-900/20">
              <Plus size={18} /> Add New Entry
            </Button>
          </Link>
        </div>
      </div>

      {/* RIGHT: Recent Transactions List */}
      <div className="lg:col-span-2">
        <div className="bg-[#050a08] rounded-2xl shadow-xl border border-emerald-900/30 overflow-hidden h-full">
          <div className="p-6 border-b border-emerald-900/20 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">
              Recent Transactions
            </h3>
            <Link to="/enterprise/cash/report">
              <span className="group flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                View Full Report →
              </span>
            </Link>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#020403] text-emerald-100/40 uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="p-5">Date</th>
                  <th className="p-5">Category</th>
                  <th className="p-5 text-right">Amount</th>
                  <th className="p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/20">
                {logs.map((log) => (
                  <tr
                    key={log._id}
                    className="hover:bg-emerald-900/10 transition-colors group"
                  >
                    <td className="p-5 text-emerald-100/60 font-mono text-xs">
                      <Calendar size={14} className="inline mr-2" />
                      {new Date(log.date).toLocaleDateString()}
                    </td>
                    <td className="p-5 font-bold text-white">
                      {log.category}
                      {log.remarks && (
                        <span className="block text-xs font-normal text-emerald-100/30">
                          {log.remarks}
                        </span>
                      )}
                    </td>
                    <td
                      className={`p-5 text-right font-bold font-mono ${
                        log.type === "Income"
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {log.type === "Income" ? "+" : "-"} ₹
                      {log.amount.toLocaleString()}
                    </td>
                    <td className="p-5 text-right flex justify-end gap-2">
                      <Link to={`/enterprise/cash/edit/${log._id}`}>
                        <button className="text-emerald-100/20 hover:text-emerald-400 transition-colors p-1">
                          <Edit size={16} />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(log._id)}
                        className="text-emerald-100/20 hover:text-rose-400 transition-colors p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
                      className="p-8 text-center text-emerald-100/30"
                    >
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Transaction?"
        message="Are you sure you want to delete this cash book entry? This will affect your balance."
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
};

export default CashBook;
