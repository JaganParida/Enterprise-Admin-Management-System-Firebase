import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
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
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";

const GlassInput = ({
  label,
  icon: Icon,
  type = "text",
  required,
  className = "",
  labelClass = "text-amber-100/50",
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

const Maintenance = () => {
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
    meterKm: "",
    serviceType: "Routine Service",
    cost: "",
    description: "",
  };

  const [formData, setFormData] = useState(initialForm);

  const fetchLogs = async () => {
    try {
      const { data } = await maintenanceService.getLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load maintenance records.");
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
        meterKm: log.meterKm || "",
        serviceType: log.serviceType || "Routine Service",
        cost: log.cost || "",
        description: log.description || "",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const stats = useMemo(() => {
    const currentLogs = Array.isArray(logs) ? logs : [];
    return {
      totalCost: currentLogs.reduce(
        (acc, log) => acc + (Number(log?.cost) || 0),
        0,
      ),
      serviceCount: currentLogs.length,
    };
  }, [logs]);

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
    if (Number(formData.cost) <= 0)
      return toast.error("Cost must be greater than 0");

    setSubmitting(true);
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      const payload = { ...formData, cost: Number(formData.cost) || 0 };

      if (editId) {
        await maintenanceService.updateLog(editId, payload, currentUser);
        toast.success("Updated successfully!");
      } else {
        await maintenanceService.addLog(payload, currentUser);
        toast.success("Logged successfully!");
      }
      resetForm();
      fetchLogs();
    } catch (err) {
      toast.error("Failed to save record.");
    } finally {
      setSubmitting(false);
    }
  };

  const openHistory = (log) => {
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
            <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Wrench className="text-amber-400" size={24} />
            </div>
            Maintenance Logs
          </h1>
          <p className="text-amber-100/40 text-sm mt-1 ml-1">
            Track vehicle repairs and servicing costs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-5">
          <div
            className={`bg-[#030816] border p-6 md:p-8 rounded-3xl shadow-2xl transition-all duration-300 relative overflow-hidden ${editId ? "border-amber-500/50 ring-1 ring-amber-500/20 shadow-amber-500/10" : "border-amber-900/30"}`}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings size={18} className="text-amber-400" />
                {editId ? "Update Entry" : "Log Service"}
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
                  className="focus:border-amber-500/50 focus:ring-amber-500/20"
                />
                <GlassInput
                  label="Vehicle No."
                  placeholder="OD-02-AX-1234"
                  value={formData.vehicleNo}
                  onChange={handleVehicleNoChange}
                  icon={Truck}
                  required
                  className="focus:border-amber-500/50 focus:ring-amber-500/20 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <GlassInput
                  label="Meter / Km Reading"
                  type="number"
                  placeholder="e.g. 45000"
                  value={formData.meterKm}
                  onChange={(e) =>
                    setFormData({ ...formData, meterKm: e.target.value })
                  }
                  icon={Map}
                  required
                  className="focus:border-amber-500/50 focus:ring-amber-500/20"
                />
                <GlassInput
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
                  className="text-amber-400 font-bold focus:border-amber-500/50 focus:ring-amber-500/20"
                />
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-[10px] font-bold tracking-widest uppercase ml-1 text-amber-100/50">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="Details of work done..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full bg-[#060d1f] border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-50 outline-none transition-all placeholder:text-gray-700 shadow-inner focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 resize-none h-24 custom-scrollbar"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-12 shadow-xl shadow-amber-900/20 text-sm tracking-widest uppercase font-black bg-amber-600 hover:bg-amber-500 border-none mt-2 text-[#020403]"
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
            <div className="bg-[#030816] border border-amber-900/30 p-5 rounded-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-amber-500 group-hover:opacity-10 transition-opacity">
                <IndianRupee size={80} />
              </div>
              <p className="text-amber-100/50 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">
                Total Maintenance Cost
              </p>
              <h3 className="text-2xl font-black text-amber-400 font-mono relative z-10">
                ₹ {(stats.totalCost || 0).toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="bg-[#030816] border border-emerald-900/30 p-5 rounded-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-emerald-500 group-hover:opacity-10 transition-opacity">
                <Wrench size={80} />
              </div>
              <p className="text-emerald-100/50 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">
                Total Services Logged
              </p>
              <h3 className="text-2xl font-black text-white font-mono relative z-10">
                {stats.serviceCount || 0}
              </h3>
            </div>
          </div>

          <div className="bg-[#030816] border border-amber-900/30 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-amber-900/20 flex justify-between items-center bg-amber-950/10">
              <h3 className="font-bold text-white">
                Recent Maintenance{" "}
                <span className="text-xs font-normal text-amber-100/40 ml-2">
                  (Latest)
                </span>
              </h3>
              <Link
                to="/transportation/maintenance/report"
                className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:underline whitespace-nowrap text-amber-400"
              >
                View All <ArrowRight size={14} />
              </Link>
            </div>

            <div className="overflow-x-auto max-h-[600px] custom-scrollbar p-2">
              <table className="w-full text-left min-w-[550px]">
                <thead className="sticky top-0 bg-[#060d1f] text-[10px] uppercase font-bold text-amber-100/40 tracking-[0.15em] z-10 shadow-sm border-b border-amber-900/20">
                  <tr>
                    <th className="py-4 px-4 rounded-tl-xl w-[35%]">
                      Vehicle Details
                    </th>
                    <th className="py-4 px-4 w-[40%]">Service Info</th>
                    <th className="py-4 px-4 text-right rounded-tr-xl w-[25%]">
                      Cost
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm text-amber-100/70 divide-y divide-amber-900/10">
                  {logs.slice(0, 10).map((log) => {
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
                        className="hover:bg-amber-400/[0.03] transition-colors group"
                      >
                        <td className="p-4 align-top">
                          <p className="text-[11px] font-mono text-amber-400 mb-1">
                            {new Date(log.date).toLocaleDateString("en-GB")}
                          </p>
                          <p className="font-bold text-white text-md uppercase tracking-wide flex items-center gap-2">
                            <Truck size={14} className="text-amber-500/50" />{" "}
                            {log.vehicleNo || "N/A"}
                          </p>
                          {log.meterKm && (
                            <p className="text-[10px] text-amber-100/40 mt-1 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                              <Map size={10} className="text-emerald-500/50" />{" "}
                              {log.meterKm} KM
                            </p>
                          )}

                          {historyArray.length > 0 && (
                            <div
                              onClick={() => openHistory(log)}
                              className="mt-3 flex items-center gap-1.5 bg-[#020403] border border-amber-900/30 px-2 py-1 rounded-lg cursor-pointer hover:border-amber-500/50 transition-colors w-max"
                            >
                              <History size={10} className="text-amber-500" />
                              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">
                                {latestEdit.role || "ADMIN"}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="p-4 align-top">
                          <div className="text-xs text-emerald-200 mb-2 flex items-center gap-1.5 bg-emerald-900/20 w-max px-2.5 py-1 rounded-md font-medium border border-emerald-900/30 uppercase tracking-wide">
                            <Wrench size={12} className="text-emerald-400" />{" "}
                            {log.serviceType || "Routine"}
                          </div>
                          {log.description && (
                            <div className="text-[10px] text-amber-100/40 font-mono mt-1.5 line-clamp-2 pr-4">
                              {log.description}
                            </div>
                          )}
                        </td>

                        <td className="p-4 text-right align-top">
                          <p className="text-lg font-black text-amber-400 font-mono drop-shadow-sm mb-2">
                            ₹{(Number(log.cost) || 0).toLocaleString("en-IN")}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                  {logs.length === 0 && (
                    <tr>
                      <td
                        colSpan="3"
                        className="p-10 text-center text-amber-100/30 italic"
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

      {/* 🚀 MULTIPLE LOG HISTORY MODAL UI */}
      {historyModal.isOpen && historyModal.data && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() =>
              setHistoryModal({ isOpen: false, data: null, itemName: "" })
            }
          />
          <div className="bg-[#030816] border border-amber-900/30 rounded-3xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-amber-900/20 bg-[#060d1f]/50 shrink-0">
              <div className="flex items-center gap-2 text-white font-bold tracking-wide text-sm">
                <History size={16} className="text-amber-500" />
                Log History:{" "}
                <span className="text-amber-400 font-normal">
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
                  className={`bg-[#060d1f] border ${index === 0 ? "border-amber-500/30" : "border-gray-800"} rounded-xl p-4 flex items-center justify-between relative overflow-hidden`}
                >
                  {index === 0 && (
                    <div className="absolute left-0 top-0 w-1 h-full bg-amber-500"></div>
                  )}
                  <div className="flex items-center gap-4 pl-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${index === 0 ? "bg-amber-500/10 text-amber-400" : "bg-gray-800 text-gray-500"}`}
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
                        className={`text-[10px] font-mono mt-1 ${index === 0 ? "text-amber-400" : "text-gray-600"}`}
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
                    <div className="bg-amber-500/10 border-amber-500/20 text-amber-400 text-[10px] font-bold px-3 py-1 rounded-lg tracking-widest uppercase border">
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
