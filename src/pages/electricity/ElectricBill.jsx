import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import electricService from "../../services/electricService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Zap,
  Activity,
  Save,
  Trash2,
  CheckCircle,
  AlertCircle,
  Edit2,
  X,
  Download,
  History,
  AlertOctagon,
  ShieldAlert,
  Eye,
  EyeOff,
  Clock,
  Search,
  Filter,
  Calendar,
  FileText,
  ChevronDown,
} from "lucide-react";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

// 🚀 LAZY LOAD CHART (With proper error boundary approach)
const BarChart = lazy(() => import("../../components/charts/BarChart"));

const ChartSkeleton = () => (
  <div className="w-full h-full bg-emerald-900/10 animate-pulse rounded-2xl border border-emerald-900/20"></div>
);

// Helper to get current month in YYYY-MM format
const getCurrentMonth = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
};

const ElectricBill = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [editId, setEditId] = useState(null);

  const [warningTooltip, setWarningTooltip] = useState(null);
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    itemName: "",
  });

  // Wipe Data States
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wiping, setWiping] = useState(false);

  // TABS & FILTERS STATES
  const [activeTab, setActiveTab] = useState("All");
  const [filters, setFilters] = useState({
    search: "",
    amountFilter: "Any Amount",
    dateFilter: "All",
    exactMonth: "",
  });

  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";

  // Pre-filled Date Form
  const [formData, setFormData] = useState({
    caNumber: "",
    month: getCurrentMonth(),
    billDate: new Date().toISOString().split("T")[0],
    billAmount: "",
    fineAmount: "",
    status: "Pending",
  });

  const predictedAmount =
    (parseFloat(formData.billAmount) || 0) +
    (parseFloat(formData.fineAmount) || 0);

  const fetchBills = async () => {
    try {
      const { data } = await electricService.getBills();
      setBills(data || []);
    } catch (error) {
      console.error("Error fetching bills:", error);
      toast.error("Failed to load bill history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  // STATS CALCULATION
  const stats = useMemo(() => {
    return bills.reduce(
      (acc, bill) => {
        const amt = Number(bill.totalAmount) || 0;
        if (bill.status === "Paid") acc.paid += amt;
        else if (bill.status === "Pending") acc.pending += amt;
        else if (bill.status === "Overdue") acc.overdue += amt;
        return acc;
      },
      { paid: 0, pending: 0, overdue: 0 },
    );
  }, [bills]);

  // ADVANCED FILTRATION LOGIC
  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      if (activeTab !== "All" && bill.status !== activeTab) return false;

      const searchTerm = String(filters.search || "").toLowerCase();
      const matchSearch =
        String(bill.caNumber || "")
          .toLowerCase()
          .includes(searchTerm) ||
        String(bill.month || "")
          .toLowerCase()
          .includes(searchTerm);

      if (!matchSearch) return false;

      let matchAmount = true;
      const amt = Number(bill.totalAmount) || 0;
      if (filters.amountFilter === "Under ₹10k") matchAmount = amt < 10000;
      else if (filters.amountFilter === "₹10k - ₹50k")
        matchAmount = amt >= 10000 && amt <= 50000;
      else if (filters.amountFilter === "Over ₹50k") matchAmount = amt > 50000;

      if (!matchAmount) return false;

      let matchDate = true;

      if (filters.exactMonth && bill.month) {
        matchDate = bill.month === filters.exactMonth;
      } else if (filters.dateFilter !== "All" && bill.billDate) {
        const billDateObj = new Date(bill.billDate);
        const today = new Date();
        const diffTime = Math.abs(today - billDateObj);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (filters.dateFilter === "Today") matchDate = diffDays <= 1;
        else if (filters.dateFilter === "Last7Days") matchDate = diffDays <= 7;
        else if (filters.dateFilter === "ThisMonth")
          matchDate =
            billDateObj.getMonth() === today.getMonth() &&
            billDateObj.getFullYear() === today.getFullYear();
      }

      if (!matchDate) return false;

      return true;
    });
  }, [bills, filters, activeTab]);

  const activeFiltersCount =
    [filters.amountFilter, filters.dateFilter].filter(
      (f) => f !== "Any Amount" && f !== "All",
    ).length + (filters.exactMonth ? 1 : 0);

  // 🚀 1. HUGE BARS CONFIGURATION (UPDATED WITH DATES)
  const chartData = useMemo(() => {
    const allMonths = bills
      .map((b) => b.month)
      .filter((m) => m && m.trim() !== "");
    const uniqueMonths = [...new Set(allMonths)]
      .sort((a, b) => new Date(a) - new Date(b))
      .slice(-6);

    // Helper: Converts "YYYY-MM" to "Jan 2026"
    const formatMonth = (yyyy_mm) => {
      if (!yyyy_mm) return "Unknown";
      const [year, month] = yyyy_mm.split("-");
      const date = new Date(year, month - 1);
      return date.toLocaleString("en-US", { month: "short", year: "numeric" });
    };

    const getStatusSum = (month, status) => {
      return bills
        .filter((b) => b.month === month && b.status === status)
        .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    };

    // Helper: Gets specific exact dates for the tooltip
    const getStatusDates = (month, status) => {
      const monthBills = bills.filter(
        (b) => b.month === month && b.status === status && b.billDate,
      );
      if (monthBills.length === 0) return "";
      const dates = monthBills.map((b) =>
        new Date(b.billDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
      );
      return [...new Set(dates)].join(", "); // Returns e.g. "12 Jan, 15 Jan"
    };

    const formattedLabels =
      uniqueMonths.length > 0 ? uniqueMonths.map(formatMonth) : ["No Data"];

    return {
      labels: formattedLabels,
      datasets: [
        {
          label: "Paid",
          data:
            uniqueMonths.length > 0
              ? uniqueMonths.map((m) => getStatusSum(m, "Paid"))
              : [0],
          billDates:
            uniqueMonths.length > 0
              ? uniqueMonths.map((m) => getStatusDates(m, "Paid"))
              : [""],
          backgroundColor: "#10b981",
          borderRadius: 4,
          barPercentage: 0.95,
          categoryPercentage: 0.95,
        },
        {
          label: "Pending",
          data:
            uniqueMonths.length > 0
              ? uniqueMonths.map((m) => getStatusSum(m, "Pending"))
              : [0],
          billDates:
            uniqueMonths.length > 0
              ? uniqueMonths.map((m) => getStatusDates(m, "Pending"))
              : [""],
          backgroundColor: "#fbbf24",
          borderRadius: 4,
          barPercentage: 0.95,
          categoryPercentage: 0.95,
        },
        {
          label: "Overdue",
          data:
            uniqueMonths.length > 0
              ? uniqueMonths.map((m) => getStatusSum(m, "Overdue"))
              : [0],
          billDates:
            uniqueMonths.length > 0
              ? uniqueMonths.map((m) => getStatusDates(m, "Overdue"))
              : [""],
          backgroundColor: "#f43f5e",
          borderRadius: 4,
          barPercentage: 0.95,
          categoryPercentage: 0.95,
        },
      ],
    };
  }, [bills]);

  // 🚀 2. PREMIUM TOOLTIPS & STACKED AXES LOGIC (UPDATED WITH PRICE FORMATTING)
  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: "#a7f3d0",
            usePointStyle: true,
            font: { family: "monospace", size: 10 },
          },
        },
        tooltip: {
          backgroundColor: "rgba(5, 10, 8, 0.95)",
          titleColor: "#34d399",
          bodyColor: "#f1f5f9",
          borderColor: "rgba(16, 185, 129, 0.3)",
          borderWidth: 1,
          padding: 12,
          usePointStyle: true,
          titleFont: { size: 13, family: "monospace", weight: "bold" },
          bodyFont: { size: 12, family: "monospace" },
          callbacks: {
            // Title shows the Month
            title: (context) => `Month: ${context[0].label}`,

            // Label dynamically builds the data string
            label: (context) => {
              const status = context.dataset.label;
              const amount = context.raw || 0;
              if (amount === 0) return null; // Hide 0 amount statuses

              const dates = context.dataset.billDates[context.dataIndex];
              const amountFormatted = `₹${amount.toLocaleString("en-IN")}`;

              // Returning an array renders a clean, multi-line tooltip list
              return [
                `Status : ${status}`,
                `Amount : ${amountFormatted}`,
                `Date(s): ${dates || "N/A"}`,
                ` `, // Spacing separator
              ];
            },

            // Footer sums up only if there are multiple parts to the bill that month
            footer: (context) => {
              const total = context.reduce(
                (sum, item) => sum + (item.raw || 0),
                0,
              );
              return `Total Billed: ₹${total.toLocaleString("en-IN")}`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false, color: "rgba(16, 185, 129, 0.1)" },
          ticks: {
            color: "rgba(167, 243, 208, 0.8)",
            font: { family: "monospace", weight: "bold" },
          },
        },
        y: {
          stacked: true,
          grid: { color: "rgba(16, 185, 129, 0.1)", borderDash: [5, 5] },
          ticks: {
            color: "rgba(167, 243, 208, 0.6)",
            font: { family: "monospace" },
            // 🚀 Compact Price Formatter (K, L, Cr)
            callback: (value) => {
              if (value >= 10000000)
                return `₹${(value / 10000000).toFixed(1)}Cr`;
              if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
              if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
              return `₹${value}`;
            },
          },
        },
      },
    };
  }, []);

  const handleExport = () => {
    try {
      if (filteredBills.length === 0)
        return toast.info("No bill records to export");
      const headers = [
        "CA Number",
        "Month",
        "Bill Date",
        "Bill Amount",
        "Fine Amount",
        "Total Amount",
        "Status",
      ];
      const rows = filteredBills.map((bill) => {
        const date = bill.billDate
          ? `\t${new Date(bill.billDate).toLocaleDateString("en-GB")}`
          : "-";
        return `"${bill.caNumber || "-"}","${bill.month || "-"}",${date},${
          bill.billAmount || 0
        },${bill.fineAmount || 0},${bill.totalAmount || 0},${
          bill.status || "-"
        }`;
      });
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Electric_Bills_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Utility records exported to Excel");
    } catch (error) {
      toast.error("Failed to export bills");
    }
  };

  const handleFullBackup = handleExport;

  const handleWipeAll = async () => {
    if (isManager || !deletePassword)
      return toast.error("Verification failed.");
    setWiping(true);
    try {
      await electricService.deleteAllBills({ password: deletePassword });
      toast.success("Electric Bills database cleared successfully.");
      setIsDeleteAllOpen(false);
      setDeletePassword("");
      setShowPassword(false);
      fetchBills();
    } catch (error) {
      toast.error(error.message || "Incorrect Admin Password.");
    } finally {
      setWiping(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      if (editId) {
        await electricService.updateBill(editId, formData, currentUser);
        toast.success("Bill updated successfully!");
      } else {
        await electricService.addBill(formData, currentUser);
        toast.success("New bill recorded!");
      }
      await fetchBills();
      resetForm();
    } catch (error) {
      toast.error("Failed to save bill");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (bill) => {
    setEditId(bill._id);
    setFormData({
      caNumber: bill.caNumber || "",
      month: bill.month || getCurrentMonth(),
      billDate: bill.billDate
        ? new Date(bill.billDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      billAmount: bill.billAmount || "",
      fineAmount: bill.fineAmount || "",
      status: bill.status || "Pending",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (id) => setDeleteModal({ isOpen: true, id });

  const handleDisabledClick = (action) => {
    setWarningTooltip(action);
    setTimeout(() => setWarningTooltip(null), 2500);
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await electricService.deleteBill(deleteModal.id);
      toast.info("Bill deleted successfully");
      fetchBills();
    } catch (error) {
      toast.error("Failed to delete bill");
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const openHistory = (bill) => {
    const sortedHistory = Array.isArray(bill.editHistory)
      ? [...bill.editHistory].reverse().slice(0, 10)
      : [];
    setHistoryModal({
      isOpen: true,
      data: sortedHistory,
      itemName: `CA: ${bill.caNumber || "N/A"} (${bill.month || "N/A"})`,
    });
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({
      caNumber: "",
      month: getCurrentMonth(),
      billDate: new Date().toISOString().split("T")[0],
      billAmount: "",
      fineAmount: "",
      status: "Pending",
    });
  };

  const handleCAChange = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val.length <= 12) {
      setFormData({ ...formData, caNumber: val });
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="w-full h-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-20 w-full">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Zap className="text-yellow-400" size={32} /> Electricity Metrics
          </h1>
          <p className="text-emerald-100/40 mt-1 text-sm">
            Monitor factory power consumption & billing history.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <button
              onClick={() =>
                isManager
                  ? handleDisabledClick("wipe-all")
                  : setIsDeleteAllOpen(true)
              }
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-xs font-bold shadow-lg ${
                isManager
                  ? "bg-red-500/5 text-red-500/50 border border-red-500/10 opacity-50 cursor-not-allowed"
                  : "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
              }`}
            >
              <AlertOctagon size={16} /> Wipe Data
            </button>
            {warningTooltip === "wipe-all" && (
              <div className="absolute top-full mt-2 right-0 md:left-1/2 md:-translate-x-1/2 z-[100] animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-[#050a08] border border-red-500/30 shadow-xl text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                  <span className="bg-red-500/20 p-1 rounded-md text-[10px] leading-none">
                    🚫
                  </span>{" "}
                  Admin Access Required
                </div>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            className="gap-2 text-xs border-emerald-900/30 hover:bg-emerald-500/10 text-emerald-400"
            onClick={handleExport}
          >
            <Download size={16} /> Export CSV
          </Button>
        </div>
      </div>

      {/* OVERDUE SUGGESTION ALERT */}
      {stats.overdue > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start sm:items-center gap-4 animate-in slide-in-from-top-4 fade-in shadow-[0_0_20px_rgba(225,29,72,0.1)] w-full">
          <div className="bg-rose-500/20 p-2.5 rounded-full text-rose-500 animate-pulse">
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 className="text-rose-400 font-bold text-sm tracking-wide">
              ⚠️ Payment Action Required
            </h4>
            <p className="text-rose-100/60 text-xs mt-1">
              You have overdue electricity bills amounting to{" "}
              <strong className="text-rose-300 font-mono">
                ₹{stats.overdue.toLocaleString("en-IN")}
              </strong>
              . Please clear them immediately to avoid extra fines or line
              disconnection.
            </p>
          </div>
        </div>
      )}

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        <div className="bg-[#050a08] border border-emerald-900/30 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-emerald-500 group-hover:opacity-10 transition-opacity">
            <CheckCircle size={100} />
          </div>
          <p className="text-emerald-100/50 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
            Total Paid Bills
          </p>
          <h3 className="text-3xl font-black text-emerald-400 font-mono relative z-10">
            ₹ {stats.paid.toLocaleString("en-IN")}
          </h3>
        </div>
        <div className="bg-[#050a08] border border-emerald-900/30 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-yellow-500 group-hover:opacity-10 transition-opacity">
            <Clock size={100} />
          </div>
          <p className="text-emerald-100/50 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
            Total Pending Bills
          </p>
          <h3 className="text-3xl font-black text-yellow-400 font-mono relative z-10">
            ₹ {stats.pending.toLocaleString("en-IN")}
          </h3>
        </div>
        <div className="bg-[#020403] border border-rose-900/30 p-6 rounded-2xl relative overflow-hidden group shadow-[0_0_20px_rgba(225,29,72,0.05)]">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-rose-500 group-hover:opacity-10 transition-opacity">
            <AlertCircle size={100} />
          </div>
          <p className="text-rose-100/50 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
            Total Overdue Bills
          </p>
          <h3 className="text-3xl font-black text-rose-400 font-mono relative z-10">
            ₹ {stats.overdue.toLocaleString("en-IN")}
          </h3>
        </div>
      </div>

      {/* 🚀 FORM & CHART SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:items-stretch w-full">
        {/* FORM CONTAINER - Modified for exact flex stretching */}
        <div className="lg:col-span-1 flex flex-col h-full w-full">
          <div
            className={`flex-1 flex flex-col justify-between w-full rounded-[32px] shadow-xl border p-6 md:p-8 relative overflow-hidden transition-colors ${
              editId
                ? "bg-emerald-900/10 border-emerald-500/30"
                : "bg-[#050a08] border-emerald-900/30"
            }`}
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 blur-[60px] rounded-full pointer-events-none" />

            <div className="flex items-center gap-3 mb-8 relative z-10 shrink-0">
              <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-2xl border border-yellow-500/20 shadow-lg shadow-yellow-500/10">
                {editId ? <Edit2 size={24} /> : <Zap size={24} />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {editId ? "Update Bill" : "Record Bill"}
                </h3>
                <p className="text-emerald-100/40 text-xs uppercase font-bold tracking-wider mt-1">
                  Monthly Log
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6 relative z-10 flex-1 flex flex-col w-full"
            >
              <div className="space-y-5 flex-1">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest ml-1">
                    Customer A/C No. (CA No.)
                  </label>
                  <input
                    type="text"
                    placeholder="12-digit CA Number"
                    maxLength={12}
                    value={formData.caNumber}
                    onChange={handleCAChange}
                    required
                    className="w-full bg-[#020403] border border-emerald-900/30 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-emerald-100 outline-none transition-all font-mono tracking-wider placeholder:text-emerald-100/20"
                  />
                  <p className="text-[9px] text-emerald-100/30 font-mono ml-1">
                    {formData.caNumber.length}/12 Digits
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest ml-1">
                      Bill Month
                    </label>
                    <input
                      type="month"
                      value={formData.month}
                      onChange={(e) =>
                        setFormData({ ...formData, month: e.target.value })
                      }
                      required
                      className="w-full bg-[#020403] border border-emerald-900/30 rounded-xl px-4 py-3 text-emerald-100 outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
                      style={{ colorScheme: "dark" }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest ml-1">
                      Bill Date
                    </label>
                    <input
                      type="date"
                      value={formData.billDate}
                      onChange={(e) =>
                        setFormData({ ...formData, billDate: e.target.value })
                      }
                      required
                      className="w-full bg-[#020403] border border-emerald-900/30 rounded-xl px-4 py-3 text-emerald-100 outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
                      style={{ colorScheme: "dark" }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest ml-1">
                      Bill Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.billAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, billAmount: e.target.value })
                      }
                      onWheel={(e) => e.target.blur()}
                      required
                      className="w-full bg-[#020403] border border-emerald-900/30 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest ml-1">
                      Fine Amount (Opt)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.fineAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, fineAmount: e.target.value })
                      }
                      onWheel={(e) => e.target.blur()}
                      className="w-full bg-[#020403] border border-emerald-900/30 rounded-xl px-4 py-3 text-rose-400 font-bold outline-none focus:border-rose-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="p-5 bg-emerald-950/20 rounded-2xl border border-emerald-900/30 space-y-4 mt-2 w-full">
                  <div className="flex justify-between items-center border-b border-emerald-900/20 pb-4">
                    <span className="text-[10px] font-black text-emerald-100/60 uppercase tracking-widest">
                      Payment Status
                    </span>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className={`text-xs rounded-lg px-3 py-1.5 outline-none border font-bold cursor-pointer ${
                        formData.status === "Paid"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : formData.status === "Overdue"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      }`}
                    >
                      <option
                        className="bg-[#020403] text-yellow-400"
                        value="Pending"
                      >
                        Pending
                      </option>
                      <option
                        className="bg-[#020403] text-emerald-400"
                        value="Paid"
                      >
                        Paid
                      </option>
                      <option
                        className="bg-[#020403] text-rose-400"
                        value="Overdue"
                      >
                        Overdue
                      </option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs font-semibold text-emerald-100/40 uppercase tracking-wider">
                      Total Payable
                    </span>
                    <span className="text-2xl font-black text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.3)] font-mono">
                      <span className="text-sm mr-1 font-bold text-yellow-500">
                        ₹
                      </span>
                      {predictedAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6 mt-auto border-t border-emerald-900/20 w-full shrink-0">
                {editId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-transparent border border-emerald-900/50 text-emerald-200/50 hover:text-white transition-all hover:bg-emerald-900/20 flex items-center justify-center gap-2"
                  >
                    <X size={16} /> Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className={`flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 ${
                    editId
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20"
                      : "bg-gradient-to-r from-yellow-600 to-amber-600 text-white shadow-xl shadow-yellow-900/20"
                  }`}
                >
                  {saving ? <Loader className="w-4 h-4" /> : <Save size={16} />}{" "}
                  {editId ? "Update Bill" : "Save Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 🚀 PREMIUM CHART UI - Modified flex tree to pass height constraints to canvas */}
        <div className="lg:col-span-2 flex flex-col h-full w-full">
          <div className="flex-1 w-full p-6 md:p-8 rounded-[32px] bg-gradient-to-br from-[#050a08] to-[#020403] border border-emerald-900/30 shadow-lg relative flex flex-col min-h-[450px] overflow-hidden">
            <div className="absolute top-0 right-0 p-8 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />

            <div className="flex justify-between items-center mb-6 relative z-10 w-full shrink-0">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity size={20} className="text-emerald-500" /> Monthly
                Trend
              </h3>
              <span className="text-[10px] text-emerald-100/40 font-mono font-bold uppercase tracking-widest bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-900/30">
                Last 6 Months
              </span>
            </div>

            {/* This flex-1 wrapper takes all available remaining height and sets up relative positioning */}
            <div className="relative flex-1 w-full min-h-0 z-10">
              {/* Added aggressive CSS overrides to guarantee the chart component matches its wrapper */}
              <div className="absolute inset-0 w-full h-full [&>div]:!h-full [&>div]:!w-full [&_canvas]:!h-full [&_canvas]:!w-full">
                {bills.length > 0 ? (
                  <Suspense fallback={<ChartSkeleton />}>
                    <BarChart data={chartData} options={chartOptions} />
                  </Suspense>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-emerald-100/30 text-sm italic border border-dashed border-emerald-900/30 rounded-2xl">
                    No data available to plot
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE SECTION WITH TABS & FILTERS */}
      <div className="w-full">
        <div className="bg-[#050a08] rounded-[32px] shadow-xl border border-emerald-900/30 overflow-hidden flex flex-col w-full">
          <div className="p-6 md:p-8 border-b border-emerald-900/20 bg-white/[0.01] flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5">
            <div className="flex gap-2 p-1.5 bg-black/60 rounded-xl border border-white/5 w-full sm:w-auto overflow-x-auto shadow-inner">
              <button
                onClick={() => setActiveTab("All")}
                className={`px-5 py-2 sm:py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 flex-1 sm:flex-none justify-center whitespace-nowrap ${
                  activeTab === "All"
                    ? "bg-emerald-500/15 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                    : "text-gray-500 hover:text-emerald-200 hover:bg-white/5"
                }`}
              >
                <FileText size={14} /> All Bills
              </button>
              <button
                onClick={() => setActiveTab("Paid")}
                className={`px-5 py-2 sm:py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 flex-1 sm:flex-none justify-center whitespace-nowrap ${
                  activeTab === "Paid"
                    ? "bg-emerald-500/15 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                    : "text-gray-500 hover:text-emerald-200 hover:bg-white/5"
                }`}
              >
                <CheckCircle size={14} /> Paid
              </button>
              <button
                onClick={() => setActiveTab("Pending")}
                className={`px-5 py-2 sm:py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 flex-1 sm:flex-none justify-center whitespace-nowrap ${
                  activeTab === "Pending"
                    ? "bg-yellow-500/15 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.1)]"
                    : "text-gray-500 hover:text-yellow-200 hover:bg-white/5"
                }`}
              >
                <Clock size={14} /> Pending
              </button>
              <button
                onClick={() => setActiveTab("Overdue")}
                className={`px-5 py-2 sm:py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 flex-1 sm:flex-none justify-center whitespace-nowrap ${
                  activeTab === "Overdue"
                    ? "bg-rose-500/15 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                    : "text-gray-500 hover:text-rose-200 hover:bg-white/5"
                }`}
              >
                <AlertCircle size={14} /> Overdue
              </button>
            </div>

            <div className="flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-end">
              <div className="relative flex-1 sm:w-80 group">
                <Search
                  size={16}
                  className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                    filters.search
                      ? "text-emerald-500"
                      : "text-gray-500 group-hover:text-gray-400"
                  }`}
                />
                <input
                  type="text"
                  placeholder="Search CA Number or Month..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* PROFESSIONAL FILTRATION UI */}
          <div className="p-4 border-b border-emerald-900/20 bg-[#020403]/80 flex flex-wrap items-center gap-4 relative z-20 w-full">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-500 px-3 py-1 border-r border-white/10 mr-1">
              <Filter size={16} /> Filters
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-1.5 rounded bg-emerald-500/20 text-emerald-400">
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
                className="appearance-none bg-black/30 border border-white/10 rounded-xl pl-4 pr-10 py-2 text-xs font-medium text-gray-300 outline-none cursor-pointer transition-all focus:ring-2 focus:ring-emerald-500/20 hover:border-emerald-500/50"
              >
                <option value="Any Amount" className="bg-[#050a08]">
                  Any Amount
                </option>
                <option value="Under ₹10k" className="bg-[#050a08]">
                  &lt; ₹10,000
                </option>
                <option value="₹10k - ₹50k" className="bg-[#050a08]">
                  ₹10k - ₹50k
                </option>
                <option value="Over ₹50k" className="bg-[#050a08]">
                  &gt; ₹50,000
                </option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover:text-emerald-500"
              />
            </div>

            <div className="relative group">
              <select
                value={filters.dateFilter}
                onChange={(e) => {
                  setFilters({
                    ...filters,
                    dateFilter: e.target.value,
                    exactMonth: "",
                  });
                }}
                className="appearance-none bg-black/30 border border-white/10 rounded-xl pl-4 pr-10 py-2 text-xs font-medium text-gray-300 outline-none cursor-pointer transition-all focus:ring-2 focus:ring-emerald-500/20 hover:border-emerald-500/50"
              >
                <option value="All" className="bg-[#050a08]">
                  Timeline: All
                </option>
                <option value="Today" className="bg-[#050a08]">
                  Today
                </option>
                <option value="Last7Days" className="bg-[#050a08]">
                  Last 7 Days
                </option>
                <option value="ThisMonth" className="bg-[#050a08]">
                  This Month
                </option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover:text-emerald-500"
              />
            </div>

            <div className="relative group flex items-center">
              <div
                className={`absolute left-3 flex items-center justify-center text-gray-500 pointer-events-none transition-colors ${
                  filters.exactMonth ? "text-emerald-500" : ""
                }`}
              >
                <Calendar size={14} />
              </div>
              <input
                type="month"
                value={filters.exactMonth}
                onChange={(e) => {
                  setFilters({
                    ...filters,
                    exactMonth: e.target.value,
                    dateFilter: "All",
                  });
                }}
                style={{ colorScheme: "dark" }}
                className={`appearance-none bg-black/30 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs font-medium ${
                  filters.exactMonth ? "text-white" : "text-gray-400"
                } outline-none cursor-pointer transition-all focus:ring-2 focus:ring-emerald-500/20 hover:border-emerald-500/50`}
              />
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={() =>
                  setFilters({
                    search: "",
                    amountFilter: "Any Amount",
                    dateFilter: "All",
                    exactMonth: "",
                  })
                }
                className="text-xs font-bold text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ml-auto md:ml-2"
              >
                <X size={14} /> Clear All
              </button>
            )}
          </div>

          <div className="overflow-x-auto w-full custom-scrollbar pb-4">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-[#020403]/90 backdrop-blur-md text-emerald-100/40 text-[10px] uppercase font-black tracking-widest sticky top-0 z-10 border-b border-emerald-900/20">
                <tr>
                  <th className="py-4 px-6">CA No. & Month</th>
                  <th className="py-4 px-5">Bill Date</th>
                  <th className="py-4 px-5 text-right">Bill Amt</th>
                  <th className="py-4 px-5 text-right">Fine</th>
                  <th className="py-4 px-5 text-right">Total Amount</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/10 text-sm">
                {filteredBills.map((bill) => {
                  const hasEdits =
                    bill.editHistory && bill.editHistory.length > 0;
                  const historyCount = hasEdits ? bill.editHistory.length : 0;
                  const latestLog = hasEdits
                    ? bill.editHistory[bill.editHistory.length - 1]
                    : null;

                  return (
                    <tr
                      key={bill._id}
                      className="hover:bg-emerald-900/10 transition-colors group"
                    >
                      <td className="p-5 pl-6 align-middle">
                        <div className="text-emerald-400 font-mono font-bold whitespace-nowrap mb-1 tracking-wider">
                          {bill.caNumber || "N/A"}
                        </div>
                        <div className="text-white font-bold whitespace-nowrap">
                          {bill.month}
                        </div>

                        {/* 🛡️ STRICT ROLE-BASED HISTORY BADGE (ONLY SHOWS IF EDITED) */}
                        {hasEdits && (
                          <div
                            onClick={() => openHistory(bill)}
                            className="mt-2.5 flex flex-col gap-0.5 cursor-pointer bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg transition-all w-max whitespace-nowrap shadow-sm group/btn"
                          >
                            <div className="text-[10px] font-mono text-emerald-400/90 flex items-center gap-1.5 uppercase tracking-widest font-bold leading-none">
                              <History
                                size={10}
                                className="group-hover/btn:-rotate-12 transition-transform"
                              />
                              {latestLog.role || "ADMIN"}
                              {historyCount > 1 && (
                                <span className="bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded text-[8px] font-bold ml-1">
                                  +{historyCount - 1} MORE
                                </span>
                              )}
                            </div>
                            <span className="text-emerald-100/40 text-[9px] ml-4 font-medium tracking-wide">
                              {new Date(latestLog.at).toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-5 align-middle text-emerald-100/60 font-mono text-xs">
                        {bill.billDate
                          ? new Date(bill.billDate).toLocaleDateString("en-GB")
                          : "-"}
                      </td>
                      <td className="p-5 align-middle text-right font-mono text-emerald-100/80">
                        ₹{Number(bill.billAmount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-5 align-middle text-right font-mono text-rose-400/80">
                        ₹{Number(bill.fineAmount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-5 text-right font-black text-yellow-400 align-middle whitespace-nowrap font-mono text-lg tracking-tight">
                        ₹{Number(bill.totalAmount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-5 text-center align-middle">
                        <span
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border inline-flex items-center gap-1.5 shadow-sm ${
                            bill.status === "Paid"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : bill.status === "Overdue"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                          }`}
                        >
                          {bill.status === "Paid" ? (
                            <CheckCircle size={12} />
                          ) : (
                            <AlertCircle size={12} />
                          )}
                          {bill.status}
                        </span>
                      </td>
                      <td className="p-5 pr-6 align-middle">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(bill)}
                            className="p-2 bg-emerald-900/20 text-emerald-100/40 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all border border-transparent hover:border-emerald-500/20"
                          >
                            <Edit2 size={16} />
                          </button>
                          <div className="relative flex items-center">
                            <button
                              onClick={() =>
                                isManager
                                  ? handleDisabledClick(bill._id)
                                  : handleDeleteClick(bill._id)
                              }
                              className={`p-2 rounded-xl transition-all border border-transparent ${
                                isManager
                                  ? "text-emerald-100/20 opacity-50 cursor-not-allowed hover:bg-red-500/5"
                                  : "bg-rose-900/20 text-rose-100/40 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20"
                              }`}
                            >
                              <Trash2 size={16} />
                            </button>
                            {warningTooltip === bill._id && (
                              <div className="absolute bottom-full right-0 mb-2 z-[99] animate-in fade-in zoom-in-95 duration-200">
                                <div className="bg-[#050a08] border border-red-500/30 shadow-2xl shadow-red-900/40 text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                                  <span className="bg-red-500/20 p-1 rounded-md text-[10px] leading-none">
                                    🚫
                                  </span>{" "}
                                  Action Denied
                                </div>
                                <div className="absolute -bottom-1 right-3 w-2 h-2 bg-[#050a08] border-b border-r border-red-500/30 rotate-45"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredBills.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-12 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/5 text-emerald-500/30 mb-4">
                        <FileText size={32} />
                      </div>
                      <p className="text-emerald-100/40 text-sm">
                        No bill records match your filters.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* LOG HISTORY MODAL */}
      {historyModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#050a08] border border-emerald-900/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-emerald-900/20 flex justify-between items-center bg-[#020403]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History size={18} className="text-emerald-500" /> Log:{" "}
                <span className="text-emerald-400 text-sm font-mono">
                  {historyModal.itemName}
                </span>
              </h3>
              <button
                onClick={() =>
                  setHistoryModal({ isOpen: false, data: [], itemName: "" })
                }
                className="text-emerald-100/40 hover:text-white p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar relative">
              {historyModal.data.map((edit, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-[#020403] p-4 rounded-xl border border-emerald-900/20 group hover:border-emerald-500/30 transition-colors relative overflow-hidden"
                >
                  {idx === 0 && (
                    <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                  )}
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm uppercase shadow-inner ${
                        idx === 0
                          ? "bg-emerald-900/40 border border-emerald-500/30 text-emerald-400"
                          : "bg-emerald-500/5 border border-emerald-500/10 text-emerald-500/60"
                      }`}
                    >
                      {edit.role ? edit.role.charAt(0) : "A"}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-bold uppercase tracking-widest ${
                          idx === 0 ? "text-white" : "text-emerald-100/70"
                        }`}
                      >
                        {edit.role || "Admin"}
                      </p>
                      <p className="text-[10px] text-emerald-100/40 font-mono tracking-wide mt-0.5">
                        {edit.email || edit.by}
                      </p>
                      <p
                        className={`text-[10px] font-mono mt-1 ${
                          idx === 0
                            ? "text-emerald-500 font-bold"
                            : "text-emerald-400/50"
                        }`}
                      >
                        {new Date(edit.at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  {idx === 0 && (
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md uppercase font-black border border-emerald-500/20 tracking-widest">
                      Latest
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Delete Bill?"
        message="Are you sure you want to delete this bill record? This cannot be undone."
        confirmText="Delete"
        isDestructive={true}
      />

      {/* SECURE WIPE DATA MODAL */}
      {isDeleteAllOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => !wiping && setIsDeleteAllOpen(false)}
          />
          <div className="bg-[#050a08] border border-red-900/50 shadow-[0_0_40px_rgba(220,38,38,0.15)] rounded-3xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col p-6 sm:p-8">
            <div className="flex items-center gap-3 text-red-500 mb-6">
              <AlertOctagon size={28} />
              <h2 className="text-xl font-bold tracking-wide">
                Wipe Electric Database
              </h2>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  size={20}
                  className="text-yellow-500 shrink-0 mt-0.5"
                />
                <div>
                  <h3 className="text-yellow-500 font-bold text-sm mb-1">
                    Recommended: Safe Backup
                  </h3>
                  <p className="text-yellow-100/60 text-xs mb-4 leading-relaxed">
                    Before wiping the database, we highly recommend downloading
                    a complete CSV backup of all your electricity records.
                  </p>
                  <button
                    onClick={handleFullBackup}
                    className="w-full sm:w-auto px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Download size={14} /> Download Full Database Backup
                  </button>
                </div>
              </div>
            </div>
            <p className="text-red-100/70 text-sm mb-4">
              This action will{" "}
              <strong className="text-red-500">PERMANENTLY DELETE ALL</strong>{" "}
              electric bills. Please enter your Admin password to confirm.
            </p>
            <div className="relative mb-8">
              <input
                type={showPassword ? "text" : "password"}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your admin password..."
                className="w-full bg-[#020403] border border-red-900/30 focus:border-red-500/50 rounded-xl px-4 py-3 text-red-100 placeholder:text-red-100/20 outline-none transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-red-100/30 hover:text-red-100/60 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteAllOpen(false);
                  setDeletePassword("");
                }}
                disabled={wiping}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-red-100/50 hover:text-red-100 hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleWipeAll}
                disabled={wiping || !deletePassword}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-red-600/20 text-red-500 border border-red-600/30 hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {wiping ? <Loader className="w-4 h-4" /> : null}
                {wiping ? "Wiping..." : "Confirm Wipe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElectricBill;
