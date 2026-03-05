import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import cashService from "../../services/cashService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import { ArrowUpCircle, ArrowDownCircle, Wallet, Save } from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

const CashEntry = () => {
  const navigate = useNavigate();
  const { toast } = useUI();
  const { admin } = useAuth();
  const [loading, setLoading] = useState(false);

  const [type, setType] = useState("Expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [remarks, setRemarks] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || Number(amount) <= 0) {
      return toast.error("Please enter a valid amount greater than 0");
    }
    if (!category) {
      return toast.error("Please select a category");
    }

    setLoading(true);

    try {
      const payload = {
        type,
        amount: Number(amount),
        category,
        remarks: remarks || "",
        date: date,
      };

      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await cashService.addTransaction(payload, currentUser);

      toast.success("Transaction recorded successfully!");
      navigate("/enterprise/cash");
    } catch (error) {
      console.error("Entry Error:", error);
      toast.error(
        error.response?.data?.message || "Failed to save transaction.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500">
          <Wallet size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">New Transaction</h1>
          <p className="text-emerald-100/40 text-sm">
            Record daily income or expenses
          </p>
        </div>
      </div>

      <div className="bg-[#050a08] rounded-2xl shadow-xl border border-emerald-900/30 overflow-hidden relative">
        <div
          className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
            type === "Income"
              ? "from-emerald-500 to-teal-400"
              : "from-red-500 to-rose-400"
          }`}
        ></div>

        <div className="flex p-2 bg-[#020403] border-b border-emerald-900/20">
          <button
            type="button"
            className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
              type === "Income"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-900/20"
                : "text-emerald-100/40 hover:bg-emerald-900/10 hover:text-emerald-200"
            }`}
            onClick={() => setType("Income")}
          >
            <ArrowUpCircle size={18} /> Income
          </button>
          <button
            type="button"
            className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
              type === "Expense"
                ? "bg-red-500/10 text-red-400 border border-red-500/20 shadow-lg shadow-red-900/20"
                : "text-emerald-100/40 hover:bg-emerald-900/10 hover:text-emerald-200"
            }`}
            onClick={() => setType("Expense")}
          >
            <ArrowDownCircle size={18} /> Expense
          </button>
        </div>

        <div className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <Input
              label="Transaction Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-[#020403] text-emerald-100"
              required
            />

            <div className="relative group">
              <label className="block text-center text-xs font-bold text-emerald-100/50 uppercase tracking-widest mb-2">
                Amount (₹)
              </label>
              <div className="relative w-2/3 mx-auto">
                <input
                  type="number"
                  placeholder="0.00"
                  className={`w-full py-4 text-4xl font-bold bg-transparent border-b-2 outline-none text-center transition-all placeholder:text-emerald-900/30 ${
                    type === "Income"
                      ? "text-emerald-400 border-emerald-900/50 focus:border-emerald-500"
                      : "text-red-400 border-red-900/50 focus:border-red-500"
                  }`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                  required
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-100/50 uppercase tracking-widest mb-3">
                Select Category
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(type === "Expense"
                  ? [
                      "Raw Material",
                      "Salary",
                      "Electricity",
                      "Fuel",
                      "Tea/Snacks",
                      "Maintenance",
                      "Logistics",
                      "Other",
                    ]
                  : ["Sales", "Advance", "Refund", "Investment", "Other"]
                ).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-all duration-200 ${
                      category === cat
                        ? type === "Income"
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-900/40"
                          : "bg-red-500 text-white border-red-500 shadow-lg shadow-red-900/40"
                        : "bg-[#020403] text-emerald-100/60 border-emerald-900/30 hover:border-emerald-500/30 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Remarks / Description"
              placeholder="e.g. Payment for Bill #123"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="bg-[#020403]"
            />

            <Button
              type="submit"
              className="w-full py-4 text-base shadow-xl"
              variant={type === "Income" ? "success" : "danger"}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/50 border-t-white"></span>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Save size={18} /> Save Transaction
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CashEntry;
