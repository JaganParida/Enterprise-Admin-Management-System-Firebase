import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import maintenanceService from "../../services/maintenanceService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Wrench,
  Truck,
  Calendar,
  IndianRupee,
  Save,
  X,
  History,
  Settings,
  Map,
  ArrowRight,
  Edit2,
  CheckCircle2,
  RefreshCcw,
  AlertOctagon,
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

const Maintenance = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 🚀 INITIALIZE FROM CACHE TO PREVENT LOADER FLICKER
  const [logs, setLogs] = useState(() => {
    const cached = maintenanceService.getCachedLogs(defaultFilters);
    return cached ? cached.slice(0, 10) : [];
  });
  const [stats, setStats] = useState(
    () =>
      maintenanceService.getCachedStats() || { totalCost: 0, serviceCount: 0 },
  );
  const [loading, setLoading] = useState(
    () =>
      !(
        maintenanceService.getCachedStats() &&
        maintenanceService.getCachedLogs(defaultFilters)
      ),
  );
  const [syncStatus, setSyncStatus] = useState(() =>
    maintenanceService.getCachedLogs(defaultFilters) ? "synced" : "syncing",
  );

  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [oldLogData, setOldLogData] = useState(null);

  const searchParams = new URLSearchParams(location.search);
  const urlHighlightId = searchParams.get("highlight");
  const [activeHighlight, setActiveHighlight] = useState(null);

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
    meterKm: "",
    serviceType: "Routine Service",
    cost: "",
    description: "",
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchData = async (force = false) => {
    if (logs.length === 0 || force) setSyncStatus("syncing");
    if (logs.length === 0) setLoading(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        maintenanceService.getStats(force),
        maintenanceService.getLogs(defaultFilters, null, 50, force),
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
    if (urlHighlightId && !loading) {
      setActiveHighlight(urlHighlightId);
      setTimeout(() => {
        const el = document.getElementById(urlHighlightId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
      const timer = setTimeout(() => setActiveHighlight(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [urlHighlightId, loading]);

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
        meterKm: log.meterKm || "",
        serviceType: log.serviceType || "Routine Service",
        cost: log.cost || "",
        description: log.description || "",
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
        } else formatted += lastDigits;
      }
    }
    setFormData((prev) => ({ ...prev, vehicleNo: formatted }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^[A-Z]{2}-[0-9]{2}-([A-Z]{1,2}-)?[0-9]{4}$/.test(formData.vehicleNo))
      return toast.error("Invalid Vehicle No.");
    if (Number(formData.cost) <= 0) return toast.error("Cost must be > 0");

    setSubmitting(true);
    try {
      const currentUser = admin?.data || admin || {};
      const payload = { ...formData, cost: Number(formData.cost) || 0 };

      if (editId) {
        await maintenanceService.updateLog(editId, payload, currentUser);
        const diffCost = payload.cost - Number(oldLogData?.cost || 0);
        setStats((prev) => ({ ...prev, totalCost: prev.totalCost + diffCost }));
        toast.success("Updated successfully!");
      } else {
        await maintenanceService.addLog(payload, currentUser);
        setStats((prev) => ({
          totalCost: prev.totalCost + payload.cost,
          serviceCount: prev.serviceCount + 1,
        }));
        toast.success("Logged successfully!");
      }
      resetForm();
      const logsRes = await maintenanceService.getLogs(
        defaultFilters,
        null,
        10,
        false,
      );
      setLogs(logsRes.data ? logsRes.data.slice(0, 10) : []);
      setSyncStatus("synced");
    } catch (err) {
      toast.error("Failed to save record.");
    } finally {
      setSubmitting(false);
    }
  };

  const openHistory = (e, log) => {
    e.stopPropagation();
    const historyData = Array.isArray(log?.editHistory)
      ? [...log.editHistory].reverse()
      : [];
    setHistoryModal({
      isOpen: true,
      data: historyData,
      itemName: `Maintenance for ${log?.vehicleNo || "Unknown"}`,
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
    navigate(`${basePath}/maintenance/report?highlight=${id}`);
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
              <Wrench className={theme.primaryText} size={24} />
            </div>{" "}
            Maintenance Logs
          </h1>
          <p className="text-zinc-400 text-sm mt-1 ml-1">
            Track vehicle repairs and servicing costs.
          </p>
        </div>

        {/* 🚀 Smart Sync Button */}
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
                  <Settings size={18} className={theme.primaryText} />
                )}{" "}
                {editId ? "Update Entry" : "Log Service"}
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
                  label="Meter / Km Reading"
                  type="number"
                  placeholder="e.g. 45000"
                  value={formData.meterKm}
                  onChange={(e) =>
                    setFormData({ ...formData, meterKm: e.target.value })
                  }
                  icon={Map}
                  required
                />
                <GlassInput
                  theme={theme}
                  label="Total Cost (₹)"
                  type="number"
                  name="cost"
                  placeholder="0.00"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
                  icon={IndianRupee}
                  required
                  className={`${theme.primaryText} font-bold text-lg`}
                />
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 ml-1">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="Details of work done..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 outline-none ${theme.primaryFocus} transition-all placeholder:text-zinc-600 resize-none h-24 custom-scrollbar`}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className="w-full mt-4 rounded-xl"
              >
                {submitting
                  ? "Processing..."
                  : editId
                    ? "Update Entry"
                    : "Save Record"}
              </Button>
            </form>
          </div>
        </div>

        <div className="xl:col-span-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className={`bg-[#09090B] border border-zinc-800/60 p-5 rounded-2xl relative overflow-hidden group hover:border-${isTransport ? "cyan" : "indigo"}-500/30 transition-all`}
            >
              <div
                className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity ${theme.primaryText}`}
              >
                <IndianRupee size={80} />
              </div>
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">
                Total Maintenance Cost
              </p>
              <h3 className="text-2xl font-black text-white font-mono relative z-10">
                <span className={theme.primaryText}>₹</span>{" "}
                {(stats.totalCost || 0).toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="bg-[#09090B] border border-zinc-800/60 p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-emerald-500 group-hover:opacity-10 transition-opacity">
                <Wrench size={80} />
              </div>
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">
                Total Services Logged
              </p>
              <h3 className="text-2xl font-black text-white font-mono relative z-10">
                {stats.serviceCount || 0}
              </h3>
            </div>
          </div>

          <div className="bg-[#09090B] border border-zinc-800/60 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-zinc-800/60 flex justify-between items-center bg-zinc-900/10">
              <h3 className="font-bold text-white">
                Recent Maintenance{" "}
                <span className="text-xs font-normal text-zinc-400 ml-2">
                  (Latest)
                </span>
              </h3>
              <Link to={`${basePath}/maintenance/report`}>
                <Button
                  variant="outline"
                  className={`!px-3 !py-1.5 !text-[10px] uppercase tracking-widest !h-auto ${theme.primaryBg} ${theme.primaryText} border ${theme.primaryBorder} hover:opacity-80`}
                >
                  View All <ArrowRight size={14} className="ml-1" />
                </Button>
              </Link>
            </div>

            <div className="overflow-x-auto max-h-[600px] custom-scrollbar p-2">
              <table className="w-full text-left min-w-[550px] animate-in fade-in">
                <thead className="sticky top-0 bg-[#09090B] text-[10px] uppercase font-bold text-zinc-500 tracking-[0.15em] z-10 shadow-sm border-b border-zinc-800/60">
                  <tr>
                    <th className="py-3 px-3 w-[35%]">Vehicle Details</th>
                    <th className="py-3 px-3 w-[40%]">Service Info</th>
                    <th className="py-3 px-3 text-right w-[25%]">Cost</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-zinc-300 divide-y divide-zinc-800/60">
                  {logs.map((log) => {
                    const historyArray = Array.isArray(log?.editHistory)
                      ? log.editHistory
                      : [];
                    const latestEdit =
                      historyArray.length > 0
                        ? historyArray[historyArray.length - 1]
                        : null;

                    return (
                      <tr
                        key={log._id}
                        id={log._id}
                        onClick={(e) => handleRowClick(e, log._id)}
                        className={`transition-all duration-1000 ease-out group cursor-pointer ${activeHighlight === log._id ? `${isTransport ? "bg-[#0ea5e9]/[0.08] shadow-[inset_0_0_20px_rgba(14,165,233,0.05)]" : "bg-indigo-500/[0.08] shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]"}` : "hover:bg-zinc-800/30"}`}
                      >
                        <td className="p-3 align-top">
                          <p className="text-[11px] font-mono text-zinc-400 mb-1">
                            {new Date(log.date).toLocaleDateString("en-GB")}
                          </p>
                          <p className="font-bold text-white text-md uppercase tracking-wide flex items-center gap-2">
                            <Truck size={14} className="text-zinc-600" />{" "}
                            {log.vehicleNo || "N/A"}
                          </p>
                          {log.meterKm && (
                            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                              <Map size={10} className="text-emerald-500/50" />{" "}
                              {log.meterKm} KM
                            </p>
                          )}
                          {historyArray.length > 0 && (
                            <div
                              onClick={(e) => openHistory(e, log)}
                              className="history-btn mt-3 flex flex-col items-start w-max cursor-pointer hover:opacity-80 transition-opacity"
                            >
                              <div className="flex items-center gap-1.5 bg-zinc-800/50 border border-zinc-700/50 px-2 py-1 rounded-lg">
                                <History size={10} className="text-zinc-400" />
                                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                                  {latestEdit.role || "ADMIN"}
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
                            className={`text-xs text-zinc-200 mb-2 flex items-center gap-1.5 ${theme.primaryBg} w-max px-2.5 py-1 rounded-md font-medium border ${theme.primaryBorder} uppercase tracking-wide`}
                          >
                            <Wrench size={12} className={theme.primaryText} />{" "}
                            {log.serviceType || "Routine"}
                          </div>
                          {log.description && (
                            <div className="text-[10px] text-zinc-400 font-mono mt-1.5 line-clamp-2 pr-4">
                              {log.description}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right align-top">
                          <p className="text-lg font-black text-white font-mono drop-shadow-sm mb-2">
                            ₹{(Number(log.cost) || 0).toLocaleString("en-IN")}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                  {logs.length === 0 && !loading && (
                    <tr>
                      <td
                        colSpan="3"
                        className="p-10 text-center text-zinc-500 italic"
                      >
                        No maintenance records found.
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

export default Maintenance;
