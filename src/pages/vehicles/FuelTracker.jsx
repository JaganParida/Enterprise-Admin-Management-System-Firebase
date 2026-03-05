import React, { useState, useEffect, useMemo } from "react";
import fuelService from "../../services/fuelService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Fuel,
  Truck,
  Calendar,
  MapPin,
  IndianRupee,
  Save,
  Download,
  Droplet,
  Trash2,
  Edit2,
  X,
  History,
} from "lucide-react";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const FuelTracker = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [warningTooltip, setWarningTooltip] = useState(null);
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    itemName: "",
  });

  const isManager = admin?.data?.role === "manager";

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    vehicleNo: "",
    stationName: "",
    liters: "",
    pricePerLiter: "",
    invoiceNo: "",
  });

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

  const stats = useMemo(
    () => ({
      // 🚀 SAFETY: Number checks to prevent white screen
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  const handleEdit = (log) => {
    setEditId(log._id);
    setFormData({
      date: new Date(log.date).toISOString().split("T")[0],
      vehicleNo: log.vehicleNo,
      stationName: log.stationName || "",
      liters: log.liters,
      pricePerLiter: log.pricePerLiter,
      invoiceNo: log.invoiceNo || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDisabledClick = (id) => {
    setWarningTooltip(id);
    setTimeout(() => setWarningTooltip(null), 2500);
  };

  const openHistory = (log) => {
    const sortedHistory = log.editHistory ? [...log.editHistory].reverse() : [];
    setHistoryModal({
      isOpen: true,
      data: sortedHistory,
      itemName: `Fuel for ${log.vehicleNo}`,
    });
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await fuelService.deleteLog(deleteModal.id);
      toast.info("Log deleted");
      fetchLogs();
    } catch (err) {
      toast.error("Delete failed");
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      vehicleNo: "",
      stationName: "",
      liters: "",
      pricePerLiter: "",
      invoiceNo: "",
    });
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
              <Droplet />
            </div>{" "}
            Fuel Tracker
          </h1>
          <p className="text-cyan-100/40 text-sm mt-1 ml-1">
            Monitor vehicle refueling and fuel expenses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- FORM SECTION --- */}
        <div
          className={`bg-[#020617]/40 backdrop-blur-md border p-6 rounded-2xl shadow-xl relative transition-colors ${editId ? "border-cyan-500/40 bg-cyan-950/20" : "border-cyan-500/10"}`}
        >
          {/* 🚀 UI FIX: Background Blur in separate container */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl" />
          </div>

          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-cyan-500/5 relative z-10">
            <div className="p-2 bg-cyan-600/20 rounded-lg text-cyan-400 border border-cyan-400/20 shadow-sm">
              {editId ? <Edit2 size={18} /> : <Fuel size={18} />}
            </div>
            <h3 className="text-lg font-semibold text-white tracking-tight">
              {editId ? "Update Fuel Log" : "Log Refuel"}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              icon={Calendar}
              required
            />
            <Input
              label="Vehicle No."
              placeholder="OD-02-A-1234"
              value={formData.vehicleNo}
              onChange={(e) =>
                setFormData({ ...formData, vehicleNo: e.target.value })
              }
              icon={Truck}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Liters"
                type="number"
                value={formData.liters}
                onChange={(e) =>
                  setFormData({ ...formData, liters: e.target.value })
                }
                required
              />
              <Input
                label="Rate"
                type="number"
                value={formData.pricePerLiter}
                onChange={(e) =>
                  setFormData({ ...formData, pricePerLiter: e.target.value })
                }
                icon={IndianRupee}
                required
              />
            </div>
            <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex justify-between items-center">
              <span className="text-xs uppercase font-bold text-cyan-200/50 tracking-wider">
                Total Cost
              </span>
              <span className="text-xl font-bold text-cyan-400">
                ₹ {calculatedTotal.toLocaleString()}
              </span>
            </div>
            <div className="flex gap-2">
              {editId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="p-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <X size={18} />
                </button>
              )}
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg shadow-md"
                disabled={submitting}
              >
                <Save size={16} className="mr-2" />{" "}
                {editId ? "Update" : "Save Log"}
              </Button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              title="Total Liters"
              value={stats.totalLiters}
              icon={Droplet}
              color="cyan"
            />
            <StatCard
              title="Total Spent"
              value={`₹ ${stats.totalCost.toLocaleString()}`}
              icon={IndianRupee}
              color="blue"
            />
            <StatCard
              title="Refuel Count"
              value={stats.refuelCount}
              icon={Fuel}
              color="cyan"
            />
          </div>

          <div className="bg-[#020617]/40 backdrop-blur-md border border-cyan-500/10 rounded-2xl shadow-xl overflow-hidden flex flex-col w-full">
            <div className="p-5 border-b border-cyan-500/5">
              <h3 className="text-lg font-semibold text-white">
                Recent Refuels
              </h3>
            </div>
            <div className="overflow-x-auto w-full pb-4 p-1">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-[#020617] text-cyan-200/30 text-[10px] uppercase font-bold tracking-wider border-b border-cyan-500/10">
                  <tr>
                    <th className="py-4 px-5">Date</th>
                    <th className="py-4 px-5">Vehicle & Role</th>
                    <th className="py-4 px-5 text-right">Fuel & Cost</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-cyan-100/70 divide-y divide-cyan-500/5">
                  {logs.map((log) => (
                    <tr
                      key={log._id}
                      className="hover:bg-cyan-400/[0.03] group transition-colors"
                    >
                      <td className="p-4 font-mono text-xs whitespace-nowrap align-middle">
                        {new Date(log.date).toLocaleDateString("en-GB")}
                      </td>
                      <td className="p-4 align-middle">
                        <div className="font-medium text-white whitespace-nowrap">
                          {log.vehicleNo}
                        </div>

                        {/* 🛡️ UPDATED HISTORY BADGE WITH DATE/TIME */}
                        {log.editHistory && log.editHistory.length > 0 ? (
                          <div
                            onClick={() => openHistory(log)}
                            className="mt-2 flex flex-col gap-0.5 cursor-pointer bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/20 p-1.5 rounded-lg transition-all w-max whitespace-nowrap"
                          >
                            <div className="text-[10px] font-mono text-cyan-400/90 flex items-center gap-1.5 uppercase tracking-widest font-bold">
                              <History size={10} />{" "}
                              {log.editHistory[log.editHistory.length - 1]
                                .role || "ADMIN"}
                              {log.editHistory.length > 1 && (
                                <span className="text-[8px] opacity-60">
                                  +{log.editHistory.length - 1} MORE
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-cyan-200/30 ml-4 font-medium">
                              {new Date(
                                log.editHistory[log.editHistory.length - 1].at,
                              ).toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ) : log.lastEditedRole ? (
                          <div className="text-[9px] font-mono text-cyan-400/50 font-bold mt-1.5 uppercase tracking-widest flex flex-col gap-0.5">
                            <span>✍️ {log.lastEditedRole}</span>
                            {log.lastEditedAt && (
                              <span className="text-cyan-200/20 font-medium normal-case tracking-normal ml-4">
                                {new Date(log.lastEditedAt).toLocaleString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[9px] text-cyan-200/30 mt-1 uppercase font-bold tracking-widest">
                            {log.createdRole || "ADMIN"}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right align-middle whitespace-nowrap">
                        <div className="font-mono text-cyan-400 font-bold">
                          ₹{(Number(log.totalCost) || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] opacity-40">
                          {Number(log.liters) || 0}L @ ₹
                          {Number(log.pricePerLiter) || 0}
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex justify-end gap-2 items-center">
                          <button
                            onClick={() => handleEdit(log)}
                            className="p-2 text-cyan-200/40 hover:text-cyan-400 transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <div className="relative flex items-center">
                            <button
                              onClick={() =>
                                isManager
                                  ? handleDisabledClick(log._id)
                                  : setDeleteModal({
                                      isOpen: true,
                                      id: log._id,
                                    })
                              }
                              className={`p-2 rounded-lg transition-colors ${isManager ? "text-red-100/20 opacity-40 cursor-not-allowed" : "text-rose-200/40 hover:text-rose-500"}`}
                            >
                              <Trash2 size={16} />
                            </button>
                            {/* 🔥 TOOLTIP FIX: Added z-index to stay on top */}
                            {warningTooltip === log._id && (
                              <div className="absolute bottom-full right-0 mb-2 z-[999] animate-in fade-in zoom-in-95 duration-200">
                                <div className="bg-[#050a08] border border-red-500/30 text-red-400 text-[10px] uppercase font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max shadow-2xl">
                                  🚫 Action Denied
                                </div>
                                <div className="absolute -bottom-1 right-3 w-2 h-2 bg-[#050a08] border-b border-r border-red-500/30 rotate-45"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Delete Fuel Log?"
        message="Delete this fuel record?"
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="p-4 bg-[#020617]/40 border border-cyan-500/10 rounded-2xl flex flex-col items-center group relative overflow-hidden transition-all hover:bg-cyan-900/10">
    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
      <div
        className={`absolute -right-5 -top-5 w-16 h-16 bg-${color}-500/5 blur-xl rounded-full group-hover:bg-${color}-500/10 transition-all`}
      />
    </div>
    <div
      className={`p-2 rounded-xl mb-2 text-${color}-400 bg-${color}-500/10 relative z-10`}
    >
      <Icon size={18} />
    </div>
    <p className="text-[9px] text-cyan-200/30 uppercase font-bold mb-1 relative z-10">
      {title}
    </p>
    <h4 className="text-lg font-bold text-white relative z-10">{value}</h4>
  </div>
);

export default FuelTracker;
