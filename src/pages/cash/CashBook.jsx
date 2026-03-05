import React, { useState, useEffect } from "react";
import cashService from "../../services/cashService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Wallet,
  Plus,
  Trash2,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Edit,
  History,
  X,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { Link } from "react-router-dom";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const CashBook = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);

  const [warningTooltip, setWarningTooltip] = useState(null);
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    itemName: "",
  });

  const isManager = admin?.data?.role === "manager";

  const fetchCashLogs = async () => {
    try {
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

  const handleDisabledClick = (id) => {
    setWarningTooltip(id);
    setTimeout(() => setWarningTooltip(null), 2500);
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

  const openHistory = (log) => {
    const sortedHistory = log.editHistory ? [...log.editHistory].reverse() : [];
    setHistoryModal({
      isOpen: true,
      data: sortedHistory,
      itemName: `${log.category} (₹${log.amount})`,
    });
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );

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

          <div className="overflow-x-auto overflow-y-auto max-h-[600px] pb-4">
            <table className="w-full text-left text-sm min-w-max">
              <thead className="bg-[#020403] text-emerald-100/40 uppercase tracking-wider sticky top-0 z-20">
                <tr>
                  <th className="p-5 whitespace-nowrap min-w-[120px]">Date</th>
                  <th className="p-5 whitespace-nowrap min-w-[200px]">
                    Category
                  </th>
                  <th className="p-5 text-right whitespace-nowrap">Amount</th>
                  <th className="p-5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/20">
                {logs.map((log) => (
                  <tr
                    key={log._id}
                    className="hover:bg-emerald-900/10 transition-colors group"
                  >
                    <td className="p-5 align-middle">
                      <div className="text-emerald-100/60 font-mono text-xs whitespace-nowrap">
                        <Calendar size={14} className="inline mr-2" />
                        {new Date(log.date).toLocaleDateString()}
                      </div>

                      {/* 🛡️ ROLE-BASED HISTORY BADGE WITH DATE & TIME FIXED */}
                      {log.editHistory && log.editHistory.length > 0 ? (
                        <div
                          onClick={() => openHistory(log)}
                          className="mt-2 flex flex-col gap-0.5 cursor-pointer bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg transition-all w-max whitespace-nowrap"
                          title="Click to view full edit history"
                        >
                          <div className="text-[10px] font-mono text-emerald-400/90 flex items-center gap-1.5 uppercase tracking-widest font-bold">
                            <History size={10} />
                            {log.editHistory[log.editHistory.length - 1].role ||
                              "ADMIN"}

                            {log.editHistory.length > 1 && (
                              <span className="bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded text-[8px] ml-1">
                                +{log.editHistory.length - 1} MORE
                              </span>
                            )}
                          </div>
                          {/* ⏱️ YEH LINE MISSING THI */}
                          <span className="text-emerald-100/30 text-[9px] ml-4 font-medium">
                            {new Date(
                              log.editHistory[log.editHistory.length - 1].at,
                            ).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ) : log.lastEditedRole ? (
                        <div className="text-[10px] font-mono text-emerald-400/70 font-bold mt-1.5 uppercase tracking-widest whitespace-nowrap w-max flex flex-col gap-0.5">
                          <span>✍️ {log.lastEditedRole}</span>
                          {/* ⏱️ Fallback Date/Time */}
                          {log.lastEditedAt && (
                            <span className="text-emerald-100/30 text-[9px] ml-4 font-medium normal-case tracking-normal">
                              {new Date(log.lastEditedAt).toLocaleString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </td>
                    <td className="p-5 align-middle whitespace-nowrap">
                      <div className="font-bold text-white">
                        {log.category}
                        {log.remarks && (
                          <span className="block text-xs font-normal text-emerald-100/30 mt-1">
                            {log.remarks}
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className={`p-5 text-right font-bold font-mono align-middle whitespace-nowrap ${
                        log.type === "Income"
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {log.type === "Income" ? "+" : "-"} ₹
                      {log.amount.toLocaleString()}
                    </td>
                    <td className="p-5 align-middle">
                      <div className="flex justify-end gap-2 items-center">
                        <Link to={`/enterprise/cash/edit/${log._id}`}>
                          <button className="text-emerald-100/20 hover:text-emerald-400 transition-colors p-2 rounded-lg hover:bg-emerald-500/10">
                            <Edit size={16} />
                          </button>
                        </Link>

                        <div className="relative flex items-center">
                          <button
                            onClick={() =>
                              isManager
                                ? handleDisabledClick(log._id)
                                : handleDeleteClick(log._id)
                            }
                            className={`p-2 rounded-lg transition-colors ${
                              isManager
                                ? "text-emerald-100/20 opacity-50 cursor-not-allowed hover:bg-red-500/5 hover:text-red-400/50"
                                : "text-emerald-100/20 hover:text-red-400 hover:bg-red-500/10"
                            }`}
                          >
                            <Trash2 size={16} />
                          </button>

                          {warningTooltip === log._id && (
                            <div className="absolute bottom-full right-0 mb-2 z-50 animate-in fade-in zoom-in-95 duration-200">
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
        title="Delete Transaction?"
        message="Are you sure you want to delete this cash book entry? This will affect your balance."
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
};

export default CashBook;
