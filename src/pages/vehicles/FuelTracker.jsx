import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import fuelService from "../../services/fuelService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Fuel,
  Truck,
  Calendar,
  IndianRupee,
  Save,
  Droplet,
  History,
  ArrowRight,
  Edit2,
  CheckCircle2,
  RefreshCcw,
  AlertOctagon,
  X,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";

const GlassInput = ({
  label,
  icon: Icon,
  type = "text",
  required,
  className = "",
  theme,
  ...props
}) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && (
      <label className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
    )}
    <div className="relative group">
      {Icon && (
        <div
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:${theme.primaryText} transition-colors pointer-events-none z-10`}
        >
          <Icon size={16} />
        </div>
      )}
      <input
        type={type}
        autoComplete="new-password"
        onWheel={(e) => e.target.blur()}
        className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-xl ${Icon ? "pl-10" : "pl-4"} pr-4 py-2.5 text-sm text-zinc-100 outline-none ${theme.primaryFocus} transition-all placeholder:text-zinc-600 [color-scheme:dark] ${className}`}
        required={required}
        {...props}
      />
    </div>
  </div>
);

const defaultFilters = {
  search: "",
  amountFilter: "Any Amount",
  dateFilter: "All",
  exactDate: "",
};

const FuelTracker = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 🚀 INITIALIZE FROM CACHE TO PREVENT LOADER FLICKER
  const [logs, setLogs] = useState(() => {
    const cached = fuelService.getCachedLogs(defaultFilters);
    return cached ? cached.slice(0, 10) : [];
  });
  const [stats, setStats] = useState(
    () =>
      fuelService.getCachedStats() || {
        totalLiters: 0,
        totalCost: 0,
        refuelCount: 0,
      },
  );
  const [loading, setLoading] = useState(
    () =>
      !(
        fuelService.getCachedStats() &&
        fuelService.getCachedLogs(defaultFilters)
      ),
  );
  const [syncStatus, setSyncStatus] = useState(() =>
    fuelService.getCachedLogs(defaultFilters) ? "synced" : "syncing",
  );

  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [oldLogData, setOldLogData] = useState(null);

  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");
  const basePath = isTransport ? "/transportation" : "/enterprise";

  const theme = {
    primaryText: isTransport ? "text-cyan-400" : "text-indigo-400",
    primaryBg: isTransport ? "bg-cyan-500/10" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-cyan-500/20" : "border-indigo-500/20",
    primaryFocus: isTransport
      ? "focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
      : "focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50",
    glowOrb: isTransport ? "bg-cyan-500/5" : "bg-indigo-500/5",
  };

  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    itemName: "",
  });
  const initialForm = {
    date: new Date().toISOString().split("T")[0],
    vehicleNo: "",
    liters: "",
    pricePerLiter: "",
  };
  const [formData, setFormData] = useState(initialForm);

  const calculatedTotal =
    (parseFloat(formData.liters) || 0) *
    (parseFloat(formData.pricePerLiter) || 0);

  // 🚀 Background Cross-Tab Sync Checker
  useEffect(() => {
    const checkSync = () => {
      const globalLastUpdate = parseInt(
        localStorage.getItem("fuel_last_update") || "0",
        10,
      );
      if (globalLastUpdate > fuelService.getLastFetchTime())
        setSyncStatus("required");
    };
    const interval = setInterval(checkSync, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async (force = false) => {
    if (logs.length === 0 || force) setSyncStatus("syncing");
    if (logs.length === 0) setLoading(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        fuelService.getStats(force),
        fuelService.getLogs(defaultFilters, null, 50, force),
      ]);
      setStats(statsRes);
      setLogs(logsRes.data ? logsRes.data.slice(0, 10) : []);
      setSyncStatus("synced");
    } catch (err) {
      toast.error("Failed to load tracking data.");
      setSyncStatus("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (location.state && location.state.editLog) {
      const log = location.state.editLog;
      setEditId(log._id);
      setOldLogData(log);
      setFormData({
        date: log.date
          ? new Date(log.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        vehicleNo: log.vehicleNo || "",
        liters: log.liters || "",
        pricePerLiter: log.pricePerLiter || "",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleVehicleNoChange = (e) => {
    let rawValue = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    let state = rawValue.slice(0, 2).replace(/[^A-Z]/g, "");
    let rto = rawValue.slice(2, 4).replace(/[^0-9]/g, "");
    let remainder = rawValue.slice(4);
    let middleChars = remainder.replace(/[^A-Z]/g, "").slice(0, 2);
    let lastDigits = remainder.replace(/[^0-9]/g, "").slice(0, 4);
    let formatted = state;
    if (state.length === 2 && rawValue.length > 2) {
      formatted += "-" + rto;
      if (rto.length === 2 && rawValue.length > 4) {
        formatted += "-";
        if (middleChars.length > 0) {
          formatted += middleChars;
          if (lastDigits.length > 0) formatted += "-" + lastDigits;
        } else {
          formatted += lastDigits;
        }
      }
    }
    setFormData((prev) => ({ ...prev, vehicleNo: formatted }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^[A-Z]{2}-[0-9]{2}-([A-Z]{1,2}-)?[0-9]{4}$/.test(formData.vehicleNo))
      return toast.error("Invalid Vehicle No. Format");
    if (Number(formData.liters) <= 0) return toast.error("Liters must be > 0");
    if (Number(formData.pricePerLiter) <= 0)
      return toast.error("Price per liter must be > 0");

    setSubmitting(true);
    try {
      const currentUser = admin?.data || admin || {};
      const payload = { ...formData, totalCost: calculatedTotal };

      if (editId) {
        await fuelService.updateLog(editId, payload, currentUser);
        const diffLiters =
          Number(payload.liters) - Number(oldLogData?.liters || 0);
        const diffCost = calculatedTotal - Number(oldLogData?.totalCost || 0);
        setStats((prev) => ({
          totalLiters: prev.totalLiters + diffLiters,
          totalCost: prev.totalCost + diffCost,
          refuelCount: prev.refuelCount,
        }));
        toast.success("Fuel log updated!");
      } else {
        await fuelService.addLog(payload, currentUser);
        setStats((prev) => ({
          totalLiters: prev.totalLiters + Number(payload.liters),
          totalCost: prev.totalCost + calculatedTotal,
          refuelCount: prev.refuelCount + 1,
        }));
        toast.success("Fuel logged successfully!");
      }

      resetForm();
      const logsRes = await fuelService.getLogs(
        defaultFilters,
        null,
        10,
        false,
      );
      setLogs(logsRes.data ? logsRes.data.slice(0, 10) : []);
      setSyncStatus("synced");
    } catch (err) {
      toast.error("Failed to save log.");
    } finally {
      setSubmitting(false);
    }
  };

  const openHistory = (e, log) => {
    e.stopPropagation();
    const sortedHistory = log.editHistory ? [...log.editHistory].reverse() : [];
    setHistoryModal({
      isOpen: true,
      data: sortedHistory,
      itemName: `Fuel for ${log.vehicleNo}`,
    });
  };
  const resetForm = () => {
    setEditId(null);
    setOldLogData(null);
    setFormData(initialForm);
  };
  const handleRowClick = (e, id) => {
    if (
      e.target.closest("button") ||
      e.target.closest("a") ||
      e.target.closest(".history-btn")
    )
      return;
    navigate(`${basePath}/fuel/report?highlight=${id}`);
  };

  if (loading && logs.length === 0)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 px-2 sm:px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${theme.primaryBg} ${theme.primaryBorder}`}
            >
              <Droplet className={theme.primaryText} size={24} />
            </div>{" "}
            Fuel Management
          </h1>
          <p className="text-zinc-400 text-sm mt-1 ml-1">
            Monitor vehicle refueling and fuel expenses.
          </p>
        </div>

        <Button
          variant="ghost"
          onClick={() => fetchData(true)}
          disabled={syncStatus === "synced" || syncStatus === "syncing"}
          className={`flex items-center gap-2 h-[40px] px-4 rounded-xl font-bold text-xs tracking-wider transition-all duration-700 w-full sm:w-auto justify-center ${syncStatus === "synced" ? "opacity-40 pointer-events-none text-emerald-500 bg-emerald-500/5 border border-emerald-500/10" : syncStatus === "error" ? "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 shadow-[0_0_15px_rgba(243,64,84,0.2)] animate-pulse" : "text-zinc-300 bg-zinc-800/40 border border-zinc-700/50"}`}
        >
          {syncStatus === "synced" && <CheckCircle2 size={16} />}
          {syncStatus === "syncing" && (
            <RefreshCcw size={16} className="animate-spin" />
          )}
          {syncStatus === "error" && <AlertOctagon size={16} />}
          {syncStatus === "synced"
            ? "Up to Date"
            : syncStatus === "syncing"
              ? "Syncing..."
              : syncStatus === "required"
                ? "Sync Required"
                : "Sync Failed - Retry"}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <div className="xl:col-span-5">
          <div
            className={`bg-[#09090B] border p-6 md:p-8 rounded-3xl shadow-xl transition-all duration-300 relative overflow-hidden ${editId ? `border-${isTransport ? "cyan" : "indigo"}-500/50 ring-1 ring-${isTransport ? "cyan" : "indigo"}-500/20` : "border-zinc-800/60"}`}
          >
            <div
              className={`absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full pointer-events-none ${theme.glowOrb}`}
            ></div>
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {editId ? (
                  <Edit2 size={18} className={theme.primaryText} />
                ) : (
                  <Save size={18} className={theme.primaryText} />
                )}{" "}
                {editId ? "Update Fuel Log" : "Log Refuel"}
              </h3>
              {editId && (
                <Button
                  variant="ghost"
                  onClick={resetForm}
                  className="!px-3 !py-1 !text-[10px] text-rose-400 hover:text-rose-300 tracking-widest uppercase !h-auto"
                >
                  Cancel Edit
                </Button>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 relative z-10 animate-in fade-in zoom-in-95 duration-300"
            >
              <div className="grid grid-cols-2 gap-4">
                <GlassInput
                  theme={theme}
                  label="Date"
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  icon={Calendar}
                  required
                />
                <GlassInput
                  theme={theme}
                  label="Vehicle No."
                  placeholder="OD-02-AX-1234"
                  value={formData.vehicleNo}
                  onChange={handleVehicleNoChange}
                  icon={Truck}
                  required
                  className="uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <GlassInput
                  theme={theme}
                  label="Fuel (Liters)"
                  type="number"
                  step="any"
                  placeholder="0"
                  value={formData.liters}
                  onChange={(e) =>
                    setFormData({ ...formData, liters: e.target.value })
                  }
                  icon={Droplet}
                  required
                />
                <GlassInput
                  theme={theme}
                  label="Cost Per Liter (₹)"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={formData.pricePerLiter}
                  onChange={(e) =>
                    setFormData({ ...formData, pricePerLiter: e.target.value })
                  }
                  icon={IndianRupee}
                  required
                />
              </div>
              <div className="flex items-center gap-4 bg-[#09090B] p-4 rounded-xl border border-zinc-800/60 mt-2">
                <div className="flex-1 text-right pr-2">
                  <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold mb-1">
                    Calculated Total
                  </p>
                  <p className="text-2xl font-black text-white font-mono">
                    <span className={`text-sm mr-1 ${theme.primaryText}`}>
                      ₹
                    </span>
                    {calculatedTotal.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                  className="w-full h-12 shadow-xl text-sm tracking-widest uppercase font-black mt-2 rounded-xl text-white"
                >
                  {submitting
                    ? "Processing..."
                    : editId
                      ? "Update Fuel Log"
                      : "Confirm & Save Log"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="xl:col-span-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              className={`bg-[#09090B] border border-zinc-800/60 p-5 rounded-2xl relative overflow-hidden group hover:border-${isTransport ? "cyan" : "indigo"}-500/30 transition-all`}
            >
              <div
                className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity ${theme.primaryText}`}
              >
                <Droplet size={80} />
              </div>
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">
                Total Fuel Logged
              </p>
              <h3 className="text-2xl font-black text-white font-mono relative z-10">
                {stats.totalLiters.toFixed(1)}{" "}
                <span className="text-sm font-normal text-zinc-500">L</span>
              </h3>
            </div>
            <div className="bg-[#09090B] border border-zinc-800/60 p-5 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-blue-500 group-hover:opacity-10 transition-opacity">
                <IndianRupee size={80} />
              </div>
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">
                Total Spent
              </p>
              <h3 className="text-2xl font-black text-white font-mono relative z-10">
                <span className="text-blue-400">₹</span>{" "}
                {stats.totalCost.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="bg-[#09090B] border border-zinc-800/60 p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-emerald-500 group-hover:opacity-10 transition-opacity">
                <Fuel size={80} />
              </div>
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">
                Refuel Count
              </p>
              <h3 className="text-2xl font-black text-white font-mono relative z-10">
                {stats.refuelCount}
              </h3>
            </div>
          </div>

          <div className="bg-[#09090B] border border-zinc-800/60 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-zinc-800/60 flex justify-between items-center bg-zinc-900/10">
              <h3 className="font-bold text-white">
                Recent Refuels{" "}
                <span className="text-xs font-normal text-zinc-400 ml-2">
                  (Latest)
                </span>
              </h3>
              <Link to={`${basePath}/fuel/report`}>
                <Button
                  variant="outline"
                  className={`!px-3 !py-1.5 !text-[10px] uppercase tracking-widest !h-auto ${theme.primaryBg} ${theme.primaryText} border ${theme.primaryBorder} hover:opacity-80`}
                >
                  View All <ArrowRight size={14} className="ml-1" />
                </Button>
              </Link>
            </div>
            <div className="overflow-x-auto max-h-[600px] custom-scrollbar p-2">
              <table className="w-full text-left min-w-[500px] animate-in fade-in">
                <thead className="sticky top-0 bg-[#09090B] text-[10px] uppercase font-bold text-zinc-500 tracking-[0.15em] z-10 shadow-sm border-b border-zinc-800/60">
                  <tr>
                    <th className="py-3 px-3 w-[40%]">Vehicle Details</th>
                    <th className="py-3 px-3 w-[30%]">Fuel & Cost</th>
                    <th className="py-3 px-3 text-right w-[30%]">
                      Total Spent
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm text-zinc-300 divide-y divide-zinc-800/60">
                  {logs.map((log) => {
                    const hasEdits =
                      log.editHistory && log.editHistory.length > 0;
                    const latestLog = hasEdits
                      ? log.editHistory[log.editHistory.length - 1]
                      : null;
                    return (
                      <tr
                        key={log._id}
                        onClick={(e) => handleRowClick(e, log._id)}
                        className="hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                      >
                        <td className="p-3 align-top">
                          <p className="text-[11px] font-mono text-zinc-400 mb-1">
                            {new Date(log.date).toLocaleDateString("en-GB")}
                          </p>
                          <p className="font-bold text-white text-md uppercase tracking-wide flex items-center gap-2">
                            <Truck size={14} className="text-zinc-600" />{" "}
                            {log.vehicleNo}
                          </p>
                          {hasEdits && (
                            <div
                              onClick={(e) => openHistory(e, log)}
                              className="history-btn mt-3 flex flex-col items-start w-max cursor-pointer hover:opacity-80 transition-opacity"
                            >
                              <div className="flex items-center gap-1.5 bg-zinc-800/50 border border-zinc-700/50 px-2 py-1 rounded-lg">
                                <History size={10} className="text-zinc-400" />
                                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                                  {latestLog.role || "ADMIN"}
                                </span>
                                {log.editHistory.length > 1 && (
                                  <span className="bg-zinc-700/50 text-zinc-400 px-1.5 py-0.5 rounded text-[8px] font-bold ml-1">
                                    +{log.editHistory.length - 1} MORE
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-3 align-top">
                          <div
                            className={`text-[11px] text-zinc-300 mb-2 flex items-center gap-1.5 bg-zinc-900/50 w-max px-2 py-1 rounded font-medium border border-zinc-800 uppercase tracking-wide`}
                          >
                            <Droplet size={12} className={theme.primaryText} />{" "}
                            {log.liters} Liters
                          </div>
                          <div className="text-[11px] text-zinc-500 font-medium mt-1 flex items-center gap-1">
                            <IndianRupee size={10} /> Rate:{" "}
                            <span
                              className={`font-bold font-mono ml-0.5 ${theme.primaryText}`}
                            >
                              ₹{log.pricePerLiter}
                            </span>{" "}
                            /L
                          </div>
                        </td>
                        <td className="p-3 text-right align-top">
                          <p className="text-lg font-black text-white font-mono drop-shadow-sm mb-2">
                            ₹
                            {(Number(log.totalCost) || 0).toLocaleString(
                              "en-IN",
                            )}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                  {logs.length === 0 && (
                    <tr>
                      <td
                        colSpan="3"
                        className="p-10 text-center text-zinc-500 italic"
                      >
                        No fuel records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {historyModal.isOpen && historyModal.data && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() =>
              setHistoryModal({ isOpen: false, data: null, itemName: "" })
            }
          />
          <div
            className={`bg-[#09090B] border ${theme.primaryBorder} rounded-3xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200`}
          >
            <div
              className={`flex items-center justify-between p-5 border-b ${theme.primaryBorder} ${theme.primaryBg} shrink-0`}
            >
              <div className="flex items-center gap-2 text-white font-bold tracking-wide text-sm">
                <History size={16} className={theme.primaryText} /> Log History:{" "}
                <span className={`${theme.primaryText} font-normal`}>
                  {historyModal.itemName}
                </span>
              </div>
              <button
                onClick={() =>
                  setHistoryModal({ isOpen: false, data: null, itemName: "" })
                }
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-3">
              {historyModal.data.map((log, index) => (
                <div
                  key={index}
                  className={`bg-[#09090B] border ${index === 0 ? theme.primaryBorder : "border-zinc-800"} rounded-xl p-4 flex items-center justify-between relative overflow-hidden`}
                >
                  {index === 0 && (
                    <div
                      className={`absolute left-0 top-0 w-1 h-full ${theme.primaryBg}`}
                    ></div>
                  )}
                  <div className="flex items-center gap-4 pl-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${index === 0 ? `${theme.primaryBg} ${theme.primaryText}` : "bg-zinc-800 text-zinc-500"}`}
                    >
                      {(log.role || "A")[0].toUpperCase()}
                    </div>
                    <div>
                      <h4
                        className={`font-bold tracking-widest uppercase text-sm ${index === 0 ? "text-white" : "text-zinc-500"}`}
                      >
                        {log.role || "ADMIN"}
                      </h4>
                      <p className="text-zinc-500 text-[10px] mt-0.5 font-mono">
                        {log.by || "admin@system.com"}
                      </p>
                      <p
                        className={`text-[10px] font-mono mt-1 ${index === 0 ? theme.primaryText : "text-zinc-600"}`}
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
                    <div className="bg-indigo-500/10 border-indigo-500/20 text-indigo-400 text-[10px] font-bold px-3 py-1 rounded-lg tracking-widest uppercase border">
                      LATEST
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelTracker;
