import React, { useState, useEffect, useMemo } from "react";
import maintenanceService from "../../services/maintenanceService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Wrench,
  Truck,
  Calendar,
  IndianRupee,
  Save,
  Trash2,
  Edit2,
  X,
  History,
  Settings,
} from "lucide-react";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const Maintenance = () => {
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
    serviceType: "Routine Service",
    garage: "",
    cost: "",
    description: "",
  });

  const fetchLogs = async () => {
    try {
      const { data } = await maintenanceService.getLogs();
      // 🚀 CRASH PROOF 1: Data null ya undefined ho toh empty array set karein
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load maintenance records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const stats = useMemo(() => {
    // 🚀 CRASH PROOF 2: Logs exist karte hain ya nahi, uska check
    const currentLogs = Array.isArray(logs) ? logs : [];
    return {
      totalCost: currentLogs.reduce(
        (acc, log) => acc + (Number(log?.cost) || 0),
        0,
      ),
      serviceCount: currentLogs.length,
    };
  }, [logs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  const handleEdit = (log) => {
    if (!log) return;
    setEditId(log._id);
    setFormData({
      date: log.date
        ? new Date(log.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      vehicleNo: log.vehicleNo || "",
      serviceType: log.serviceType || "Routine Service",
      garage: log.garage || "",
      cost: log.cost || "",
      description: log.description || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDisabledClick = (id) => {
    setWarningTooltip(id);
    setTimeout(() => setWarningTooltip(null), 2500);
  };

  const openHistory = (log) => {
    // 🚀 CRASH PROOF 3: Array spread se pehle type check
    const historyData = Array.isArray(log?.editHistory)
      ? [...log.editHistory].reverse()
      : [];
    setHistoryModal({
      isOpen: true,
      data: historyData,
      itemName: `${log?.vehicleNo || "Unknown Vehicle"} Service`,
    });
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

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await maintenanceService.deleteLog(deleteModal.id);
      toast.info("Log removed.");
      fetchLogs();
    } catch (err) {
      toast.error("Delete failed.");
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <div className="p-2 bg-amber-500/10 rounded-lg">
          <Wrench className="text-amber-400" />
        </div>{" "}
        Maintenance Logs
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- FORM SECTION --- */}
        <div
          className={`bg-[#050a08] border p-6 rounded-2xl shadow-xl relative transition-colors ${editId ? "border-amber-500/40 bg-amber-950/10" : "border-amber-900/30"}`}
        >
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2 relative z-10">
            {editId ? (
              <Edit2 size={18} className="text-amber-400" />
            ) : (
              <Settings size={18} className="text-amber-400" />
            )}{" "}
            {editId ? "Update Entry" : "Log Service"}
          </h3>
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
              placeholder="OD-02..."
              value={formData.vehicleNo}
              onChange={(e) =>
                setFormData({ ...formData, vehicleNo: e.target.value })
              }
              icon={Truck}
              required
            />
            <Input
              label="Cost (₹)"
              type="number"
              value={formData.cost}
              onChange={(e) =>
                setFormData({ ...formData, cost: e.target.value })
              }
              icon={IndianRupee}
              required
            />
            <div className="flex gap-2 pt-2">
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
                className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg shadow-md"
                disabled={submitting}
              >
                <Save size={16} className="mr-2" /> {editId ? "Update" : "Save"}
              </Button>
            </div>
          </form>
        </div>

        {/* --- LIST SECTION --- */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-amber-900/10 border border-amber-500/10 rounded-2xl text-center">
              <p className="text-[10px] text-amber-200/30 uppercase font-bold mb-1 tracking-widest">
                Total Spent
              </p>
              <h4 className="text-xl font-bold text-white">
                ₹ {(stats.totalCost || 0).toLocaleString()}
              </h4>
            </div>
            <div className="p-4 bg-amber-900/10 border border-amber-500/10 rounded-2xl text-center">
              <p className="text-[10px] text-amber-200/30 uppercase font-bold mb-1 tracking-widest">
                Trips Logged
              </p>
              <h4 className="text-xl font-bold text-white">
                {stats.serviceCount || 0}
              </h4>
            </div>
          </div>

          <div className="bg-[#050a08] border border-emerald-900/20 rounded-2xl shadow-xl overflow-visible relative">
            <div className="p-5 border-b border-emerald-900/20 bg-white/[0.01]">
              <h3 className="text-lg font-semibold text-white">
                Service History
              </h3>
            </div>
            <div className="overflow-x-auto p-1">
              <table className="w-full text-left min-w-[750px]">
                <thead className="bg-[#020403] text-amber-100/40 text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Vehicle & Role</th>
                    <th className="p-4">Service Type</th>
                    <th className="p-4 text-right">Cost</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-amber-50/70 divide-y divide-emerald-900/10">
                  {logs.map((log) => {
                    // 🚀 CRASH PROOF 4: Optional chaining for array indexing
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
                        className="hover:bg-amber-400/[0.02] transition-colors group"
                      >
                        <td className="p-4 font-mono text-xs align-middle">
                          {log.date
                            ? new Date(log.date).toLocaleDateString("en-GB")
                            : "N/A"}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="font-medium text-white whitespace-nowrap">
                            {log.vehicleNo || "N/A"}
                          </div>
                          {historyArray.length > 0 ? (
                            <div
                              onClick={() => openHistory(log)}
                              className="mt-2 flex flex-col gap-0.5 cursor-pointer bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 p-1.5 rounded-lg transition-all w-max whitespace-nowrap"
                            >
                              <div className="text-[10px] font-mono text-amber-400/90 flex items-center gap-1 uppercase tracking-widest font-bold leading-none">
                                <History size={10} />{" "}
                                {latestEdit?.role || "ADMIN"}
                                {historyArray.length > 1 && (
                                  <span className="text-[8px] opacity-60 ml-1">
                                    +{historyArray.length - 1} MORE
                                  </span>
                                )}
                              </div>
                              <span className="text-[8px] text-amber-200/30 ml-4">
                                {latestEdit?.at
                                  ? new Date(latestEdit.at).toLocaleString(
                                      "en-GB",
                                      {
                                        day: "2-digit",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )
                                  : ""}
                              </span>
                            </div>
                          ) : log.lastEditedRole ? (
                            <div className="text-[9px] font-mono text-amber-400/50 font-bold mt-1.5 uppercase tracking-widest flex flex-col gap-0.5">
                              <span>✍️ {log.lastEditedRole}</span>
                              {log.lastEditedAt && (
                                <span className="text-amber-200/20 font-medium ml-4">
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
                            <div className="text-[9px] text-amber-200/30 mt-1 uppercase font-bold tracking-widest">
                              {log.createdRole || "ADMIN"}
                            </div>
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="text-amber-400/80 font-bold text-xs uppercase tracking-wide">
                            {log.serviceType || "Routine"}
                          </div>
                          <div className="text-[10px] opacity-40 line-clamp-1">
                            {log.description || log.garage || "-"}
                          </div>
                        </td>
                        <td className="p-4 text-right font-bold text-white align-middle">
                          ₹{(Number(log.cost) || 0).toLocaleString()}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex justify-end gap-2 items-center relative">
                            <button
                              onClick={() => handleEdit(log)}
                              className="p-2 text-amber-100/40 hover:text-amber-400 transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <div className="relative">
                              <button
                                onClick={() =>
                                  isManager
                                    ? handleDisabledClick(log._id)
                                    : setDeleteModal({
                                        isOpen: true,
                                        id: log._id,
                                      })
                                }
                                className={`p-2 rounded-lg transition-colors ${isManager ? "opacity-30 cursor-not-allowed" : "hover:text-rose-500"}`}
                              >
                                <Trash2 size={16} />
                              </button>
                              {/* 🔥 TOOLTIP FIX: High Z-Index & Container escape */}
                              {warningTooltip === log._id && (
                                <div className="absolute bottom-full right-0 mb-2 z-[9999] animate-in fade-in zoom-in-95 duration-200">
                                  <div className="bg-[#050a08] border border-red-500/30 text-red-400 text-[10px] uppercase font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max shadow-2xl">
                                    🚫 Action Denied
                                  </div>
                                  <div className="absolute -bottom-1 right-3 w-2 h-2 bg-[#050a08] border-b border-r border-red-500/30 rotate-45" />
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* --- HISTORY MODAL --- */}
      {historyModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#050a08] border border-amber-900/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-amber-900/20 flex justify-between items-center bg-[#020403]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History size={18} className="text-amber-500" /> Log History
              </h3>
              <button
                onClick={() =>
                  setHistoryModal({ isOpen: false, data: [], itemName: "" })
                }
                className="text-emerald-100/40 hover:text-white p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {historyModal.data.map((edit, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-[#020403] p-4 rounded-xl border border-amber-900/20 group hover:border-emerald-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-black text-sm uppercase shadow-inner">
                      {edit.role ? edit.role.charAt(0) : "A"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-100 uppercase tracking-widest">
                        {edit.role || "Admin"}
                      </p>
                      <p className="text-[9px] text-emerald-100/30 font-mono mt-0.5">
                        {edit.by}
                      </p>
                      <p className="text-[10px] text-amber-400/60 font-mono mt-1">
                        {new Date(edit.at).toLocaleString("en-GB")}
                      </p>
                    </div>
                  </div>
                  {idx === 0 && (
                    <span className="relative z-10 text-[9px] bg-amber-500/20 text-emerald-400 px-2 py-1 rounded-md uppercase font-black border border-emerald-500/20">
                      Latest
                    </span>
                  )}
                </div>
              ))}
              {historyModal.data.length === 0 && (
                <p className="text-center py-10 text-white/20 italic">
                  No edit history available.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Delete Record?"
        message="Are you sure you want to delete this maintenance record?"
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
};

export default Maintenance;
