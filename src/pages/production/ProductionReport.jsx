import React, { useState, useEffect } from "react";
import productionService from "../../services/productionService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Factory,
  Download,
  Filter,
  Search,
  BarChart,
  X,
  Users,
  IndianRupee,
  Layers,
  Edit,
  Trash2,
  AlertCircle,
  History,
  ChevronDown,
  Calendar,
  AlertOctagon,
  ShieldAlert,
  Eye,
  EyeOff,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { Link } from "react-router-dom";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const ProductionReport = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [labourLogs, setLabourLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("production");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterProduct, setFilterProduct] = useState("All");
  const [filterQuantity, setFilterQuantity] = useState("All");
  const [filterDate, setFilterDate] = useState("All");
  const [filterExactDate, setFilterExactDate] = useState("");

  // Wipe Data States
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wiping, setWiping] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState("");
  const [warningTooltip, setWarningTooltip] = useState(null);
  const [logModalInfo, setLogModalInfo] = useState({
    isOpen: false,
    data: null,
    tabType: "production",
  });

  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";

  const fetchAllLogs = async () => {
    try {
      const prodRes = await productionService.getAllProduction();
      setLogs(Array.isArray(prodRes.data) ? prodRes.data : []);

      const labRes = await productionService.getAllLabourPayouts();
      setLabourLogs(Array.isArray(labRes.data) ? labRes.data : []);
    } catch (error) {
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLogs();
  }, []);

  const parseProduct = (fullName) => {
    if (!fullName) return { name: "-", size: "-" };
    if (fullName.includes("(")) {
      const parts = fullName.split("(");
      return { name: parts[0].trim(), size: parts[1].replace(")", "").trim() };
    }
    return { name: fullName, size: "-" };
  };

  const formatLogDate = (isoString) => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-GB", { month: "short" });
    const time = date.toLocaleString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${day} ${month}, ${time}`;
  };

  const formatLogDateFull = (isoString) => {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.productName
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesProduct =
      filterProduct === "All" || log.productName === filterProduct;

    let matchesQty = true;
    if (filterQuantity !== "All") {
      const qty = Number(log.quantity) || 0;
      if (filterQuantity === "Under5k") matchesQty = qty < 5000;
      else if (filterQuantity === "5k-15k")
        matchesQty = qty >= 5000 && qty <= 15000;
      else if (filterQuantity === "Above15k") matchesQty = qty > 15000;
    }

    let matchesDate = true;
    if (filterExactDate && log.date) {
      const logDateObj = new Date(log.date);
      const formattedLogDate = `${logDateObj.getFullYear()}-${String(logDateObj.getMonth() + 1).padStart(2, "0")}-${String(logDateObj.getDate()).padStart(2, "0")}`;
      matchesDate = formattedLogDate === filterExactDate;
    } else if (filterDate !== "All" && log.date) {
      const lDate = new Date(log.date);
      const today = new Date();
      const diffTime = Math.abs(today - lDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (filterDate === "Today") matchesDate = diffDays <= 1;
      else if (filterDate === "Last7Days") matchesDate = diffDays <= 7;
      else if (filterDate === "ThisMonth")
        matchesDate =
          lDate.getMonth() === today.getMonth() &&
          lDate.getFullYear() === today.getFullYear();
    }
    return matchesSearch && matchesProduct && matchesQty && matchesDate;
  });

  const filteredLabourLogs = labourLogs.filter((log) => {
    const matchesSearch =
      log.labourName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.payoutCategory?.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesDate = true;
    if (filterExactDate && log.date) {
      const logDateObj = new Date(log.date);
      const formattedLogDate = `${logDateObj.getFullYear()}-${String(logDateObj.getMonth() + 1).padStart(2, "0")}-${String(logDateObj.getDate()).padStart(2, "0")}`;
      matchesDate = formattedLogDate === filterExactDate;
    } else if (filterDate !== "All" && log.date) {
      const lDate = new Date(log.date);
      const today = new Date();
      const diffTime = Math.abs(today - lDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (filterDate === "Today") matchesDate = diffDays <= 1;
      else if (filterDate === "Last7Days") matchesDate = diffDays <= 7;
      else if (filterDate === "ThisMonth")
        matchesDate =
          lDate.getMonth() === today.getMonth() &&
          lDate.getFullYear() === today.getFullYear();
    }
    return matchesSearch && matchesDate;
  });

  const filteredDuesLogs = filteredLabourLogs.filter(
    (log) => Number(log.amountDue) > 0,
  );

  const activeFiltersCount =
    [filterProduct, filterQuantity, filterDate].filter((f) => f !== "All")
      .length + (filterExactDate ? 1 : 0);

  const totalOutput = filteredLogs.reduce(
    (acc, log) => acc + (Number(log.quantity) || 0),
    0,
  );
  const totalPaidOut = filteredLabourLogs.reduce(
    (acc, log) => acc + (Number(log.amountPaid) || 0),
    0,
  );
  const totalDue = filteredDuesLogs.reduce(
    (acc, log) => acc + (Number(log.amountDue) || 0),
    0,
  );

  const handleDeleteClick = (entry, type) => {
    setEntryToDelete(entry);
    setDeleteType(type);
    setIsDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;
    try {
      if (deleteType === "production") {
        await productionService.deleteProduction(entryToDelete._id);
        toast.success("Production log deleted.");
      } else {
        await productionService.deleteLabourPayout(entryToDelete._id);
        toast.success("Record deleted.");
      }
      fetchAllLogs();
    } catch (error) {
      toast.error("Failed to delete log.");
    } finally {
      setIsDialogOpen(false);
      setEntryToDelete(null);
      setDeleteType("");
    }
  };

  const handleDisabledClick = (action) => {
    setWarningTooltip(action);
    setTimeout(() => setWarningTooltip(null), 2500);
  };

  // Full Database Backup Logic
  const handleFullBackup = () => {
    try {
      if (logs.length === 0 && labourLogs.length === 0)
        return toast.info("Database is empty.");

      const headers = [
        "Module,Date,Item Name,Size,Quantity,Payout Category,Party Name,Cost,Paid,Due",
      ];
      const prodRows = logs.map((l) => {
        const { name, size } = parseProduct(l.productName);
        return `"Production",\t${new Date(l.date).toLocaleDateString("en-GB")},"${name}","${size}",${l.quantity},"-","-",0,0,0`;
      });
      const labRows = labourLogs.map(
        (l) =>
          `"Payout",\t${new Date(l.date).toLocaleDateString("en-GB")},"-","-",${l.quantityProduced || 0},"${l.payoutCategory || "Labour"}","${l.labourName}",${l.cost || 0},${l.amountPaid || 0},${l.amountDue || 0}`,
      );

      const csvContent = [headers.join(","), ...prodRows, ...labRows].join(
        "\n",
      );
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute(
        "download",
        `Full_Database_Backup_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Secure full backup generated!");
    } catch (e) {
      toast.error("Backup failed.");
    }
  };

  // Wipe All Logic
  const handleWipeAll = async () => {
    if (isManager || !deletePassword)
      return toast.error("Verification failed.");
    setWiping(true);
    try {
      await productionService.deleteAllProduction({ password: deletePassword });
      toast.success("Database cleared successfully.");
      setIsDeleteAllOpen(false);
      setDeletePassword("");
      setShowPassword(false);
      fetchAllLogs();
    } catch (error) {
      toast.error(error.message || "Incorrect Admin Password.");
    } finally {
      setWiping(false);
    }
  };

  const handleExport = () => {
    try {
      if (activeTab === "production") {
        if (filteredLogs.length === 0)
          return toast.info("No records to export");
        const headers = ["Date", "Item Name", "Size", "Quantity Produced"];
        const rows = filteredLogs.map((log) => {
          let dateStr = log.date
            ? `\t${new Date(log.date).toLocaleDateString("en-GB")}`
            : "-";
          const { name, size } = parseProduct(log.productName);
          return `${dateStr},"${name}","${size}",${log.quantity}`;
        });
        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute(
          "download",
          `Production_Report_${new Date().toISOString().split("T")[0]}.csv`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Exported successfully");
      } else if (activeTab === "labour") {
        if (filteredLabourLogs.length === 0)
          return toast.info("No records to export");
        const headers = ["Date", "Category", "Name", "Cost", "Paid", "Due"];
        const rows = filteredLabourLogs.map((log) => {
          let dateStr = log.date
            ? `\t${new Date(log.date).toLocaleDateString("en-GB")}`
            : "-";
          return `${dateStr},"${log.payoutCategory || "Labour"}","${log.labourName}",${log.cost || 0},${log.amountPaid || 0},${log.amountDue || 0}`;
        });
        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute(
          "download",
          `Payouts_Report_${new Date().toISOString().split("T")[0]}.csv`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Exported!");
      } else if (activeTab === "dues") {
        if (filteredDuesLogs.length === 0)
          return toast.info("No dues to export");
        const headers = [
          "Date",
          "Category",
          "Party Name",
          "Pending Due Amount",
        ];
        const rows = filteredDuesLogs.map((log) => {
          let dateStr = log.date
            ? `\t${new Date(log.date).toLocaleDateString("en-GB")}`
            : "-";
          return `${dateStr},"${log.payoutCategory || "Labour"}","${log.labourName}",${log.amountDue}`;
        });
        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute(
          "download",
          `Pending_Dues_Report_${new Date().toISOString().split("T")[0]}.csv`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Exported!");
      }
    } catch (error) {
      toast.error("Export failed");
    }
  };

  if (loading) return <Loader />;

  // Theme configuration based on active tab for professional UI
  const theme = {
    color:
      activeTab === "production"
        ? "emerald"
        : activeTab === "labour"
          ? "blue"
          : "rose",
    bgClass:
      activeTab === "production"
        ? "bg-emerald-500"
        : activeTab === "labour"
          ? "bg-blue-500"
          : "bg-rose-500",
    textClass:
      activeTab === "production"
        ? "text-emerald-500"
        : activeTab === "labour"
          ? "text-blue-500"
          : "text-rose-500",
    borderClass:
      activeTab === "production"
        ? "border-emerald-500/30 hover:border-emerald-500/60 focus:border-emerald-500"
        : activeTab === "labour"
          ? "border-blue-500/30 hover:border-blue-500/60 focus:border-blue-500"
          : "border-rose-500/30 hover:border-rose-500/60 focus:border-rose-500",
    focusRing:
      activeTab === "production"
        ? "focus:ring-emerald-500/20"
        : activeTab === "labour"
          ? "focus:ring-blue-500/20"
          : "focus:ring-rose-500/20",
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Production Ledger
        </h1>
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
              <AlertOctagon size={16} /> Wipe Database
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
          <Link to="/enterprise/production">
            <Button variant="primary" className="text-xs px-6 py-2.5 shadow-lg">
              + Log New Entry
            </Button>
          </Link>
        </div>
      </div>

      {/* STATS CARDS */}
      {activeTab === "production" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#050a08] to-[#020403] border border-emerald-900/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Factory size={80} className="text-emerald-500" />
            </div>
            <p className="text-emerald-100/50 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
              Total Output
            </p>
            <h3 className="text-3xl font-bold text-emerald-400 relative z-10">
              {totalOutput.toLocaleString()}{" "}
              <span className="text-sm text-emerald-100/40">Pcs</span>
            </h3>
          </div>
          <div className="p-6 rounded-2xl bg-[#050a08] border border-emerald-900/30">
            <div className="flex items-center gap-3 mb-2 text-emerald-400">
              <BarChart size={20} />
              <span className="font-bold">Total Batches</span>
            </div>
            <h3 className="text-2xl font-bold text-white">
              {filteredLogs.length}
            </h3>
          </div>
        </div>
      ) : activeTab === "labour" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#050a08] to-[#020403] border border-blue-900/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <IndianRupee size={80} className="text-blue-500" />
            </div>
            <p className="text-blue-100/50 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
              Total Paid Out
            </p>
            <h3 className="text-3xl font-bold text-blue-400 relative z-10">
              ₹ {totalPaidOut.toLocaleString()}{" "}
              <span className="text-sm text-blue-100/40">INR</span>
            </h3>
          </div>
          <div className="p-6 rounded-2xl bg-[#050a08] border border-blue-900/30">
            <div className="flex items-center gap-3 mb-2 text-blue-400">
              <Users size={20} />
              <span className="font-bold">Total Payout Records</span>
            </div>
            <h3 className="text-2xl font-bold text-white">
              {filteredLabourLogs.length}
            </h3>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#050a08] to-[#020403] border border-rose-900/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <AlertCircle size={80} className="text-rose-500" />
            </div>
            <p className="text-rose-100/50 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
              Total Pending Dues
            </p>
            <h3 className="text-4xl font-bold text-rose-400 relative z-10">
              ₹ {totalDue.toLocaleString()}
            </h3>
          </div>
        </div>
      )}

      {/* MAIN DATA SECTION */}
      <div className="bg-[#050a08] rounded-2xl border border-white/5 overflow-visible shadow-2xl transition-colors duration-500">
        {/* TABS & SEARCH BAR */}
        <div className="p-5 border-b border-white/5 bg-[#020403]/80 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5 rounded-t-2xl">
          <div className="flex gap-2 p-1.5 bg-black/60 rounded-xl border border-white/5 w-full sm:w-auto overflow-x-auto shadow-inner">
            <button
              onClick={() => setActiveTab("production")}
              className={`px-5 py-2 sm:py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 flex-1 sm:flex-none justify-center whitespace-nowrap ${activeTab === "production" ? "bg-emerald-500/15 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "text-gray-500 hover:text-emerald-200 hover:bg-white/5"}`}
            >
              <Factory size={14} /> Output
            </button>
            <button
              onClick={() => setActiveTab("labour")}
              className={`px-5 py-2 sm:py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 flex-1 sm:flex-none justify-center whitespace-nowrap ${activeTab === "labour" ? "bg-blue-500/15 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]" : "text-gray-500 hover:text-blue-200 hover:bg-white/5"}`}
            >
              <IndianRupee size={14} /> Payouts
            </button>
            <button
              onClick={() => setActiveTab("dues")}
              className={`px-5 py-2 sm:py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 flex-1 sm:flex-none justify-center whitespace-nowrap ${activeTab === "dues" ? "bg-rose-500/15 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]" : "text-gray-500 hover:text-rose-200 hover:bg-white/5"}`}
            >
              <AlertCircle size={14} /> Dues
            </button>
          </div>

          <div className="flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-end">
            <div className="relative flex-1 sm:w-72 group">
              <Search
                size={16}
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${searchTerm ? theme.textClass : "text-gray-500 group-hover:text-gray-400"}`}
              />
              <input
                type="text"
                placeholder={`Search ${activeTab === "production" ? "product" : "name or category"}...`}
                className={`w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 outline-none transition-all shadow-inner focus:ring-2 ${theme.focusRing} ${theme.borderClass}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="gap-2 text-xs font-bold tracking-widest border-white/10 py-2.5 bg-black/40 hover:bg-white/5"
              onClick={handleExport}
            >
              <Download size={16} /> Export
            </Button>
          </div>
        </div>

        {/* 🚀 PROFESSIONAL FILTRATION UI 🚀 */}
        <div className="p-4 border-b border-white/5 bg-[#050a08] flex flex-wrap items-center gap-4 relative z-20">
          <div
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${theme.textClass} px-3 py-1 border-r border-white/10 mr-1`}
          >
            <Filter size={16} /> Filters
            {activeFiltersCount > 0 && (
              <span className={`ml-1 px-1.5 rounded bg-white/10 text-white`}>
                {activeFiltersCount}
              </span>
            )}
          </div>

          {activeTab === "production" && (
            <>
              {/* Product Filter Wrapper */}
              <div className="relative group">
                <select
                  value={filterProduct}
                  onChange={(e) => setFilterProduct(e.target.value)}
                  className={`appearance-none bg-black/30 border border-white/10 rounded-xl pl-4 pr-10 py-2 text-xs font-medium text-gray-300 outline-none cursor-pointer transition-all focus:ring-2 ${theme.focusRing} ${theme.borderClass}`}
                >
                  <option value="All" className="bg-[#050a08] text-gray-300">
                    All Products
                  </option>
                  <optgroup
                    label="Bricks"
                    className="bg-[#020403] text-emerald-500 font-bold"
                  >
                    <option
                      value="Bricks (10 inch)"
                      className="text-gray-300 font-normal"
                    >
                      Bricks (10 inch)
                    </option>
                    <option
                      value="Bricks (9 inch)"
                      className="text-gray-300 font-normal"
                    >
                      Bricks (9 inch)
                    </option>
                    <option
                      value="Bricks (8 inch)"
                      className="text-gray-300 font-normal"
                    >
                      Bricks (8 inch)
                    </option>
                  </optgroup>
                  <optgroup
                    label="Paver Blocks"
                    className="bg-[#020403] text-emerald-500 font-bold"
                  >
                    <option
                      value="Zig Zag (60mm)"
                      className="text-gray-300 font-normal"
                    >
                      Zig Zag (60mm)
                    </option>
                    <option
                      value="Zig Zag (80mm)"
                      className="text-gray-300 font-normal"
                    >
                      Zig Zag (80mm)
                    </option>
                    <option
                      value="6-12 Brick (60mm)"
                      className="text-gray-300 font-normal"
                    >
                      6-12 Brick (60mm)
                    </option>
                    <option
                      value="6-12 Brick (80mm)"
                      className="text-gray-300 font-normal"
                    >
                      6-12 Brick (80mm)
                    </option>
                    <option
                      value="6/6 Brick (60mm)"
                      className="text-gray-300 font-normal"
                    >
                      6/6 Brick 60mm
                    </option>
                    <option
                      value="6/6 Brick (80mm)"
                      className="text-gray-300 font-normal"
                    >
                      6/6 Brick (80mm)
                    </option>
                  </optgroup>
                  <optgroup
                    label="Chequered Tiles"
                    className="bg-[#020403] text-emerald-500 font-bold"
                  >
                    <option
                      value="Hexagon"
                      className="text-gray-300 font-normal"
                    >
                      Hexagon
                    </option>
                    <option
                      value="Brick Design (9inch)"
                      className="text-gray-300 font-normal"
                    >
                      Brick Design (9inch)
                    </option>
                    <option
                      value="Curve Stone"
                      className="text-gray-300 font-normal"
                    >
                      Curve Stone
                    </option>
                    <option
                      value="Cover Block"
                      className="text-gray-300 font-normal"
                    >
                      Cover Block
                    </option>
                  </optgroup>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover:text-emerald-500 transition-colors"
                />
              </div>

              {/* Quantity Filter Wrapper */}
              <div className="relative group">
                <select
                  value={filterQuantity}
                  onChange={(e) => setFilterQuantity(e.target.value)}
                  className={`appearance-none bg-black/30 border border-white/10 rounded-xl pl-4 pr-10 py-2 text-xs font-medium text-gray-300 outline-none cursor-pointer transition-all focus:ring-2 ${theme.focusRing} ${theme.borderClass}`}
                >
                  <option value="All" className="bg-[#050a08]">
                    Any Quantity
                  </option>
                  <option value="Under5k" className="bg-[#050a08]">
                    &lt; 5,000 pcs
                  </option>
                  <option value="5k-15k" className="bg-[#050a08]">
                    5k - 15k pcs
                  </option>
                  <option value="Above15k" className="bg-[#050a08]">
                    &gt; 15,000 pcs
                  </option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover:text-emerald-500 transition-colors"
                />
              </div>
            </>
          )}

          {/* Preset Date Filter */}
          <div className="relative group">
            <select
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                if (e.target.value !== "All") setFilterExactDate("");
              }}
              className={`appearance-none bg-black/30 border border-white/10 rounded-xl pl-4 pr-10 py-2 text-xs font-medium text-gray-300 outline-none cursor-pointer transition-all focus:ring-2 ${theme.focusRing} ${theme.borderClass}`}
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover:text-white transition-colors"
            />
          </div>

          {/* Exact Date Filter */}
          <div className="relative group flex items-center">
            <div
              className={`absolute left-3 flex items-center justify-center text-gray-500 pointer-events-none transition-colors ${filterExactDate ? theme.textClass : ""}`}
            >
              <Calendar size={14} />
            </div>
            <input
              type="date"
              value={filterExactDate}
              onChange={(e) => {
                setFilterExactDate(e.target.value);
                if (e.target.value) setFilterDate("All");
              }}
              style={{ colorScheme: "dark" }}
              className={`appearance-none bg-black/30 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs font-medium ${filterExactDate ? "text-white" : "text-gray-400"} outline-none cursor-pointer transition-all focus:ring-2 ${theme.focusRing} ${theme.borderClass}`}
            />
          </div>

          {/* Clear Filters Button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                setFilterProduct("All");
                setFilterQuantity("All");
                setFilterDate("All");
                setFilterExactDate("");
                setSearchTerm("");
              }}
              className="text-xs font-bold text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ml-auto md:ml-2"
            >
              <X size={14} /> Clear All
            </button>
          )}
        </div>

        {/* DATA TABLES SECTION */}
        <div className="overflow-x-auto pb-4 custom-scrollbar min-h-[400px]">
          {/* PRODUCTION TAB */}
          {activeTab === "production" && (
            <table className="w-full text-left min-w-[600px] animate-in fade-in duration-300">
              <thead className="bg-[#020403] text-emerald-100/40 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-4 md:pl-6">Date</th>
                  <th className="p-4">Item Name</th>
                  <th className="p-4">Size</th>
                  <th className="p-4 text-right">Output (Pcs)</th>
                  <th className="p-4 text-right md:pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/20 text-sm">
                {filteredLogs.map((log) => {
                  const { name, size } = parseProduct(log.productName);

                  const hasEdits =
                    log.editHistory && log.editHistory.length > 0;
                  const historyCount = hasEdits ? log.editHistory.length : 0;
                  const latestLog = hasEdits
                    ? log.editHistory[log.editHistory.length - 1]
                    : null;

                  return (
                    <tr
                      key={log._id}
                      className="hover:bg-emerald-900/10 transition-colors group"
                    >
                      <td className="p-4 md:pl-6 align-middle">
                        <div className="text-emerald-100/70 font-mono text-xs mb-2">
                          {log.date
                            ? new Date(log.date).toLocaleDateString("en-GB")
                            : "N/A"}
                        </div>
                        {hasEdits && (
                          <button
                            onClick={() =>
                              setLogModalInfo({
                                isOpen: true,
                                data: log,
                                tabType: "production",
                              })
                            }
                            className="mt-2 flex flex-col items-start bg-[#020403] border border-emerald-900/30 rounded-lg py-1.5 px-2.5 hover:border-emerald-500/50 transition-colors w-max group/btn"
                          >
                            <div className="flex items-center gap-1.5">
                              <History
                                size={12}
                                className="text-emerald-500 group-hover/btn:-rotate-12 transition-transform"
                              />
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                                {latestLog.role || "ADMIN"}
                              </span>
                              {historyCount > 1 && (
                                <span className="bg-emerald-900/40 text-emerald-400 px-1.5 py-0.5 rounded text-[8px] font-bold ml-1">
                                  +{historyCount - 1} MORE
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-emerald-100/40 font-mono mt-1 pl-[18px]">
                              {formatLogDate(latestLog.at)}
                            </div>
                          </button>
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest inline-flex items-center gap-2 w-max">
                          <Layers size={12} /> {name}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-emerald-100 font-medium tracking-wide">
                        {size}
                      </td>
                      <td className="p-4 text-right align-middle font-bold text-emerald-400 tracking-wider">
                        {Number(log.quantity).toLocaleString()}
                      </td>
                      <td className="p-4 md:pr-6 text-right align-middle overflow-visible">
                        <div className="flex justify-end gap-2 items-center relative">
                          <Link
                            to={`/enterprise/production/edit/${log._id}`}
                            className="p-2 text-emerald-100/40 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          >
                            <Edit size={16} />
                          </Link>
                          <button
                            onClick={() =>
                              isManager
                                ? handleDisabledClick(log._id)
                                : handleDeleteClick(log, "production")
                            }
                            className={`p-2 rounded-lg transition-colors ${isManager ? "text-emerald-100/20 opacity-50 cursor-not-allowed" : "text-emerald-100/40 hover:text-red-400 hover:bg-red-500/10"}`}
                          >
                            <Trash2 size={16} />
                          </button>
                          {warningTooltip === log._id && (
                            <div className="absolute bottom-full right-0 mb-2 z-[9999] bg-[#050a08] border border-red-500/30 text-red-400 text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                              🚫 Access Denied
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-10 text-center text-emerald-100/30 italic"
                    >
                      No production logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* LABOUR PAYOUTS TAB */}
          {activeTab === "labour" && (
            <table className="w-full text-left min-w-[600px] animate-in fade-in duration-300">
              <thead className="bg-[#020403] text-blue-100/40 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-4 md:pl-6">Date</th>
                  <th className="p-4">Party Name</th>
                  <th className="p-4 text-right">Cost</th>
                  <th className="p-4 text-right">Paid</th>
                  <th className="p-4 text-right">Due</th>
                  <th className="p-4 text-right md:pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/20 text-sm">
                {filteredLabourLogs.map((log) => {
                  const hasEdits =
                    log.editHistory && log.editHistory.length > 0;
                  const historyCount = hasEdits ? log.editHistory.length : 0;
                  const latestLog = hasEdits
                    ? log.editHistory[log.editHistory.length - 1]
                    : null;

                  return (
                    <tr
                      key={log._id}
                      className="hover:bg-blue-900/10 transition-colors group"
                    >
                      <td className="p-4 md:pl-6 align-middle">
                        <div className="text-blue-100/70 font-mono text-xs mb-2">
                          {log.date
                            ? new Date(log.date).toLocaleDateString("en-GB")
                            : "N/A"}
                        </div>
                        {hasEdits && (
                          <button
                            onClick={() =>
                              setLogModalInfo({
                                isOpen: true,
                                data: log,
                                tabType: "labour",
                              })
                            }
                            className="mt-2 flex flex-col items-start bg-[#020403] border border-blue-900/30 rounded-lg py-1.5 px-2.5 hover:border-blue-500/50 transition-colors w-max group/btn"
                          >
                            <div className="flex items-center gap-1.5">
                              <History
                                size={12}
                                className="text-blue-500 group-hover/btn:-rotate-12 transition-transform"
                              />
                              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                                {latestLog.role || "ADMIN"}
                              </span>
                              {historyCount > 1 && (
                                <span className="bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded text-[8px] font-bold ml-1">
                                  +{historyCount - 1} MORE
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-blue-100/40 font-mono mt-1 pl-[18px]">
                              {formatLogDate(latestLog.at)}
                            </div>
                          </button>
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        <div className="font-bold text-blue-100/90 flex items-center gap-2 whitespace-nowrap tracking-wide">
                          <Users size={12} className="text-blue-500/50" />{" "}
                          {log.labourName}
                        </div>
                        <div className="text-[9px] text-blue-400 mt-1.5 uppercase tracking-widest font-bold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded w-max">
                          {log.payoutCategory || "Labour"}
                        </div>
                      </td>
                      <td className="p-4 align-middle text-right font-mono text-blue-100/60">
                        ₹ {Number(log.cost || 0).toLocaleString()}
                      </td>
                      <td className="p-4 align-middle text-right font-mono text-emerald-400 font-bold">
                        ₹ {Number(log.amountPaid || 0).toLocaleString()}
                      </td>
                      <td className="p-4 align-middle text-right font-mono font-bold text-rose-400">
                        ₹ {Number(log.amountDue || 0).toLocaleString()}
                      </td>
                      <td className="p-4 md:pr-6 text-right align-middle overflow-visible">
                        <div className="flex justify-end gap-2 items-center relative">
                          <Link
                            to={`/enterprise/labour/edit/${log._id}`}
                            className="p-2 text-blue-100/40 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          >
                            <Edit size={16} />
                          </Link>
                          <button
                            onClick={() =>
                              isManager
                                ? handleDisabledClick(log._id)
                                : handleDeleteClick(log, "labour")
                            }
                            className={`p-2 rounded-lg transition-colors ${isManager ? "text-blue-100/20 opacity-50 cursor-not-allowed" : "text-blue-100/40 hover:text-red-400 hover:bg-red-500/10"}`}
                          >
                            <Trash2 size={16} />
                          </button>
                          {warningTooltip === log._id && (
                            <div className="absolute bottom-full right-0 mb-2 z-[9999] bg-[#050a08] border border-red-500/30 text-red-400 text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                              🚫 Access Denied
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredLabourLogs.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-16 text-center">
                      <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mx-auto mb-4 shadow-inner">
                        <IndianRupee size={28} />
                      </div>
                      <h3 className="text-white font-bold text-lg mb-1">
                        No Payout Records
                      </h3>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* DUES TAB */}
          {activeTab === "dues" && (
            <table className="w-full text-left min-w-[600px] animate-in fade-in duration-300">
              <thead className="bg-[#020403] text-rose-100/40 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-4 md:pl-6">Date</th>
                  <th className="p-4">Party Name</th>
                  <th className="p-4 text-right md:pr-6">Pending Due Amount</th>
                  <th className="p-4 text-right md:pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-900/10 text-sm">
                {filteredDuesLogs.map((log) => {
                  const hasEdits =
                    log.editHistory && log.editHistory.length > 0;
                  const historyCount = hasEdits ? log.editHistory.length : 0;
                  const latestLog = hasEdits
                    ? log.editHistory[log.editHistory.length - 1]
                    : null;

                  return (
                    <tr
                      key={log._id}
                      className="hover:bg-rose-900/10 transition-colors group"
                    >
                      <td className="p-4 md:pl-6 align-middle">
                        <div className="text-rose-100/70 font-mono text-xs mb-2">
                          {log.date
                            ? new Date(log.date).toLocaleDateString("en-GB")
                            : "N/A"}
                        </div>
                        {hasEdits && (
                          <button
                            onClick={() =>
                              setLogModalInfo({
                                isOpen: true,
                                data: log,
                                tabType: "dues",
                              })
                            }
                            className="mt-2 flex flex-col items-start bg-[#020403] border border-rose-900/30 rounded-lg py-1.5 px-2.5 hover:border-rose-500/50 transition-colors w-max group/btn"
                          >
                            <div className="flex items-center gap-1.5">
                              <History
                                size={12}
                                className="text-rose-500 group-hover/btn:-rotate-12 transition-transform"
                              />
                              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">
                                {latestLog.role || "ADMIN"}
                              </span>
                              {historyCount > 1 && (
                                <span className="bg-rose-900/40 text-rose-400 px-1.5 py-0.5 rounded text-[8px] font-bold ml-1">
                                  +{historyCount - 1} MORE
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-rose-100/40 font-mono mt-1 pl-[18px]">
                              {formatLogDate(latestLog.at)}
                            </div>
                          </button>
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        <div className="font-bold text-rose-100/90 flex items-center gap-2 whitespace-nowrap tracking-wide">
                          <AlertCircle size={14} className="text-rose-500/50" />{" "}
                          {log.labourName}
                        </div>
                        <div className="text-[9px] text-rose-400 mt-1.5 uppercase tracking-widest font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded w-max">
                          {log.payoutCategory || "Labour"}
                        </div>
                      </td>
                      <td className="p-4 text-right md:pr-6 align-middle font-mono font-bold text-rose-400 text-lg">
                        ₹ {Number(log.amountDue || 0).toLocaleString()}
                      </td>
                      <td className="p-4 md:pr-6 text-right align-middle overflow-visible">
                        <div className="flex justify-end gap-2 items-center relative">
                          <Link
                            to={`/enterprise/labour/edit/${log._id}`}
                            className="p-2 text-rose-100/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            <Edit size={16} />
                          </Link>
                          <button
                            onClick={() =>
                              isManager
                                ? handleDisabledClick(log._id)
                                : handleDeleteClick(log, "labour")
                            }
                            className={`p-2 rounded-lg transition-colors ${isManager ? "text-rose-100/20 opacity-50 cursor-not-allowed" : "text-rose-100/40 hover:text-red-400 hover:bg-red-500/10"}`}
                          >
                            <Trash2 size={16} />
                          </button>
                          {warningTooltip === log._id && (
                            <div className="absolute bottom-full right-0 mb-2 z-[9999] bg-[#050a08] border border-red-500/30 text-red-400 text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                              🚫 Access Denied
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredDuesLogs.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-16 text-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto mb-4 shadow-inner">
                        <AlertCircle size={28} />
                      </div>
                      <h3 className="text-white font-bold text-lg mb-1">
                        No Pending Dues!
                      </h3>
                      <p className="text-emerald-100/40 text-sm max-w-sm mx-auto">
                        All accounts are settled. Great job!
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 🚨 DELETE CONFIRMATION MODAL 🚨 */}
      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Record"
        message={`Are you sure you want to permanently delete this ${deleteType === "production" ? "production log" : "payout record"}?`}
        confirmText="Delete"
        isDestructive={true} // 👈 This prop makes it Red!
      />

      {/* 🛑 SECURE WIPE DATA MODAL 🛑 */}
      {isDeleteAllOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => !wiping && setIsDeleteAllOpen(false)}
          />
          <div className="bg-[#050a08] border border-red-900/50 shadow-[0_0_40px_rgba(220,38,38,0.15)] rounded-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col p-6 sm:p-8">
            <div className="flex items-center gap-3 text-red-500 mb-6">
              <AlertOctagon size={28} />
              <h2 className="text-xl font-bold tracking-wide">
                Wipe Production Database
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
                    a complete CSV backup of all your current production and
                    payout records.
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
              production and payout records. Please enter your Admin password to
              confirm.
            </p>

            <div className="relative mb-8">
              <input
                type={showPassword ? "text" : "password"}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your admin password..."
                className="w-full bg-[#020403] border border-red-900/30 focus:border-red-500/50 rounded-xl px-4 py-3 text-red-100 placeholder:text-red-100/20 outline-none transition-all"
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

      {/* 🚀 MULTIPLE LOG HISTORY MODAL UI */}
      {logModalInfo.isOpen &&
        logModalInfo.data &&
        (() => {
          const isProd = logModalInfo.tabType === "production";
          const isLab = logModalInfo.tabType === "labour";

          // Dynamic theme colors based on active tab
          const modalBorder = isProd
            ? "border-emerald-900/30"
            : isLab
              ? "border-blue-900/30"
              : "border-rose-900/30";
          const iconColor = isProd
            ? "text-emerald-500"
            : isLab
              ? "text-blue-500"
              : "text-rose-500";
          const titleText = isProd
            ? "text-emerald-400"
            : isLab
              ? "text-blue-400"
              : "text-rose-400";
          const borderColor = isProd
            ? "border-emerald-900/20"
            : isLab
              ? "border-blue-900/20"
              : "border-rose-900/20";

          const activeBg = isProd
            ? "bg-emerald-900/40 border-emerald-500/30 text-emerald-400"
            : isLab
              ? "bg-blue-900/40 border-blue-500/30 text-blue-400"
              : "bg-rose-900/40 border-rose-500/30 text-rose-400";
          const inactiveBg = isProd
            ? "bg-emerald-900/10 border-emerald-900/20 text-emerald-100/40"
            : isLab
              ? "bg-blue-900/10 border-blue-900/20 text-blue-100/40"
              : "bg-rose-900/10 border-rose-900/20 text-rose-100/40";
          const badgeBg = isProd
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
            : isLab
              ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
              : "bg-rose-500/10 border-rose-500/20 text-rose-500";
          const activeLine = isProd
            ? "bg-emerald-500"
            : isLab
              ? "bg-blue-500"
              : "bg-rose-500";

          const logsList = logModalInfo.data.editHistory
            ? [...logModalInfo.data.editHistory].reverse()
            : [];

          const titleName = isProd
            ? logModalInfo.data.productName
            : logModalInfo.data.labourName;

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div
                className="absolute inset-0"
                onClick={() =>
                  setLogModalInfo({
                    isOpen: false,
                    data: null,
                    tabType: "production",
                  })
                }
              />
              <div
                className={`bg-[#050a08] border ${modalBorder} rounded-2xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]`}
              >
                <div
                  className={`flex items-center justify-between p-5 border-b ${borderColor} bg-[#020403]/50 shrink-0`}
                >
                  <div className="flex items-center gap-2 text-white font-bold tracking-wide text-sm">
                    <History size={16} className={iconColor} />
                    Log History:{" "}
                    <span className={`${titleText} font-normal`}>
                      {titleName}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setLogModalInfo({
                        isOpen: false,
                        data: null,
                        tabType: "production",
                      })
                    }
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                  {logsList.map((log, index) => (
                    <div
                      key={index}
                      className={`bg-[#020403] border ${borderColor} rounded-xl p-4 flex items-center justify-between relative overflow-hidden`}
                    >
                      {index === 0 && (
                        <div
                          className={`absolute left-0 top-0 w-1 h-full ${activeLine}`}
                        ></div>
                      )}

                      <div className="flex items-center gap-4 pl-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${index === 0 ? activeBg : inactiveBg}`}
                        >
                          {(log.role || "A")[0].toUpperCase()}
                        </div>
                        <div>
                          <h4
                            className={`font-bold tracking-widest uppercase text-sm ${index === 0 ? "text-white" : "text-gray-500"}`}
                          >
                            {log.role || "ADMIN"}
                          </h4>
                          <p className="text-gray-500 text-[10px] mt-0.5 font-mono">
                            {log.email || "admin@system.com"}
                          </p>
                          <p
                            className={`text-[10px] font-mono mt-1.5 ${index === 0 ? titleText : "text-gray-600"}`}
                          >
                            {formatLogDateFull(log.at)}
                          </p>
                        </div>
                      </div>

                      {index === 0 && (
                        <div
                          className={`${badgeBg} text-[10px] font-bold px-3 py-1 rounded tracking-widest uppercase border`}
                        >
                          LATEST
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
};

export default ProductionReport;
