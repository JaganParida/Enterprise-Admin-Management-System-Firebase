import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import vehicleService from "../../services/vehicleService";
import {
  Truck,
  MapPin,
  Calendar,
  User,
  IndianRupee,
  History,
  X,
  Package,
  ArrowRightCircle,
  Receipt,
  RefreshCcw,
  CloudOff,
  CloudDrizzle,
  CheckCircle2,
  Map,
} from "lucide-react";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import Loader from "../../components/common/Loader";

const GlassInput = ({
  label,
  icon: Icon,
  type = "text",
  required,
  className = "",
  theme,
  ...props
}) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && (
      <label className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
    )}
    <div className="relative group">
      {Icon && (
        <div
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:${theme.primaryText} transition-colors pointer-events-none z-10`}
        >
          <Icon size={16} />
        </div>
      )}
      <input
        type={type}
        autoComplete="new-password"
        onWheel={(e) => e.target.blur()}
        className={`w-full bg-[#09090B] border border-zinc-800 rounded-xl ${Icon ? "pl-10" : "pl-4"} pr-4 py-3 text-sm text-zinc-100 outline-none ${theme.primaryFocus} transition-all placeholder:text-zinc-600 [color-scheme:dark] shadow-inner ${className}`}
        required={required}
        {...props}
      />
    </div>
  </div>
);

const defaultFilters = {
  search: "",
  amountFilter: "Any Amount",
  dateFilter: "All",
  exactDate: "",
};

const VehicleLog = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("trips");

  // 🚀 SYNCHRONOUS CACHE INITIALIZATION (No Loader Flicker)
  const [logs, setLogs] = useState(() => {
    const cached = vehicleService.getCachedLogs("trips", defaultFilters);
    return cached ? cached.slice(0, 10) : [];
  });
  const [expenses, setExpenses] = useState(() => {
    const cached = vehicleService.getCachedLogs("expenses", defaultFilters);
    return cached ? cached.slice(0, 10) : [];
  });
  const [loading, setLoading] = useState(
    () =>
      !(
        vehicleService.getCachedLogs("trips", defaultFilters) &&
        vehicleService.getCachedLogs("expenses", defaultFilters)
      ),
  );
  const [syncStatus, setSyncStatus] = useState(() =>
    vehicleService.getCachedLogs("trips", defaultFilters) &&
    vehicleService.getCachedLogs("expenses", defaultFilters)
      ? "up-to-date"
      : "syncing",
  );

  const searchParams = new URLSearchParams(location.search);
  const urlHighlightId = searchParams.get("highlight");
  const [activeHighlight, setActiveHighlight] = useState(null);

  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");
  const basePath = isTransport ? "/transportation" : "/enterprise";

  const theme = {
    primaryText: isTransport ? "text-[#38bdf8]" : "text-indigo-400",
    primaryBg: isTransport ? "bg-[#0c4a6e]/30" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-[#0284c7]/30" : "border-indigo-500/20",
    primaryFocus: isTransport
      ? "focus:border-[#0ea5e9]/50 focus:ring-1 focus:ring-[#0ea5e9]/50"
      : "focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50",
    glowOrb: isTransport ? "bg-[#0ea5e9]/5" : "bg-indigo-500/5",
    tabActive: isTransport
      ? "bg-[#0ea5e9] text-white shadow-lg shadow-[#0ea5e9]/20"
      : "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20",
    iconColor: isTransport ? "text-[#38bdf8]" : "text-indigo-400",
    gradientBtn: isTransport
      ? "bg-[#0ea5e9] hover:bg-[#0284c7] text-white"
      : "bg-indigo-600 hover:bg-indigo-500 text-white",
  };

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
    const checkSync = () => {
      const globalLastUpdate = parseInt(
        localStorage.getItem("vehicle_last_update") || "0",
        10,
      );
      if (globalLastUpdate > vehicleService.getLastFetchTime())
        setSyncStatus("required");
    };
    const interval = setInterval(checkSync, 2000);
    return () => clearInterval(interval);
  }, []);

  // 🚀 OPTIMIZED FETCH: 0 Reads, NO Unconditional Loaders!
  const fetchData = async (force = false) => {
    if (force || logs.length === 0 || expenses.length === 0)
      setSyncStatus("syncing");
    if ((logs.length === 0 || expenses.length === 0) && !force)
      setLoading(true);

    try {
      const [tripRes, expRes] = await Promise.all([
        vehicleService.getLogs(defaultFilters, null, 10, force),
        vehicleService.getExpenses(defaultFilters, null, 10, force),
      ]);
      setLogs(tripRes.data ? tripRes.data.slice(0, 10) : []);
      setExpenses(expRes.data ? expRes.data.slice(0, 10) : []);
      setSyncStatus("up-to-date");
    } catch (err) {
      setSyncStatus("error");
      toast.error("Error loading data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (urlHighlightId && !loading) {
      setActiveHighlight(urlHighlightId);
      setTimeout(() => {
        const element = document.getElementById(urlHighlightId);
        if (element)
          element.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
      const timer = setTimeout(() => setActiveHighlight(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [urlHighlightId, loading]);

  useEffect(() => {
    if (location.state?.editLog) {
      setActiveTab("trips");
      handleEdit(location.state.editLog, "trips");
      window.history.replaceState({}, document.title);
    } else if (location.state?.editExpense) {
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
    )
      return toast.error("Invalid Vehicle Number format.");
    setSubmitting(true);
    try {
      const currentUser = admin?.data || admin || {};
      if (editId) {
        await vehicleService.updateLog(editId, formData, currentUser);
        toast.success("Trip record updated!");
      } else {
        await vehicleService.addLog(formData, currentUser);
        toast.success("Trip logged successfully!");
      }
      setFormData(initialTripForm);
      setEditId(null);
      fetchData(false);
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
      const currentUser = admin?.data || admin || {};
      if (editId) {
        await vehicleService.updateExpense(editId, expenseData, currentUser);
        toast.success("Expense updated!");
      } else {
        await vehicleService.addExpense(expenseData, currentUser);
        toast.success("Expense saved!");
      }
      setExpenseData(initialExpenseForm);
      setEditId(null);
      fetchData(false);
    } catch (err) {
      toast.error("Failed to save expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item, type) => {
    setEditId(item._id);
    if (type === "trips")
      setFormData({
        ...item,
        date: item.date
          ? new Date(item.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      });
    else
      setExpenseData({
        ...item,
        date: item.date
          ? new Date(item.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditId(null);
    if (activeTab === "trips") setFormData(initialTripForm);
    else setExpenseData(initialExpenseForm);
  };

  const openHistory = (e, item, type) => {
    e.stopPropagation();
    const sortedHistory = item.editHistory
      ? [...item.editHistory].reverse()
      : [];
    setHistoryModal({
      isOpen: true,
      data: sortedHistory,
      itemName: type === "trips" ? item.vehicleNo : item.reason,
    });
  };

  const handleRowClick = (e, id) => {
    if (
      e.target.closest("button") ||
      e.target.closest("a") ||
      e.target.closest(".history-btn")
    )
      return;
    navigate(`${basePath}/logs/report?highlight=${id}`);
  };

  return (
    <div className="space-y-6 pb-10 px-2 sm:px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
          >
            <Truck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Vehicle Logs
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] mt-1 text-zinc-500">
              Track shipments and manage expenses.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => fetchData(true)}
            disabled={syncStatus === "up-to-date" || syncStatus === "syncing"}
            className={`flex items-center gap-2 px-4 h-[44px] text-xs font-bold rounded-xl transition-all border ${syncStatus === "up-to-date" ? "bg-zinc-800/30 text-zinc-500 border-zinc-800/50 cursor-not-allowed opacity-50" : syncStatus === "syncing" ? "bg-amber-500/20 text-amber-400 border-amber-500/40" : syncStatus === "error" ? "bg-red-500/20 text-red-400 border-red-500/40" : "bg-blue-500/20 text-blue-400 border-blue-500/40 animate-pulse hover:bg-blue-500/30"}`}
          >
            {syncStatus === "up-to-date" && <CheckCircle2 size={14} />}
            {syncStatus === "syncing" && (
              <RefreshCcw size={14} className="animate-spin" />
            )}
            {syncStatus === "required" && <CloudDrizzle size={14} />}
            {syncStatus === "error" && <CloudOff size={14} />}
            {syncStatus === "up-to-date"
              ? "Up to Date"
              : syncStatus === "syncing"
                ? "Syncing..."
                : syncStatus === "error"
                  ? "DB Error"
                  : "Sync Required"}
          </button>

          <div className="flex items-center gap-3 bg-[#09090B] p-1.5 rounded-2xl border border-zinc-800/60 shadow-inner h-[44px]">
            <button
              onClick={() => {
                setActiveTab("trips");
                cancelEdit();
              }}
              className={`flex-1 md:flex-none px-6 h-full text-xs font-bold rounded-xl transition-all ${activeTab === "trips" ? theme.tabActive : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"}`}
            >
              Trips Data
            </button>
            <button
              onClick={() => {
                setActiveTab("expenses");
                cancelEdit();
              }}
              className={`flex-1 md:flex-none px-6 h-full text-xs font-bold rounded-xl transition-all ${activeTab === "expenses" ? "bg-rose-600 text-white shadow-lg shadow-rose-900/20" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"}`}
            >
              Expenses
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[50vh] flex items-center justify-center animate-in fade-in zoom-in-95 duration-500 ease-out">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <div className="xl:col-span-5 animate-in fade-in slide-in-from-left-4 duration-500 ease-out">
            <div
              className={`bg-[#09090B] border p-6 md:p-8 rounded-3xl shadow-2xl transition-all duration-300 relative overflow-hidden ${editId ? (activeTab === "trips" ? (isTransport ? "border-[#0ea5e9]/50 ring-1 ring-[#0ea5e9]/20" : "border-indigo-500/50 ring-1 ring-indigo-500/20") : "border-rose-500/50 ring-1 ring-rose-500/20") : "border-zinc-800/60"}`}
            >
              <div
                className={`absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full pointer-events-none ${activeTab === "trips" ? theme.glowOrb : "bg-rose-500/5"}`}
              ></div>

              <div className="flex justify-between items-center mb-8 relative z-10">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {activeTab === "trips" ? (
                    <Truck size={18} className={theme.iconColor} />
                  ) : (
                    <Receipt size={18} className="text-rose-400" />
                  )}{" "}
                  {editId
                    ? `Edit ${activeTab === "trips" ? "Trip Log" : "Expense"}`
                    : `Log ${activeTab === "trips" ? "New Trip" : "Expense"}`}
                </h3>
                {editId && (
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1.5 text-[10px] text-rose-400 hover:text-rose-300 tracking-widest uppercase font-bold border border-rose-500/30 rounded-lg hover:bg-rose-500/10 transition-colors"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              {activeTab === "trips" && (
                <form
                  onSubmit={handleTripSubmit}
                  className="space-y-5 relative z-10 animate-in fade-in zoom-in-[0.98] duration-500"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <GlassInput
                      theme={theme}
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
                      theme={theme}
                      label="Vehicle No."
                      placeholder="OD-02-AX-1234"
                      value={formData.vehicleNo}
                      onChange={handleVehicleNoChange}
                      icon={Truck}
                      required
                    />
                  </div>
                  <GlassInput
                    theme={theme}
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
                      theme={theme}
                      label="Loading Point"
                      placeholder="City/Hub"
                      value={formData.loadingPoint}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          loadingPoint: e.target.value,
                        })
                      }
                      icon={MapPin}
                      required
                    />
                    <GlassInput
                      theme={theme}
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
                      theme={theme}
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
                        theme={theme}
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
                      theme={theme}
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
                      theme={theme}
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
                  <div className="grid grid-cols-2 gap-4 p-5 bg-zinc-900/30 rounded-2xl border border-zinc-800/60">
                    <GlassInput
                      theme={theme}
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
                      theme={theme}
                      label="Amount Paid (₹)"
                      type="number"
                      placeholder="0"
                      value={formData.amountPaid}
                      onChange={(e) =>
                        setFormData({ ...formData, amountPaid: e.target.value })
                      }
                      icon={IndianRupee}
                      className={`${theme.primaryText} font-bold`}
                    />
                  </div>
                  <div className="flex items-center gap-4 bg-[#09090B] p-5 rounded-2xl border border-zinc-800/60">
                    <div className="flex-1">
                      <GlassInput
                        theme={theme}
                        label="Amount Due (₹) - Opt"
                        type="number"
                        placeholder="0 (Optional)"
                        value={formData.amountDue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            amountDue: e.target.value,
                          })
                        }
                        className="text-rose-400 font-bold"
                      />
                    </div>
                    <div className="flex-1 text-right pr-2">
                      <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold mb-1">
                        Calculated Total
                      </p>
                      <p className="text-3xl font-black text-white font-mono">
                        <span className={`text-sm mr-1 ${theme.primaryText}`}>
                          ₹
                        </span>
                        {formData.totalAmount.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full mt-4 py-3.5 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${theme.gradientBtn}`}
                  >
                    {submitting ? (
                      <RefreshCcw className="animate-spin" size={18} />
                    ) : null}{" "}
                    {submitting
                      ? "Processing..."
                      : editId
                        ? "Update Trip Entry"
                        : "Save Record"}
                  </button>
                </form>
              )}

              {activeTab === "expenses" && (
                <form
                  onSubmit={handleExpenseSubmit}
                  className="space-y-5 relative z-10 animate-in fade-in zoom-in-[0.98] duration-500"
                >
                  <GlassInput
                    theme={{
                      primaryFocus:
                        "focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50",
                      primaryText: "text-rose-400",
                    }}
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
                    theme={{
                      primaryFocus:
                        "focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50",
                      primaryText: "text-rose-400",
                    }}
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
                    theme={{
                      primaryFocus:
                        "focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50",
                      primaryText: "text-rose-400",
                    }}
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
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-4 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-rose-900/20 transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <RefreshCcw className="animate-spin" size={18} />
                    ) : null}{" "}
                    {submitting
                      ? "Processing..."
                      : editId
                        ? "Update Expense"
                        : "Save Record"}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="xl:col-span-7 animate-in fade-in slide-in-from-right-4 duration-500 ease-out">
            <div
              className={`bg-[#09090B] border rounded-3xl overflow-hidden shadow-2xl transition-colors duration-300 ${activeTab === "trips" ? "border-zinc-800/60" : "border-rose-900/30"}`}
            >
              <div
                className={`p-6 border-b flex justify-between items-center ${activeTab === "trips" ? "border-zinc-800/60 bg-zinc-900/10" : "border-rose-900/20 bg-rose-900/10"}`}
              >
                <h3 className="font-bold text-white">
                  Recent {activeTab === "trips" ? "Working Logs" : "Expenses"}{" "}
                  <span className="text-xs font-normal text-zinc-400 ml-2">
                    (Top 10)
                  </span>
                </h3>
                <Link to={`${basePath}/logs/report`}>
                  <button
                    className={`h-9 px-4 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] border transition-colors ${activeTab === "trips" ? "border-zinc-800 text-zinc-300 bg-transparent hover:text-white hover:bg-zinc-800/50" : "text-rose-400 bg-transparent border-rose-900/40 hover:bg-rose-500/10"}`}
                  >
                    View All{" "}
                    <span
                      className={
                        activeTab === "trips"
                          ? theme.primaryText
                          : "text-rose-300"
                      }
                    >
                      {activeTab === "trips" ? logs.length : expenses.length}
                    </span>
                  </button>
                </Link>
              </div>

              <div className="overflow-x-auto max-h-[700px] custom-scrollbar p-2">
                {activeTab === "trips" ? (
                  <table className="w-full text-left min-w-[550px] animate-in fade-in duration-300">
                    <thead className="sticky top-0 bg-[#09090B] text-[10px] uppercase font-bold text-zinc-500 tracking-[0.15em] z-10 border-b border-zinc-800/60">
                      <tr>
                        <th className="py-4 px-4 w-[40%]">Shipment Details</th>
                        <th className="py-4 px-4 w-[35%]">Route & Site</th>
                        <th className="py-4 px-4 text-right w-[25%]">
                          Payment
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-zinc-800/60">
                      {logs.map((log) => {
                        const hasEdits =
                          log.editHistory && log.editHistory.length > 0;
                        const latestLog = hasEdits
                          ? log.editHistory[log.editHistory.length - 1]
                          : null;
                        return (
                          <tr
                            key={log._id}
                            id={log._id}
                            onClick={(e) => handleRowClick(e, log._id)}
                            className={`transition-all duration-500 ease-out group cursor-pointer animate-in fade-in zoom-in-95 ${activeHighlight === log._id ? `${isTransport ? "bg-[#0ea5e9]/[0.08] shadow-[inset_0_0_20px_rgba(14,165,233,0.05)]" : "bg-indigo-500/[0.08] shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]"}` : "hover:bg-zinc-800/30"}`}
                          >
                            <td className="p-4 align-top">
                              <p className="text-[11px] font-mono text-zinc-400 mb-1.5">
                                {new Date(log.date).toLocaleDateString("en-GB")}
                              </p>
                              <p className="font-bold text-white text-md uppercase tracking-wider flex items-center gap-2">
                                <Truck size={14} className="text-zinc-500" />{" "}
                                {log.vehicleNo}
                              </p>
                              <p className="text-[11px] text-zinc-500 mt-1.5 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                                <User size={12} className="text-zinc-600" />{" "}
                                {log.driverName}
                              </p>
                              {hasEdits && (
                                <div
                                  onClick={(e) => openHistory(e, log, "trips")}
                                  className="mt-3 flex flex-col items-start w-max cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                  <div className="flex items-center gap-1.5 bg-zinc-800/50 border border-zinc-700/50 px-2 py-1 rounded-lg">
                                    <History
                                      size={10}
                                      className="text-zinc-400"
                                    />
                                    <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                                      {latestLog.role || "ADMIN"}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="p-4 align-top">
                              <div className="flex flex-col gap-2.5">
                                <div className="flex items-start gap-2">
                                  <div
                                    className={`mt-0.5 w-5 h-5 rounded-full ${theme.primaryBg} flex items-center justify-center border ${theme.primaryBorder} shrink-0`}
                                  >
                                    <MapPin
                                      size={10}
                                      className={theme.iconColor}
                                    />
                                  </div>
                                  <div>
                                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-0.5">
                                      Origin
                                    </p>
                                    <span className="text-xs font-semibold text-zinc-300">
                                      {log.loadingPoint}
                                    </span>
                                  </div>
                                </div>
                                <div className="w-0.5 h-3 bg-zinc-800 ml-3"></div>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shrink-0">
                                    <ArrowRightCircle
                                      size={12}
                                      className="text-rose-400"
                                    />
                                  </div>
                                  <span className="text-xs font-semibold text-zinc-300">
                                    {log.unloadingSite}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 align-top text-right">
                              <p className="text-lg font-black text-white font-mono drop-shadow-sm">
                                ₹{log.totalAmount?.toLocaleString("en-IN")}
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                      {logs.length === 0 && (
                        <tr>
                          <td
                            colSpan="3"
                            className="p-12 text-center text-zinc-500 italic animate-in fade-in"
                          >
                            No trip records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left min-w-[500px] animate-in fade-in duration-300">
                    <thead className="sticky top-0 bg-[#09090B] text-[10px] uppercase font-bold text-rose-100/40 tracking-[0.15em] z-10 border-b border-rose-900/20">
                      <tr>
                        <th className="py-4 px-4 w-[30%]">Date</th>
                        <th className="py-4 px-4 w-[45%]">Reason</th>
                        <th className="py-4 px-4 text-right w-[25%]">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-rose-900/10">
                      {expenses.map((exp) => {
                        const hasEdits =
                          exp.editHistory && exp.editHistory.length > 0;
                        const latestLog = hasEdits
                          ? exp.editHistory[exp.editHistory.length - 1]
                          : null;
                        return (
                          <tr
                            key={exp._id}
                            id={exp._id}
                            onClick={(e) => handleRowClick(e, exp._id)}
                            className={`transition-all duration-500 ease-out group cursor-pointer animate-in fade-in zoom-in-95 ${activeHighlight === exp._id ? `bg-rose-500/[0.08] shadow-[inset_0_0_20px_rgba(244,63,94,0.05)]` : "hover:bg-rose-900/10"}`}
                          >
                            <td className="p-4 align-top">
                              <div className="text-[11px] font-mono text-rose-400 mb-1.5">
                                {new Date(exp.date).toLocaleDateString("en-GB")}
                              </div>
                              {hasEdits && (
                                <div
                                  onClick={(e) =>
                                    openHistory(e, exp, "expenses")
                                  }
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
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="p-4 align-top text-white font-medium capitalize">
                              {exp.reason}
                            </td>
                            <td className="p-4 align-top text-right">
                              <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg font-mono font-bold">
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
                            className="p-12 text-center text-rose-100/30 italic animate-in fade-in"
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
      )}

      {historyModal.isOpen && historyModal.data && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() =>
              setHistoryModal({ isOpen: false, data: null, itemName: "" })
            }
          />
          <div
            className={`bg-[#09090B] border ${activeTab === "trips" ? theme.primaryBorder : "border-rose-900/30"} rounded-3xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-[0.95] duration-300 ease-out`}
          >
            <div
              className={`flex items-center justify-between p-5 border-b ${activeTab === "trips" ? `${theme.primaryBorder} ${theme.primaryBg}` : "border-rose-900/20 bg-rose-900/10"} shrink-0`}
            >
              <div className="flex items-center gap-2 text-white font-bold tracking-wide text-sm">
                <History
                  size={16}
                  className={
                    activeTab === "trips" ? theme.primaryText : "text-rose-400"
                  }
                />{" "}
                Log History:{" "}
                <span
                  className={`${activeTab === "trips" ? theme.primaryText : "text-rose-400"} font-normal`}
                >
                  {historyModal.itemName}
                </span>
              </div>
              <button
                onClick={() =>
                  setHistoryModal({ isOpen: false, data: null, itemName: "" })
                }
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-3">
              {historyModal.data.map((log, index) => (
                <div
                  key={index}
                  className={`bg-[#09090B] border ${index === 0 ? (activeTab === "trips" ? theme.primaryBorder : "border-rose-500/30") : "border-zinc-800"} rounded-xl p-4 flex items-center justify-between relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  {index === 0 && (
                    <div
                      className={`absolute left-0 top-0 w-1 h-full ${activeTab === "trips" ? theme.primaryBg : "bg-rose-500"}`}
                    ></div>
                  )}
                  <div className="flex items-center gap-4 pl-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${index === 0 ? (activeTab === "trips" ? `${theme.primaryBg} ${theme.primaryText}` : "bg-rose-500/10 text-rose-400") : "bg-zinc-800 text-zinc-500"}`}
                    >
                      {(log.role || "A")[0].toUpperCase()}
                    </div>
                    <div>
                      <h4
                        className={`font-bold tracking-widest uppercase text-sm ${index === 0 ? "text-white" : "text-zinc-500"}`}
                      >
                        {log.role || "ADMIN"}
                      </h4>
                      <p className="text-zinc-500 text-[10px] mt-0.5 font-mono">
                        {log.by || "admin@system.com"}
                      </p>
                    </div>
                  </div>
                  {index === 0 && (
                    <div
                      className={`${activeTab === "trips" ? `${theme.primaryBg} ${theme.primaryBorder} ${theme.primaryText}` : "bg-rose-500/10 border-rose-500/20 text-rose-400"} text-[10px] font-bold px-3 py-1 rounded-lg tracking-widest uppercase border`}
                    >
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
