import React, { useState, useEffect, useMemo } from "react";
import fuelService from "../../services/fuelService";
import { useUI } from "../../context/UIProvider";
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
} from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const FuelTracker = () => {
  const { toast } = useUI();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);

  // State for Confirm Dialog
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

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
      // ✅ REMOVED ARTIFICIAL TIMEOUT DELAY
      const { data } = await fuelService.getLogs();
      setLogs(data);
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load fuel logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const stats = useMemo(() => {
    return {
      totalLiters: logs.reduce((acc, log) => acc + (log.liters || 0), 0),
      totalCost: logs.reduce((acc, log) => acc + (log.totalCost || 0), 0),
      refuelCount: logs.length,
    };
  }, [logs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...formData, totalCost: calculatedTotal };
      if (editId) {
        await fuelService.updateLog(editId, payload);
        toast.success("Fuel log updated!");
      } else {
        await fuelService.addLog(payload);
        toast.success("Fuel logged successfully!");
      }
      resetForm();
      fetchLogs();
    } catch (err) {
      console.error("Submit Error:", err);
      toast.error("Failed to save fuel log.");
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

  const handleDeleteClick = (id) => {
    setDeleteModal({ isOpen: true, id });
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await fuelService.deleteLog(deleteModal.id);
      toast.info("Log deleted");
      fetchLogs();
    } catch (error) {
      toast.error("Failed to delete log");
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

  const handleExport = () => {
    try {
      if (logs.length === 0) return toast.info("No data to export");
      const headers = [
        "Date,Vehicle No,Pump/Station,Invoice No,Liters,Price/L,Total Cost",
      ];
      const rows = logs.map((l) => {
        const dateStr = `\t${new Date(l.date).toLocaleDateString("en-GB")}`;
        const station = `"${(l.stationName || "").replace(/"/g, '""')}"`;
        const invoice = `"${(l.invoiceNo || "").replace(/"/g, '""')}"`;
        return `${dateStr},${l.vehicleNo},${station},${invoice},${l.liters},${l.pricePerLiter},${l.totalCost}`;
      });
      const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Fuel_Logs_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Exported successfully");
    } catch (error) {
      toast.error("Failed to export.");
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Droplet className="text-cyan-400" />
            </div>{" "}
            Fuel Tracker
          </h1>
          <p className="text-cyan-200/30 text-sm mt-1 ml-1">
            Monitor vehicle refueling and fuel expenses.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 text-xs border-cyan-900/50 text-cyan-400 hover:bg-cyan-900/20 rounded-lg"
          onClick={handleExport}
        >
          <Download size={16} /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- FORM SECTION --- */}
        <div
          className={`bg-[#020617]/40 backdrop-blur-md border p-6 rounded-2xl shadow-xl relative overflow-hidden transition-colors ${editId ? "border-cyan-500/40 bg-cyan-950/20" : "border-cyan-500/10"}`}
        >
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-cyan-500/5">
            <div className="p-2 bg-cyan-600/20 rounded-lg text-cyan-400 border border-cyan-400/20 shadow-sm">
              {editId ? <Edit2 size={18} /> : <Fuel size={18} />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">
                {editId ? "Update Fuel Log" : "Log Refuel"}
              </h3>
            </div>
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
            <Input
              label="Fuel Station / Pump"
              placeholder="Reliance Petrol Pump"
              value={formData.stationName}
              onChange={(e) =>
                setFormData({ ...formData, stationName: e.target.value })
              }
              icon={MapPin}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Liters Filled"
                type="number"
                placeholder="0"
                value={formData.liters}
                onChange={(e) =>
                  setFormData({ ...formData, liters: e.target.value })
                }
                required
              />
              <Input
                label="Price / Liter"
                type="number"
                placeholder="0"
                value={formData.pricePerLiter}
                onChange={(e) =>
                  setFormData({ ...formData, pricePerLiter: e.target.value })
                }
                icon={IndianRupee}
                required
              />
            </div>

            <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex justify-between items-center">
              <span className="text-xs text-cyan-200/50 uppercase font-bold tracking-wider">
                Total Cost
              </span>
              <span className="text-xl font-bold text-cyan-400">
                ₹ {calculatedTotal.toLocaleString()}
              </span>
            </div>

            <Input
              label="Invoice / Receipt No."
              placeholder="INV-001"
              value={formData.invoiceNo}
              onChange={(e) =>
                setFormData({ ...formData, invoiceNo: e.target.value })
              }
            />

            <div className="flex gap-2 pt-2">
              {editId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetForm}
                  className="flex-1 border-cyan-900/50 text-cyan-200/50 rounded-lg"
                >
                  <X size={18} className="mr-1" /> Cancel
                </Button>
              )}
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-none py-3 rounded-lg font-semibold text-sm tracking-wide shadow-md"
                disabled={submitting}
              >
                <Save size={16} className="mr-2" />{" "}
                {editId ? "Update" : "Save Log"}
              </Button>
            </div>
          </form>
        </div>

        {/* --- STATS & TABLE SECTION --- */}
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
            <div className="p-6 border-b border-cyan-500/5 bg-white/[0.01]">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                Recent Refuels
              </h3>
            </div>

            <div className="overflow-x-auto w-full custom-scrollbar p-1">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-[#020617] text-cyan-200/30 text-[10px] uppercase font-bold tracking-wider border-b border-cyan-500/10 sticky top-0 z-10">
                  <tr>
                    <th className="py-4 px-5">Date</th>
                    <th className="py-4 px-5">Vehicle & Station</th>
                    <th className="py-4 px-5 text-right">Fuel & Cost</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-cyan-100/70 divide-y divide-cyan-500/5">
                  {logs.length > 0 ? (
                    logs.map((log) => (
                      <tr
                        key={log._id}
                        className="hover:bg-cyan-400/[0.03] group transition-colors"
                      >
                        <td className="p-4 font-mono text-xs whitespace-nowrap">
                          {new Date(log.date).toLocaleDateString("en-GB")}
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-white whitespace-nowrap">
                            {log.vehicleNo}
                          </div>
                          <div
                            className="text-xs text-cyan-200/50 mt-0.5 max-w-[150px] truncate"
                            title={log.stationName}
                          >
                            {log.stationName || "Unknown Pump"}
                          </div>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="font-mono text-cyan-400 font-medium">
                            {log.liters} L{" "}
                            <span className="text-[10px] text-cyan-200/30 font-sans">
                              (@ ₹{log.pricePerLiter})
                            </span>
                          </div>
                          <div className="text-sm font-semibold mt-0.5 text-cyan-100/90">
                            ₹ {log.totalCost.toLocaleString()}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(log)}
                              className="p-1.5 text-cyan-200/40 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-md transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(log._id)}
                              className="p-1.5 text-rose-200/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="text-center py-10 text-cyan-200/20 italic"
                      >
                        No fuel logs found.
                      </td>
                    </tr>
                  )}
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
        message="Are you sure you want to delete this fuel record? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="p-5 bg-[#020617]/40 backdrop-blur-md border border-cyan-500/10 rounded-2xl flex flex-col items-center text-center hover:bg-cyan-600/5 hover:border-cyan-500/30 transition-all cursor-default group relative overflow-hidden">
    <div
      className={`p-2.5 rounded-xl mb-3 border text-${color}-400 bg-${color}-500/10 border-${color}-400/20 group-hover:scale-110 transition-transform`}
    >
      <Icon size={20} />
    </div>
    <p className="relative z-10 text-[10px] text-cyan-200/30 uppercase font-bold tracking-wider mb-1">
      {title}
    </p>
    <h4 className="relative z-10 text-xl font-bold text-white">{value}</h4>
  </div>
);

export default FuelTracker;
