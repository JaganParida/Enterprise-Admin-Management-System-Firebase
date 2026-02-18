import React, { useState, useEffect, useMemo } from "react";
import vehicleService from "../../services/vehicleService";
import {
  Truck,
  MapPin,
  Calendar,
  User,
  Gauge,
  Fuel,
  IndianRupee,
  Save,
  Activity,
  History,
  Trash2,
  Edit2,
  X,
  Download,
} from "lucide-react";
import { useUI } from "../../context/UIProvider";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import LineChart from "../../components/charts/LineChart";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const VehicleLog = () => {
  const { toast } = useUI();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    vehicleNo: "",
    driverName: "",
    distance: "",
    litersFilled: "",
    pricePerLiter: "",
    route: "",
  });

  const calculatedTotal =
    (parseFloat(formData.litersFilled) || 0) *
    (parseFloat(formData.pricePerLiter) || 0);

  const fetchLogs = async () => {
    try {
      // ✅ REMOVED ARTIFICIAL TIMEOUT DELAY
      const { data } = await vehicleService.getLogs();
      setLogs(data);
    } catch (err) {
      console.error("Fetch Error:", err);
      toast.error("Failed to load vehicle logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const stats = useMemo(() => {
    return {
      totalTrips: logs.length,
      totalKm: logs.reduce((acc, log) => acc + (log.distance || 0), 0),
      totalCost: logs.reduce((acc, log) => acc + (log.fuelCost || 0), 0),
    };
  }, [logs]);

  const chartData = useMemo(() => {
    const sortedLogs = [...logs]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-7);
    return {
      labels: sortedLogs.map((l) =>
        new Date(l.date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
      ),
      datasets: [
        {
          label: "Fuel Cost (₹)",
          data: sortedLogs.map((l) => l.fuelCost),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          borderWidth: 4,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "#60a5fa",
          pointBorderColor: "rgba(255,255,255,0.5)",
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    };
  }, [logs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editId) {
        await vehicleService.updateLog(editId, formData);
        toast.success("Trip updated successfully!");
      } else {
        await vehicleService.addLog(formData);
        toast.success("Trip logged successfully!");
      }
      resetForm();
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save trip.");
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

  const handleDeleteClick = (id) => {
    setDeleteModal({ isOpen: true, id });
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await vehicleService.deleteLog(deleteModal.id);
      toast.info("Trip log deleted");
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
      driverName: "",
      distance: "",
      litersFilled: "",
      pricePerLiter: "",
      route: "",
    });
  };

  const handleExport = () => {
    try {
      if (logs.length === 0) return toast.info("No data to export");
      const headers = [
        "Date,Vehicle No,Driver,Route,Distance (KM),Fuel (L),Fuel Price/L,Total Fuel Cost",
      ];
      const rows = logs.map((l) => {
        const dateStr = `\t${new Date(l.date).toLocaleDateString("en-GB")}`;
        const route = `"${(l.route || "").replace(/"/g, '""')}"`;
        return `${dateStr},${l.vehicleNo},${l.driverName},${route},${l.distance},${l.litersFilled},${l.pricePerLiter},${l.fuelCost}`;
      });
      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Vehicle_Logs_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Vehicle logs exported successfully");
    } catch (error) {
      toast.error("Failed to export logs");
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <Truck className="text-blue-400" size={28} />
          </div>
          Vehicle Logistics
        </h1>
        <Button
          variant="outline"
          className="gap-2 text-xs border-blue-900/30 text-blue-400 hover:bg-blue-900/10 rounded-lg"
          onClick={handleExport}
        >
          <Download size={16} /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 h-full">
          <div
            className={`h-full bg-[#020617]/40 backdrop-blur-md border p-6 lg:p-7 rounded-2xl shadow-xl relative overflow-hidden flex flex-col transition-colors duration-300 ${editId ? "border-blue-500/40 bg-blue-950/20" : "border-blue-500/10"}`}
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/5 blur-[60px] rounded-full pointer-events-none" />

            <div className="flex items-center gap-3 mb-6 shrink-0 relative z-10">
              <div className="p-2.5 bg-blue-600/20 rounded-lg text-blue-400 border border-blue-400/20 shadow-sm shadow-blue-500/10">
                {editId ? <Edit2 size={20} /> : <Truck size={20} />}
              </div>
              <h3 className="text-lg font-semibold text-white tracking-tight">
                {editId ? "Update Log" : "New Entry"}
              </h3>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 flex-1 flex flex-col relative z-10"
            >
              <div className="space-y-4 flex-1">
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
                <div className="grid grid-cols-2 gap-4">
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
                    label="Driver Name"
                    placeholder="John"
                    value={formData.driverName}
                    onChange={(e) =>
                      setFormData({ ...formData, driverName: e.target.value })
                    }
                    icon={User}
                    required
                  />
                </div>
                <Input
                  label="Distance (KM)"
                  type="number"
                  step="any"
                  placeholder="0"
                  value={formData.distance}
                  onChange={(e) =>
                    setFormData({ ...formData, distance: e.target.value })
                  }
                  icon={Gauge}
                  required
                />
                <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/10 space-y-3 mt-1">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Liters"
                      type="number"
                      step="any"
                      placeholder="0"
                      value={formData.litersFilled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          litersFilled: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Rate"
                      type="number"
                      step="any"
                      placeholder="0"
                      value={formData.pricePerLiter}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pricePerLiter: e.target.value,
                        })
                      }
                      icon={IndianRupee}
                    />
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-blue-500/5">
                    <span className="text-[10px] uppercase font-bold text-blue-200/40 tracking-wider">
                      Est. Cost
                    </span>
                    <span className="text-xl font-bold text-blue-400">
                      ₹{" "}
                      {calculatedTotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
                <Input
                  label="Purpose / Route"
                  placeholder="Route info..."
                  value={formData.route}
                  onChange={(e) =>
                    setFormData({ ...formData, route: e.target.value })
                  }
                  icon={MapPin}
                  required
                />
              </div>

              <div className="flex gap-2 mt-auto pt-5">
                {editId && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={resetForm}
                    className="flex-1 bg-transparent border-blue-900/50 text-blue-200/50 hover:text-white rounded-lg"
                  >
                    <X size={18} />
                  </Button>
                )}
                <Button
                  type="submit"
                  className={`flex-1 py-3 text-sm font-semibold tracking-wide shadow-md rounded-lg border-none ${editId ? "bg-blue-600" : "bg-gradient-to-r from-blue-600 to-indigo-600"}`}
                  disabled={submitting}
                >
                  <Save size={16} className="mr-2" />{" "}
                  {editId ? "Update" : "Save Trip"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6 flex flex-col h-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Trips"
              value={stats.totalTrips}
              icon={MapPin}
              color="blue"
            />
            <StatCard
              title="Total Distance"
              value={`${stats.totalKm} KM`}
              icon={Activity}
              color="indigo"
            />
            <StatCard
              title="Fuel Expense"
              value={`₹ ${stats.totalCost.toLocaleString()}`}
              icon={Fuel}
              color="blue"
            />
          </div>

          <div className="p-6 lg:p-7 bg-[#020617]/40 backdrop-blur-md border border-blue-500/10 rounded-2xl shadow-xl relative flex flex-col min-h-[450px] flex-1">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />

            <div className="flex justify-between items-center mb-6 shrink-0 relative z-10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-500 rounded-full" />
                Fuel Trend Analysis
              </h3>
              <span className="text-xs text-blue-200/40 font-mono bg-blue-900/20 px-2.5 py-1 rounded border border-blue-500/10">
                Last 7 Logs
              </span>
            </div>

            <div className="relative flex-1 w-full min-h-0 z-10">
              <div className="absolute inset-0 [&>div]:!h-full [&>div]:!w-full [&>div]:!bg-transparent [&>div]:!border-none [&>div]:!shadow-none [&>div]:!p-0 [&>div]:!rounded-none [&>div]:!m-0">
                {logs.length > 0 ? (
                  <LineChart data={chartData} theme="blue" />
                ) : (
                  <div className="flex items-center justify-center h-full text-blue-200/20 italic text-sm">
                    No data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full">
        <div className="bg-[#020617]/40 backdrop-blur-md border border-blue-500/10 rounded-2xl shadow-xl overflow-hidden flex flex-col w-full">
          <div className="p-6 border-b border-blue-500/5 bg-white/[0.01]">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <History size={18} className="text-blue-500" /> Recent Activity
              Log
            </h3>
          </div>

          <div className="overflow-x-auto w-full custom-scrollbar p-2">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-blue-900/5 text-blue-200/30 text-[10px] uppercase font-bold tracking-wider border-b border-blue-500/10 sticky top-0 z-10">
                <tr>
                  <th className="py-4 px-5">Date</th>
                  <th className="py-4 px-5">Vehicle & Driver</th>
                  <th className="py-4 px-5">Route</th>
                  <th className="py-4 px-5 text-right">Distance</th>
                  <th className="py-4 px-5 text-right">Fuel Cost</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-500/5 text-sm">
                {logs.length > 0 ? (
                  logs.map((trip) => (
                    <tr
                      key={trip._id}
                      className="hover:bg-blue-400/[0.02] transition-colors group"
                    >
                      <td className="p-5 text-blue-200/50 font-mono text-xs whitespace-nowrap">
                        {new Date(trip.date).toLocaleDateString("en-GB")}
                      </td>
                      <td className="p-5 font-medium text-blue-50 group-hover:text-blue-400 transition-colors whitespace-nowrap">
                        {trip.vehicleNo}{" "}
                        <span className="text-[10px] text-blue-200/40 font-normal ml-1">
                          ({trip.driverName})
                        </span>
                      </td>
                      <td
                        className="p-5 text-blue-200/70 max-w-[200px] truncate"
                        title={trip.route}
                      >
                        {trip.route}
                      </td>
                      <td className="p-5 text-right font-mono text-blue-400 font-medium whitespace-nowrap">
                        {trip.distance}{" "}
                        <span className="text-[10px] text-blue-200/30">KM</span>
                      </td>
                      <td className="p-5 text-right font-semibold text-blue-100 whitespace-nowrap">
                        ₹ {trip.fuelCost?.toLocaleString()}
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(trip)}
                            className="p-1.5 text-blue-200/40 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(trip._id)}
                            className="p-1.5 text-rose-200/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
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
                      colSpan="6"
                      className="text-center py-16 text-blue-200/20 font-medium italic"
                    >
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Delete Trip Log?"
        message="Are you sure you want to delete this log? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => {
  const themes = {
    blue: "text-blue-400 bg-blue-600/10 border-blue-400/10",
    indigo: "text-indigo-400 bg-indigo-600/10 border-indigo-400/10",
  };
  return (
    <div className="p-5 lg:p-6 bg-[#020617]/40 backdrop-blur-md border border-blue-500/10 rounded-2xl flex flex-col items-center text-center hover:bg-blue-600/5 transition-all group relative overflow-hidden">
      <div
        className={`absolute -right-5 -top-5 w-20 h-20 bg-blue-500/5 blur-2xl rounded-full group-hover:bg-blue-500/10 transition-all`}
      />
      <div
        className={`p-3 rounded-xl mb-3 transition-transform group-hover:scale-105 border ${themes[color] || themes.blue}`}
      >
        <Icon size={20} />
      </div>
      <p className="text-[10px] text-blue-200/30 uppercase font-semibold tracking-wider mb-1">
        {title}
      </p>
      <h4 className="text-xl lg:text-2xl font-bold text-white">{value}</h4>
    </div>
  );
};

export default VehicleLog;
