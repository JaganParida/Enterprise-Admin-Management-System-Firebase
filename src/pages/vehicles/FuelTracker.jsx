import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
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
  X,
  History,
  ArrowRight,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";

const GlassInput = ({
  label,
  icon: Icon,
  type = "text",
  required,
  className = "",
  labelClass = "text-cyan-100/50",
  ...props
}) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && (
      <label
        className={`text-[10px] font-bold tracking-widest uppercase ml-1 ${labelClass}`}
      >
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
    )}
    <div className="relative group">
      {Icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gray-300 transition-colors pointer-events-none z-10">
          <Icon size={16} />
        </div>
      )}
      <input
        type={type}
        autoComplete="new-password"
        onWheel={(e) => e.target.blur()}
        className={`w-full bg-[#060d1f] border border-gray-800 rounded-xl ${Icon ? "pl-10" : "pl-4"} pr-4 py-2.5 text-sm text-gray-50 outline-none transition-all placeholder:text-gray-700 shadow-inner [color-scheme:dark] ${className}`}
        required={required}
        {...props}
      />
    </div>
  </div>
);

const FuelTracker = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const location = useLocation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);

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

  const fetchLogs = async () => {
    try {
      const { data } = await fuelService.getLogs();
      setLogs(data || []);
    } catch (err) {
      toast.error("Failed to load logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // 🚀 Catch edit triggers from the Report page
  useEffect(() => {
    if (location.state && location.state.editLog) {
      const log = location.state.editLog;
      setEditId(log._id);
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

  const stats = useMemo(
    () => ({
      totalLiters: logs.reduce(
        (acc, log) => acc + (Number(log.liters) || 0),
        0,
      ),
      totalCost: logs.reduce(
        (acc, log) => acc + (Number(log.totalCost) || 0),
        0,
      ),
      refuelCount: logs.length,
    }),
    [logs],
  );

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
          if (lastDigits.length > 0) {
            formatted += "-" + lastDigits;
          }
        } else {
          formatted += lastDigits;
        }
      }
    }
    setFormData((prev) => ({ ...prev, vehicleNo: formatted }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const vehicleRegex = /^[A-Z]{2}-[0-9]{2}-([A-Z]{1,2}-)?[0-9]{4}$/;
    if (!vehicleRegex.test(formData.vehicleNo))
      return toast.error("Invalid Vehicle No. Format (e.g., OD-02-AX-1234)");
    if (Number(formData.liters) <= 0)
      return toast.error("Liters must be greater than 0");
    if (Number(formData.pricePerLiter) <= 0)
      return toast.error("Price per liter must be greater than 0");

    setSubmitting(true);
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      const payload = { ...formData, totalCost: calculatedTotal };

      if (editId) {
        await fuelService.updateLog(editId, payload, currentUser);
        toast.success("Fuel log updated!");
      } else {
        await fuelService.addLog(payload, currentUser);
        toast.success("Fuel logged successfully!");
      }
      resetForm();
      fetchLogs();
    } catch (err) {
      toast.error("Failed to save log.");
    } finally {
      setSubmitting(false);
    }
  };

  const openHistory = (log) => {
    const sortedHistory = log.editHistory ? [...log.editHistory].reverse() : [];
    setHistoryModal({
      isOpen: true,
      data: sortedHistory,
      itemName: `Fuel for ${log.vehicleNo}`,
    });
  };

  const resetForm = () => {
    setEditId(null);
    setFormData(initialForm);
  };

  if (loading)
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
            <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <Droplet className="text-cyan-400" size={24} />
            </div>
            Fuel Management
          </h1>
          <p className="text-cyan-100/40 text-sm mt-1 ml-1">
            Monitor vehicle refueling and fuel expenses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-5">
          <div
            className={`bg-[#030816] border p-6 md:p-8 rounded-3xl shadow-2xl transition-all duration-300 relative overflow-hidden ${editId ? "border-cyan-500/50 ring-1 ring-cyan-500/20 shadow-cyan-500/10" : "border-cyan-900/30"}`}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Fuel size={18} className="text-cyan-400" />
                {editId ? "Update Fuel Log" : "Log Refuel"}
              </h3>
              {editId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold tracking-widest uppercase"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              <div className="grid grid-cols-2 gap-4">
                <GlassInput
                  label="Date"
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  icon={Calendar}
                  required
                  className="focus:border-cyan-500/50 focus:ring-cyan-500/20"
                />
                <GlassInput
                  label="Vehicle No."
                  placeholder="OD-02-AX-1234"
                  value={formData.vehicleNo}
                  onChange={handleVehicleNoChange}
                  icon={Truck}
                  required
                  className="focus:border-cyan-500/50 focus:ring-cyan-500/20 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <GlassInput
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
                  className="focus:border-cyan-500/50 focus:ring-cyan-500/20 text-cyan-50"
                />
                <GlassInput
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
                  className="focus:border-cyan-500/50 focus:ring-cyan-500/20 text-cyan-50"
                />
              </div>

              <div className="flex items-center gap-4 bg-[#0a1222] p-4 rounded-xl border border-cyan-900/30 mt-2">
                <div className="flex-1">
                  <p className="text-cyan-100/40 uppercase tracking-widest text-[10px] font-bold mb-1">
                    Calculated Total
                  </p>
                  <p className="text-2xl font-black text-cyan-400 font-mono">
                    <span className="text-sm mr-1 text-cyan-600">₹</span>
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
                  disabled={submitting}
                  className="w-full h-12 shadow-xl shadow-cyan-900/20 text-sm tracking-widest uppercase font-black bg-cyan-600 hover:bg-cyan-500 border-none mt-2 text-[#020403]"
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
            <div className="bg-[#030816] border border-cyan-900/30 p-5 rounded-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-cyan-500 group-hover:opacity-10 transition-opacity">
                <Droplet size={80} />
              </div>
              <p className="text-cyan-100/50 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">
                Total Fuel Logged
              </p>
              <h3 className="text-2xl font-black text-white font-mono relative z-10">
                {stats.totalLiters.toFixed(1)}{" "}
                <span className="text-sm font-normal text-cyan-100/40">L</span>
              </h3>
            </div>
            <div className="bg-[#030816] border border-blue-900/30 p-5 rounded-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-blue-500 group-hover:opacity-10 transition-opacity">
                <IndianRupee size={80} />
              </div>
              <p className="text-blue-100/50 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">
                Total Spent
              </p>
              <h3 className="text-2xl font-black text-blue-400 font-mono relative z-10">
                ₹ {stats.totalCost.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="bg-[#030816] border border-emerald-900/30 p-5 rounded-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-emerald-500 group-hover:opacity-10 transition-opacity">
                <Fuel size={80} />
              </div>
              <p className="text-emerald-100/50 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">
                Refuel Count
              </p>
              <h3 className="text-2xl font-black text-white font-mono relative z-10">
                {stats.refuelCount}
              </h3>
            </div>
          </div>

          <div className="bg-[#030816] border border-cyan-900/30 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-cyan-900/20 flex justify-between items-center bg-cyan-950/10">
              <h3 className="font-bold text-white">
                Recent Refuels{" "}
                <span className="text-xs font-normal text-cyan-100/40 ml-2">
                  (Latest)
                </span>
              </h3>
              <Link
                to="/transportation/fuel/report"
                className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:underline whitespace-nowrap text-cyan-400"
              >
                View All <ArrowRight size={14} />
              </Link>
            </div>

            <div className="overflow-x-auto max-h-[600px] custom-scrollbar p-2">
              <table className="w-full text-left min-w-[500px]">
                <thead className="sticky top-0 bg-[#060d1f] text-[10px] uppercase font-bold text-cyan-100/40 tracking-[0.15em] z-10 shadow-sm border-b border-cyan-900/20">
                  <tr>
                    <th className="py-4 px-4 rounded-tl-xl w-[40%]">
                      Vehicle Details
                    </th>
                    <th className="py-4 px-4 w-[30%]">Fuel & Cost</th>
                    <th className="py-4 px-4 text-right rounded-tr-xl w-[30%]">
                      Total Spent
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm text-cyan-100/70 divide-y divide-cyan-900/10">
                  {logs.slice(0, 10).map((log) => {
                    const hasEdits =
                      log.editHistory && log.editHistory.length > 0;
                    const latestLog = hasEdits
                      ? log.editHistory[log.editHistory.length - 1]
                      : null;

                    return (
                      <tr
                        key={log._id}
                        className="hover:bg-cyan-400/[0.03] group transition-colors"
                      >
                        <td className="p-4 align-top">
                          <p className="text-[11px] font-mono text-cyan-400 mb-1">
                            {new Date(log.date).toLocaleDateString("en-GB")}
                          </p>
                          <p className="font-bold text-white text-md uppercase tracking-wide flex items-center gap-2">
                            <Truck size={14} className="text-cyan-500/50" />{" "}
                            {log.vehicleNo}
                          </p>

                          {hasEdits && (
                            <div
                              onClick={() => openHistory(log)}
                              className="mt-3 flex items-center gap-1.5 bg-[#020403] border border-cyan-900/30 px-2 py-1 rounded-lg cursor-pointer w-max hover:border-cyan-500/50 transition-colors"
                            >
                              <History size={10} className="text-cyan-500" />
                              <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">
                                {latestLog.role || "ADMIN"}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="p-4 align-top">
                          <div className="text-xs text-cyan-200 mb-2 flex items-center gap-1.5 bg-cyan-900/20 w-max px-2.5 py-1 rounded-md font-medium border border-cyan-900/30 uppercase tracking-wide">
                            <Droplet size={12} className="text-cyan-400" />{" "}
                            {log.liters} Liters
                          </div>
                          <div className="text-[11px] text-cyan-100/60 font-medium mt-1 flex items-center gap-1">
                            <IndianRupee size={10} /> Rate:{" "}
                            <span className="font-bold text-cyan-400 font-mono ml-0.5">
                              ₹{log.pricePerLiter}
                            </span>{" "}
                            /L
                          </div>
                        </td>

                        <td className="p-4 text-right align-top">
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
                        className="p-10 text-center text-cyan-100/30 italic"
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

      {/* 🚀 HISTORY MODAL REFINED UI */}
      {historyModal.isOpen && historyModal.data && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() =>
              setHistoryModal({ isOpen: false, data: null, itemName: "" })
            }
          />
          <div className="bg-[#030816] border border-cyan-900/30 rounded-3xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-cyan-900/20 bg-[#060d1f]/50 shrink-0">
              <div className="flex items-center gap-2 text-white font-bold tracking-wide text-sm">
                <History size={16} className="text-cyan-500" />
                Log History:{" "}
                <span className="text-cyan-400 font-normal">
                  {historyModal.itemName}
                </span>
              </div>
              <button
                onClick={() =>
                  setHistoryModal({ isOpen: false, data: null, itemName: "" })
                }
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-3">
              {historyModal.data.map((log, index) => (
                <div
                  key={index}
                  className={`bg-[#060d1f] border ${index === 0 ? "border-cyan-500/30" : "border-gray-800"} rounded-xl p-4 flex items-center justify-between relative overflow-hidden`}
                >
                  {index === 0 && (
                    <div className="absolute left-0 top-0 w-1 h-full bg-cyan-500"></div>
                  )}
                  <div className="flex items-center gap-4 pl-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${index === 0 ? "bg-cyan-500/10 text-cyan-400" : "bg-gray-800 text-gray-500"}`}
                    >
                      {(log.role || "A")[0].toUpperCase()}
                    </div>
                    <div>
                      <h4
                        className={`font-bold tracking-widest uppercase text-sm ${index === 0 ? "text-white" : "text-gray-500"}`}
                      >
                        {log.role || "ADMIN"}
                      </h4>
                      <p className="text-gray-500 text-[10px] mt-0.5 font-mono">
                        {log.by || "admin@system.com"}
                      </p>
                      <p
                        className={`text-[10px] font-mono mt-1 ${index === 0 ? "text-cyan-400" : "text-gray-600"}`}
                      >
                        {new Date(log.at).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  {index === 0 && (
                    <div className="bg-cyan-500/10 border-cyan-500/20 text-cyan-400 text-[10px] font-bold px-3 py-1 rounded-lg tracking-widest uppercase border">
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
