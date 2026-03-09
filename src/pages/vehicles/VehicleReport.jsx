import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import vehicleService from "../../services/vehicleService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  FileText,
  Search,
  Trash2,
  Edit2,
  Truck,
  Activity,
  Filter,
  History,
  X,
  ChevronDown,
  Calendar,
  Download,
  AlertCircle,
  AlertOctagon,
  ShieldAlert,
  Eye,
  EyeOff,
  MapPin,
  Package,
  IndianRupee,
  ArrowRightCircle,
  User,
  Map,
  Receipt,
  Banknote,
  RefreshCcw,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const VehicleReport = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("trips"); // Tabs: "trips" | "expenses"

  const [logs, setLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    id: null,
    type: null,
  });
  const [warningTooltip, setWarningTooltip] = useState(null);

  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: null,
    itemName: "",
  });

  // Wipe Data States
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wiping, setWiping] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    amountFilter: "Any Amount",
    dateFilter: "All",
    exactDate: "",
  });

  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";

  const fetchData = async () => {
    try {
      const [tripRes, expRes] = await Promise.all([
        vehicleService.getLogs(),
        vehicleService.getExpenses(),
      ]);
      setLogs(tripRes.data || []);
      setExpenses(expRes.data || []);
    } catch (error) {
      toast.error("Failed to load report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDisabledClick = (action) => {
    setWarningTooltip(action);
    setTimeout(() => setWarningTooltip(null), 2500);
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      if (deleteModal.type === "trips") {
        await vehicleService.deleteLog(deleteModal.id);
        toast.success("Trip record deleted.");
      } else {
        await vehicleService.deleteExpense(deleteModal.id);
        toast.success("Expense deleted.");
      }
      fetchData();
    } catch (error) {
      toast.error("Failed to delete record");
    } finally {
      setDeleteModal({ isOpen: false, id: null, type: null });
    }
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

  // --- FILTRATION LOGIC FOR BOTH TABS ---
  const currentDataList = activeTab === "trips" ? logs : expenses;

  const filteredData = useMemo(() => {
    return currentDataList.filter((item) => {
      const itemDateObj = item.date ? new Date(item.date) : new Date();
      const searchTerm = String(filters.search || "").toLowerCase();

      // Search Logic (Differs by tab)
      let matchSearch = false;
      if (activeTab === "trips") {
        matchSearch =
          String(item.vehicleNo || "")
            .toLowerCase()
            .includes(searchTerm) ||
          String(item.driverName || "")
            .toLowerCase()
            .includes(searchTerm) ||
          String(item.loadingPoint || "")
            .toLowerCase()
            .includes(searchTerm) ||
          String(item.unloadingSite || "")
            .toLowerCase()
            .includes(searchTerm);
      } else {
        matchSearch = String(item.reason || "")
          .toLowerCase()
          .includes(searchTerm);
      }

      // Amount Logic (Differs by tab)
      let matchAmount = true;
      const amt =
        activeTab === "trips"
          ? Number(item.totalAmount) || 0
          : Number(item.amount) || 0;
      if (filters.amountFilter === "Under ₹10k") matchAmount = amt < 10000;
      else if (filters.amountFilter === "₹10k - ₹50k")
        matchAmount = amt >= 10000 && amt <= 50000;
      else if (filters.amountFilter === "Over ₹50k") matchAmount = amt > 50000;

      // Date Logic
      let matchDate = true;
      if (filters.exactDate && item.date) {
        matchDate = item.date.startsWith(filters.exactDate);
      } else if (filters.dateFilter !== "All" && item.date) {
        const today = new Date();
        const diffTime = Math.abs(today - itemDateObj);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (filters.dateFilter === "Today") matchDate = diffDays <= 1;
        else if (filters.dateFilter === "Last7Days") matchDate = diffDays <= 7;
        else if (filters.dateFilter === "ThisMonth")
          matchDate =
            itemDateObj.getMonth() === today.getMonth() &&
            itemDateObj.getFullYear() === today.getFullYear();
      }

      return matchSearch && matchAmount && matchDate;
    });
  }, [currentDataList, filters, activeTab]);

  // --- STATS SUMMARY ---
  const summary = useMemo(() => {
    if (activeTab === "trips") {
      return filteredData.reduce(
        (acc, curr) => {
          acc.trips += 1;
          acc.total += Number(curr.totalAmount) || 0;
          acc.paid += Number(curr.amountPaid) || 0;
          acc.due += Number(curr.amountDue) || 0;
          return acc;
        },
        { trips: 0, total: 0, paid: 0, due: 0 },
      );
    } else {
      return filteredData.reduce(
        (acc, curr) => {
          acc.count += 1;
          acc.total += Number(curr.amount) || 0;
          return acc;
        },
        { count: 0, total: 0 },
      );
    }
  }, [filteredData, activeTab]);

  const activeFiltersCount =
    [filters.amountFilter, filters.dateFilter].filter(
      (f) => f !== "All" && f !== "Any Amount",
    ).length + (filters.exactDate ? 1 : 0);

  const handleExport = () => {
    try {
      if (filteredData.length === 0) return toast.info("No records to export");
      let csvContent = "";

      if (activeTab === "trips") {
        const headers = [
          "Date",
          "Vehicle No",
          "Driver",
          "Loading Point",
          "Unloading Site",
          "Distance (km)",
          "Item",
          "Quantity",
          "Rate",
          "Food Charge",
          "Total Amount",
          "Paid",
          "Due",
        ];
        const rows = filteredData.map((log) => {
          let dateStr = log.date
            ? `\t${new Date(log.date).toLocaleDateString("en-GB")}`
            : "-";
          return `${dateStr},"${log.vehicleNo}","${log.driverName}","${log.loadingPoint}","${log.unloadingSite}",${log.distanceTravelled || 0},"${log.items}",${log.quantity},${log.rate},${log.foodCharge},${log.totalAmount},${log.amountPaid},${log.amountDue}`;
        });
        csvContent = [headers.join(","), ...rows].join("\n");
      } else {
        const headers = ["Date", "Reason", "Amount"];
        const rows = filteredData.map((exp) => {
          let dateStr = exp.date
            ? `\t${new Date(exp.date).toLocaleDateString("en-GB")}`
            : "-";
          return `${dateStr},"${exp.reason}",${exp.amount}`;
        });
        csvContent = [headers.join(","), ...rows].join("\n");
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute(
        "download",
        `${activeTab === "trips" ? "Trip_Report" : "Expense_Report"}_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Exported successfully");
    } catch (error) {
      toast.error("Export failed");
    }
  };

  const handleWipeAll = async () => {
    if (isManager || !deletePassword)
      return toast.error("Verification failed.");
    setWiping(true);
    try {
      const adminEmail = admin?.data?.email || admin?.email;
      await vehicleService.deleteAllLogs({
        password: deletePassword,
        email: adminEmail,
        type: activeTab,
      });
      toast.success(
        `${activeTab === "trips" ? "Trip" : "Expense"} database cleared.`,
      );
      setIsDeleteAllOpen(false);
      setDeletePassword("");
      setShowPassword(false);
      fetchData();
    } catch (error) {
      toast.error(error.message || "Incorrect Admin Password.");
    } finally {
      setWiping(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader />
      </div>
    );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 relative space-y-8 px-2 sm:px-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${activeTab === "trips" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}
            >
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {activeTab === "trips" ? "Trip Logs Report" : "Expense Report"}
              </h1>
              <p
                className={`text-xs uppercase tracking-widest mt-0.5 ${activeTab === "trips" ? "text-blue-100/40" : "text-rose-100/40"}`}
              >
                Advanced Analytics
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 bg-[#030816] p-1.5 rounded-2xl border border-blue-900/30 w-max h-[44px]">
            <button
              onClick={() => {
                setActiveTab("trips");
                setFilters({
                  search: "",
                  amountFilter: "Any Amount",
                  dateFilter: "All",
                  exactDate: "",
                });
              }}
              className={`px-5 h-full flex items-center text-xs font-bold rounded-xl transition-all ${activeTab === "trips" ? "bg-blue-600 text-white shadow-lg" : "text-blue-100/40 hover:text-white"}`}
            >
              Trips
            </button>
            <button
              onClick={() => {
                setActiveTab("expenses");
                setFilters({
                  search: "",
                  amountFilter: "Any Amount",
                  dateFilter: "All",
                  exactDate: "",
                });
              }}
              className={`px-5 h-full flex items-center text-xs font-bold rounded-xl transition-all ${activeTab === "expenses" ? "bg-rose-600 text-white shadow-lg" : "text-blue-100/40 hover:text-white"}`}
            >
              Expenses
            </button>
          </div>

          <div className="flex gap-2">
            <div className="relative h-[44px]">
              <button
                onClick={() =>
                  isManager
                    ? (() => {
                        setWarningTooltip("wipe-all");
                        setTimeout(() => setWarningTooltip(null), 2500);
                      })()
                    : setIsDeleteAllOpen(true)
                }
                className={`flex items-center justify-center h-full gap-2 px-4 rounded-xl transition-all text-xs font-bold shadow-lg ${isManager ? "bg-red-500/5 text-red-500/50 border border-red-500/10 opacity-50 cursor-not-allowed" : "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white"}`}
              >
                <AlertOctagon size={16} /> Wipe{" "}
                {activeTab === "trips" ? "Trips" : "Expenses"}
              </button>
              {warningTooltip === "wipe-all" && (
                <div className="absolute top-full mt-2 right-0 z-[100] bg-[#050a08] border border-red-500/30 text-red-400 text-[10px] font-bold px-3 py-2 rounded-lg w-max">
                  🚫 Admin Access Required
                </div>
              )}
            </div>
            <Link
              to="/transportation/logs"
              className="px-4 h-[44px] bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 w-max"
            >
              Add Entry
            </Link>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-6 ${activeTab === "trips" ? "lg:grid-cols-4" : "lg:grid-cols-2"}`}
      >
        {activeTab === "trips" ? (
          <>
            <div className="bg-[#030816] border border-blue-900/30 p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-blue-500 group-hover:opacity-10 transition-opacity">
                <Truck size={100} />
              </div>
              <p className="text-blue-100/50 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
                Total Trips
              </p>
              <h3 className="text-2xl font-black text-white font-mono relative z-10">
                {summary.trips}
              </h3>
            </div>
            <div className="bg-[#030816] border border-blue-900/30 p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-blue-500 group-hover:opacity-10 transition-opacity">
                <Activity size={100} />
              </div>
              <p className="text-blue-100/50 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
                Total Billed
              </p>
              <h3 className="text-2xl font-black text-blue-400 font-mono relative z-10">
                ₹ {summary.total.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="bg-[#030816] border border-emerald-900/30 p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-emerald-500 group-hover:opacity-10 transition-opacity">
                <IndianRupee size={100} />
              </div>
              <p className="text-emerald-100/50 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
                Amount Paid
              </p>
              <h3 className="text-2xl font-black text-emerald-400 font-mono relative z-10">
                ₹ {summary.paid.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="bg-[#050a08] border border-rose-900/30 p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-rose-500 group-hover:opacity-10 transition-opacity">
                <AlertCircle size={100} />
              </div>
              <p className="text-rose-100/50 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
                Pending Dues
              </p>
              <h3 className="text-2xl font-black text-rose-400 font-mono relative z-10">
                ₹ {summary.due.toLocaleString("en-IN")}
              </h3>
            </div>
          </>
        ) : (
          <>
            <div className="bg-[#030816] border border-rose-900/30 p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-rose-500 group-hover:opacity-10 transition-opacity">
                <Receipt size={100} />
              </div>
              <p className="text-rose-100/50 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
                Total Entries
              </p>
              <h3 className="text-2xl font-black text-white font-mono relative z-10">
                {summary.count}
              </h3>
            </div>
            <div className="bg-[#050a08] border border-rose-900/50 p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-rose-500 group-hover:opacity-10 transition-opacity">
                <Banknote size={100} />
              </div>
              <p className="text-rose-100/50 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
                Total Spend
              </p>
              <h3 className="text-2xl font-black text-rose-400 font-mono relative z-10">
                ₹ {summary.total.toLocaleString("en-IN")}
              </h3>
            </div>
          </>
        )}
      </div>

      {/* MAIN DATA SECTION */}
      <div
        className={`bg-[#030816] rounded-3xl border overflow-visible shadow-2xl ${activeTab === "trips" ? "border-blue-900/30" : "border-rose-900/30"}`}
      >
        {/* TABS & SEARCH BAR */}
        <div
          className={`p-5 border-b flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5 rounded-t-3xl ${activeTab === "trips" ? "border-blue-900/20 bg-blue-950/10" : "border-rose-900/20 bg-rose-950/10"}`}
        >
          <div className="relative w-full xl:w-96 group">
            <Search
              size={16}
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${filters.search ? (activeTab === "trips" ? "text-blue-500" : "text-rose-500") : "text-blue-100/30 group-hover:text-blue-100/50"}`}
            />
            <input
              type="text"
              placeholder={
                activeTab === "trips"
                  ? "Search vehicle, driver or route..."
                  : "Search reason..."
              }
              className={`w-full bg-[#060d1f] border rounded-xl pl-10 pr-4 py-2.5 text-sm text-blue-100 outline-none transition-all shadow-inner focus:ring-2 ${activeTab === "trips" ? "border-blue-900/40 focus:ring-blue-500/50" : "border-rose-900/40 focus:ring-rose-500/50"}`}
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </div>
          <button
            onClick={handleExport}
            className={`gap-2 text-xs font-bold tracking-widest border py-2.5 px-4 rounded-xl bg-[#060d1f] transition-colors flex items-center ${activeTab === "trips" ? "border-blue-900/40 hover:bg-blue-900/20 text-blue-400" : "border-rose-900/40 hover:bg-rose-900/20 text-rose-400"}`}
          >
            <Download size={16} /> Export View
          </button>
        </div>

        {/* 🚀 PROFESSIONAL UNIVERSAL FILTRATION UI */}
        <div
          className={`p-4 border-b bg-[#060d1f] flex flex-wrap items-center gap-4 relative z-20 ${activeTab === "trips" ? "border-blue-900/20" : "border-rose-900/20"}`}
        >
          <div
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1 border-r mr-1 ${activeTab === "trips" ? "text-blue-500 border-blue-900/40" : "text-rose-500 border-rose-900/40"}`}
          >
            <Filter size={16} /> Filters
            {activeFiltersCount > 0 && (
              <span
                className={`ml-1 px-1.5 rounded ${activeTab === "trips" ? "bg-blue-500/20 text-blue-400" : "bg-rose-500/20 text-rose-400"}`}
              >
                {activeFiltersCount}
              </span>
            )}
          </div>

          <div className="relative group">
            <select
              value={filters.amountFilter}
              onChange={(e) =>
                setFilters({ ...filters, amountFilter: e.target.value })
              }
              className={`appearance-none bg-[#030816] border rounded-xl pl-4 pr-10 py-2.5 text-xs font-medium outline-none cursor-pointer transition-all ${activeTab === "trips" ? "border-blue-900/40 text-blue-200 focus:border-blue-500/50" : "border-rose-900/40 text-rose-200 focus:border-rose-500/50"}`}
            >
              <option value="Any Amount">Any Amount</option>
              <option value="Under ₹10k">&lt; ₹10,000</option>
              <option value="₹10k - ₹50k">₹10k - ₹50k</option>
              <option value="Over ₹50k">&gt; ₹50,000</option>
            </select>
            <ChevronDown
              size={14}
              className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${activeTab === "trips" ? "text-blue-500/50 group-hover:text-blue-400" : "text-rose-500/50 group-hover:text-rose-400"}`}
            />
          </div>

          <div className="relative group">
            <select
              value={filters.dateFilter}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  dateFilter: e.target.value,
                  exactDate: "",
                })
              }
              className={`appearance-none bg-[#030816] border rounded-xl pl-4 pr-10 py-2.5 text-xs font-medium outline-none cursor-pointer transition-all ${activeTab === "trips" ? "border-blue-900/40 text-blue-200 focus:border-blue-500/50" : "border-rose-900/40 text-rose-200 focus:border-rose-500/50"}`}
            >
              <option value="All">Timeline: All</option>
              <option value="Today">Today</option>
              <option value="Last7Days">Last 7 Days</option>
              <option value="ThisMonth">This Month</option>
            </select>
            <ChevronDown
              size={14}
              className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${activeTab === "trips" ? "text-blue-500/50 group-hover:text-blue-400" : "text-rose-500/50 group-hover:text-rose-400"}`}
            />
          </div>

          <div className="relative group flex items-center">
            <div
              className={`absolute left-3 flex items-center justify-center pointer-events-none transition-colors ${filters.exactDate ? (activeTab === "trips" ? "text-blue-500" : "text-rose-500") : "text-blue-500/50"}`}
            >
              <Calendar size={14} />
            </div>
            <input
              type="date"
              value={filters.exactDate}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  exactDate: e.target.value,
                  dateFilter: "All",
                })
              }
              style={{ colorScheme: "dark" }}
              className={`appearance-none bg-[#030816] border rounded-xl pl-9 pr-4 py-2 text-xs font-medium outline-none cursor-pointer transition-all ${activeTab === "trips" ? "border-blue-900/40 focus:border-blue-500/50" : "border-rose-900/40 focus:border-rose-500/50"} ${filters.exactDate ? "text-white" : "text-blue-200/50"}`}
            />
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={() =>
                setFilters({
                  search: "",
                  amountFilter: "Any Amount",
                  dateFilter: "All",
                  exactDate: "",
                })
              }
              className="text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-800 px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ml-auto md:ml-2"
            >
              <X size={14} /> Clear All
            </button>
          )}
        </div>

        {/* 🚀 DATA TABLE */}
        <div className="overflow-x-auto pb-4 custom-scrollbar min-h-[400px]">
          {activeTab === "trips" ? (
            <table className="w-full text-left min-w-[900px] animate-in fade-in duration-300">
              <thead className="bg-[#020403] text-blue-100/40 text-[10px] uppercase font-bold tracking-[0.15em]">
                <tr>
                  <th className="py-5 px-6">Shipment Date & Vehicle</th>
                  <th className="py-5 px-6">Route Details</th>
                  <th className="py-5 px-6">Cargo & Rate</th>
                  <th className="py-5 px-6 text-right">Financials</th>
                  <th className="py-5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/20 text-sm">
                {filteredData.map((log) => {
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
                      <td className="p-5 px-6 align-top">
                        <div className="font-mono text-blue-400 text-xs mb-1">
                          {log.date
                            ? new Date(log.date).toLocaleDateString("en-GB")
                            : "-"}
                        </div>
                        <div className="text-white font-bold text-md tracking-wider mb-1 uppercase">
                          {log.vehicleNo}
                        </div>
                        <div className="text-[10px] text-blue-100/40 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                          <User size={12} className="text-blue-500/50" />{" "}
                          {log.driverName}
                        </div>
                        {hasEdits && (
                          <div
                            onClick={() => openHistory(log, "trips")}
                            className="mt-3 flex flex-col items-start w-max cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <div className="flex items-center gap-1.5 bg-blue-950/30 border border-blue-900/50 px-2 py-1 rounded-lg">
                              <History size={10} className="text-blue-500" />
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
                              {new Date(latestLog.at).toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="p-5 px-6 align-top">
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                              <MapPin size={10} className="text-blue-400" />
                            </div>
                            <div>
                              <p className="text-[9px] text-blue-100/40 uppercase tracking-widest mb-0.5">
                                Origin
                              </p>
                              <span className="text-xs font-semibold text-blue-50">
                                {log.loadingPoint}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 w-5 h-5 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shrink-0">
                              <MapPin size={10} className="text-rose-400" />
                            </div>
                            <div>
                              <p className="text-[9px] text-blue-100/40 uppercase tracking-widest mb-0.5">
                                Destination
                              </p>
                              <span className="text-xs font-semibold text-blue-50">
                                {log.unloadingSite}
                              </span>
                            </div>
                          </div>
                          {log.distanceTravelled && (
                            <div className="flex items-start gap-2 mt-1">
                              <div className="mt-0.5 w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
                                <Map size={10} className="text-indigo-400" />
                              </div>
                              <div>
                                <p className="text-[9px] text-blue-100/40 uppercase tracking-widest mb-0.5">
                                  Distance
                                </p>
                                <span className="text-xs font-semibold text-blue-50">
                                  {log.distanceTravelled} km
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-5 px-6 align-top">
                        <div className="text-xs text-blue-200 mb-2 flex items-center gap-1.5 bg-blue-900/20 w-max px-2.5 py-1 rounded-md font-medium border border-blue-900/30 uppercase tracking-wide">
                          <Package size={12} className="text-blue-400" />{" "}
                          {log.items}
                        </div>
                        <div className="text-[11px] text-blue-100/60 font-medium">
                          Qty:{" "}
                          <span className="font-bold text-white ml-1">
                            {log.quantity}
                          </span>
                        </div>
                        <div className="text-[11px] text-blue-100/60 font-medium mt-1">
                          Rate:{" "}
                          <span className="font-bold text-emerald-400 font-mono ml-1">
                            ₹{log.rate}
                          </span>
                        </div>
                      </td>

                      <td className="p-5 px-6 align-top text-right">
                        <div className="font-black text-white font-mono text-lg drop-shadow-sm mb-2">
                          Total: ₹
                          {Number(log.totalAmount).toLocaleString("en-IN")}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 text-xs font-mono">
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">
                            Paid: ₹
                            {Number(log.amountPaid).toLocaleString("en-IN")}
                          </span>
                          {Number(log.amountDue) > 0 && (
                            <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              Due: ₹
                              {Number(log.amountDue).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-5 px-6 text-right align-top">
                        <div className="flex justify-end gap-2 items-center relative">
                          <button
                            onClick={() =>
                              navigate("/transportation/logs", {
                                state: { editLog: log },
                              })
                            }
                            className="p-2 text-blue-100/40 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() =>
                              isManager
                                ? handleDisabledClick(log._id)
                                : setDeleteModal({
                                    isOpen: true,
                                    id: log._id,
                                    type: "trips",
                                  })
                            }
                            className={`p-2 rounded-lg transition-colors ${isManager ? "text-blue-100/10 opacity-50 cursor-not-allowed" : "text-blue-100/40 hover:text-rose-400 hover:bg-rose-900/30"}`}
                          >
                            <Trash2 size={16} />
                          </button>
                          {warningTooltip === log._id && (
                            <div className="absolute top-full right-0 mt-2 z-[9999] bg-[#050a08] border border-red-500/30 text-red-400 text-[10px] font-bold px-3 py-2 rounded-lg w-max shadow-xl">
                              🚫 Access Denied
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredData.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-10 text-center text-blue-100/30 italic"
                    >
                      No matching trip records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left min-w-[700px] animate-in fade-in duration-300">
              <thead className="bg-[#020403] text-rose-100/40 text-[10px] uppercase font-bold tracking-[0.15em]">
                <tr>
                  <th className="py-5 px-6 w-[20%]">Date</th>
                  <th className="py-5 px-6 w-[50%]">Reason for Expense</th>
                  <th className="py-5 px-6 text-right w-[20%]">Amount</th>
                  <th className="py-5 px-6 text-right w-[10%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-900/20 text-sm">
                {filteredData.map((exp) => {
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
                      <td className="p-5 px-6 align-top">
                        <div className="text-[11px] font-mono text-rose-400 mb-1">
                          {exp.date
                            ? new Date(exp.date).toLocaleDateString("en-GB")
                            : "-"}
                        </div>
                        {hasEdits && (
                          <div
                            onClick={() => openHistory(exp, "expenses")}
                            className="mt-2 flex flex-col items-start w-max cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <div className="flex items-center gap-1.5 bg-rose-950/30 border border-rose-900/50 px-2 py-1 rounded-lg">
                              <History size={10} className="text-rose-500" />
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
                              {new Date(latestLog.at).toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-5 px-6 align-top text-white font-medium capitalize">
                        {exp.reason}
                      </td>
                      <td className="p-5 px-6 align-top text-right">
                        <span className="font-black text-rose-400 font-mono text-lg bg-rose-500/10 px-3 py-1 rounded-lg border border-rose-500/20">
                          ₹{Number(exp.amount).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="p-5 px-6 text-right align-top">
                        <div className="flex justify-end gap-2 items-center relative">
                          <button
                            onClick={() =>
                              navigate("/transportation/logs", {
                                state: { editExpense: exp },
                              })
                            }
                            className="p-2 text-rose-100/40 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() =>
                              isManager
                                ? handleDisabledClick(exp._id)
                                : setDeleteModal({
                                    isOpen: true,
                                    id: exp._id,
                                    type: "expenses",
                                  })
                            }
                            className={`p-2 rounded-lg transition-colors ${isManager ? "text-rose-100/10 opacity-50 cursor-not-allowed" : "text-rose-100/40 hover:text-rose-400 hover:bg-rose-900/30"}`}
                          >
                            <Trash2 size={16} />
                          </button>
                          {warningTooltip === exp._id && (
                            <div className="absolute top-full right-0 mt-2 z-[9999] bg-[#050a08] border border-red-500/30 text-red-400 text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max shadow-xl">
                              🚫 Access Denied
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredData.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
                      className="p-10 text-center text-rose-100/30 italic"
                    >
                      No matching expenses found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, type: null })}
        onConfirm={executeDelete}
        title={`Delete ${deleteModal.type === "trips" ? "Trip" : "Expense"}?`}
        message="Are you sure you want to permanently delete this record?"
        confirmText="Delete Record"
        isDestructive={true}
      />

      {/* 🛑 SECURE WIPE DATA MODAL REDESIGNED */}
      {isDeleteAllOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => !wiping && setIsDeleteAllOpen(false)}
          />
          <div className="bg-[#050505] border border-red-900/30 shadow-[0_0_40px_rgba(220,38,38,0.15)] rounded-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col p-6 sm:p-8">
            <div className="flex items-center gap-3 text-red-500 mb-6">
              <AlertOctagon size={24} />
              <h2 className="text-xl font-bold tracking-wide">
                Wipe{" "}
                {activeTab === "trips" ? "Trip Database" : "Expense Database"}
              </h2>
            </div>

            {/* 🌟 RECOMMENDED BACKUP BOX */}
            <div className="bg-[#1f1a08] border border-yellow-600/30 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-2 text-yellow-500 font-bold mb-2 text-sm">
                <ShieldAlert size={18} />
                <h3>Recommended: Safe Backup</h3>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed mb-4">
                Before wiping the database, we highly recommend downloading a
                complete CSV backup of all your current{" "}
                {activeTab === "trips" ? "trip" : "expense"} records.
              </p>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 text-yellow-500 text-xs font-bold border border-yellow-600/40 px-4 py-2.5 rounded-lg hover:bg-yellow-500/10 transition-colors w-max"
              >
                <Download size={14} /> Download Full Database Backup
              </button>
            </div>

            <p className="text-gray-300 text-sm mb-4">
              This action will{" "}
              <strong className="text-red-500">PERMANENTLY DELETE ALL</strong>{" "}
              {activeTab === "trips" ? "trip" : "expense"} records. Please enter
              your Admin password to confirm.
            </p>

            <div className="relative mb-8">
              <input
                type={showPassword ? "text" : "password"}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your admin password..."
                className="w-full bg-black border border-gray-800 focus:border-red-500/50 rounded-xl px-4 py-3.5 text-gray-200 outline-none transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex justify-end gap-4 items-center">
              <button
                onClick={() => {
                  setIsDeleteAllOpen(false);
                  setDeletePassword("");
                }}
                disabled={wiping}
                className="text-sm font-bold text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>

              {/* Changed Loader to RefreshCcw to avoid UI height explosion bug */}
              <button
                onClick={handleWipeAll}
                disabled={wiping || !deletePassword}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                  wiping || !deletePassword
                    ? "bg-[#3a1616] text-red-500/40 cursor-not-allowed"
                    : "bg-[#7f1d1d] text-white hover:bg-red-700 shadow-lg"
                }`}
              >
                {wiping ? (
                  <RefreshCcw size={16} className="animate-spin" />
                ) : null}
                {wiping ? "Wiping..." : "Confirm Wipe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleReport;
