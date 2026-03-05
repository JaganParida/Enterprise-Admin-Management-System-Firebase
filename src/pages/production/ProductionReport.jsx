import React, { useState, useEffect } from "react";
import productionService from "../../services/productionService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Factory,
  Download,
  Filter,
  Search,
  BarChart,
  X,
  AlertOctagon,
  ShieldAlert,
  Eye,
  EyeOff,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { Link } from "react-router-dom";
import Input from "../../components/common/Input";

const ProductionReport = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProduct, setFilterProduct] = useState("All");
  const [filterQuantity, setFilterQuantity] = useState("All");
  const [filterDate, setFilterDate] = useState("All");
  const [filterExactDate, setFilterExactDate] = useState("");

  // Wipe All State
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [warningTooltip, setWarningTooltip] = useState(null);

  const isManager = admin?.data?.role === "manager";

  const fetchLogs = async () => {
    try {
      const { data } = await productionService.getAllProduction();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Failed to load production data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.productName
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesProduct =
      filterProduct === "All" || log.productName === filterProduct;

    let matchesQty = true;
    if (filterQuantity !== "All") {
      const qty = Number(log.quantity) || 0;
      if (filterQuantity === "Under5k") matchesQty = qty < 5000;
      else if (filterQuantity === "5k-15k")
        matchesQty = qty >= 5000 && qty <= 15000;
      else if (filterQuantity === "Above15k") matchesQty = qty > 15000;
    }

    let matchesDate = true;
    if (filterExactDate && log.date) {
      const logDateObj = new Date(log.date);
      const formattedLogDate = `${logDateObj.getFullYear()}-${String(logDateObj.getMonth() + 1).padStart(2, "0")}-${String(logDateObj.getDate()).padStart(2, "0")}`;
      matchesDate = formattedLogDate === filterExactDate;
    } else if (filterDate !== "All" && log.date) {
      const lDate = new Date(log.date);
      const today = new Date();
      const diffTime = Math.abs(today - lDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (filterDate === "Today") matchesDate = diffDays <= 1;
      else if (filterDate === "Last7Days") matchesDate = diffDays <= 7;
      else if (filterDate === "ThisMonth")
        matchesDate =
          lDate.getMonth() === today.getMonth() &&
          lDate.getFullYear() === today.getFullYear();
    }
    return matchesSearch && matchesProduct && matchesQty && matchesDate;
  });

  const activeFiltersCount =
    [filterProduct, filterQuantity, filterDate].filter((f) => f !== "All")
      .length + (filterExactDate ? 1 : 0);
  const totalOutput = filteredLogs.reduce(
    (acc, log) => acc + (Number(log.quantity) || 0),
    0,
  );

  const handleFullBackup = () => {
    try {
      if (logs.length === 0) return toast.info("No data available for backup.");
      const headers = ["Date,Product Name,Quantity Produced"];
      const rows = logs.map(
        (l) =>
          `${new Date(l.date).toLocaleDateString("en-GB")},"${l.productName}",${l.quantity}`,
      );
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute(
        "download",
        `Full_Production_Backup_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Secure backup generated!");
    } catch (e) {
      toast.error("Backup failed.");
    }
  };

  const handleWipeAll = async () => {
    if (isManager || !deletePassword)
      return toast.error("Verification failed.");
    setWiping(true);
    try {
      await productionService.deleteAllProduction({ password: deletePassword });
      toast.success("Database cleared successfully.");
      setIsDeleteAllOpen(false);
      setDeletePassword("");
      fetchLogs();
    } catch (error) {
      toast.error(error.response?.data?.message || "Wipe aborted.");
    } finally {
      setWiping(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Production Ledger
        </h1>
        <div className="flex gap-3">
          {!isManager && (
            <button
              onClick={() => setIsDeleteAllOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm font-bold shadow-lg shadow-red-900/10"
            >
              <AlertOctagon size={16} /> Wipe Data
            </button>
          )}
          <Link to="/enterprise/production">
            <Button variant="primary" className="text-xs">
              + Log Entry
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#050a08] to-[#020403] border border-emerald-900/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Factory size={80} className="text-blue-500" />
          </div>
          <p className="text-blue-100/50 text-xs font-bold uppercase tracking-widest mb-2">
            Total Output
          </p>
          <h3 className="text-3xl font-bold text-blue-400">
            {totalOutput.toLocaleString()}{" "}
            <span className="text-sm text-blue-100/40">Pcs</span>
          </h3>
        </div>
        <div className="p-6 rounded-2xl bg-[#050a08] border border-emerald-900/30">
          <div className="flex items-center gap-3 mb-2 text-emerald-400">
            <BarChart size={20} />
            <span className="font-bold">Total Batches</span>
          </div>
          <h3 className="text-2xl font-bold text-white">
            {filteredLogs.length}
          </h3>
        </div>
      </div>

      <div className="bg-[#050a08] rounded-2xl border border-emerald-900/30 overflow-visible shadow-2xl">
        <div className="p-5 border-b border-emerald-900/20 flex flex-col md:flex-row justify-between items-center gap-4 bg-[#020403]/50">
          <h2 className="text-lg font-bold text-white">History</h2>
          <div className="relative w-full md:w-80">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/30"
            />
            <input
              type="text"
              placeholder="Search product..."
              className="w-full bg-[#020403] border border-emerald-900/40 rounded-xl pl-9 pr-3 py-2 text-sm text-emerald-100 focus:border-emerald-500/50 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="p-3 border-b border-emerald-900/20 flex flex-wrap items-center gap-3 bg-[#020403]/80">
          <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold uppercase tracking-wider px-2 border-r border-emerald-900/40 mr-2">
            <Filter size={14} />{" "}
            {activeFiltersCount > 0 && (
              <span className="bg-emerald-500 text-[#020403] px-1.5 rounded-full ml-1">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <select
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-full border outline-none bg-transparent border-emerald-900/40 text-emerald-100/60"
          >
            <option value="All" className="bg-[#050a08]">
              All Products
            </option>
            <optgroup label="Bricks" className="bg-[#020403] text-emerald-500">
              <option value="10 inch" className="bg-[#050a08] text-emerald-100">
                10 inch
              </option>
              <option value="9 inch" className="bg-[#050a08] text-emerald-100">
                9 inch
              </option>
              <option value="8 inch" className="bg-[#050a08] text-emerald-100">
                8 inch
              </option>
            </optgroup>
          </select>
          <input
            type="date"
            value={filterExactDate}
            onChange={(e) => {
              setFilterExactDate(e.target.value);
              if (e.target.value) setFilterDate("All");
            }}
            style={{ colorScheme: "dark" }}
            className="text-xs px-3 py-1.5 rounded-full border border-emerald-900/40 bg-transparent text-emerald-400"
          />
          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                setFilterProduct("All");
                setFilterQuantity("All");
                setFilterDate("All");
                setFilterExactDate("");
                setSearchTerm("");
              }}
              className="text-xs text-rose-400 underline ml-2"
            >
              <X size={12} className="inline mr-1" />
              Clear
            </button>
          )}
        </div>

        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <table className="w-full text-left min-w-[500px]">
            <thead className="bg-[#020403] text-emerald-100/40 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="p-4 md:pl-6">Date</th>
                <th className="p-4">Product Type</th>
                <th className="p-4 text-right md:pr-6">Output (Pcs)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/20 text-sm">
              {filteredLogs.map((log) => (
                <tr
                  key={log._id}
                  className="hover:bg-emerald-900/10 transition-colors"
                >
                  <td className="p-4 md:pl-6 text-emerald-100/70 font-mono text-xs">
                    {log.date
                      ? new Date(log.date).toLocaleDateString("en-GB")
                      : "N/A"}
                  </td>
                  <td className="p-4">
                    <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md text-[10px] uppercase font-bold">
                      {log.productName}
                    </span>
                  </td>
                  <td className="p-4 text-right md:pr-6 font-bold text-white">
                    {Number(log.quantity).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🚀 WIPE DATA MODAL WITH EYE BUTTON */}
      {isDeleteAllOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#050a08] border border-red-900/50 rounded-2xl shadow-2xl w-full max-w-md p-6 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6 text-red-500">
              <AlertOctagon size={24} />
              <h3 className="text-xl font-bold">Wipe Production Logs</h3>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mb-6 flex flex-col gap-3">
              <div className="flex items-start gap-3 text-amber-500">
                <ShieldAlert size={20} />
                <div>
                  <h4 className="text-amber-400 text-sm font-bold">
                    Safe Backup Recommended
                  </h4>
                </div>
              </div>
              <button
                onClick={handleFullBackup}
                className="w-full flex items-center justify-center gap-2 bg-amber-500/20 text-amber-400 text-xs font-bold py-2 rounded-lg"
              >
                <Download size={14} /> Full CSV Backup
              </button>
            </div>
            <p className="text-xs text-emerald-100/60 mb-4 leading-relaxed">
              This action is irreversible. Enter Admin password to continue.
            </p>

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Admin password..."
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="bg-[#020403] border-red-900/30 focus:border-red-500/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-100/30 hover:text-emerald-100/60"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex justify-end gap-3 mt-8 relative z-10">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsDeleteAllOpen(false);
                  setDeletePassword("");
                  setShowPassword(false);
                }}
              >
                Cancel
              </Button>
              <button
                onClick={handleWipeAll}
                disabled={!deletePassword || wiping}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm disabled:opacity-50"
              >
                {wiping ? "Wiping Data..." : "Confirm Wipe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionReport;
