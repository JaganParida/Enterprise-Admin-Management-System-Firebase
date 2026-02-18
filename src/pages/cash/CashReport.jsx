import React, { useState, useEffect } from "react";
import cashService from "../../services/cashService";
import {
  ArrowUp,
  ArrowDown,
  Wallet,
  Filter,
  Download,
  Search,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { Link } from "react-router-dom";
import { useUI } from "../../context/UIProvider";

const CashReport = () => {
  const { toast } = useUI();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await cashService.getTransactions();
        setTransactions(data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load transactions");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExport = () => {
    try {
      if (transactions.length === 0) {
        return toast.info("No data to export");
      }

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
        `Cash_Report_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Report exported! (Dates formatted for Excel)");
    } catch (error) {
      console.error("Export Error:", error);
      toast.error("Failed to export report");
    }
  };

  const totalIncome = transactions
    .filter((t) => t.type === "Income")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "Expense")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  const filteredTransactions = transactions.filter(
    (t) =>
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.remarks && t.remarks.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  if (loading) return <Loader />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Cash Book Report
          </h1>
          <p className="text-emerald-100/40 text-sm mt-1">
            Financial overview and transaction history
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="gap-2 text-xs border-emerald-900/30"
          >
            <Filter size={16} /> Filter
          </Button>
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

      {/* 2. Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Net Balance */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#050a08] to-[#020403] border border-emerald-900/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={80} className="text-emerald-500" />
          </div>
          <div className="relative z-10">
            <p className="text-emerald-100/50 text-xs font-bold uppercase tracking-widest mb-2">
              Net Balance
            </p>
            <h3
              className={`text-3xl font-bold ${
                balance >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              ₹ {balance.toLocaleString()}
            </h3>
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-100/40">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>{" "}
              Live Update
            </div>
          </div>
        </div>

        {/* Income Card */}
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

        {/* Expense Card */}
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

      {/* 3. Transactions Table */}
      <div className="bg-[#050a08] rounded-2xl border border-emerald-900/30 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-emerald-900/20 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">All Transactions</h2>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/30"
            />
            <input
              type="text"
              placeholder="Search category..."
              className="bg-[#020403] border border-emerald-900/30 rounded-lg pl-9 pr-3 py-1.5 text-xs text-emerald-100 focus:border-emerald-500/50 outline-none w-48 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
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
                  <td className="p-4 md:pl-6 text-emerald-100/70 font-mono text-xs">
                    {new Date(t.date).toLocaleDateString("en-GB")}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-md border ${
                        t.type === "Income"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:border-emerald-500/40"
                          : "bg-red-500/10 text-red-400 border-red-500/20 group-hover:border-red-500/40"
                      }`}
                    >
                      {t.category}
                    </span>
                  </td>
                  <td className="p-4 text-emerald-100/80">
                    {t.remarks || "-"}
                  </td>
                  <td
                    className={`p-4 md:pr-6 text-right font-bold font-mono ${
                      t.type === "Income" ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {t.type === "Income" ? "+" : "-"} ₹{" "}
                    {t.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
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
  );
};

export default CashReport;
