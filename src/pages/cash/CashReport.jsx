import React, { useState, useEffect } from "react";
import cashService from "../../services/cashService";
import {
  ArrowUp,
  ArrowDown,
  Wallet,
  Filter,
  Download,
  Search,
  X,
  AlertOctagon,
  ShieldAlert,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { Link } from "react-router-dom";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/common/Input";

const CashReport = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🚀 Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterAmount, setFilterAmount] = useState("All");
  const [filterDate, setFilterDate] = useState("All");
  const [filterExactDate, setFilterExactDate] = useState("");

  // 🚀 Delete All State
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [wiping, setWiping] = useState(false);
  const [warningTooltip, setWarningTooltip] = useState(null);

  // Role Detection
  const isManager = admin?.data?.role === "manager";

  const fetchData = async () => {
    try {
      const { data } = await cashService.getTransactions();
      setTransactions(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🚀 ADVANCED FILTERING LOGIC
  const filteredTransactions = transactions.filter((t) => {
    // 1. Search Filter
    const matchesSearch =
      t.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.remarks && t.remarks.toLowerCase().includes(searchTerm.toLowerCase()));

    // 2. Type Filter
    const matchesType = filterType === "All" || t.type === filterType;

    // 3. Amount Filter
    let matchesAmount = true;
    if (filterAmount !== "All") {
      const amt = Number(t.amount) || 0;
      if (filterAmount === "Under5k") matchesAmount = amt < 5000;
      else if (filterAmount === "5k-20k")
        matchesAmount = amt >= 5000 && amt <= 20000;
      else if (filterAmount === "Above20k") matchesAmount = amt > 20000;
    }

    // 4. Date Filter
    let matchesDate = true;
    if (filterExactDate && t.date) {
      const tDateObj = new Date(t.date);
      const formattedTDate = `${tDateObj.getFullYear()}-${String(tDateObj.getMonth() + 1).padStart(2, "0")}-${String(tDateObj.getDate()).padStart(2, "0")}`;
      matchesDate = formattedTDate === filterExactDate;
    } else if (filterDate !== "All" && t.date) {
      const tDate = new Date(t.date);
      const today = new Date();
      const diffTime = Math.abs(today - tDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (filterDate === "Today") matchesDate = diffDays <= 1;
      else if (filterDate === "Last7Days") matchesDate = diffDays <= 7;
      else if (filterDate === "ThisMonth")
        matchesDate =
          tDate.getMonth() === today.getMonth() &&
          tDate.getFullYear() === today.getFullYear();
    }

    return matchesSearch && matchesType && matchesAmount && matchesDate;
  });

  const activeFiltersCount =
    [filterType, filterAmount, filterDate].filter((f) => f !== "All").length +
    (filterExactDate ? 1 : 0);

  // 🚀 DYNAMIC STATS (Based on FILTERED Data)
  const totalIncome = filteredTransactions
    .filter((t) => t.type === "Income")
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalExpense = filteredTransactions
    .filter((t) => t.type === "Expense")
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const balance = totalIncome - totalExpense;

  // 🚀 STANDARD EXPORT (Filtered data)
  const handleExport = () => {
    try {
      if (filteredTransactions.length === 0)
        return toast.info("No data to export");

      const headers = ["Date", "Type", "Category", "Amount", "Remarks"];
      const rows = filteredTransactions.map((t) => {
        let dateStr = "-";
        if (t.date) {
          const d = new Date(t.date);
          dateStr = `\t${d.toLocaleDateString("en-GB")}`;
        }
        const type = t.type || "-";
        const category = t.category ? `"${t.category}"` : "-";
        const amount = t.amount || 0;
        const remarks = t.remarks ? `"${t.remarks.replace(/"/g, '""')}"` : "";

        return `${dateStr},${type},${category},${amount},${remarks}`;
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Cash_Report_Filtered_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Filtered report exported!");
    } catch (error) {
      console.error("Export Error:", error);
      toast.error("Failed to export report");
    }
  };

  // 🚀 FULL BACKUP EXPORT (Explicitly for the Wipe Data Modal)
  const handleFullBackup = () => {
    try {
      if (transactions.length === 0)
        return toast.info("Database is already empty.");
      const headers = ["Date", "Type", "Category", "Amount", "Remarks"];
      const rows = transactions.map((t) => {
        let dateStr = "-";
        if (t.date) {
          const d = new Date(t.date);
          dateStr = `\t${d.toLocaleDateString("en-GB")}`;
        }
        const type = t.type || "-";
        const category = t.category ? `"${t.category}"` : "-";
        const amount = t.amount || 0;
        const remarks = t.remarks ? `"${t.remarks.replace(/"/g, '""')}"` : "";
        return `${dateStr},${type},${category},${amount},${remarks}`;
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `FULL_BACKUP_CashBook_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Full database backup downloaded securely!");
    } catch (error) {
      toast.error("Failed to generate full backup");
    }
  };

  // 🚀 SECURE DELETE ALL FUNCTION
  const handleWipeAll = async () => {
    if (isManager)
      return toast.error("Unauthorized: Only Admins can wipe data.");
    if (!deletePassword)
      return toast.error("Password is required to delete all records.");

    setWiping(true);
    try {
      await cashService.deleteAllTransactions({ password: deletePassword });
      toast.success("All cash transactions have been wiped.");
      setIsDeleteAllOpen(false);
      setDeletePassword("");
      fetchData(); // Refresh the list
    } catch (error) {
      console.error("Wipe Error:", error);
      toast.error(
        error.response?.data?.message || "Authentication failed. Wipe aborted.",
      );
    } finally {
      setWiping(false);
    }
  };

  const handleDisabledClick = (action) => {
    setWarningTooltip(action);
    setTimeout(() => setWarningTooltip(null), 2500);
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Cash Book Report
          </h1>
          <p className="text-emerald-100/40 text-sm mt-1">
            Financial overview and transaction history
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* 🚀 WIPE DATA BUTTON WITH ROLE-BASED UI */}
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

            {/* 🛑 Action Denied Tooltip */}
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
            <Download size={16} /> Export CSV
          </Button>
          <Link to="/enterprise/cash/add">
            <Button
              variant="primary"
              className="text-xs shadow-lg shadow-emerald-500/20"
            >
              + Add Entry
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards (Now dynamically tied to filters!) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#050a08] to-[#020403] border border-emerald-900/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={80} className="text-emerald-500" />
          </div>
          <div className="relative z-10">
            <p className="text-emerald-100/50 text-xs font-bold uppercase tracking-widest mb-2">
              Net Balance
            </p>
            <h3
              className={`text-3xl font-bold ${balance >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              ₹ {balance.toLocaleString()}
            </h3>
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-100/40">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>{" "}
              Filtered Update
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#050a08] border border-emerald-900/30 flex items-center gap-5 hover:border-emerald-500/30 transition-colors">
          <div className="p-4 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <ArrowUp size={24} />
          </div>
          <div>
            <p className="text-emerald-100/50 text-xs font-bold uppercase tracking-widest">
              Total Income
            </p>
            <h3 className="text-2xl font-bold text-white mt-1">
              ₹ {totalIncome.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#050a08] border border-emerald-900/30 flex items-center gap-5 hover:border-red-500/30 transition-colors">
          <div className="p-4 bg-red-500/10 rounded-xl text-red-400 border border-red-500/20">
            <ArrowDown size={24} />
          </div>
          <div>
            <p className="text-emerald-100/50 text-xs font-bold uppercase tracking-widest">
              Total Expense
            </p>
            <h3 className="text-2xl font-bold text-white mt-1">
              ₹ {totalExpense.toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      {/* Transactions Area */}
      <div className="bg-[#050a08] rounded-2xl border border-emerald-900/30 overflow-visible shadow-2xl">
        {/* Top Search Bar */}
        <div className="p-5 border-b border-emerald-900/20 flex flex-col md:flex-row justify-between gap-4 items-center bg-[#020403]/50">
          <h2 className="text-lg font-bold text-white whitespace-nowrap">
            All Transactions
          </h2>
          <div className="relative w-full md:w-80">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/30"
            />
            <input
              type="text"
              placeholder="Search category or remarks..."
              className="w-full bg-[#020403] border border-emerald-900/40 rounded-xl pl-9 pr-3 py-2.5 text-sm text-emerald-100 focus:border-emerald-500/50 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* 🚀 FILTER BAR */}
        <div className="p-3 border-b border-emerald-900/20 flex flex-wrap items-center gap-3 bg-[#020403]/80">
          <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold uppercase tracking-wider px-2 border-r border-emerald-900/40 mr-2">
            <Filter size={14} /> Filters
            {activeFiltersCount > 0 && (
              <span className="bg-emerald-500 text-[#020403] px-1.5 rounded-full ml-1">
                {activeFiltersCount}
              </span>
            )}
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`text-xs px-3 py-1.5 rounded-full border outline-none cursor-pointer transition-colors ${filterType !== "All" ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-transparent border-emerald-900/40 text-emerald-100/60 hover:border-emerald-500/30"}`}
          >
            <option value="All" className="bg-[#050a08] text-emerald-100">
              All Types
            </option>
            <option value="Income" className="bg-[#050a08] text-emerald-100">
              Income
            </option>
            <option value="Expense" className="bg-[#050a08] text-emerald-100">
              Expense
            </option>
          </select>

          {/* Amount Filter */}
          <select
            value={filterAmount}
            onChange={(e) => setFilterAmount(e.target.value)}
            className={`text-xs px-3 py-1.5 rounded-full border outline-none cursor-pointer transition-colors ${filterAmount !== "All" ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-transparent border-emerald-900/40 text-emerald-100/60 hover:border-emerald-500/30"}`}
          >
            <option value="All" className="bg-[#050a08] text-emerald-100">
              Any Amount
            </option>
            <option value="Under5k" className="bg-[#050a08] text-emerald-100">
              Under ₹5,000
            </option>
            <option value="5k-20k" className="bg-[#050a08] text-emerald-100">
              ₹5k - ₹20k
            </option>
            <option value="Above20k" className="bg-[#050a08] text-emerald-100">
              Above ₹20,000
            </option>
          </select>

          {/* Date Range Filter */}
          <select
            value={filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value);
              if (e.target.value !== "All") setFilterExactDate("");
            }}
            className={`text-xs px-3 py-1.5 rounded-full border outline-none cursor-pointer transition-colors ${filterDate !== "All" ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-transparent border-emerald-900/40 text-emerald-100/60 hover:border-emerald-500/30"}`}
          >
            <option value="All" className="bg-[#050a08] text-emerald-100">
              Any Date
            </option>
            <option value="Today" className="bg-[#050a08] text-emerald-100">
              Today
            </option>
            <option value="Last7Days" className="bg-[#050a08] text-emerald-100">
              Last 7 Days
            </option>
            <option value="ThisMonth" className="bg-[#050a08] text-emerald-100">
              This Month
            </option>
          </select>

          {/* 📅 Exact Date Picker */}
          <input
            type="date"
            value={filterExactDate}
            onChange={(e) => {
              setFilterExactDate(e.target.value);
              if (e.target.value) setFilterDate("All");
            }}
            title="Pick Exact Date"
            style={{ colorScheme: "dark" }}
            className={`text-xs px-3 py-1.5 rounded-full border outline-none cursor-pointer transition-colors ${filterExactDate ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-transparent border-emerald-900/40 text-emerald-100/60 hover:border-emerald-500/30"}`}
          />

          {/* Clear Filters Button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                setFilterType("All");
                setFilterAmount("All");
                setFilterDate("All");
                setFilterExactDate("");
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
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-[#020403] text-emerald-100/40 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-4 md:pl-6">Date</th>
                <th className="p-4">Category</th>
                <th className="p-4">Remarks</th>
                <th className="p-4 text-right md:pr-6">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/20 text-sm">
              {filteredTransactions.map((t) => (
                <tr
                  key={t._id}
                  className="hover:bg-emerald-900/10 transition-colors group"
                >
                  <td className="p-4 md:pl-6 text-emerald-100/70 font-mono text-xs whitespace-nowrap">
                    {t.date
                      ? new Date(t.date).toLocaleDateString("en-GB")
                      : "N/A"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-md border whitespace-nowrap ${
                        t.type === "Income"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:border-emerald-500/40"
                          : "bg-red-500/10 text-red-400 border-red-500/20 group-hover:border-red-500/40"
                      }`}
                    >
                      {t.category}
                    </span>
                  </td>
                  <td className="p-4 text-emerald-100/80 max-w-[200px] truncate">
                    {t.remarks || "-"}
                  </td>
                  <td
                    className={`p-4 md:pr-6 text-right font-bold font-mono whitespace-nowrap ${
                      t.type === "Income" ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {t.type === "Income" ? "+" : "-"} ₹{" "}
                    {Number(t.amount || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="p-10 text-center text-emerald-100/30 text-sm italic"
                  >
                    No transactions match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🚀 SECURE DELETE ALL MODAL WITH DATA GUARD (ADMIN ONLY) */}
      {isDeleteAllOpen && !isManager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#050a08] border border-red-900/50 rounded-2xl shadow-2xl shadow-red-900/20 w-full max-w-md p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full pointer-events-none"></div>

            <div className="flex items-center gap-3 mb-6 text-red-500">
              <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                <AlertOctagon size={24} />
              </div>
              <h3 className="text-xl font-bold">Wipe Cash Book</h3>
            </div>

            {/* 🛡️ DATA BACKUP GUIDE BOX */}
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
                  <p className="text-amber-100/60 text-[11px] mt-1 leading-relaxed">
                    Before wiping the database, we highly recommend downloading
                    a complete CSV backup of all your current financial records.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleFullBackup}
                className="w-full flex items-center justify-center gap-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-bold py-2.5 rounded-lg transition-colors"
              >
                <Download size={14} /> Download Full Financial Backup
              </button>
            </div>

            <p className="text-sm text-emerald-100/60 mb-4 leading-relaxed">
              This action will{" "}
              <span className="text-red-400 font-bold uppercase">
                permanently delete all
              </span>{" "}
              cash book transactions. Please enter your Admin password to
              confirm.
            </p>

            <Input
              type="password"
              placeholder="Enter your admin password..."
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
                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {wiping ? "Wiping..." : "Confirm Wipe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashReport;
