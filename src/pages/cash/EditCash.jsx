import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import cashService from "../../services/cashService";
import { useUI } from "../../context/UIProvider";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Save,
  ArrowLeft,
  RefreshCcw,
} from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const EditCash = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useUI();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [type, setType] = useState("Expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [remarks, setRemarks] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ REMOVED ARTIFICIAL TIMEOUT DELAY
        const { data } = await cashService.getTransactionById(id);

        setType(data.type);
        setAmount(data.amount);
        setCategory(data.category);
        setRemarks(data.remarks || "");
        setDate(
          data.date ? new Date(data.date).toISOString().split("T")[0] : "",
        );
      } catch (error) {
        console.error("Fetch Error:", error);
        toast.error("Could not load transaction details.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleFormSubmitClick = (e) => {
    e.preventDefault();
    setIsDialogOpen(true);
  };

  const executeUpdate = async () => {
    setSaving(true);
    try {
      await cashService.updateTransaction(id, {
        type,
        amount: Number(amount),
        category,
        remarks,
        date,
      });
      toast.success("Transaction updated successfully!");
      navigate("/enterprise/cash");
    } catch (error) {
      console.error("Update Error:", error);
      toast.error("Failed to update transaction.");
    } finally {
      setSaving(false);
      setIsDialogOpen(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader />
        <span className="text-emerald-500/40 text-[10px] font-mono uppercase tracking-widest animate-pulse">
          Retrieving Record...
        </span>
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        onClick={() => navigate("/enterprise/cash")}
        className="flex items-center text-emerald-100/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={18} className="mr-2" /> Back to Cash Book
      </button>

      <div className="bg-[#050a08] rounded-2xl shadow-xl border border-emerald-900/30 overflow-hidden relative">
        <div
          className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${type === "Income" ? "from-emerald-500 to-teal-400" : "from-red-500 to-rose-400"}`}
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
          <form onSubmit={handleFormSubmitClick} className="space-y-8">
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
                  required
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
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="bg-[#020403]"
            />

            <Button
              type="submit"
              className="w-full py-4 text-base shadow-xl gap-2"
              variant={type === "Income" ? "success" : "danger"}
              disabled={saving}
            >
              {saving ? (
                <RefreshCcw className="animate-spin" size={20} />
              ) : (
                <Save size={20} />
              )}
              {saving ? "Updating..." : "Update Transaction"}
            </Button>
          </form>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={executeUpdate}
        title="Update Transaction"
        message="Are you sure you want to modify this financial record?"
        confirmText="Save Update"
        isDestructive={false}
      />
    </div>
  );
};

export default EditCash;
