import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import jcbService from "../../services/jcbService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Truck,
  Calendar,
  Save,
  Edit2,
  X,
  History,
  User,
  Phone,
  MapPin,
  Clock,
  Timer,
  CalendarDays,
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
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-amber-400 transition-colors pointer-events-none z-10">
          <Icon size={16} />
        </div>
      )}
      <input
        type={type}
        autoComplete="new-password"
        onWheel={(e) => e.target.blur()}
        className={`w-full bg-[#060d1f] border border-gray-800 rounded-xl ${Icon ? "pl-10" : "pl-4"} pr-4 py-2.5 text-sm text-gray-50 outline-none transition-all placeholder:text-gray-700 shadow-inner [color-scheme:dark] focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 ${className}`}
        required={required}
        {...props}
      />
    </div>
  </div>
);

const GlassSelect = ({
  label,
  icon: Icon,
  required,
  className = "",
  children,
  ...props
}) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && (
      <label className="text-[10px] font-bold tracking-widest uppercase text-amber-100/50 ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
    )}
    <div className="relative group">
      {Icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-amber-400 transition-colors pointer-events-none z-10">
          <Icon size={16} />
        </div>
      )}
      <select
        className={`w-full bg-[#060d1f] border border-gray-800 rounded-xl appearance-none ${Icon ? "pl-10" : "pl-4"} pr-10 py-2.5 text-sm text-gray-50 outline-none transition-all shadow-inner cursor-pointer focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 ${className}`}
        required={required}
        {...props}
      >
        {children}
      </select>
    </div>
  </div>
);

