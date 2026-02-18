import React, { useState, useEffect, useMemo } from "react";
import maintenanceService from "../../services/maintenanceService";
import { useUI } from "../../context/UIProvider";
import {
  Wrench,
  Truck,
  Calendar,
  Settings,
  AlertTriangle,
  IndianRupee,
  Save,
  Download,
  Trash2,
  Edit2,
  X,
  FileText,
} from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const Maintenance = () => {
  const { toast } = useUI();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    vehicleNo: "",
    serviceType: "Routine Service",
    garage: "",
    cost: "",
    description: "",
  });

  const fetchLogs = async () => {
    try {
      // ✅ REMOVED ARTIFICIAL TIMEOUT DELAY
      const { data } = await maintenanceService.getLogs();
      setLogs(data);
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load maintenance logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const stats = useMemo(() => {
    return {
      totalCost: logs.reduce((acc, log) => acc + (log.cost || 0), 0),
      serviceCount: logs.length,
    };
  }, [logs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...formData, cost: Number(formData.cost) };
      if (editId) {
        await maintenanceService.updateLog(editId, payload);
        toast.success("Maintenance log updated!");
      } else {
        await maintenanceService.addLog(payload);
        toast.success("Maintenance logged successfully!");
      }
      resetForm();
      fetchLogs();
    } catch (err) {
      console.error("Submit Error:", err);
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
      serviceType: log.serviceType,
      garage: log.garage || "",
      cost: log.cost,
      description: log.description || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (id) => {
    setDeleteModal({ isOpen: true, id });
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await maintenanceService.deleteLog(deleteModal.id);
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
      serviceType: "Routine Service",
      garage: "",
      cost: "",
      description: "",
    });
  };

  const handleExport = () => {
    try {
      if (logs.length === 0) return toast.info("No data to export");
      const headers = [
        "Date",
        "Vehicle No",
        "Service Type",
        "Garage",
        "Description",
        "Cost",
      ];
      const rows = logs.map((l) => {
        const dateStr = `="${new Date(l.date).toLocaleDateString("en-GB")}"`;
        const garage = `"${(l.garage || "").replace(/"/g, '""')}"`;
        const desc = `"${(l.description || "").replace(/"/g, '""')}"`;
        return `${dateStr},${l.vehicleNo},${l.serviceType},${garage},${desc},${l.cost}`;
      });
      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Maintenance_Logs_${new Date().toISOString().split("T")[0]}.csv`,
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
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Wrench className="text-amber-400" />
            </div>{" "}
            Maintenance
          </h1>
          <p className="text-amber-200/30 text-sm mt-1 ml-1">
            Track vehicle repairs, parts, and servicing.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 text-xs border-amber-900/50 text-amber-400 hover:bg-amber-900/20 rounded-lg"
          onClick={handleExport}
        >
          <Download size={16} /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- FORM SECTION --- */}
        <div
          className={`bg-[#020617]/40 backdrop-blur-md border p-6 rounded-2xl shadow-xl relative overflow-hidden transition-colors duration-300 ${editId ? "border-amber-500/40 bg-amber-950/20" : "border-amber-500/10"}`}
        >
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-amber-500/5">
            <div className="p-2 bg-amber-600/20 rounded-lg text-amber-400 border border-amber-400/20 shadow-sm">
              {editId ? <Edit2 size={18} /> : <Settings size={18} />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">
                {editId ? "Update Record" : "Log Maintenance"}
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

            <div className="relative">
              <label className="block text-[10px] font-bold text-amber-200/60 uppercase tracking-widest mb-2 ml-1">
                Service Type
              </label>
              <select
                className="w-full px-4 py-3 bg-[#020403]/60 border border-amber-900/40 rounded-xl text-amber-50 outline-none focus:border-amber-500/50 appearance-none font-medium transition-colors"
                value={formData.serviceType}
                onChange={(e) =>
                  setFormData({ ...formData, serviceType: e.target.value })
                }
              >
                <option
                  value="Routine Service"
                  className="bg-[#020403] text-amber-100"
                >
                  Routine Service
                </option>
                <option
                  value="Engine Repair"
                  className="bg-[#020403] text-amber-100"
                >
                  Engine Repair
                </option>
                <option
                  value="Tyre Replacement"
                  className="bg-[#020403] text-amber-100"
                >
                  Tyre Replacement
                </option>
                <option
                  value="Body Work"
                  className="bg-[#020403] text-amber-100"
                >
                  Body Work
                </option>
                <option
                  value="Electrical"
                  className="bg-[#020403] text-amber-100"
                >
                  Electrical
                </option>
                <option value="Other" className="bg-[#020403] text-amber-100">
                  Other
                </option>
              </select>
              <div className="absolute right-4 top-[38px] pointer-events-none text-amber-500/50">
                ▼
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Garage / Mechanic"
                placeholder="Auto Care"
                value={formData.garage}
                onChange={(e) =>
                  setFormData({ ...formData, garage: e.target.value })
                }
              />
              <Input
                label="Total Cost"
                type="number"
                placeholder="0"
                value={formData.cost}
                onChange={(e) =>
                  setFormData({ ...formData, cost: e.target.value })
                }
                icon={IndianRupee}
                required
              />
            </div>

            <Input
              label="Description / Parts"
              placeholder="Changed oil and filter"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              icon={FileText}
            />

            <div className="flex gap-2 pt-2">
              {editId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetForm}
                  className="flex-1 bg-transparent border-amber-900/50 text-amber-200/50 hover:text-white rounded-lg"
                >
                  <X size={18} className="mr-1" /> Cancel
                </Button>
              )}
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border-none py-3 rounded-lg font-semibold text-sm tracking-wide shadow-md"
                disabled={submitting}
              >
                <Save size={16} className="mr-2" />{" "}
                {editId ? "Update Record" : "Save Record"}
              </Button>
            </div>
          </form>
        </div>

        {/* --- STATS & TABLE SECTION --- */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Total Spent"
              value={`₹ ${stats.totalCost.toLocaleString()}`}
              icon={IndianRupee}
              color="amber"
            />
            <StatCard
              title="Services Logged"
              value={stats.serviceCount}
              icon={AlertTriangle}
              color="orange"
            />
          </div>

          <div className="bg-[#020617]/40 backdrop-blur-md border border-amber-500/10 rounded-2xl shadow-xl overflow-hidden flex flex-col w-full">
            <div className="p-6 border-b border-amber-500/5 bg-white/[0.01]">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Wrench size={18} className="text-amber-500" />
                Service History
              </h3>
            </div>

            <div className="overflow-x-auto w-full custom-scrollbar p-1">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-[#020617] text-amber-200/30 text-[10px] uppercase font-bold tracking-wider border-b border-amber-500/10 sticky top-0 z-10">
                  <tr>
                    <th className="py-4 px-5">Date</th>
                    <th className="py-4 px-5">Vehicle</th>
                    <th className="py-4 px-5">Service Details</th>
                    <th className="py-4 px-5 text-right">Cost</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-amber-100/70 divide-y divide-amber-500/5">
                  {logs.length > 0 ? (
                    logs.map((log) => (
                      <tr
                        key={log._id}
                        className="hover:bg-amber-400/[0.03] group transition-colors"
                      >
                        <td className="p-4 text-amber-200/40 text-xs font-mono whitespace-nowrap">
                          {new Date(log.date).toLocaleDateString("en-GB")}
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-white whitespace-nowrap">
                            {log.vehicleNo}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-amber-400/80 text-xs uppercase tracking-wide mb-0.5">
                            {log.serviceType}
                          </div>
                          <div
                            className="text-xs text-amber-200/60 max-w-[200px] truncate"
                            title={log.description || log.garage}
                          >
                            {log.description || log.garage || "-"}
                          </div>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="font-mono text-white font-medium">
                            ₹ {log.cost.toLocaleString()}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(log)}
                              className="p-1.5 text-amber-200/60 hover:text-amber-400 hover:bg-amber-500/10 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(log._id)}
                              className="p-1.5 text-rose-200/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                              title="Delete"
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
                        colSpan="5"
                        className="text-center py-10 text-amber-200/20 italic"
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

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Delete Record?"
        message="Are you sure you want to delete this maintenance record? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="p-5 bg-[#020617]/40 backdrop-blur-md border border-amber-500/10 rounded-2xl flex flex-col items-center text-center hover:bg-amber-600/5 hover:border-amber-500/30 transition-all cursor-default group relative overflow-hidden">
    <div
      className={`p-2.5 rounded-xl mb-3 border text-${color}-400 bg-${color}-500/10 border-${color}-400/20 group-hover:scale-110 transition-transform`}
    >
      <Icon size={20} />
    </div>
    <p className="relative z-10 text-[10px] text-amber-200/30 uppercase font-bold tracking-wider mb-1">
      {title}
    </p>
    <h4 className="relative z-10 text-xl font-bold text-white">{value}</h4>
  </div>
);

export default Maintenance;
