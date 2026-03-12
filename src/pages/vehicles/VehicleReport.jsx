import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("trips");

  const [logs, setLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔥 THEME HOOK
  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const theme = {
    primaryText: isTransport ? "text-[#38bdf8]" : "text-indigo-400",
    primaryBg: isTransport ? "bg-[#0c4a6e]/30" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-[#0284c7]/30" : "border-indigo-500/20",
    primaryFocus: isTransport
      ? "focus:border-[#0ea5e9]/50 focus:ring-1 focus:ring-[#0ea5e9]/50"
      : "focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50",
    primaryTabBg: isTransport
      ? "bg-[#0ea5e9] text-white shadow-lg shadow-[#0ea5e9]/20"
      : "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20",
    glowOrb: isTransport ? "bg-[#0ea5e9]/5" : "bg-indigo-500/5",
  };

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

  const currentDataList = activeTab === "trips" ? logs : expenses;

  const filteredData = useMemo(() => {
    return currentDataList.filter((item) => {
      const itemDateObj = item.date ? new Date(item.date) : new Date();
      const searchTerm = String(filters.search || "").toLowerCase();

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

      let matchAmount = true;
      const amt =
        activeTab === "trips"
          ? Number(item.totalAmount) || 0
          : Number(item.amount) || 0;
      if (filters.amountFilter === "Under ₹10k") matchAmount = amt < 10000;
      else if (filters.amountFilter === "₹10k - ₹50k")
        matchAmount = amt >= 10000 && amt <= 50000;
      else if (filters.amountFilter === "Over ₹50k") matchAmount = amt > 50000;

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
              className={`p-2.5 rounded-xl border ${activeTab === "trips" ? `${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}` : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}
            >
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {activeTab === "trips" ? "Trip Logs Report" : "Expense Report"}
              </h1>
              <p
                className={`text-xs uppercase tracking-widest mt-0.5 ${activeTab === "trips" ? "text-zinc-500" : "text-rose-100/40"}`}
              >
                Advanced Analytics
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 bg-[#09090B] p-1.5 rounded-2xl border border-zinc-800/60 w-max h-[44px] shadow-inner">
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
              className={`px-5 h-full flex items-center text-xs font-bold rounded-xl transition-all ${activeTab === "trips" ? theme.primaryTabBg : "text-zinc-400 hover:text-white"}`}
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
              className={`px-5 h-full flex items-center text-xs font-bold rounded-xl transition-all ${activeTab === "expenses" ? "bg-rose-600 text-white shadow-lg shadow-rose-900/20" : "text-zinc-400 hover:text-white"}`}
            >
              Expenses
            </button>
          </div>

          <div className="flex gap-2">
            <div className="relative h-[44px]">
              <Button
                variant="module"
                onClick={() =>
                  isManager
                    ? (() => {
                        setWarningTooltip("wipe-all");
                        setTimeout(() => setWarningTooltip(null), 2500);
                      })()
                    : setIsDeleteAllOpen(true)
                }
                className={`h-full flex items-center justify-center gap-2 px-4 rounded-xl transition-all text-xs font-bold border-rose-500/40 text-rose-400 bg-rose-950/30 hover:bg-rose-900/40 hover:border-rose-400/60 ${isManager ? "opacity-50 !cursor-not-allowed" : ""}`}
              >
                <AlertOctagon size={16} /> Wipe{" "}
                {activeTab === "trips" ? "Trips" : "Expenses"}
              </Button>
              {warningTooltip === "wipe-all" && (
                <div className="absolute top-full mt-2 right-0 z-[100] bg-[#09090B] border border-red-500/30 text-red-400 text-[10px] font-bold px-3 py-2 rounded-lg w-max shadow-xl">
                  🚫 Admin Access Required
                </div>
              )}
            </div>
            <Link
              to={isTransport ? "/transportation/logs" : "/enterprise/logs"}
            >
              <Button
                variant="primary"
                className="h-[44px] px-6 text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 w-full sm:w-auto whitespace-nowrap"
              >
                Add Entry
              </Button>
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
            <div
              className={`bg-[#09090B] border border-zinc-800/60 p-6 rounded-2xl relative overflow-hidden group ${isTransport ? "hover:border-[#0ea5e9]/30" : "hover:border-indigo-500/30"} transition-all`}
            >
              <div
                className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity ${theme.primaryText}`}
              >
                <Truck size={100} />
              </div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
                Total Trips
              </p>
              <h3 className="text-2xl font-black text-white font-mono relative z-10">
                {summary.trips}
              </h3>
            </div>
            <div className="bg-[#09090B] border border-zinc-800/60 p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-blue-500 group-hover:opacity-10 transition-opacity">
                <Activity size={100} />
              </div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
                Total Billed
              </p>
              <h3 className="text-2xl font-black text-[#38bdf8] font-mono relative z-10">
                ₹ {summary.total.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="bg-[#09090B] border border-zinc-800/60 p-6 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-emerald-500 group-hover:opacity-10 transition-opacity">
                <IndianRupee size={100} />
              </div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
                Amount Paid
              </p>
              <h3 className="text-2xl font-black text-emerald-400 font-mono relative z-10">
                ₹ {summary.paid.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="bg-[#09090B] border border-zinc-800/60 p-6 rounded-2xl relative overflow-hidden group hover:border-rose-500/30 transition-all">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-rose-500 group-hover:opacity-10 transition-opacity">
                <AlertCircle size={100} />
              </div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
                Pending Dues
              </p>
              <h3 className="text-2xl font-black text-rose-400 font-mono relative z-10">
                ₹ {summary.due.toLocaleString("en-IN")}
              </h3>
            </div>
          </>
        ) : (
          <>
            <div className="bg-[#09090B] border border-zinc-800/60 p-6 rounded-2xl relative overflow-hidden group hover:border-rose-500/30 transition-all">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-rose-500 group-hover:opacity-10 transition-opacity">
                <Receipt size={100} />
              </div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
                Total Entries
              </p>
              <h3 className="text-2xl font-black text-white font-mono relative z-10">
                {summary.count}
              </h3>
            </div>
            <div className="bg-[#09090B] border border-zinc-800/60 p-6 rounded-2xl relative overflow-hidden group hover:border-rose-500/30 transition-all">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-rose-500 group-hover:opacity-10 transition-opacity">
                <Banknote size={100} />
              </div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
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
        className={`bg-[#09090B] rounded-3xl border overflow-visible shadow-2xl ${activeTab === "trips" ? "border-zinc-800/60" : "border-rose-900/30"}`}
      >
        {/* TABS & SEARCH BAR */}
        <div
          className={`p-5 border-b flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5 rounded-t-3xl ${activeTab === "trips" ? "border-zinc-800/60 bg-zinc-900/10" : "border-rose-900/20 bg-rose-950/10"}`}
        >
          <div className="relative w-full xl:w-96 group">
            <Search
              size={16}
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${filters.search ? (activeTab === "trips" ? theme.primaryText : "text-rose-500") : "text-zinc-500 group-hover:text-zinc-400"}`}
            />
            <input
              type="text"
              placeholder={
                activeTab === "trips"
                  ? "Search vehicle, driver or route..."
                  : "Search reason..."
              }
              className={`w-full bg-[#09090B] border rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 outline-none transition-all shadow-inner focus:ring-2 ${activeTab === "trips" ? "border-zinc-800 focus:border-zinc-700 focus:ring-zinc-800/50" : "border-rose-900/40 focus:ring-rose-500/50"}`}
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </div>
          <Button
            variant="outline"
            onClick={handleExport}
            className={`gap-2 text-xs font-bold tracking-widest border h-11 px-4 rounded-xl bg-[#09090B] transition-colors flex items-center ${activeTab === "trips" ? "border-zinc-800 hover:bg-zinc-800/50 text-zinc-300" : "border-rose-900/40 hover:bg-rose-900/20 text-rose-400"}`}
          >
            <Download size={16} /> Export View
          </Button>
        </div>

        {/* 🚀 PROFESSIONAL UNIVERSAL FILTRATION UI */}
        <div
          className={`p-4 border-b bg-[#09090B] flex flex-wrap items-center gap-4 relative z-20 ${activeTab === "trips" ? "border-zinc-800/60" : "border-rose-900/20"}`}
        >
          <div
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1 border-r mr-1 ${activeTab === "trips" ? "text-zinc-400 border-zinc-800" : "text-rose-500 border-rose-900/40"}`}
          >
            <Filter size={16} /> Filters
            {activeFiltersCount > 0 && (
              <span
                className={`ml-1 px-1.5 rounded ${activeTab === "trips" ? `${theme.primaryBg} ${theme.primaryText}` : "bg-rose-500/20 text-rose-400"}`}
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
              className={`appearance-none bg-[#09090B] border rounded-xl pl-4 pr-10 py-2.5 text-xs font-medium outline-none cursor-pointer transition-all ${activeTab === "trips" ? `border-zinc-800 text-zinc-400 ${theme.primaryFocus}` : "border-rose-900/40 text-rose-200 focus:border-rose-500/50"}`}
            >
              <option value="Any Amount">Any Amount</option>
              <option value="Under ₹10k">&lt; ₹10,000</option>
              <option value="₹10k - ₹50k">₹10k - ₹50k</option>
              <option value="Over ₹50k">&gt; ₹50,000</option>
            </select>
            <ChevronDown
              size={14}
              className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${activeTab === "trips" ? "text-zinc-500 group-hover:text-zinc-300" : "text-rose-500/50 group-hover:text-rose-400"}`}
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
              className={`appearance-none bg-[#09090B] border rounded-xl pl-4 pr-10 py-2.5 text-xs font-medium outline-none cursor-pointer transition-all ${activeTab === "trips" ? `border-zinc-800 text-zinc-400 ${theme.primaryFocus}` : "border-rose-900/40 text-rose-200 focus:border-rose-500/50"}`}
            >
              <option value="All">Timeline: All</option>
              <option value="Today">Today</option>
              <option value="Last7Days">Last 7 Days</option>
              <option value="ThisMonth">This Month</option>
            </select>
            <ChevronDown
              size={14}
              className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${activeTab === "trips" ? "text-zinc-500 group-hover:text-zinc-300" : "text-rose-500/50 group-hover:text-rose-400"}`}
            />
          </div>

          <div className="relative group flex items-center">
            <div
              className={`absolute left-3 flex items-center justify-center pointer-events-none transition-colors ${filters.exactDate ? (activeTab === "trips" ? theme.primaryText : "text-rose-500") : "text-zinc-500"}`}
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
              className={`appearance-none bg-[#09090B] border rounded-xl pl-9 pr-4 py-2 text-xs font-medium outline-none cursor-pointer transition-all ${activeTab === "trips" ? `border-zinc-800 ${theme.primaryFocus}` : "border-rose-900/40 focus:border-rose-500/50"} ${filters.exactDate ? "text-white" : "text-zinc-500"}`}
            />
          </div>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              onClick={() =>
                setFilters({
                  search: "",
                  amountFilter: "Any Amount",
                  dateFilter: "All",
                  exactDate: "",
                })
              }
              className="!px-3 !py-1.5 !text-xs !rounded-full !ml-auto md:!ml-2 flex items-center gap-1.5"
            >
              <X size={14} /> Clear All
            </Button>
          )}
        </div>

        {/* 🚀 DATA TABLE */}
        <div className="overflow-x-auto pb-4 custom-scrollbar min-h-[400px]">
          {activeTab === "trips" ? (
            <table className="w-full text-left min-w-[900px] animate-in fade-in duration-300">
              <thead className="bg-[#09090B] text-zinc-500 text-[10px] uppercase font-bold tracking-[0.15em] border-b border-zinc-800/60">
                <tr>
                  <th className="py-5 px-6">Shipment Date & Vehicle</th>
                  <th className="py-5 px-6">Route Details</th>
                  <th className="py-5 px-6">Cargo & Rate</th>
                  <th className="py-5 px-6 text-right">Financials</th>
                  <th className="py-5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
                {filteredData.map((log) => {
                  const hasEdits =
                    log.editHistory && log.editHistory.length > 0;
                  const latestLog = hasEdits
                    ? log.editHistory[log.editHistory.length - 1]
                    : null;

                  return (
                    <tr
                      key={log._id}
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      <td className="p-5 px-6 align-top">
                        <div className="font-mono text-zinc-400 text-xs mb-1">
                          {log.date
                            ? new Date(log.date).toLocaleDateString("en-GB")
                            : "-"}
                        </div>
                        <div className="text-white font-bold text-md tracking-wider mb-1 uppercase">
                          {log.vehicleNo}
                        </div>
                        <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                          <User size={12} className="text-zinc-600" />{" "}
                          {log.driverName}
                        </div>
                        {hasEdits && (
                          <div
                            onClick={() => openHistory(log, "trips")}
                            className="mt-3 flex flex-col items-start w-max cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <div className="flex items-center gap-1.5 bg-zinc-800/50 border border-zinc-700/50 px-2 py-1 rounded-lg">
                              <History size={10} className="text-zinc-500" />
                              <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                                {latestLog.role || "ADMIN"}
                              </span>
                              {log.editHistory.length > 1 && (
                                <span className="bg-zinc-700/50 text-zinc-300 px-1.5 py-0.5 rounded text-[8px] font-bold ml-1">
                                  +{log.editHistory.length - 1} MORE
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-zinc-500 font-mono mt-1 pl-1">
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
                            <div
                              className={`mt-0.5 w-5 h-5 rounded-full ${theme.primaryBg} flex items-center justify-center border ${theme.primaryBorder} shrink-0`}
                            >
                              <MapPin size={10} className={theme.primaryText} />
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
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 w-5 h-5 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shrink-0">
                              <MapPin size={10} className="text-rose-400" />
                            </div>
                            <div>
                              <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-0.5">
                                Destination
                              </p>
                              <span className="text-xs font-semibold text-zinc-300">
                                {log.unloadingSite}
                              </span>
                            </div>
                          </div>
                          {log.distanceTravelled && (
                            <div className="flex items-start gap-2 mt-1">
                              <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                                <Map size={10} className="text-emerald-400" />
                              </div>
                              <div>
                                <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-0.5">
                                  Distance
                                </p>
                                <span className="text-xs font-semibold text-zinc-300">
                                  {log.distanceTravelled} km
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-5 px-6 align-top">
                        <div className="text-xs text-zinc-300 mb-2 flex items-center gap-1.5 bg-zinc-800/50 w-max px-2.5 py-1 rounded-md font-medium border border-zinc-700/50 uppercase tracking-wide">
                          <Package size={12} className={theme.primaryText} />{" "}
                          {log.items}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-medium">
                          Qty:{" "}
                          <span className="font-bold text-white ml-1">
                            {log.quantity}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 font-medium mt-1">
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
                        <div className="flex justify-end gap-2 items-center relative mt-1">
                          <button
                            onClick={() =>
                              navigate(
                                `${isTransport ? "/transportation/logs" : "/enterprise/logs"}`,
                                {
                                  state: { editLog: log },
                                },
                              )
                            }
                            className={`p-2 text-zinc-500 hover:${theme.primaryText} hover:bg-zinc-800/50 rounded-lg transition-colors`}
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
                            className={`p-2 rounded-lg transition-colors ${isManager ? "text-zinc-600 opacity-50 cursor-not-allowed" : "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"}`}
                          >
                            <Trash2 size={16} />
                          </button>
                          {warningTooltip === log._id && (
                            <div className="absolute top-full right-0 mt-2 z-[9999] bg-[#09090B] border border-red-500/30 text-red-400 text-[10px] font-bold px-3 py-2 rounded-lg w-max shadow-xl">
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
                      className="p-10 text-center text-zinc-500 italic"
                    >
                      No matching trip records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left min-w-[500px] animate-in fade-in duration-300">
              <thead className="sticky top-0 bg-[#09090B] text-[10px] uppercase font-bold text-rose-400/70 tracking-[0.15em] z-10 shadow-sm border-b border-rose-900/20">
                <tr>
                  <th className="py-5 px-6 w-[20%]">Date</th>
                  <th className="py-5 px-6 w-[50%]">Reason for Expense</th>
                  <th className="py-5 px-6 text-right w-[20%]">Amount</th>
                  <th className="py-5 px-6 text-right w-[10%]">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-rose-900/10">
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
                          {new Date(exp.date).toLocaleDateString("en-GB")}
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
                        <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-lg font-mono font-bold">
                          ₹{Number(exp.amount).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="p-5 px-6 text-right align-top">
                        <div className="flex justify-end gap-2 items-center relative mt-1">
                          <button
                            onClick={() =>
                              navigate(
                                `${isTransport ? "/transportation/logs" : "/enterprise/logs"}`,
                                {
                                  state: { editExpense: exp },
                                },
                              )
                            }
                            className="p-2 text-rose-400/70 hover:text-rose-400 hover:bg-rose-900/30 rounded-lg transition-colors"
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
                            className={`p-2 rounded-lg transition-colors ${isManager ? "text-rose-100/10 opacity-50 cursor-not-allowed" : "text-rose-400/70 hover:text-red-400 hover:bg-red-900/30"}`}
                          >
                            <Trash2 size={16} />
                          </button>
                          {warningTooltip === exp._id && (
                            <div className="absolute top-full right-0 mt-2 z-[9999] bg-[#09090B] border border-red-500/30 text-red-400 text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max shadow-xl">
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
          <div className="bg-[#09090B] border border-red-900/30 shadow-[0_0_40px_rgba(220,38,38,0.15)] rounded-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col p-6 sm:p-8">
            <div className="flex items-center gap-3 text-red-500 mb-6">
              <AlertOctagon size={24} />
              <h2 className="text-xl font-bold tracking-wide">
                Wipe{" "}
                {activeTab === "trips" ? "Trip Database" : "Expense Database"}
              </h2>
            </div>

            {/* 🌟 RECOMMENDED BACKUP BOX */}
            <div className="bg-amber-500/10 border border-yellow-600/30 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-2 text-yellow-500 font-bold mb-2 text-sm">
                <ShieldAlert size={18} />
                <h3>Recommended: Safe Backup</h3>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed mb-4">
                Before wiping the database, we highly recommend downloading a
                complete CSV backup of all your current{" "}
                {activeTab === "trips" ? "trip" : "expense"} records.
              </p>
              <Button
                variant="outline"
                onClick={handleExport}
                className="h-11 w-full sm:w-auto text-yellow-500 border-yellow-600/40 hover:bg-yellow-500/10"
              >
                <Download size={14} /> Download Full Database Backup
              </Button>
            </div>

            <p className="text-red-100/70 text-sm mb-4">
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
                className="w-full bg-[#09090B] border border-zinc-800 focus:border-red-500/50 rounded-xl px-4 py-3 text-zinc-200 outline-none transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex justify-end gap-3 items-center">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteAllOpen(false);
                  setDeletePassword("");
                }}
                disabled={wiping}
                className="h-11 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
              >
                Cancel
              </Button>

              <Button
                variant="danger"
                onClick={handleWipeAll}
                disabled={wiping || !deletePassword}
                className="h-11"
              >
                {wiping ? (
                  <RefreshCcw size={16} className="animate-spin" />
                ) : null}
                {wiping ? "Wiping..." : "Confirm Wipe"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 HISTORY MODAL REFINED UI */}
      {historyModal.isOpen && historyModal.data && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() =>
              setHistoryModal({ isOpen: false, data: null, itemName: "" })
            }
          />
          <div
            className={`bg-[#09090B] border ${theme.primaryBorder} rounded-3xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200`}
          >
            <div
              className={`flex items-center justify-between p-5 border-b ${theme.primaryBorder} ${theme.primaryBg} shrink-0`}
            >
              <div className="flex items-center gap-2 text-white font-bold tracking-wide text-sm">
                <History size={16} className={theme.primaryText} />
                Log History:{" "}
                <span className={`${theme.primaryText} font-normal`}>
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
                  className={`bg-[#09090B] border ${index === 0 ? theme.primaryBorder : "border-zinc-800"} rounded-xl p-4 flex items-center justify-between relative overflow-hidden`}
                >
                  {index === 0 && (
                    <div
                      className={`absolute left-0 top-0 w-1 h-full ${theme.primaryBg}`}
                    ></div>
                  )}
                  <div className="flex items-center gap-4 pl-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${index === 0 ? `${theme.primaryBg} ${theme.primaryText}` : "bg-zinc-800 text-zinc-500"}`}
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
                      <p
                        className={`text-[10px] font-mono mt-1 ${index === 0 ? theme.primaryText : "text-zinc-600"}`}
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
                    <div
                      className={`${theme.primaryBg} ${theme.primaryBorder} ${theme.primaryText} text-[10px] font-bold px-3 py-1 rounded-lg tracking-widest uppercase border`}
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

export default VehicleReport;