const JcbTracker = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const location = useLocation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [activeTab, setActiveTab] = useState("logs");
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    itemName: "",
  });

  const initialForm = {
    date: new Date().toISOString().split("T")[0],
    vehicleNo: "",
    customerName: "",
    phone: "",
    location: "",
    startTime: "",
    endTime: "",
  };

  const [formData, setFormData] = useState(initialForm);

  const fetchLogs = async () => {
    try {
      const { data } = await jcbService.getLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Catch edit triggers from the Report page
  useEffect(() => {
    if (location.state && location.state.editLog) {
      const log = location.state.editLog;
      setEditId(log._id);
      setFormData({
        date: log.date
          ? new Date(log.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        vehicleNo: log.vehicleNo || "",
        customerName: log.customerName || "",
        phone: log.phone || "",
        location: log.location || "",
        startTime: log.startTime || "",
        endTime: log.endTime || "",
      });
      setActiveTab("logs");
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const calculateDuration = (start, end) => {
    if (!start || !end) return { hours: 0, minutes: 0, totalMins: 0 };
    const [sH, sM] = start.split(":").map(Number);
    const [eH, eM] = end.split(":").map(Number);
    let totalMins = eH * 60 + eM - (sH * 60 + sM);
    if (totalMins < 0) totalMins += 24 * 60;
    return {
      hours: Math.floor(totalMins / 60),
      minutes: totalMins % 60,
      totalMins,
    };
  };

  const duration = calculateDuration(formData.startTime, formData.endTime);

  const daywiseSummary = useMemo(() => {
    const summary = {};
    logs.forEach((log) => {
      if (!summary[log.date]) summary[log.date] = { totalMins: 0, entries: 0 };
      summary[log.date].totalMins += Number(log.totalMins || 0);
      summary[log.date].entries += 1;
    });
    return Object.entries(summary)
      .map(([date, data]) => ({
        date,
        hours: Math.floor(data.totalMins / 60),
        minutes: data.totalMins % 60,
        entries: data.entries,
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [logs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (duration.totalMins <= 0)
      return toast.error("End time must be greater than Start time.");
    const phoneRegex = /^[0-9]{10}$/;
    if (formData.phone && !phoneRegex.test(formData.phone))
      return toast.error("Phone number must be exactly 10 digits.");
    setSubmitting(true);
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      const payload = {
        ...formData,
        totalHours: duration.hours,
        totalMinutes: duration.minutes,
        totalMins: duration.totalMins,
      };
      if (editId) {
        await jcbService.updateLog(editId, payload, currentUser);
        toast.success("Updated successfully!");
      } else {
        await jcbService.addLog(payload, currentUser);
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
      itemName: `${log?.customerName || "Unknown"} (JCB)`,
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
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Truck className="text-amber-400" size={24} />
            </div>
            JCB Working Logs
          </h1>
          <p className="text-amber-100/40 text-sm mt-1 ml-1">
            Track heavy machinery working hours & locations.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#030816] p-1 rounded-xl border border-gray-800/50 w-full sm:w-auto h-[42px] shadow-inner">
          <button
            onClick={() => {
              setActiveTab("logs");
              resetForm();
            }}
            className={`px-5 h-full text-xs font-bold transition-all rounded-lg flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === "logs" ? "bg-amber-600 text-[#020403] shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
          >
            <Clock size={14} /> Active Logs
          </button>
          <button
            onClick={() => {
              setActiveTab("daywise");
              resetForm();
            }}
            className={`px-5 h-full text-xs font-bold transition-all rounded-lg flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === "daywise" ? "bg-amber-600 text-[#020403] shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
          >
            <CalendarDays size={14} /> Day-wise Summary
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-5">
          <div
            className={`bg-[#030816] border p-6 md:p-8 rounded-3xl shadow-2xl transition-all duration-300 relative overflow-hidden ${editId ? "border-amber-500/50 ring-1 ring-amber-500/20 shadow-amber-500/10" : "border-amber-900/30"}`}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none"></div>
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {editId ? (
                  <Edit2 size={18} className="text-amber-400" />
                ) : (
                  <Timer size={18} className="text-amber-400" />
                )}
                {editId ? "Update JCB Log" : "Log Working Hours"}
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
                />
                <GlassSelect
                  label="Vehicle No."
                  name="vehicleNo"
                  value={formData.vehicleNo}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleNo: e.target.value })
                  }
                  icon={Truck}
                  required
                >
                  <option value="" className="bg-[#050a08] text-gray-500">
                    Select...
                  </option>
                  <option
                    value="OD02AT6907"
                    className="bg-[#020403] text-white"
                  >
                    OD02AT6907
                  </option>
                  <option
                    value="OD02XA7407"
                    className="bg-[#020403] text-white"
                  >
                    OD02XA7407
                  </option>
                  <option
                    value="OD02AJ3507"
                    className="bg-[#020403] text-white"
                  >
                    OD02AJ3507
                  </option>
                </GlassSelect>
              </div>
              <GlassInput
                label="Customer Name"
                placeholder="e.g. Ramesh Singh"
                value={formData.customerName}
                onChange={(e) =>
                  setFormData({ ...formData, customerName: e.target.value })
                }
                icon={User}
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <GlassInput
                  label="Phone Number"
                  type="tel"
                  maxLength="10"
                  placeholder="10-digit number"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: e.target.value.replace(/[^0-9]/g, ""),
                    })
                  }
                  icon={Phone}
                  required
                />
                <GlassInput
                  label="Location"
                  placeholder="Site / Village"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  icon={MapPin}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 bg-amber-950/10 border border-amber-900/30 rounded-xl">
                <GlassInput
                  label="Starting Time"
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  icon={Clock}
                  required
                />
                <GlassInput
                  label="Ending Time"
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  icon={Clock}
                  required
                />
              </div>
              <div className="flex items-center gap-4 bg-[#0a1222] p-4 rounded-xl border border-amber-900/30 mt-2">
                <div className="flex-1">
                  <p className="text-amber-100/40 uppercase tracking-widest text-[10px] font-bold mb-1">
                    Calculated Duration
                  </p>
                  <p className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
                    <span className="text-amber-400">{duration.hours}</span>
                    <span className="text-xs text-amber-100/30 mr-2">h</span>
                    <span className="text-amber-400">{duration.minutes}</span>
                    <span className="text-xs text-amber-100/30">m</span>
                  </p>
                </div>
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-12 shadow-xl shadow-indigo-900/20 text-sm tracking-widest uppercase font-black bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 border-none mt-2 text-white"
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

        {/* 🚀 LIST SECTION (RIGHT COLUMN) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#030816] border border-amber-900/30 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-amber-900/20 flex justify-between items-center bg-amber-950/10">
              <h3 className="font-bold text-white">
                {activeTab === "logs"
                  ? "Recent Working Logs"
                  : "Day-wise Summary"}
                {activeTab === "logs" && (
                  <span className="text-xs font-normal text-amber-100/40 ml-2">
                    (Top 10)
                  </span>
                )}
              </h3>
              <Link
                to="/transportation/jcb/report"
                className="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg uppercase tracking-widest border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
              >
                View All{" "}
                {activeTab === "logs" ? logs.length : daywiseSummary.length}
              </Link>
            </div>

            <div className="overflow-x-auto max-h-[650px] custom-scrollbar p-2">
              {activeTab === "logs" ? (
                <table className="w-full text-left min-w-[550px] animate-in fade-in duration-300">
                  <thead className="sticky top-0 bg-[#060d1f] text-[10px] uppercase font-bold text-amber-100/40 tracking-[0.15em] z-10 shadow-sm border-b border-amber-900/20">
                    <tr>
                      <th className="py-4 px-4 rounded-tl-xl w-[30%]">
                        Date & Vehicle
                      </th>
                      <th className="py-4 px-4 w-[40%]">Customer Info</th>
                      <th className="py-4 px-4 text-right rounded-tr-xl w-[30%]">
                        Time Log
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-amber-100/70 divide-y divide-amber-900/10">
                    {logs.slice(0, 10).map((log) => {
                      const hasEdits =
                        log.editHistory && log.editHistory.length > 0;
                      const latestLog = hasEdits
                        ? log.editHistory[log.editHistory.length - 1]
                        : null;
                      return (
                        <tr
                          key={log._id}
                          className="hover:bg-amber-400/[0.03] group transition-colors"
                        >
                          <td className="p-4 align-top">
                            <p className="text-[11px] font-mono text-amber-400 mb-1">
                              {new Date(log.date).toLocaleDateString("en-GB")}
                            </p>
                            <p className="font-bold text-white text-md uppercase tracking-wide flex items-center gap-2">
                              <Truck size={14} className="text-amber-500/50" />{" "}
                              {log.vehicleNo}
                            </p>
                            {hasEdits && (
                              <div
                                onClick={() => openHistory(log)}
                                className="mt-3 flex items-center gap-1.5 bg-[#020403] border border-amber-900/30 px-2 py-1 rounded-lg cursor-pointer w-max hover:border-amber-500/50 transition-colors"
                              >
                                <History size={10} className="text-amber-500" />
                                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">
                                  {latestLog.role || "ADMIN"}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="p-4 align-top">
                            <div className="font-bold text-white text-md tracking-wide flex items-center gap-2">
                              <User size={14} className="text-amber-500/50" />{" "}
                              {log.customerName}
                            </div>
                            <div className="text-[11px] text-amber-100/60 font-mono mt-1 flex items-center gap-1.5">
                              <Phone size={10} className="text-amber-500/40" />{" "}
                              {log.phone}
                            </div>
                            <div className="text-[11px] text-amber-100/40 mt-1 flex items-center gap-1.5 uppercase tracking-wider">
                              <MapPin size={10} className="text-amber-500/40" />{" "}
                              {log.location}
                            </div>
                          </td>
                          <td className="p-4 align-top text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="text-[10px] bg-amber-950/30 border border-amber-900/40 px-2 py-1 rounded text-amber-100/60 font-mono w-max">
                                {log.startTime} to {log.endTime}
                              </span>
                              <span className="text-lg font-black text-amber-400 font-mono tracking-wider mt-1">
                                {log.totalHours}h {log.totalMinutes}m
                              </span>
                            </div>
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
                          No logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left min-w-[500px] animate-in fade-in duration-300">
                  <thead className="sticky top-0 bg-[#060d1f] text-[10px] uppercase font-bold text-amber-100/40 tracking-[0.15em] z-10 shadow-sm border-b border-amber-900/20">
                    <tr>
                      <th className="py-4 px-6 rounded-tl-xl w-[30%]">Date</th>
                      <th className="py-4 px-6 w-[30%] text-center">
                        Total Entries
                      </th>
                      <th className="py-4 px-6 text-right rounded-tr-xl w-[40%]">
                        Total Working Hours
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-amber-100/70 divide-y divide-amber-900/10">
                    {daywiseSummary.map((day) => (
                      <tr
                        key={day.date}
                        className="hover:bg-amber-400/[0.03] group transition-colors"
                      >
                        <td className="p-5 px-6 font-mono text-xs text-amber-400 align-middle">
                          {new Date(day.date).toLocaleDateString("en-GB")}
                        </td>
                        <td className="p-5 px-6 text-center align-middle">
                          <span className="bg-amber-900/20 text-amber-200 px-3 py-1 rounded-lg font-bold">
                            {day.entries}
                          </span>
                        </td>
                        <td className="p-5 px-6 text-right align-middle">
                          <div className="text-xl font-black text-white font-mono drop-shadow-sm">
                            <span className="text-amber-500">{day.hours}</span>
                            <span className="text-sm text-amber-100/30 mr-2">
                              h
                            </span>
                            <span className="text-amber-500">
                              {day.minutes}
                            </span>
                            <span className="text-sm text-amber-100/30">m</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {daywiseSummary.length === 0 && (
                      <tr>
                        <td
                          colSpan="3"
                          className="p-10 text-center text-amber-100/30 italic"
                        >
                          No summary data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
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

export default JcbTracker;
