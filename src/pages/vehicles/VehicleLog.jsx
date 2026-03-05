import React, { useState, useEffect, useMemo } from "react";
import vehicleService from "../../services/vehicleService";
import {
  Truck,
  MapPin,
  Calendar,
  User,
  IndianRupee,
  Save,
  History,
  Trash2,
  Edit2,
  X,
} from "lucide-react";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const VehicleLog = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
    driverName: "",
    distance: "",
    litersFilled: "",
    pricePerLiter: "",
    route: "",
  });

  const fetchLogs = async () => {
    try {
      const { data } = await vehicleService.getLogs();
      setLogs(data);
    } catch (err) {
      toast.error("Error loading logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      if (editId) {
        await vehicleService.updateLog(editId, formData, currentUser);
        toast.success("Updated!");
      } else {
        await vehicleService.addLog(formData, currentUser);
        toast.success("Logged!");
      }
      resetForm();
      fetchLogs();
    } catch (err) {
      toast.error("Save failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (log) => {
    setEditId(log._id);
    setFormData({
      date: new Date(log.date).toISOString().split("T")[0],
      vehicleNo: log.vehicleNo,
      driverName: log.driverName,
      distance: log.distance,
      litersFilled: log.litersFilled || "",
      pricePerLiter: log.pricePerLiter || "",
      route: log.route,
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
      itemName: `Trip for ${log.vehicleNo}`,
    });
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      vehicleNo: "",
      driverName: "",
      distance: "",
      litersFilled: "",
      pricePerLiter: "",
      route: "",
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
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
          <Truck className="text-blue-400" size={28} />
        </div>{" "}
        Trip Logbook
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4">
          <div
            className={`bg-[#050a08] border p-6 rounded-2xl shadow-xl transition-colors ${editId ? "border-blue-500/40 bg-blue-950/10" : "border-blue-900/30"}`}
          >
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              {editId ? "Update Trip" : "New Trip Entry"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                required
              />
              <Input
                label="Driver Name"
                value={formData.driverName}
                onChange={(e) =>
                  setFormData({ ...formData, driverName: e.target.value })
                }
                icon={User}
                required
              />
              <Input
                label="Route"
                value={formData.route}
                onChange={(e) =>
                  setFormData({ ...formData, route: e.target.value })
                }
                icon={MapPin}
                required
              />
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg"
                disabled={submitting}
              >
                <Save size={16} className="mr-2" /> Save Trip
              </Button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-[#050a08] border border-blue-900/30 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-blue-900/20">
              <h3 className="text-lg font-semibold text-white">Recent Trips</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-[#020403] text-blue-100/40 text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-4 px-5">Date</th>
                    <th className="py-4 px-5">Vehicle & Driver</th>
                    <th className="py-4 px-5">Route</th>
                    <th className="py-4 px-5 text-right">Fuel Cost</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-blue-900/10">
                  {logs.map((trip) => (
                    <tr
                      key={trip._id}
                      className="hover:bg-blue-400/[0.02] transition-colors group"
                    >
                      <td className="p-4 font-mono text-xs text-blue-100/40">
                        {new Date(trip.date).toLocaleDateString("en-GB")}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white">
                          {trip.vehicleNo}
                        </div>
                        <div className="text-[10px] opacity-40 uppercase tracking-widest">
                          {trip.driverName}
                        </div>
                        {trip.editHistory && trip.editHistory.length > 0 ? (
                          <div
                            onClick={() => openHistory(trip)}
                            className="mt-2 flex items-center gap-1.5 cursor-pointer bg-blue-500/5 text-[9px] font-bold text-blue-400 p-1 rounded uppercase tracking-widest w-max"
                          >
                            <History size={10} />{" "}
                            {trip.editHistory[trip.editHistory.length - 1].role}
                          </div>
                        ) : (
                          <div className="text-[9px] opacity-20 mt-1 uppercase font-bold">
                            {trip.createdRole || "ADMIN"}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-blue-100/60 text-xs italic">
                        "{trip.route}"
                      </td>
                      <td className="p-4 text-right font-bold text-blue-400">
                        ₹{trip.fuelCost?.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2 items-center h-full">
                          <button
                            onClick={() => handleEdit(trip)}
                            className="p-2 text-blue-200/40 hover:text-blue-400 transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <div className="relative flex items-center">
                            <button
                              onClick={() =>
                                isManager
                                  ? handleDisabledClick(trip._id)
                                  : setDeleteModal({
                                      isOpen: true,
                                      id: trip._id,
                                    })
                              }
                              className={`p-2 rounded-lg transition-colors ${isManager ? "opacity-30 cursor-not-allowed" : "hover:text-rose-500"}`}
                            >
                              <Trash2 size={16} />
                            </button>
                            {warningTooltip === trip._id && (
                              <div className="absolute bottom-full right-0 mb-2 z-50 animate-in fade-in zoom-in-95 duration-200">
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
    </div>
  );
};

export default VehicleLog;
