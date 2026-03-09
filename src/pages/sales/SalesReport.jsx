import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import salesService from "../../services/salesService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  FileText,
  Search,
  Trash2,
  Edit,
  Truck,
  TrendingUp,
  Banknote,
  CreditCard,
  Filter,
  History,
  X,
  ChevronDown,
  Calendar,
  Download,
  Layers,
  AlertCircle,
  Users,
  ChevronRight,
  AlertOctagon,
  ShieldAlert,
  Eye,
  EyeOff,
  ArrowRight,
  RefreshCcw,
} from "lucide-react";
import Loader from "../../components/common/Loader";
import Button from "../../components/common/Button";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const SalesReport = () => {
  const { toast } = useUI();
  const { admin } = useAuth();

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [warningTooltip, setWarningTooltip] = useState(null);

  const [activeTab, setActiveTab] = useState("all_sales");
  const [expandedCustomer, setExpandedCustomer] = useState(null);

  const [logModalInfo, setLogModalInfo] = useState({
    isOpen: false,
    data: null,
  });

  // Wipe Data States
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wiping, setWiping] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    productFilter: "All",
    paymentMode: "All Status",
    amountFilter: "Any Amount",
    dateFilter: "All",
    exactDate: "",
  });

  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";

  const fetchSales = async () => {
    try {
      const { data } = await salesService.getAllSales();
      setSales(data || []);
    } catch (error) {
      toast.error("Failed to load sales report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await salesService.deleteSale(deleteModal.id);
      toast.success("Sale record deleted successfully");
      fetchSales();
    } catch (error) {
      toast.error("Failed to delete record");
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  // 🚀 ITEM PARSER FOR SPLITTING (Item / Size)
  const parseProduct = (fullName) => {
    if (!fullName || typeof fullName !== "string")
      return { name: "-", size: "No unit" };
    if (fullName.includes("(")) {
      const parts = fullName.split("(");
      return { name: parts[0].trim(), size: parts[1].replace(")", "").trim() };
    }
    return { name: fullName, size: "No unit" };
  };

  // --- FILTRATION LOGIC (Applies universally) ---
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const saleDate = sale.date ? new Date(sale.date) : new Date();
      const searchTerm = String(filters.search || "").toLowerCase();

      const matchSearch =
        String(sale.buyerName || "")
          .toLowerCase()
          .includes(searchTerm) ||
        String(sale.challanNo || "")
          .toLowerCase()
          .includes(searchTerm) ||
        String(sale.vehicleNo || "")
          .toLowerCase()
          .includes(searchTerm);

      const matchProduct =
        filters.productFilter === "All" ||
        sale.productName === filters.productFilter ||
        (sale.productName &&
          sale.productName.startsWith(filters.productFilter.split(" ")[0]));

      let matchAmount = true;
      const amt = Number(sale.amount) || 0;
      if (filters.amountFilter === "Under ₹50k") matchAmount = amt < 50000;
      else if (filters.amountFilter === "Over ₹50k") matchAmount = amt >= 50000;

      const matchMode =
        filters.paymentMode === "All Status" ||
        sale.paymentMode === filters.paymentMode;

      let matchDate = true;
      if (filters.exactDate && sale.date) {
        const formattedLogDate = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, "0")}-${String(saleDate.getDate()).padStart(2, "0")}`;
        matchDate = formattedLogDate === filters.exactDate;
      } else if (filters.dateFilter !== "All" && sale.date) {
        const today = new Date();
        const diffTime = Math.abs(today - saleDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (filters.dateFilter === "Today") matchDate = diffDays <= 1;
        else if (filters.dateFilter === "Last7Days") matchDate = diffDays <= 7;
        else if (filters.dateFilter === "ThisMonth")
          matchDate =
            saleDate.getMonth() === today.getMonth() &&
            saleDate.getFullYear() === today.getFullYear();
      }

      return (
        matchSearch && matchProduct && matchAmount && matchMode && matchDate
      );
    });
  }, [sales, filters]);

  // --- STATS SUMMARY ---
  const summary = useMemo(() => {
    return filteredSales.reduce(
      (acc, curr) => {
        const amt = Number(curr.amount) || 0;
        acc.total += amt;
        if (curr.paymentMode === "Cash")
          acc.cash += Number(curr.amountPaid || amt);
        if (curr.paymentMode === "Online")
          acc.online += Number(curr.amountPaid || amt);
        acc.pendingDues += Number(curr.amountDue || 0);
        return acc;
      },
      { total: 0, cash: 0, online: 0, pendingDues: 0 },
    );
  }, [filteredSales]);

  // 🚀 --- CUSTOMER DUES GROUPING LOGIC --- 🚀
  const groupedDuesByCustomer = useMemo(() => {
    const map = {};
    filteredSales.forEach((sale) => {
      const due = Number(sale.amountDue) || 0;
      if (due > 0) {
        const buyer = sale.buyerName || "Unknown Customer";
        if (!map[buyer]) {
          map[buyer] = {
            buyerName: buyer,
            totalDue: 0,
            totalBillAmount: 0,
            records: [],
          };
        }
        map[buyer].totalDue += due;
        map[buyer].totalBillAmount += Number(sale.amount) || 0;
        map[buyer].records.push(sale);
      }
    });
    return Object.values(map).sort((a, b) => b.totalDue - a.totalDue);
  }, [filteredSales]);

  const activeFiltersCount =
    [
      filters.productFilter,
      filters.paymentMode,
      filters.amountFilter,
      filters.dateFilter,
    ].filter((f) => f !== "All" && f !== "All Status" && f !== "Any Amount")
      .length + (filters.exactDate ? 1 : 0);

  const formatLogDate = (isoString) => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    return `${String(date.getDate()).padStart(2, "0")} ${date.toLocaleString("en-GB", { month: "short" })}, ${date.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
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

  const handleFullBackup = () => {
    try {
      if (sales.length === 0) return toast.info("Database is empty.");
      const headers = [
        "Date",
        "Challan No",
        "Buyer Name",
        "Vehicle No",
        "Item Name",
        "Quantity",
        "Total Bill",
        "Paid",
        "Due",
        "Mode",
      ];
      const rows = sales.map((sale) => {
        let dateStr = sale.date
          ? `\t${new Date(sale.date).toLocaleDateString("en-GB")}`
          : "-";
        return `${dateStr},"${sale.challanNo || ""}","${sale.buyerName || ""}","${sale.vehicleNo || ""}","${sale.productName || ""}",${sale.quantity || 0},${sale.amount || 0},${sale.amountPaid || sale.amount || 0},${sale.amountDue || 0},"${sale.paymentMode || ""}"`;
      });
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute(
        "download",
        `Full_Sales_Database_Backup_${new Date().toISOString().split("T")[0]}.csv`,
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
      await salesService.deleteAllSales({
        password: deletePassword,
        email: adminEmail,
      });
      toast.success("Sales database cleared successfully.");
      setIsDeleteAllOpen(false);
      setDeletePassword("");
      setShowPassword(false);
      fetchSales();
    } catch (error) {
      toast.error(error.message || "Incorrect Admin Password.");
    } finally {
      setWiping(false);
    }
  };

  const handleExport = () => {
    try {
      if (activeTab === "all_sales") {
        if (filteredSales.length === 0)
          return toast.info("No records to export");
        const headers = [
          "Date",
          "Challan No",
          "Buyer Name",
          "Vehicle No",
          "Item Name",
          "Size",
          "Quantity",
          "Total Bill",
          "Paid",
          "Due",
          "Mode",
        ];
        const rows = filteredSales.map((sale) => {
          let dateStr = sale.date
            ? `\t${new Date(sale.date).toLocaleDateString("en-GB")}`
            : "-";
          const { name, size } = parseProduct(sale.productName);
          return `${dateStr},"${sale.challanNo || ""}","${sale.buyerName || ""}","${sale.vehicleNo || ""}","${name}","${size}",${sale.quantity || 0},${sale.amount || 0},${sale.amountPaid || sale.amount || 0},${sale.amountDue || 0},"${sale.paymentMode || ""}"`;
        });
        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute(
          "download",
          `Sales_Report_${new Date().toISOString().split("T")[0]}.csv`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Exported successfully");
      } else {
        if (groupedDuesByCustomer.length === 0)
          return toast.info("No dues to export");
        const headers = [
          "Customer Name",
          "Total Purchase Value",
          "Total Pending Due",
        ];
        const rows = groupedDuesByCustomer.map(
          (cust) =>
            `"${cust.buyerName}",${cust.totalBillAmount},${cust.totalDue}`,
        );
        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute(
          "download",
          `Customer_Dues_${new Date().toISOString().split("T")[0]}.csv`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Dues Exported!");
      }
    } catch (error) {
      toast.error("Export failed");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 relative space-y-8">
      {/* 🚀 HEADER SECTION WITH PILL TABS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Sales Ledger
              </h1>
              <p className="text-emerald-100/40 text-xs uppercase tracking-widest mt-0.5">
                Advanced Report
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-4 w-full xl:w-auto">
          {/* 🚀 NO SCROLLBAR PILL TABS */}
          <div className="w-full lg:w-auto bg-[#020403] p-1.5 rounded-2xl md:rounded-full border border-emerald-900/30 shadow-inner grid grid-cols-2 md:flex md:items-center gap-1">
            <button
              onClick={() => {
                setActiveTab("all_sales");
                setExpandedCustomer(null);
              }}
              className={`col-span-1 px-2 md:px-8 py-2 md:py-2 text-[10px] sm:text-xs md:text-sm font-bold rounded-xl md:rounded-full transition-all truncate tracking-wide ${
                activeTab === "all_sales"
                  ? "bg-emerald-600 text-white shadow-[0_2px_10px_rgba(5,150,105,0.3)]"
                  : "text-emerald-100/50 hover:text-emerald-100 hover:bg-white/5"
              }`}
            >
              All Sales
            </button>
            <button
              onClick={() => setActiveTab("dues")}
              className={`col-span-1 px-2 md:px-8 py-2 md:py-2 text-[10px] sm:text-xs md:text-sm font-bold rounded-xl md:rounded-full transition-all truncate tracking-wide ${
                activeTab === "dues"
                  ? "bg-emerald-600 text-white shadow-[0_2px_10px_rgba(5,150,105,0.3)]"
                  : "text-emerald-100/50 hover:text-emerald-100 hover:bg-white/5"
              }`}
            >
              Customer Dues
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full lg:w-auto ml-auto lg:ml-0">
            <div className="relative w-full lg:w-auto">
              <button
                onClick={() =>
                  isManager
                    ? (() => {
                        setWarningTooltip("wipe-all");
                        setTimeout(() => setWarningTooltip(null), 2500);
                      })()
                    : setIsDeleteAllOpen(true)
                }
                className={`flex w-full lg:w-auto items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-xs font-bold shadow-lg ${
                  isManager
                    ? "bg-red-500/5 text-red-500/50 border border-red-500/10 opacity-50 cursor-not-allowed"
                    : "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                }`}
              >
                <AlertOctagon size={16} /> Wipe DB
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
            <Link to="/enterprise/sales" className="w-full lg:w-auto">
              <Button
                variant="primary"
                className="w-full lg:w-auto text-xs px-6 py-2.5 shadow-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center"
              >
                + Record Sale
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-[#050a08] to-[#020403] border border-emerald-900/30 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-emerald-500 group-hover:opacity-10 transition-opacity">
            <TrendingUp size={100} />
          </div>
          <p className="text-emerald-100/50 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
            Total Billed
          </p>
          <h3 className="text-2xl font-black text-white font-mono relative z-10">
            ₹ {summary.total.toLocaleString("en-IN")}
          </h3>
        </div>
        <div className="bg-gradient-to-br from-[#050a08] to-[#020403] border border-emerald-900/30 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-emerald-500 group-hover:opacity-10 transition-opacity">
            <Banknote size={100} />
          </div>
          <p className="text-emerald-100/50 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
            Cash Collected
          </p>
          <h3 className="text-2xl font-black text-emerald-400 font-mono relative z-10">
            ₹ {summary.cash.toLocaleString("en-IN")}
          </h3>
        </div>
        <div className="bg-gradient-to-br from-[#050b14] to-[#020617] border border-blue-900/30 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-blue-500 group-hover:opacity-10 transition-opacity">
            <CreditCard size={100} />
          </div>
          <p className="text-blue-100/50 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
            Online Received
          </p>
          <h3 className="text-2xl font-black text-blue-400 font-mono relative z-10">
            ₹ {summary.online.toLocaleString("en-IN")}
          </h3>
        </div>
        <div className="bg-gradient-to-br from-[#120406] to-[#0a0203] border border-rose-900/30 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-rose-500 group-hover:opacity-10 transition-opacity">
            <AlertCircle size={100} />
          </div>
          <p className="text-rose-100/50 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
            Total Pending Dues
          </p>
          <h3 className="text-2xl font-black text-rose-400 font-mono relative z-10">
            ₹ {summary.pendingDues.toLocaleString("en-IN")}
          </h3>
        </div>
      </div>

      {/* MAIN DATA SECTION */}
      <div className="bg-[#050a08] rounded-2xl border border-white/5 overflow-visible shadow-2xl transition-colors duration-500">
        {/* SEARCH & EXPORT BAR */}
        <div className="p-5 border-b border-white/5 bg-[#020403]/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 rounded-t-2xl">
          <div className="relative w-full sm:max-w-md group">
            <Search
              size={16}
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${filters.search ? "text-emerald-500" : "text-gray-500 group-hover:text-gray-400"}`}
            />
            <input
              type="text"
              placeholder={
                activeTab === "all_sales"
                  ? "Search buyer, challan or vehicle..."
                  : "Search customer name..."
              }
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </div>
          <div className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="gap-2 w-full sm:w-auto text-xs font-bold tracking-widest border-white/10 py-2.5 bg-black/40 hover:bg-white/5 flex items-center justify-center"
              onClick={handleExport}
            >
              <Download size={16} /> Export View
            </Button>
          </div>
        </div>

        {/* 🚀 PROFESSIONAL UNIVERSAL FILTRATION UI 🚀 */}
        <div className="p-4 border-b border-white/5 bg-[#050a08] flex flex-wrap items-center gap-4 relative z-20">
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
              value={filters.productFilter}
              onChange={(e) =>
                setFilters({ ...filters, productFilter: e.target.value })
              }
              className="appearance-none bg-black/30 border border-white/10 rounded-xl pl-4 pr-10 py-2 text-xs font-medium text-gray-300 outline-none cursor-pointer transition-all focus:ring-2 focus:ring-emerald-500/20 hover:border-emerald-500/50"
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
                <option value="Hexagon" className="text-gray-300 font-normal">
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
              <optgroup
                label="Raw Materials"
                className="bg-[#020403] text-teal-500 font-bold"
              >
                <option
                  value="Cement (Bags)"
                  className="text-gray-300 font-normal"
                >
                  Cement (Bags)
                </option>
                <option value="Sand" className="text-gray-300 font-normal">
                  Sand
                </option>
              </optgroup>
              <optgroup
                label="Aggregate"
                className="bg-[#020403] text-amber-500 font-bold"
              >
                <option
                  value="Aggregate (60mm)"
                  className="text-gray-300 font-normal"
                >
                  Aggregate (60mm)
                </option>
                <option
                  value="Aggregate (40mm)"
                  className="text-gray-300 font-normal"
                >
                  Aggregate (40mm)
                </option>
                <option
                  value="Aggregate (20mm)"
                  className="text-gray-300 font-normal"
                >
                  Aggregate (20mm)
                </option>
                <option
                  value="Aggregate (10mm)"
                  className="text-gray-300 font-normal"
                >
                  Aggregate (10mm)
                </option>
                <option
                  value="Aggregate (6mm)"
                  className="text-gray-300 font-normal"
                >
                  Aggregate (6mm)
                </option>
                <option value="Dust" className="text-gray-300 font-normal">
                  Dust
                </option>
                <option value="GSP" className="text-gray-300 font-normal">
                  GSP
                </option>
                <option value="WMM" className="text-gray-300 font-normal">
                  WMM
                </option>
              </optgroup>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover:text-emerald-500"
            />
          </div>

          <div className="relative group">
            <select
              value={filters.paymentMode}
              onChange={(e) =>
                setFilters({ ...filters, paymentMode: e.target.value })
              }
              className="appearance-none bg-black/30 border border-white/10 rounded-xl pl-4 pr-10 py-2 text-xs font-medium text-gray-300 outline-none cursor-pointer transition-all focus:ring-2 focus:ring-emerald-500/20 hover:border-emerald-500/50"
            >
              <option value="All Status" className="bg-[#050a08]">
                All Modes
              </option>
              <option value="Cash" className="bg-[#050a08]">
                Cash Only
              </option>
              <option value="Online" className="bg-[#050a08]">
                Online Only
              </option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover:text-emerald-500"
            />
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
              <option value="Under ₹50k" className="bg-[#050a08]">
                &lt; ₹50,000
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
                  exactDate: "",
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover:text-white transition-colors"
            />
          </div>

          <div className="relative group flex items-center">
            <div
              className={`absolute left-3 flex items-center justify-center text-gray-500 pointer-events-none transition-colors ${filters.exactDate ? "text-emerald-500" : ""}`}
            >
              <Calendar size={14} />
            </div>
            <input
              type="date"
              value={filters.exactDate}
              onChange={(e) => {
                setFilters({
                  ...filters,
                  exactDate: e.target.value,
                  dateFilter: "All",
                });
              }}
              style={{ colorScheme: "dark" }}
              className={`appearance-none bg-black/30 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs font-medium ${filters.exactDate ? "text-white" : "text-gray-400"} outline-none cursor-pointer transition-all focus:ring-2 focus:ring-emerald-500/20 hover:border-emerald-500/50`}
            />
          </div>

          {/* Clear Filters Button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                setFilters({
                  search: "",
                  productFilter: "All",
                  paymentMode: "All Status",
                  amountFilter: "Any Amount",
                  dateFilter: "All",
                  exactDate: "",
                });
              }}
              className="text-xs font-bold text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ml-auto md:ml-2"
            >
              <X size={14} /> Clear All
            </button>
          )}
        </div>

        {/* 🚀 DATA TABLE: ALL SALES 🚀 */}
        {activeTab === "all_sales" && (
          <div className="overflow-x-auto pb-4 custom-scrollbar min-h-[400px]">
            <table className="w-full text-left min-w-[800px] animate-in fade-in duration-300">
              <thead className="bg-[#020403] text-emerald-100/40 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-5 pl-6">Date & Challan</th>
                  <th className="p-5">Buyer Details</th>
                  <th className="p-5">Item</th>
                  <th className="p-5">Size</th>
                  <th className="p-5">Financials (Bill / Paid / Due)</th>
                  <th className="p-5 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/20 text-sm">
                {filteredSales.map((sale) => {
                  const { name, size } = parseProduct(sale.productName);
                  const hasEdits =
                    sale.editHistory && sale.editHistory.length > 0;
                  const historyCount = hasEdits ? sale.editHistory.length : 0;
                  const latestLog = hasEdits
                    ? sale.editHistory[sale.editHistory.length - 1]
                    : null;

                  return (
                    <tr
                      key={sale._id}
                      className="hover:bg-emerald-900/10 transition-colors group"
                    >
                      <td className="p-5 pl-6 align-middle">
                        <div className="font-mono text-emerald-100/80 text-xs mb-1.5">
                          {sale.date
                            ? new Date(sale.date).toLocaleDateString("en-GB")
                            : "-"}
                        </div>
                        <div className="text-[10px] text-emerald-500 font-bold tracking-wider mb-2">
                          {sale.challanNo || "NO CHALLAN"}
                        </div>

                        {/* 🚀 LOGIC FIX: Perfect Edit Log History Button (Clickable!) */}
                        {hasEdits && (
                          <div
                            onClick={() =>
                              setLogModalInfo({ isOpen: true, data: sale })
                            }
                            className="mt-1.5 flex flex-col items-start w-max cursor-pointer hover:opacity-80 transition-opacity"
                            title="View Edit History"
                          >
                            <div className="flex items-center gap-1.5 bg-emerald-950/30 border border-emerald-900/50 px-2 py-1 rounded-lg">
                              <History size={12} className="text-emerald-500" />
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                                {latestLog.role || "ADMIN"}
                              </span>
                              {historyCount > 1 && (
                                <span className="bg-emerald-900/80 text-emerald-300 px-1.5 py-0.5 rounded text-[8px] font-bold ml-1">
                                  +{historyCount - 1} MORE
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-emerald-100/40 font-mono mt-1 pl-1">
                              {formatLogDate(latestLog.at)}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="p-5 align-middle">
                        <div className="font-bold text-white tracking-wide mb-1">
                          {sale.buyerName}
                        </div>
                        <div className="text-[10px] text-emerald-100/40 font-mono mt-1 flex items-center gap-1.5">
                          <Truck size={12} className="text-emerald-500/50" />{" "}
                          {sale.vehicleNo}
                        </div>
                      </td>

                      <td className="p-5 align-middle">
                        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest inline-flex items-center gap-2 w-max mb-2">
                          <Layers size={12} /> {name}
                        </span>
                        <div className="text-xs text-emerald-100 font-medium">
                          Qty:{" "}
                          <span className="font-bold">
                            {Number(sale.quantity).toLocaleString()}
                          </span>
                        </div>
                      </td>

                      <td className="p-5 align-middle text-emerald-100 font-medium text-xs">
                        {size}
                      </td>

                      <td className="p-5 align-middle">
                        <div className="font-bold text-white font-mono mb-1.5">
                          Total: ₹{Number(sale.amount).toLocaleString("en-IN")}
                        </div>
                        <div className="flex items-center gap-2 mb-1 text-xs font-mono">
                          <span className="text-emerald-400 font-bold">
                            Paid: ₹
                            {Number(
                              sale.amountPaid || sale.amount,
                            ).toLocaleString("en-IN")}
                          </span>
                          {/* 🚀 Cash/Online Status Badge Restored */}
                          <span
                            className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border inline-block ${sale.paymentMode === "Online" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}
                          >
                            {sale.paymentMode}
                          </span>
                        </div>
                        {Number(sale.amountDue) > 0 && (
                          <div className="text-xs font-mono">
                            <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded w-max">
                              Due: ₹
                              {Number(sale.amountDue).toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="p-5 pr-6 text-right align-middle overflow-visible">
                        <div className="flex justify-end gap-2 items-center relative">
                          <Link
                            to={`/enterprise/sales/edit/${sale._id}`}
                            className="p-2 text-emerald-100/40 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          >
                            <Edit size={16} />
                          </Link>
                          <button
                            onClick={() =>
                              isManager
                                ? (() => {
                                    setWarningTooltip(sale._id);
                                    setTimeout(
                                      () => setWarningTooltip(null),
                                      2500,
                                    );
                                  })()
                                : setDeleteModal({ isOpen: true, id: sale._id })
                            }
                            className={`p-2 rounded-lg transition-colors ${isManager ? "text-emerald-100/20 opacity-50 cursor-not-allowed" : "text-emerald-100/40 hover:text-red-400 hover:bg-red-500/10"}`}
                          >
                            <Trash2 size={16} />
                          </button>
                          {warningTooltip === sale._id && (
                            <div className="absolute bottom-full right-0 mb-2 z-[9999] bg-[#050a08] border border-red-500/30 text-red-400 text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                              🚫 Access Denied
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredSales.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="p-10 text-center text-emerald-100/30 italic"
                    >
                      No matching sales records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 🚀 CUSTOMER DUES (GROUPED) TAB 🚀 */}
        {activeTab === "dues" && (
          <div className="p-4 custom-scrollbar min-h-[400px]">
            {groupedDuesByCustomer.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto mb-4 shadow-inner">
                  <AlertCircle size={28} />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">
                  No Pending Dues!
                </h3>
                <p className="text-emerald-100/40 text-sm">
                  All customers have settled their accounts.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {groupedDuesByCustomer.map((cust, idx) => {
                  const isExpanded = expandedCustomer === cust.buyerName;
                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border transition-all duration-300 overflow-hidden ${isExpanded ? "bg-[#020403] border-rose-900/50 shadow-lg shadow-rose-900/10" : "bg-[#050a08] border-white/5 hover:border-rose-900/30"}`}
                    >
                      {/* GROUP HEADER */}
                      <button
                        onClick={() =>
                          setExpandedCustomer(
                            isExpanded ? null : cust.buyerName,
                          )
                        }
                        className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 text-left gap-4 cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-3 rounded-xl transition-colors ${isExpanded ? "bg-rose-500/20 text-rose-500" : "bg-white/5 text-gray-400"}`}
                          >
                            <Users size={24} />
                          </div>
                          <div>
                            <h3
                              className={`text-lg font-bold tracking-wide transition-colors ${isExpanded ? "text-white" : "text-gray-300"}`}
                            >
                              {cust.buyerName}
                            </h3>
                            <p className="text-gray-500 text-xs mt-1">
                              Pending in {cust.records.length} bill(s)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 sm:gap-10 w-full sm:w-auto">
                          <div className="text-left sm:text-right hidden sm:block">
                            <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1">
                              Total Purchases
                            </p>
                            <p className="text-gray-300 font-mono font-bold">
                              ₹ {cust.totalBillAmount.toLocaleString("en-IN")}
                            </p>
                          </div>
                          <div className="text-left sm:text-right flex-1 sm:flex-none">
                            <p className="text-rose-500/70 text-[10px] uppercase tracking-widest font-bold mb-1">
                              Total Pending Due
                            </p>
                            <p className="text-rose-400 font-mono font-black text-xl">
                              ₹ {cust.totalDue.toLocaleString("en-IN")}
                            </p>
                          </div>
                          <ChevronRight
                            size={20}
                            className={`text-gray-600 transition-transform duration-300 ${isExpanded ? "rotate-90 text-rose-500" : ""}`}
                          />
                        </div>
                      </button>

                      {/* 🚀 EXPANDED BILL DETAILS */}
                      {isExpanded && (
                        <div className="border-t border-rose-900/20 bg-rose-950/5 p-5 animate-in slide-in-from-top-2 fade-in duration-200">
                          <h4 className="text-xs font-bold text-rose-200/50 uppercase tracking-widest mb-4">
                            Pending Bill Details
                          </h4>
                          <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left min-w-[600px]">
                              <thead className="text-rose-100/40 text-[10px] uppercase font-bold tracking-wider border-b border-rose-900/20">
                                <tr>
                                  <th className="pb-3 pl-2">Date</th>
                                  <th className="pb-3">Challan</th>
                                  <th className="pb-3">Item</th>
                                  <th className="pb-3">Size</th>
                                  <th className="pb-3 text-right">
                                    Bill Amount
                                  </th>
                                  <th className="pb-3 text-right">
                                    Amount Paid
                                  </th>
                                  <th className="pb-3 text-right pr-2 text-rose-400">
                                    Amount Due
                                  </th>
                                  <th className="pb-3 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-rose-900/10 text-sm">
                                {cust.records.map((record) => {
                                  const { name, size } = parseProduct(
                                    record.productName || "",
                                  );
                                  return (
                                    <tr
                                      key={record._id}
                                      className="hover:bg-rose-900/10 transition-colors"
                                    >
                                      <td className="py-3 pl-2 text-gray-300 font-mono text-xs">
                                        {record.date
                                          ? new Date(
                                              record.date,
                                            ).toLocaleDateString("en-GB")
                                          : "-"}
                                      </td>
                                      <td className="py-3">
                                        <div className="text-emerald-400 text-xs font-bold">
                                          {record.challanNo || "-"}
                                        </div>
                                      </td>
                                      <td className="py-3 text-gray-300 text-[11px] font-medium">
                                        {name}
                                      </td>
                                      <td className="py-3 text-gray-500 text-[11px]">
                                        {size}
                                      </td>
                                      <td className="py-3 text-right text-gray-300 font-mono">
                                        ₹{" "}
                                        {Number(
                                          record.amount || 0,
                                        ).toLocaleString("en-IN")}
                                      </td>
                                      <td className="py-3 text-right text-emerald-400 font-mono font-bold">
                                        ₹{" "}
                                        {Number(
                                          record.amountPaid || 0,
                                        ).toLocaleString("en-IN")}
                                      </td>
                                      <td className="py-3 pr-2 text-right text-rose-400 font-mono font-bold text-lg">
                                        ₹{" "}
                                        {Number(
                                          record.amountDue || 0,
                                        ).toLocaleString("en-IN")}
                                      </td>
                                      <td className="py-3 text-center">
                                        <Link
                                          to={`/enterprise/sales/edit/${record._id}`}
                                          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-rose-500/10 text-rose-400 hover:bg-rose-500 border border-rose-500/20 hover:text-white px-3 py-1.5 rounded transition-all"
                                        >
                                          Settle <ArrowRight size={12} />
                                        </Link>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Delete Sale Record?"
        message="Are you sure you want to permanently delete this sale record?"
        confirmText="Delete Record"
        isDestructive={true}
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
                Wipe Sales Database
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
                    a complete CSV backup of all your current sales records.
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
              sales records. Please enter your Admin password to confirm.
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

              {/* Changed Loader to RefreshCcw to avoid UI height explosion bug */}
              <button
                onClick={handleWipeAll}
                disabled={wiping || !deletePassword}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-red-600/20 text-red-500 border border-red-600/30 hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* 🚀 MULTIPLE LOG HISTORY MODAL UI */}
      {logModalInfo.isOpen &&
        logModalInfo.data &&
        (() => {
          const logsList =
            logModalInfo.data.editHistory &&
            logModalInfo.data.editHistory.length > 0
              ? [...logModalInfo.data.editHistory].reverse()
              : [];

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div
                className="absolute inset-0"
                onClick={() => setLogModalInfo({ isOpen: false, data: null })}
              />
              <div className="bg-[#050a08] border border-emerald-900/30 rounded-2xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-5 border-b border-emerald-900/20 bg-[#020403]/50 shrink-0">
                  <div className="flex items-center gap-2 text-white font-bold tracking-wide text-sm">
                    <History size={16} className="text-emerald-500" />
                    Log History:{" "}
                    <span className="text-emerald-400 font-normal">
                      {logModalInfo.data.challanNo ||
                        logModalInfo.data.buyerName}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setLogModalInfo({ isOpen: false, data: null })
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
                      className="bg-[#020403] border border-emerald-900/20 rounded-xl p-4 flex items-center justify-between relative overflow-hidden"
                    >
                      {index === 0 && (
                        <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500"></div>
                      )}

                      <div className="flex items-center gap-4 pl-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${index === 0 ? "bg-emerald-900/40 border-emerald-500/30 text-emerald-400" : "bg-emerald-900/10 border-emerald-900/20 text-emerald-100/40"}`}
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
                            className={`text-[10px] font-mono mt-1.5 ${index === 0 ? "text-emerald-400" : "text-gray-600"}`}
                          >
                            {formatLogDateFull(log.at)}
                          </p>
                        </div>
                      </div>

                      {index === 0 && (
                        <div className="bg-emerald-500/10 border-emerald-500/20 text-emerald-500 text-[10px] font-bold px-3 py-1 rounded tracking-widest uppercase border">
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

export default SalesReport;
