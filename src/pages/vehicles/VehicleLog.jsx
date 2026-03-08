import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import vehicleService from "../../services/vehicleService";
import {
  Truck,
  MapPin,
  Calendar,
  User,
  IndianRupee,
  Save,
  History,
  X,
  Package,
  ArrowRightCircle,
  FileText,
  Edit2,
  Map,
  Receipt,
} from "lucide-react";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";

// 🚀 CUSTOM GLASSY INPUT COMPONENT
const GlassInput = ({
  label,
  icon: Icon,
  type = "text",
  required,
  className = "",
  ...props
}) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && (
      <label className="text-[10px] font-bold tracking-widest uppercase text-blue-100/50 ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
    )}
    <div className="relative group">
      {Icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400/40 group-focus-within:text-blue-400 transition-colors pointer-events-none z-10">
          <Icon size={16} />
        </div>
      )}
      <input
        type={type}
        autoComplete="new-password"
        onWheel={(e) => e.target.blur()}
        className={`w-full bg-[#060d1f] border border-blue-900/30 rounded-xl ${Icon ? "pl-10" : "pl-4"} pr-4 py-2.5 text-sm text-blue-50 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-blue-100/20 shadow-inner [color-scheme:dark] ${className}`}
        required={required}
        {...props}
      />
    </div>
  </div>
);

