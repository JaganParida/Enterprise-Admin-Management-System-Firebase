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
  RefreshCcw,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { Link, useLocation } from "react-router-dom";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const ProductionReport = () => {
  const location = useLocation();
  const { toast } = useUI();
  const { admin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [labourLogs, setLabourLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("production");

  // 🔥 THEME HOOK
  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const theme = {
    primaryText: isTransport ? "text-cyan-400" : "text-indigo-400",
    primaryTextMuted: isTransport ? "text-cyan-500" : "text-indigo-500",
    primaryBg: isTransport ? "bg-cyan-500/10" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-cyan-500/20" : "border-indigo-500/20",
    primaryHoverBorder: isTransport
      ? "hover:border-cyan-500/30"
      : "hover:border-indigo-500/30",
    primaryHoverBg: isTransport
      ? "hover:bg-cyan-500/20"
      : "hover:bg-indigo-500/20",
    primaryFocus: isTransport
      ? "focus:border-cyan-500/50 focus:ring-cyan-500/50"
      : "focus:border-indigo-500/50 focus:ring-indigo-500/50",
    primaryTabBg: isTransport ? "bg-cyan-600" : "bg-indigo-600",
    indicatorLine: isTransport ? "bg-cyan-500" : "bg-indigo-500",
  };

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

  const handleWipeAll = async () => {
    if (isManager || !deletePassword)
      return toast.error("Verification failed.");

    setWiping(true);
    try {
      const adminEmail = admin?.data?.email || admin?.email;
      await productionService.deleteAllProduction({
        password: deletePassword,
        email: adminEmail,
      });
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Production Ledger
          </h1>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
          {/* PILL TABS */}
          <div className="w-full md:w-auto bg-[#09090B] p-1.5 rounded-2xl md:rounded-full border border-zinc-800/60 grid grid-cols-3 md:flex md:items-center gap-1">
            <button
              onClick={() => setActiveTab("production")}
              className={`col-span-1 px-2 md:px-8 py-2 md:py-2 text-[10px] sm:text-xs md:text-sm font-bold rounded-xl md:rounded-full transition-all truncate tracking-wide ${
                activeTab === "production"
                  ? `${theme.primaryTabBg} text-white`
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
              }`}
            >
              Output
            </button>
            <button
              onClick={() => setActiveTab("labour")}
              className={`col-span-1 px-2 md:px-8 py-2 md:py-2 text-[10px] sm:text-xs md:text-sm font-bold rounded-xl md:rounded-full transition-all truncate tracking-wide ${
                activeTab === "labour"
                  ? `${theme.primaryTabBg} text-white`
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
              }`}
            >
              Payouts
            </button>
            <button
              onClick={() => setActiveTab("dues")}
              className={`col-span-1 px-2 md:px-8 py-2 md:py-2 text-[10px] sm:text-xs md:text-sm font-bold rounded-xl md:rounded-full transition-all truncate tracking-wide ${
                activeTab === "dues"
                  ? `${theme.primaryTabBg} text-white`
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
              }`}
            >
              Dues
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full md:w-auto ml-auto md:ml-0">
            <div className="relative w-full md:w-auto">
              <Button
                variant="module"
                onClick={() =>
                  isManager
                    ? handleDisabledClick("wipe-all")
                    : setIsDeleteAllOpen(true)
                }
                className={`h-11 px-5 w-full md:w-auto border-rose-500/40 text-rose-400 bg-rose-950/30 hover:bg-rose-900/40 hover:border-rose-400/60 ${
                  isManager ? "opacity-50 !cursor-not-allowed" : ""
                }`}
              >
                <AlertOctagon size={16} /> Wipe DB
              </Button>
              {warningTooltip === "wipe-all" && (
                <div className="absolute top-full mt-2 right-0 md:left-1/2 md:-translate-x-1/2 z-[100] animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-[#09090B] border border-red-500/30 text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                    <span className="bg-red-500/20 p-1 rounded-md text-[10px] leading-none">
                      🚫
                    </span>{" "}
                    Admin Access Required
                  </div>
                </div>
              )}
            </div>
            <Link
              to={
                isTransport
                  ? "/transportation/production"
                  : "/enterprise/production"
              }
              className="w-full md:w-auto"
            >
              <Button
                variant="primary"
                className="w-full md:w-auto text-xs px-6 h-11 rounded-xl shadow-lg flex items-center justify-center text-white"
              >
                + Log New Entry
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      {activeTab === "production" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
          <div
            className={`p-6 rounded-2xl bg-[#09090B] border border-zinc-800/60 relative overflow-hidden group ${theme.primaryHoverBorder} transition-all`}
          >
            <div
              className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${theme.primaryTextMuted}`}
            >
              <Factory size={80} />
            </div>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
              Total Output
            </p>
            <h3 className="text-3xl font-bold text-white relative z-10">
              {totalOutput.toLocaleString()}{" "}
              <span className="text-sm text-zinc-500">Pcs</span>
            </h3>
          </div>
          <div
            className={`p-6 rounded-2xl bg-[#09090B] border border-zinc-800/60 ${theme.primaryHoverBorder} transition-all`}
          >
            <div
              className={`flex items-center gap-3 mb-2 ${theme.primaryText}`}
            >
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
          <div className="p-6 rounded-2xl bg-[#09090B] border border-zinc-800/60 relative overflow-hidden group hover:border-blue-500/30 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <IndianRupee size={80} className="text-blue-500" />
            </div>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
              Total Paid Out
            </p>
            <h3 className="text-3xl font-bold text-white relative z-10">
              ₹ {totalPaidOut.toLocaleString()}{" "}
              <span className="text-sm text-zinc-500">INR</span>
            </h3>
          </div>
          <div className="p-6 rounded-2xl bg-[#09090B] border border-zinc-800/60 hover:border-blue-500/30 transition-all">
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
          <div className="p-6 rounded-2xl bg-[#09090B] border border-zinc-800/60 relative overflow-hidden group hover:border-rose-500/30 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <AlertCircle size={80} className="text-rose-500" />
            </div>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
              Total Pending Dues
            </p>
            <h3 className="text-4xl font-bold text-rose-400 relative z-10">
              ₹ {totalDue.toLocaleString()}
            </h3>
          </div>
        </div>
      )}

      {/* MAIN DATA SECTION */}
      <div className="bg-[#09090B] rounded-2xl border border-zinc-800/60 overflow-visible transition-colors duration-500">
        {/* SEARCH & EXPORT BAR */}
        <div className="p-5 border-b border-zinc-800/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
          <div className="relative w-full sm:max-w-md group">
            <Search
              size={16}
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${searchTerm ? theme.primaryText : "text-zinc-500 group-hover:text-zinc-400"}`}
            />
            <input
              type="text"
              placeholder={`Search ${activeTab === "production" ? "product" : "name or category"}...`}
              className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 outline-none transition-all ${theme.primaryFocus}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="h-11 px-5 gap-2 w-full sm:w-auto rounded-xl border-zinc-800 text-zinc-300 hover:bg-zinc-800/50 hover:text-white hover:border-zinc-700 transition-colors text-xs"
              onClick={handleExport}
            >
              <Download size={16} /> Export View
            </Button>
          </div>
        </div>

        {/* FILTERS */}
        <div className="p-4 border-b border-zinc-800/60 bg-zinc-900/20 flex flex-wrap items-center gap-4 relative z-20">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 px-3 py-1 border-r border-zinc-800 mr-1">
            <Filter size={16} /> Filters
            {activeFiltersCount > 0 && (
              <span
                className={`ml-1 px-1.5 rounded border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
              >
                {activeFiltersCount}
              </span>
            )}
          </div>

          {activeTab === "production" && (
            <>
              <div className="relative group">
                <select
                  value={filterProduct}
                  onChange={(e) => setFilterProduct(e.target.value)}
                  className={`appearance-none bg-transparent border border-zinc-800 rounded-full pl-4 pr-10 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
                >
                  <option value="All" className="bg-[#09090B] text-zinc-300">
                    All Products
                  </option>
                  <optgroup
                    label="Bricks"
                    className={`bg-[#09090B] font-bold ${theme.primaryText}`}
                  >
                    <option
                      value="Bricks (10 inch)"
                      className="text-zinc-300 font-normal"
                    >
                      Bricks (10 inch)
                    </option>
                    <option
                      value="Bricks (9 inch)"
                      className="text-zinc-300 font-normal"
                    >
                      Bricks (9 inch)
                    </option>
                    <option
                      value="Bricks (8 inch)"
                      className="text-zinc-300 font-normal"
                    >
                      Bricks (8 inch)
                    </option>
                  </optgroup>
                  <optgroup
                    label="Paver Blocks"
                    className={`bg-[#09090B] font-bold ${theme.primaryText}`}
                  >
                    <option
                      value="Zig Zag (60mm)"
                      className="text-zinc-300 font-normal"
                    >
                      Zig Zag (60mm)
                    </option>
                    <option
                      value="Zig Zag (80mm)"
                      className="text-zinc-300 font-normal"
                    >
                      Zig Zag (80mm)
                    </option>
                    <option
                      value="6-12 Brick (60mm)"
                      className="text-zinc-300 font-normal"
                    >
                      6-12 Brick (60mm)
                    </option>
                    <option
                      value="6-12 Brick (80mm)"
                      className="text-zinc-300 font-normal"
                    >
                      6-12 Brick (80mm)
                    </option>
                    <option
                      value="6/6 Brick (60mm)"
                      className="text-zinc-300 font-normal"
                    >
                      6/6 Brick 60mm
                    </option>
                    <option
                      value="6/6 Brick (80mm)"
                      className="text-zinc-300 font-normal"
                    >
                      6/6 Brick (80mm)
                    </option>
                  </optgroup>
                  <optgroup
                    label="Chequered Tiles"
                    className={`bg-[#09090B] font-bold ${theme.primaryText}`}
                  >
                    <option
                      value="Hexagon"
                      className="text-zinc-300 font-normal"
                    >
                      Hexagon
                    </option>
                    <option
                      value="Brick Design (9inch)"
                      className="text-zinc-300 font-normal"
                    >
                      Brick Design (9inch)
                    </option>
                    <option
                      value="Curve Stone"
                      className="text-zinc-300 font-normal"
                    >
                      Curve Stone
                    </option>
                    <option
                      value="Cover Block"
                      className="text-zinc-300 font-normal"
                    >
                      Cover Block
                    </option>
                  </optgroup>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:text-zinc-400"
                />
              </div>

              <div className="relative group">
                <select
                  value={filterQuantity}
                  onChange={(e) => setFilterQuantity(e.target.value)}
                  className={`appearance-none bg-transparent border border-zinc-800 rounded-full pl-4 pr-10 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
                >
                  <option value="All" className="bg-[#09090B]">
                    Any Quantity
                  </option>
                  <option value="Under5k" className="bg-[#09090B]">
                    &lt; 5,000 pcs
                  </option>
                  <option value="5k-15k" className="bg-[#09090B]">
                    5k - 15k pcs
                  </option>
                  <option value="Above15k" className="bg-[#09090B]">
                    &gt; 15,000 pcs
                  </option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:text-zinc-400"
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
              className={`appearance-none bg-transparent border border-zinc-800 rounded-full pl-4 pr-10 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
            >
              <option value="All" className="bg-[#09090B]">
                Timeline: All
              </option>
              <option value="Today" className="bg-[#09090B]">
                Today
              </option>
              <option value="Last7Days" className="bg-[#09090B]">
                Last 7 Days
              </option>
              <option value="ThisMonth" className="bg-[#09090B]">
                This Month
              </option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:text-zinc-400"
            />
          </div>

          {/* Exact Date Filter */}
          <div className="relative group flex items-center">
            <div
              className={`absolute left-3 flex items-center justify-center pointer-events-none transition-colors ${filterExactDate ? theme.primaryText : "text-zinc-500"}`}
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
              className={`appearance-none bg-transparent border rounded-full pl-9 pr-4 py-1.5 text-xs font-medium outline-none cursor-pointer transition-all ${theme.primaryFocus} ${filterExactDate ? `${theme.primaryText} ${theme.primaryBg} ${theme.primaryBorder}` : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"}`}
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
              className="text-xs font-bold text-zinc-500 hover:text-white underline underline-offset-2 flex items-center gap-1.5 ml-auto md:ml-2 transition-colors"
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
              <thead className="bg-[#09090B] text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-800/60">
                <tr>
                  <th className="p-4 md:pl-6">Date</th>
                  <th className="p-4">Item Name</th>
                  <th className="p-4">Size</th>
                  <th className="p-4 text-right">Output (Pcs)</th>
                  <th className="p-4 text-right md:pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
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
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      <td className="p-4 md:pl-6 align-middle">
                        <div className="text-zinc-400 font-mono text-xs mb-2">
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
                            className="mt-2 flex flex-col items-start bg-zinc-800/50 border border-zinc-700/50 rounded-lg py-1.5 px-2.5 hover:bg-zinc-800 transition-colors w-max group/btn"
                          >
                            <div className="flex items-center gap-1.5">
                              <History
                                size={12}
                                className="text-zinc-400 group-hover/btn:-rotate-12 transition-transform"
                              />
                              <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                                {latestLog.role || "ADMIN"}
                              </span>
                              {historyCount > 1 && (
                                <span className="bg-zinc-700/50 text-zinc-300 px-1.5 py-0.5 rounded text-[8px] font-bold ml-1">
                                  +{historyCount - 1} MORE
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono mt-1 pl-[18px]">
                              {formatLogDate(latestLog.at)}
                            </div>
                          </button>
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        <span
                          className={`${theme.primaryBg} border ${theme.primaryBorder} ${theme.primaryText} px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest inline-flex items-center gap-2 w-max`}
                        >
                          <Layers size={12} /> {name}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-zinc-300 font-medium tracking-wide">
                        {size}
                      </td>
                      <td className="p-4 text-right align-middle font-bold text-white tracking-wider">
                        {Number(log.quantity).toLocaleString()}
                      </td>
                      <td className="p-4 md:pr-6 text-right align-middle overflow-visible">
                        <div className="flex justify-end gap-2 items-center relative">
                          <Link
                            to={`${isTransport ? `/transportation/production/edit/${log._id}` : `/enterprise/production/edit/${log._id}`}`}
                            className={`p-2 text-zinc-500 hover:${theme.primaryText} ${theme.primaryHoverBg} rounded-lg transition-colors`}
                          >
                            <Edit size={16} />
                          </Link>
                          <button
                            onClick={() =>
                              isManager
                                ? handleDisabledClick(log._id)
                                : handleDeleteClick(log, "production")
                            }
                            className={`p-2 rounded-lg transition-colors ${
                              isManager
                                ? "text-zinc-600 opacity-50 cursor-not-allowed"
                                : "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                            }`}
                          >
                            <Trash2 size={16} />
                          </button>
                          {warningTooltip === log._id && (
                            <div className="absolute bottom-full right-0 mb-2 z-[9999] bg-[#09090B] border border-red-500/30 text-red-400 text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
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
                      className="p-10 text-center text-zinc-500 italic"
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
              <thead className="bg-[#09090B] text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-800/60">
                <tr>
                  <th className="p-4 md:pl-6">Date</th>
                  <th className="p-4">Party Name</th>
                  <th className="p-4 text-right">Cost</th>
                  <th className="p-4 text-right">Paid</th>
                  <th className="p-4 text-right">Due</th>
                  <th className="p-4 text-right md:pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
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
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      <td className="p-4 md:pl-6 align-middle">
                        <div className="text-zinc-400 font-mono text-xs mb-2">
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
                            className="mt-2 flex flex-col items-start bg-zinc-800/50 border border-zinc-700/50 rounded-lg py-1.5 px-2.5 hover:bg-zinc-800 transition-colors w-max group/btn"
                          >
                            <div className="flex items-center gap-1.5">
                              <History
                                size={12}
                                className="text-zinc-400 group-hover/btn:-rotate-12 transition-transform"
                              />
                              <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                                {latestLog.role || "ADMIN"}
                              </span>
                              {historyCount > 1 && (
                                <span className="bg-zinc-700/50 text-zinc-300 px-1.5 py-0.5 rounded text-[8px] font-bold ml-1">
                                  +{historyCount - 1} MORE
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono mt-1 pl-[18px]">
                              {formatLogDate(latestLog.at)}
                            </div>
                          </button>
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        <div className="font-bold text-zinc-100 flex items-center gap-2 whitespace-nowrap tracking-wide">
                          <Users size={12} className="text-zinc-500" />{" "}
                          {log.labourName}
                        </div>
                        <div
                          className={`text-[9px] ${theme.primaryText} mt-1.5 uppercase tracking-widest font-bold ${theme.primaryBg} border ${theme.primaryBorder} px-2 py-0.5 rounded w-max`}
                        >
                          {log.payoutCategory || "Labour"}
                        </div>
                      </td>
                      <td className="p-4 align-middle text-right font-mono text-zinc-400">
                        ₹ {Number(log.cost || 0).toLocaleString()}
                      </td>
                      <td className="p-4 align-middle text-right font-mono text-white font-bold">
                        ₹ {Number(log.amountPaid || 0).toLocaleString()}
                      </td>
                      <td className="p-4 align-middle text-right font-mono font-bold text-rose-400">
                        ₹ {Number(log.amountDue || 0).toLocaleString()}
                      </td>
                      <td className="p-4 md:pr-6 text-right align-middle overflow-visible">
                        <div className="flex justify-end gap-2 items-center relative">
                          <Link
                            to={`${isTransport ? `/transportation/labour/edit/${log._id}` : `/enterprise/labour/edit/${log._id}`}`}
                            className={`p-2 text-zinc-500 hover:${theme.primaryText} ${theme.primaryHoverBg} rounded-lg transition-colors`}
                          >
                            <Edit size={16} />
                          </Link>
                          <button
                            onClick={() =>
                              isManager
                                ? handleDisabledClick(log._id)
                                : handleDeleteClick(log, "labour")
                            }
                            className={`p-2 rounded-lg transition-colors ${
                              isManager
                                ? "text-zinc-600 opacity-50 cursor-not-allowed"
                                : "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                            }`}
                          >
                            <Trash2 size={16} />
                          </button>
                          {warningTooltip === log._id && (
                            <div className="absolute bottom-full right-0 mb-2 z-[9999] bg-[#09090B] border border-red-500/30 text-red-400 text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
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
                      <div
                        className={`w-16 h-16 rounded-full bg-zinc-800/50 border border-zinc-800 flex items-center justify-center text-zinc-500 mx-auto mb-4`}
                      >
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
              <thead className="bg-[#09090B] text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-800/60">
                <tr>
                  <th className="p-4 md:pl-6">Date</th>
                  <th className="p-4">Party Name</th>
                  <th className="p-4 text-right md:pr-6">Pending Due Amount</th>
                  <th className="p-4 text-right md:pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
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
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      <td className="p-4 md:pl-6 align-middle">
                        <div className="text-zinc-400 font-mono text-xs mb-2">
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
                            className="mt-2 flex flex-col items-start bg-zinc-800/50 border border-zinc-700/50 rounded-lg py-1.5 px-2.5 hover:bg-zinc-800 transition-colors w-max group/btn"
                          >
                            <div className="flex items-center gap-1.5">
                              <History
                                size={12}
                                className="text-zinc-400 group-hover/btn:-rotate-12 transition-transform"
                              />
                              <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                                {latestLog.role || "ADMIN"}
                              </span>
                              {historyCount > 1 && (
                                <span className="bg-zinc-700/50 text-zinc-300 px-1.5 py-0.5 rounded text-[8px] font-bold ml-1">
                                  +{historyCount - 1} MORE
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono mt-1 pl-[18px]">
                              {formatLogDate(latestLog.at)}
                            </div>
                          </button>
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        <div className="font-bold text-zinc-100 flex items-center gap-2 whitespace-nowrap tracking-wide">
                          <AlertCircle size={14} className="text-rose-500/50" />{" "}
                          {log.labourName}
                        </div>
                        <div
                          className={`text-[9px] ${theme.primaryText} mt-1.5 uppercase tracking-widest font-bold ${theme.primaryBg} border ${theme.primaryBorder} px-2 py-0.5 rounded w-max`}
                        >
                          {log.payoutCategory || "Labour"}
                        </div>
                      </td>
                      <td className="p-4 md:pr-6 align-middle text-right whitespace-nowrap font-mono font-bold text-rose-400 text-lg">
                        ₹ {Number(log.amountDue || 0).toLocaleString()}
                      </td>
                      <td className="p-4 md:pr-6 text-right align-middle overflow-visible">
                        <div className="flex justify-end gap-2 items-center relative">
                          <Link
                            to={`${isTransport ? `/transportation/labour/edit/${log._id}` : `/enterprise/labour/edit/${log._id}`}`}
                            className={`p-2 text-zinc-500 hover:${theme.primaryText} ${theme.primaryHoverBg} rounded-lg transition-colors`}
                          >
                            <Edit size={16} />
                          </Link>
                          <button
                            onClick={() =>
                              isManager
                                ? handleDisabledClick(log._id)
                                : handleDeleteClick(log, "labour")
                            }
                            className={`p-2 rounded-lg transition-colors ${
                              isManager
                                ? "text-zinc-600 opacity-50 cursor-not-allowed"
                                : "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                            }`}
                          >
                            <Trash2 size={16} />
                          </button>
                          {warningTooltip === log._id && (
                            <div className="absolute bottom-full right-0 mb-2 z-[9999] bg-[#09090B] border border-red-500/30 text-red-400 text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
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
                      <div className="w-16 h-16 rounded-full bg-zinc-800/50 border border-zinc-800 flex items-center justify-center text-zinc-400 mx-auto mb-4">
                        <AlertCircle size={28} />
                      </div>
                      <h3 className="text-white font-bold text-lg mb-1">
                        No Pending Dues!
                      </h3>
                      <p className="text-zinc-500 text-sm max-w-sm mx-auto">
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

      {/* MULTIPLE LOG HISTORY MODAL UI */}
      {logModalInfo.isOpen && logModalInfo.data && (
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
          <div className="bg-[#09090B] border border-zinc-800/60 rounded-2xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800/60 bg-[#09090B] shrink-0">
              <div
                className={`flex items-center gap-2 text-white font-bold tracking-wide text-sm`}
              >
                <History size={16} className={theme.primaryText} />
                Log History:{" "}
                <span className="text-zinc-400 font-normal">
                  {logModalInfo.tabType === "production"
                    ? logModalInfo.data.productName
                    : logModalInfo.data.labourName}
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
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-3">
              {(logModalInfo.data.editHistory
                ? [...logModalInfo.data.editHistory].reverse()
                : []
              ).map((log, index) => (
                <div
                  key={index}
                  className={`bg-zinc-900/30 border ${index === 0 ? theme.primaryBorder : "border-zinc-800"} rounded-xl p-4 flex items-center justify-between relative overflow-hidden`}
                >
                  {index === 0 && (
                    <div
                      className={`absolute left-0 top-0 w-1 h-full ${theme.indicatorLine}`}
                    ></div>
                  )}

                  <div className="flex items-center gap-4 pl-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${index === 0 ? `${theme.primaryBg} ${theme.primaryText}` : "bg-zinc-800/50 text-zinc-400"}`}
                    >
                      {(log.role || "A")[0].toUpperCase()}
                    </div>
                    <div>
                      <h4
                        className={`font-bold tracking-widest uppercase text-sm ${index === 0 ? "text-white" : "text-zinc-400"}`}
                      >
                        {log.role || "ADMIN"}
                      </h4>
                      <p className="text-zinc-500 text-[10px] mt-0.5 font-mono">
                        {log.email || "admin@system.com"}
                      </p>
                      <p
                        className={`text-[10px] font-mono mt-1.5 ${index === 0 ? theme.primaryText : "text-zinc-500"}`}
                      >
                        {formatLogDateFull(log.at)}
                      </p>
                    </div>
                  </div>

                  {index === 0 && (
                    <div
                      className={`${theme.primaryBg} border ${theme.primaryBorder} ${theme.primaryText} text-[10px] font-bold px-3 py-1 rounded-lg tracking-widest uppercase`}
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

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Record"
        message={`Are you sure you want to permanently delete this ${deleteType === "production" ? "production log" : "payout record"}?`}
        confirmText="Delete"
        isDestructive={true}
      />

      {/* SECURE WIPE DATA MODAL */}
      {isDeleteAllOpen && !isManager && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => !wiping && setIsDeleteAllOpen(false)}
          />
          <div className="bg-[#09090B] border border-red-900/50 rounded-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col p-6 sm:p-8">
            <div className="flex items-center gap-3 text-red-500 mb-6">
              <AlertOctagon size={28} />
              <h2 className="text-xl font-bold tracking-wide">
                Wipe Production Database
              </h2>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  size={20}
                  className="text-amber-500 shrink-0 mt-0.5"
                />
                <div>
                  <h3 className="text-amber-500 font-bold text-sm mb-1">
                    Recommended: Safe Backup
                  </h3>
                  <p className="text-amber-100/60 text-xs mb-4 leading-relaxed">
                    Before wiping the database, we highly recommend downloading
                    a complete CSV backup of all your current production and
                    payout records.
                  </p>
                  <button
                    onClick={handleFullBackup}
                    className="w-full sm:w-auto px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
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
                className="w-full bg-zinc-900/50 border border-red-900/30 focus:border-red-500/50 rounded-xl px-4 py-3 text-red-100 placeholder:text-red-100/20 outline-none transition-all"
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
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteAllOpen(false);
                  setDeletePassword("");
                }}
                disabled={wiping}
                className="border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleWipeAll}
                disabled={wiping || !deletePassword}
                className="rounded-xl flex items-center gap-2"
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
    </div>
  );
};

export default ProductionReport;