const VehicleLog = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("trips");

  const [logs, setLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    itemName: "",
  });

  const initialTripForm = {
    date: new Date().toISOString().split("T")[0],
    vehicleNo: "",
    driverName: "",
    loadingPoint: "",
    unloadingSite: "",
    distanceTravelled: "",
    items: "",
    quantity: "",
    rate: "",
    foodCharge: "",
    amountPaid: "",
    amountDue: "",
    totalAmount: 0,
  };

  const initialExpenseForm = {
    date: new Date().toISOString().split("T")[0],
    reason: "",
    amount: "",
  };

  const [formData, setFormData] = useState(initialTripForm);
  const [expenseData, setExpenseData] = useState(initialExpenseForm);

  useEffect(() => {
    if (location.state && location.state.editLog) {
      setActiveTab("trips");
      handleEdit(location.state.editLog, "trips");
      window.history.replaceState({}, document.title);
    } else if (location.state && location.state.editExpense) {
      setActiveTab("expenses");
      handleEdit(location.state.editExpense, "expenses");
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (activeTab !== "trips") return;
    const qty = Number(formData.quantity) || 0;
    const rate = Number(formData.rate) || 0;
    const food = Number(formData.foodCharge) || 0;
    const paid = Number(formData.amountPaid) || 0;

    const total = qty * rate + food;
    const calculatedDue = total - paid;

    setFormData((prev) => ({
      ...prev,
      totalAmount: total,
      amountDue: calculatedDue > 0 ? calculatedDue : 0,
    }));
  }, [
    formData.quantity,
    formData.rate,
    formData.foodCharge,
    formData.amountPaid,
    activeTab,
  ]);

  const fetchData = async () => {
    try {
      const [tripRes, expRes] = await Promise.all([
        vehicleService.getLogs(),
        vehicleService.getExpenses(),
      ]);
      setLogs(tripRes.data || []);
      setExpenses(expRes.data || []);
    } catch (err) {
      toast.error("Error loading data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVehicleNoChange = (e) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (val.length > 2) val = val.slice(0, 2) + "-" + val.slice(2);
    if (val.length > 5) val = val.slice(0, 5) + "-" + val.slice(5);
    if (val.length > 8) val = val.slice(0, 8) + "-" + val.slice(8);
    if (val.length <= 13) setFormData({ ...formData, vehicleNo: val });
  };

  const handleTripSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.vehicleNo.match(
        /^[A-Z]{2}[-][0-9]{2}[-][A-Z0-9]{1,2}[-][0-9]{4}$/i,
      )
    ) {
      return toast.error("Invalid Vehicle Number format.");
    }

    setSubmitting(true);
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      if (editId) {
        await vehicleService.updateLog(editId, formData, currentUser);
        toast.success("Trip record updated!");
      } else {
        await vehicleService.addLog(formData, currentUser);
        toast.success("Trip logged successfully!");
      }
      setFormData(initialTripForm);
      setEditId(null);
      fetchData();
    } catch (err) {
      toast.error("Failed to save trip.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      if (editId) {
        await vehicleService.updateExpense(editId, expenseData, currentUser);
        toast.success("Expense updated!");
      } else {
        await vehicleService.addExpense(expenseData, currentUser);
        toast.success("Expense saved!");
      }
      setExpenseData(initialExpenseForm);
      setEditId(null);
      fetchData();
    } catch (err) {
      toast.error("Failed to save expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item, type) => {
    setEditId(item._id);
    if (type === "trips") {
      setFormData({
        ...item,
        date: item.date
          ? new Date(item.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      });
    } else {
      setExpenseData({
        ...item,
        date: item.date
          ? new Date(item.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditId(null);
    if (activeTab === "trips") setFormData(initialTripForm);
    else setExpenseData(initialExpenseForm);
  };

  const openHistory = (item, type) => {
    const sortedHistory = item.editHistory
      ? [...item.editHistory].reverse()
      : [];
    setHistoryModal({
      isOpen: true,
      data: sortedHistory,
      itemName: type === "trips" ? item.vehicleNo : item.reason,
    });
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 px-2 sm:px-4">
      {/* HEADER & TABS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Truck className="text-blue-500" size={24} />
            </div>
            Log Management
          </h1>
          <p className="text-blue-100/40 text-sm mt-1 ml-1">
            Track shipments and manage expenses.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto bg-[#030816] p-1.5 rounded-2xl border border-blue-900/30">
          <button
            onClick={() => {
              setActiveTab("trips");
              cancelEdit();
            }}
            className={`flex-1 md:flex-none px-6 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === "trips" ? "bg-blue-600 text-white shadow-lg" : "text-blue-100/40 hover:text-white"}`}
          >
            Trips Data
          </button>
          <button
            onClick={() => {
              setActiveTab("expenses");
              cancelEdit();
            }}
            className={`flex-1 md:flex-none px-6 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === "expenses" ? "bg-rose-600 text-white shadow-lg" : "text-blue-100/40 hover:text-white"}`}
          >
            Expenses
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* FORM SECTION */}
        <div className="xl:col-span-5">
          <div
            className={`bg-[#030816] border p-6 md:p-8 rounded-3xl shadow-2xl transition-all duration-300 relative overflow-hidden ${editId ? (activeTab === "trips" ? "border-blue-500/50 ring-1 ring-blue-500/20" : "border-rose-500/50 ring-1 ring-rose-500/20") : "border-blue-900/30"}`}
          >
            <div
              className={`absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full pointer-events-none ${activeTab === "trips" ? "bg-blue-500/5" : "bg-rose-500/5"}`}
            ></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {editId ? (
                  <Edit2
                    size={18}
                    className={
                      activeTab === "trips" ? "text-blue-400" : "text-rose-400"
                    }
                  />
                ) : (
                  <Save
                    size={18}
                    className={
                      activeTab === "trips" ? "text-blue-400" : "text-rose-400"
                    }
                  />
                )}
                {editId
                  ? `Edit ${activeTab === "trips" ? "Trip" : "Expense"}`
                  : `Log New ${activeTab === "trips" ? "Trip" : "Expense"}`}
              </h3>
              {editId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold tracking-widest uppercase"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {/* TRIP FORM */}
            {activeTab === "trips" && (
              <form
                onSubmit={handleTripSubmit}
                className="space-y-5 relative z-10 animate-in fade-in zoom-in-95 duration-300"
              >
                <div className="grid grid-cols-2 gap-4">
                  <GlassInput
                    label="Date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    icon={Calendar}
                    required
                  />
                  <GlassInput
                    label="Vehicle No."
                    placeholder="OD-02-AX-1234"
                    value={formData.vehicleNo}
                    onChange={handleVehicleNoChange}
                    icon={Truck}
                    required
                  />
                </div>
                <GlassInput
                  label="Driver Name"
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.driverName}
                  onChange={(e) =>
                    setFormData({ ...formData, driverName: e.target.value })
                  }
                  icon={User}
                  required
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <GlassInput
                    label="Loading Point"
                    placeholder="City/Hub"
                    value={formData.loadingPoint}
                    onChange={(e) =>
                      setFormData({ ...formData, loadingPoint: e.target.value })
                    }
                    icon={MapPin}
                    required
                  />
                  <GlassInput
                    label="Unloading Site"
                    placeholder="Destination"
                    value={formData.unloadingSite}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unloadingSite: e.target.value,
                      })
                    }
                    icon={ArrowRightCircle}
                    required
                  />
                  <GlassInput
                    label="Distance (km)"
                    type="number"
                    placeholder="e.g. 150"
                    value={formData.distanceTravelled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        distanceTravelled: e.target.value,
                      })
                    }
                    icon={Map}
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <GlassInput
                      label="Item"
                      placeholder="Cement.."
                      value={formData.items}
                      onChange={(e) =>
                        setFormData({ ...formData, items: e.target.value })
                      }
                      icon={Package}
                      required
                    />
                  </div>
                  <GlassInput
                    label="Qty"
                    type="number"
                    placeholder="0"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                    required
                  />
                  <GlassInput
                    label="Rate (₹)"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={formData.rate}
                    onChange={(e) =>
                      setFormData({ ...formData, rate: e.target.value })
                    }
                    icon={IndianRupee}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 p-5 bg-blue-950/20 rounded-2xl border border-blue-900/30">
                  <GlassInput
                    label="Food Charge (₹)"
                    type="number"
                    placeholder="0"
                    value={formData.foodCharge}
                    onChange={(e) =>
                      setFormData({ ...formData, foodCharge: e.target.value })
                    }
                    icon={IndianRupee}
                  />
                  <GlassInput
                    label="Amount Paid (₹)"
                    type="number"
                    placeholder="0"
                    value={formData.amountPaid}
                    onChange={(e) =>
                      setFormData({ ...formData, amountPaid: e.target.value })
                    }
                    icon={IndianRupee}
                    className="text-emerald-400 font-bold"
                  />
                </div>
                <div className="flex items-center gap-4 bg-[#0a1222] p-4 rounded-xl border border-blue-900/30">
                  <div className="flex-1">
                    <GlassInput
                      label="Amount Due (₹) - Opt"
                      type="number"
                      placeholder="0 (Optional)"
                      value={formData.amountDue}
                      onChange={(e) =>
                        setFormData({ ...formData, amountDue: e.target.value })
                      }
                      className="text-rose-400 font-bold"
                    />
                  </div>
                  <div className="flex-1 text-right pr-2">
                    <p className="text-blue-100/40 uppercase tracking-widest text-[10px] font-bold mb-1">
                      Calculated Total
                    </p>
                    <p className="text-2xl font-black text-white font-mono">
                      <span className="text-sm mr-1 text-blue-500">₹</span>
                      {formData.totalAmount.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 shadow-xl shadow-blue-900/20 text-sm tracking-widest uppercase font-black bg-blue-600 hover:bg-blue-500 border-none mt-2"
                >
                  {submitting
                    ? "Processing..."
                    : editId
                      ? "Update Trip Entry"
                      : "Confirm & Save Trip"}
                </Button>
              </form>
            )}

            {/* EXPENSE FORM */}
            {activeTab === "expenses" && (
              <form
                onSubmit={handleExpenseSubmit}
                className="space-y-5 relative z-10 animate-in fade-in zoom-in-95 duration-300"
              >
                <GlassInput
                  label="Date"
                  type="date"
                  value={expenseData.date}
                  onChange={(e) =>
                    setExpenseData({ ...expenseData, date: e.target.value })
                  }
                  icon={Calendar}
                  required
                />
                <GlassInput
                  label="Expense Reason"
                  placeholder="e.g. Fuel, Toll, Repairs..."
                  value={expenseData.reason}
                  onChange={(e) =>
                    setExpenseData({ ...expenseData, reason: e.target.value })
                  }
                  icon={Receipt}
                  required
                />
                <GlassInput
                  label="Amount (₹)"
                  type="number"
                  placeholder="0.00"
                  value={expenseData.amount}
                  onChange={(e) =>
                    setExpenseData({ ...expenseData, amount: e.target.value })
                  }
                  icon={IndianRupee}
                  className="text-rose-400 font-bold text-lg"
                  required
                />
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 shadow-xl shadow-rose-900/20 text-sm tracking-widest uppercase font-black bg-rose-600 hover:bg-rose-500 border-none mt-4"
                >
                  {submitting
                    ? "Processing..."
                    : editId
                      ? "Update Expense"
                      : "Confirm & Save Expense"}
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* LIST SECTION */}
        <div className="xl:col-span-7">
          <div
            className={`bg-[#030816] border rounded-3xl overflow-hidden shadow-xl transition-colors duration-300 ${activeTab === "trips" ? "border-blue-900/30" : "border-rose-900/30"}`}
          >
            <div
              className={`p-6 border-b flex justify-between items-center ${activeTab === "trips" ? "border-blue-900/20 bg-blue-950/10" : "border-rose-900/20 bg-rose-950/10"}`}
            >
              <h3 className="font-bold text-white">
                Recent {activeTab === "trips" ? "Logs" : "Expenses"}{" "}
                <span className="text-xs font-normal text-blue-100/40 ml-2">
                  (Top 10)
                </span>
              </h3>
              <Link
                to="/transportation/logs/report"
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-widest border transition-colors ${activeTab === "trips" ? "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"}`}
              >
                View All {activeTab === "trips" ? logs.length : expenses.length}
              </Link>
            </div>

            <div className="overflow-x-auto max-h-[700px] custom-scrollbar p-2">
              {activeTab === "trips" ? (
                <table className="w-full text-left min-w-[550px] animate-in fade-in">
                  <thead className="sticky top-0 bg-[#060d1f] text-[10px] uppercase font-bold text-blue-100/40 tracking-[0.15em] z-10 shadow-sm border-b border-blue-900/20">
                    <tr>
                      <th className="py-3 px-3 w-[40%]">Shipment Details</th>
                      <th className="py-3 px-3 w-[35%]">Route & Site</th>
                      <th className="py-3 px-3 text-right w-[25%]">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-blue-900/10">
                    {logs.slice(0, 10).map((log) => {
                      const hasEdits =
                        log.editHistory && log.editHistory.length > 0;
                      const latestLog = hasEdits
                        ? log.editHistory[log.editHistory.length - 1]
                        : null;

                      return (
                        <tr
                          key={log._id}
                          className="hover:bg-blue-900/10 transition-colors group"
                        >
                          <td className="p-3">
                            <p className="text-[11px] font-mono text-blue-400 mb-1">
                              {new Date(log.date).toLocaleDateString("en-GB")}
                            </p>
                            <p className="font-bold text-white text-md uppercase tracking-wide">
                              {log.vehicleNo}
                            </p>
                            <p className="text-[11px] text-blue-100/40 mt-1 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                              <User size={12} className="text-blue-500/50" />{" "}
                              {log.driverName}
                            </p>
                            <div className="text-[11px] text-blue-200 mt-2 flex items-center gap-1.5 bg-blue-900/20 w-max px-2 py-1 rounded font-medium border border-blue-900/30">
                              <Package size={12} className="text-blue-400" />{" "}
                              {log.items}{" "}
                              <span className="text-blue-100/30">|</span>{" "}
                              {log.quantity} Qty
                            </div>
                            {hasEdits && (
                              <div
                                onClick={() => openHistory(log, "trips")}
                                className="mt-3 flex flex-col items-start w-max cursor-pointer hover:opacity-80 transition-opacity"
                              >
                                <div className="flex items-center gap-1.5 bg-blue-950/30 border border-blue-900/50 px-2 py-1 rounded-lg">
                                  <History
                                    size={10}
                                    className="text-blue-500"
                                  />
                                  <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">
                                    {latestLog.role || "ADMIN"}
                                  </span>
                                  {log.editHistory.length > 1 && (
                                    <span className="bg-blue-900/80 text-blue-300 px-1.5 py-0.5 rounded text-[8px] font-bold ml-1">
                                      +{log.editHistory.length - 1} MORE
                                    </span>
                                  )}
                                </div>
                                <div className="text-[9px] text-blue-100/40 font-mono mt-1 pl-1">
                                  {new Date(latestLog.at).toLocaleString(
                                    "en-GB",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                                  <MapPin size={12} className="text-blue-400" />
                                </div>
                                <span className="text-xs font-semibold text-blue-50">
                                  {log.loadingPoint}
                                </span>
                              </div>
                              <div className="w-0.5 h-3 bg-blue-900/40 ml-3"></div>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shrink-0">
                                  <ArrowRightCircle
                                    size={12}
                                    className="text-rose-400"
                                  />
                                </div>
                                <span className="text-xs font-semibold text-blue-50">
                                  {log.unloadingSite}
                                </span>
                                {log.distanceTravelled && (
                                  <span className="text-[10px] text-blue-100/40 font-mono ml-1">
                                    ({log.distanceTravelled} km)
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <p className="text-lg font-black text-white font-mono drop-shadow-sm">
                              ₹{log.totalAmount?.toLocaleString("en-IN")}
                            </p>
                            <div className="flex flex-col items-end gap-1 mt-1">
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                                Paid: ₹
                                {Number(log.amountPaid || 0).toLocaleString(
                                  "en-IN",
                                )}
                              </span>
                              {log.amountDue > 0 && (
                                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 mt-0.5">
                                  Due: ₹{log.amountDue?.toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {logs.length === 0 && (
                      <tr>
                        <td
                          colSpan="3"
                          className="p-10 text-center text-blue-100/30 italic"
                        >
                          No trip records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left min-w-[500px] animate-in fade-in">
                  <thead className="sticky top-0 bg-[#060d1f] text-[10px] uppercase font-bold text-rose-100/40 tracking-[0.15em] z-10 shadow-sm border-b border-rose-900/20">
                    <tr>
                      <th className="py-3 px-4 w-[30%]">Date</th>
                      <th className="py-3 px-4 w-[45%]">Reason</th>
                      <th className="py-3 px-4 text-right w-[25%]">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-rose-900/10">
                    {expenses.slice(0, 10).map((exp) => {
                      const hasEdits =
                        exp.editHistory && exp.editHistory.length > 0;
                      const latestLog = hasEdits
                        ? exp.editHistory[exp.editHistory.length - 1]
                        : null;

                      return (
                        <tr
                          key={exp._id}
                          className="hover:bg-rose-900/10 transition-colors group"
                        >
                          <td className="p-4 align-top">
                            <div className="text-[11px] font-mono text-rose-400 mb-1">
                              {new Date(exp.date).toLocaleDateString("en-GB")}
                            </div>
                            {hasEdits && (
                              <div
                                onClick={() => openHistory(exp, "expenses")}
                                className="mt-2 flex flex-col items-start w-max cursor-pointer hover:opacity-80 transition-opacity"
                              >
                                <div className="flex items-center gap-1.5 bg-rose-950/30 border border-rose-900/50 px-2 py-1 rounded-lg">
                                  <History
                                    size={10}
                                    className="text-rose-500"
                                  />
                                  <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">
                                    {latestLog.role || "ADMIN"}
                                  </span>
                                  {exp.editHistory.length > 1 && (
                                    <span className="bg-rose-900/80 text-rose-300 px-1.5 py-0.5 rounded text-[8px] font-bold ml-1">
                                      +{exp.editHistory.length - 1} MORE
                                    </span>
                                  )}
                                </div>
                                <div className="text-[9px] text-rose-100/40 font-mono mt-1 pl-1">
                                  {new Date(latestLog.at).toLocaleString(
                                    "en-GB",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-4 align-top text-white font-medium capitalize">
                            {exp.reason}
                          </td>
                          <td className="p-4 align-top text-right">
                            <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-lg font-mono font-bold">
                              ₹{Number(exp.amount).toLocaleString("en-IN")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {expenses.length === 0 && (
                      <tr>
                        <td
                          colSpan="3"
                          className="p-10 text-center text-rose-100/30 italic"
                        >
                          No expenses recorded yet.
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

      {/* 🚀 HISTORY MODAL REFINED UI (Matches Screenshot!) */}
      {historyModal.isOpen && historyModal.data && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setHistoryModal({ isOpen: false, data: null })}
          />
          <div className="bg-[#030816] border border-emerald-900/30 rounded-3xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-5 border-b border-emerald-900/20 bg-[#060d1f]/50 shrink-0">
              <div className="flex items-center gap-2 text-white font-bold tracking-wide text-sm">
                <History size={16} className="text-emerald-500" />
                Log History:{" "}
                <span className="text-emerald-400 font-normal">
                  {historyModal.itemName}
                </span>
              </div>
              <button
                onClick={() => setHistoryModal({ isOpen: false, data: null })}
                className="text-blue-100/40 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-3">
              {historyModal.data.map((log, index) => (
                <div
                  key={index}
                  className={`bg-[#060d1f] border ${index === 0 ? "border-emerald-500/30" : "border-blue-900/20"} rounded-xl p-4 flex items-center justify-between relative overflow-hidden`}
                >
                  {index === 0 && (
                    <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500"></div>
                  )}

                  <div className="flex items-center gap-4 pl-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${index === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-900/10 text-blue-100/40"}`}
                    >
                      {(log.role || "A")[0].toUpperCase()}
                    </div>
                    <div>
                      <h4
                        className={`font-bold tracking-widest uppercase text-sm ${index === 0 ? "text-white" : "text-blue-100/50"}`}
                      >
                        {log.role || "ADMIN"}
                      </h4>
                      <p className="text-blue-100/40 text-[10px] mt-0.5 font-mono">
                        {log.by || "admin@system.com"}
                      </p>
                      <p
                        className={`text-[10px] font-mono mt-1 ${index === 0 ? "text-emerald-400" : "text-blue-100/30"}`}
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
                    <div className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-lg tracking-widest uppercase border">
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

export default VehicleLog;
