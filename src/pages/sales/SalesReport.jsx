import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
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
  MapPin,
} from "lucide-react";
import Loader from "../../components/common/Loader";
import Button from "../../components/common/Button";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const SalesReport = () => {
  const location = useLocation();
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

  // 🔥 THEME HOOK
  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const theme = {
    primaryText: isTransport ? "text-cyan-400" : "text-indigo-400",
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
  };

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

  const parseProduct = (fullName) => {
    if (!fullName || typeof fullName !== "string")
      return { name: "-", size: "No unit" };
    if (fullName.includes("(")) {
      const parts = fullName.split("(");
      return { name: parts[0].trim(), size: parts[1].replace(")", "").trim() };
    }
    return { name: fullName, size: "No unit" };
  };

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

  const handleFullBackup = () => {
    try {
      if (sales.length === 0) return toast.info("Database is empty.");
      const headers = [
        "Date",
        "Challan No",
        "Buyer Name",
        "Vehicle No",
        "Delivery Address",
        "Item Name",
        "Quantity",
        "Price/Qty",
        "Total Bill",
        "Paid",
        "Due",
        "Mode",
      ];
      const rows = sales.map((sale) => {
        let dateStr = sale.date
          ? `\t${new Date(sale.date).toLocaleDateString("en-GB")}`
          : "-";
        return `${dateStr},"${sale.challanNo || ""}","${sale.buyerName || ""}","${sale.vehicleNo || ""}","${sale.address || ""}","${sale.productName || ""}",${sale.quantity || 0},${sale.pricePerQuantity || 0},${sale.amount || 0},${sale.amountPaid || sale.amount || 0},${sale.amountDue || 0},"${sale.paymentMode || ""}"`;
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
          "Delivery Address",
          "Item Name",
          "Size",
          "Quantity",
          "Price/Qty",
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
          return `${dateStr},"${sale.challanNo || ""}","${sale.buyerName || ""}","${sale.vehicleNo || ""}","${sale.address || ""}","${name}","${size}",${sale.quantity || 0},${sale.pricePerQuantity || 0},${sale.amount || 0},${sale.amountPaid || sale.amount || 0},${sale.amountDue || 0},"${sale.paymentMode || ""}"`;
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
      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
            >
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Sales Ledger
              </h1>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mt-0.5">
                Advanced Report
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-4 w-full xl:w-auto">
          {/* PILL TABS */}
          <div className="w-full lg:w-auto bg-[#09090B] p-1.5 rounded-2xl md:rounded-full border border-zinc-800/60 grid grid-cols-2 md:flex md:items-center gap-1">
            <button
              onClick={() => {
                setActiveTab("all_sales");
                setExpandedCustomer(null);
              }}
              className={`col-span-1 px-2 md:px-8 py-2 md:py-2 text-[10px] sm:text-xs md:text-sm font-bold rounded-xl md:rounded-full transition-all truncate tracking-wide ${
                activeTab === "all_sales"
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
              }`}
            >
              All Sales
            </button>
            <button
              onClick={() => setActiveTab("dues")}
              className={`col-span-1 px-2 md:px-8 py-2 md:py-2 text-[10px] sm:text-xs md:text-sm font-bold rounded-xl md:rounded-full transition-all truncate tracking-wide ${
                activeTab === "dues"
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
              }`}
            >
              Customer Dues
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full lg:w-auto ml-auto lg:ml-0">
            <div className="relative w-full lg:w-auto">
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
                className={`w-full lg:w-auto h-11 px-5 border-rose-500/40 text-rose-400 bg-rose-950/30 hover:bg-rose-900/40 hover:border-rose-400/60 ${
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
              to={isTransport ? "/transportation/sales" : "/enterprise/sales"}
              className="w-full lg:w-auto"
            >
              <Button
                variant="primary"
                className="w-full lg:w-auto text-xs px-6 h-11 rounded-xl shadow-lg flex items-center justify-center"
              >
                + Record Sale
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div
          className={`bg-[#09090B] border border-zinc-800/60 p-6 rounded-2xl relative overflow-hidden group transition-all ${theme.primaryHoverBorder}`}
        >
          <div
            className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity ${theme.primaryText}`}
          >
            <TrendingUp size={100} />
          </div>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
            Total Billed
          </p>
          <h3 className="text-2xl font-black text-white font-mono relative z-10">
            ₹ {summary.total.toLocaleString("en-IN")}
          </h3>
        </div>
        <div
          className={`bg-[#09090B] border border-zinc-800/60 p-6 rounded-2xl relative overflow-hidden group transition-all ${theme.primaryHoverBorder}`}
        >
          <div
            className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity ${theme.primaryText}`}
          >
            <Banknote size={100} />
          </div>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
            Cash Collected
          </p>
          <h3
            className={`text-2xl font-black font-mono relative z-10 ${theme.primaryText}`}
          >
            ₹ {summary.cash.toLocaleString("en-IN")}
          </h3>
        </div>
        <div className="bg-[#09090B] border border-zinc-800/60 p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-blue-500 group-hover:opacity-10 transition-opacity">
            <CreditCard size={100} />
          </div>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
            Online Received
          </p>
          <h3 className="text-2xl font-black text-blue-400 font-mono relative z-10">
            ₹ {summary.online.toLocaleString("en-IN")}
          </h3>
        </div>
        <div className="bg-[#09090B] border border-zinc-800/60 p-6 rounded-2xl relative overflow-hidden group hover:border-rose-500/30 transition-all">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-rose-500 group-hover:opacity-10 transition-opacity">
            <AlertCircle size={100} />
          </div>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
            Total Pending Dues
          </p>
          <h3 className="text-2xl font-black text-rose-400 font-mono relative z-10">
            ₹ {summary.pendingDues.toLocaleString("en-IN")}
          </h3>
        </div>
      </div>

      {/* MAIN DATA SECTION */}
      <div className="bg-[#09090B] rounded-2xl border border-zinc-800/60 overflow-visible transition-colors duration-500">
        {/* SEARCH & EXPORT BAR */}
        <div className="p-5 border-b border-zinc-800/60 bg-[#09090B] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 rounded-t-2xl">
          <div className="relative w-full sm:max-w-md group">
            <Search
              size={16}
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${filters.search ? theme.primaryText : "text-zinc-500 group-hover:text-zinc-400"}`}
            />
            <input
              type="text"
              placeholder={
                activeTab === "all_sales"
                  ? "Search buyer, challan or vehicle..."
                  : "Search customer name..."
              }
              className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 outline-none transition-all ${theme.primaryFocus}`}
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
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

        {/* FILTERS UI */}
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

          <div className="relative group">
            <select
              value={filters.productFilter}
              onChange={(e) =>
                setFilters({ ...filters, productFilter: e.target.value })
              }
              className={`appearance-none bg-transparent border border-zinc-800 rounded-full pl-4 pr-10 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
            >
              <option value="All" className="bg-[#09090B]">
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
                  6/12 Brick (60mm)
                </option>
                <option
                  value="6-12 Brick (80mm)"
                  className="text-zinc-300 font-normal"
                >
                  6/12 Brick (80mm)
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
                <option value="Hexagon" className="text-zinc-300 font-normal">
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
              value={filters.paymentMode}
              onChange={(e) =>
                setFilters({ ...filters, paymentMode: e.target.value })
              }
              className={`appearance-none bg-transparent border border-zinc-800 rounded-full pl-4 pr-10 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
            >
              <option value="All Status" className="bg-[#09090B]">
                All Modes
              </option>
              <option value="Cash" className="bg-[#09090B]">
                Cash Only
              </option>
              <option value="Online" className="bg-[#09090B]">
                Online Only
              </option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:text-zinc-400"
            />
          </div>

          <div className="relative group">
            <select
              value={filters.amountFilter}
              onChange={(e) =>
                setFilters({ ...filters, amountFilter: e.target.value })
              }
              className={`appearance-none bg-transparent border border-zinc-800 rounded-full pl-4 pr-10 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
            >
              <option value="Any Amount" className="bg-[#09090B]">
                Any Amount
              </option>
              <option value="Under ₹50k" className="bg-[#09090B]">
                &lt; ₹50,000
              </option>
              <option value="Over ₹50k" className="bg-[#09090B]">
                &gt; ₹50,000
              </option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:text-zinc-400"
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

          <div className="relative group flex items-center">
            <div
              className={`absolute left-3 flex items-center justify-center pointer-events-none transition-colors ${filters.exactDate ? theme.primaryText : "text-zinc-500"}`}
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
              className={`appearance-none bg-transparent border rounded-full pl-9 pr-4 py-1.5 text-xs font-medium outline-none cursor-pointer transition-all ${theme.primaryFocus} ${filters.exactDate ? `${theme.primaryBg} ${theme.primaryBorder} text-indigo-100` : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"}`}
            />
          </div>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
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
              className="!px-3 !py-1.5 !text-xs !rounded-full !ml-auto md:!ml-2 flex items-center gap-1.5"
            >
              <X size={14} /> Clear All
            </Button>
          )}
        </div>

        {/* DATA TABLE: ALL SALES */}
        {activeTab === "all_sales" && (
          <div className="overflow-x-auto pb-4 custom-scrollbar min-h-[400px]">
            <table className="w-full text-left min-w-[800px] animate-in fade-in duration-300">
              <thead className="bg-[#09090B] text-zinc-500 text-[11px] uppercase font-bold tracking-widest border-b border-zinc-800/60">
                <tr>
                  <th className="p-5 md:pl-6">Date & Challan</th>
                  <th className="p-5">Buyer Details</th>
                  <th className="p-5">Item</th>
                  <th className="p-5">Size & Rate</th>
                  <th className="p-5">Financials (Bill / Paid / Due)</th>
                  <th className="p-5 md:pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
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
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      <td className="p-5 md:pl-6 align-middle">
                        <div className="font-mono text-zinc-400 text-xs mb-1.5">
                          {sale.date
                            ? new Date(sale.date).toLocaleDateString("en-GB")
                            : "-"}
                        </div>
                        <div
                          className={`text-[11px] ${theme.primaryText} font-bold tracking-wider mb-2`}
                        >
                          {sale.challanNo || "NO CHALLAN"}
                        </div>

                        {hasEdits && (
                          <div
                            onClick={() =>
                              setLogModalInfo({ isOpen: true, data: sale })
                            }
                            className="mt-1.5 flex flex-col items-start w-max cursor-pointer hover:opacity-80 transition-opacity"
                            title="View Edit History"
                          >
                            <div className="flex items-center gap-1.5 bg-zinc-800/50 border border-zinc-700/50 px-2 py-1 rounded-lg">
                              <History size={12} className="text-zinc-400" />
                              <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                                {latestLog.role || "ADMIN"}
                              </span>
                              {historyCount > 1 && (
                                <span className="bg-zinc-700/50 text-zinc-400 px-1.5 py-0.5 rounded text-[8px] font-bold ml-1">
                                  +{historyCount - 1} MORE
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-zinc-500 font-mono mt-1 pl-1">
                              {formatLogDate(latestLog.at)}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="p-5 align-middle">
                        <div className="font-bold text-white tracking-wide text-sm mb-1">
                          {sale.buyerName}
                        </div>
                        {sale.address && (
                          <div className="text-[11px] text-zinc-400 mt-1 mb-1.5 flex items-start gap-1.5 leading-tight max-w-[200px]">
                            <MapPin
                              size={12}
                              className="text-zinc-500 shrink-0 mt-0.5"
                            />
                            <span className="line-clamp-2">{sale.address}</span>
                          </div>
                        )}
                        <div className="text-xs text-zinc-400 font-mono font-medium mt-1 flex items-center gap-1.5">
                          <Truck size={14} className="text-zinc-500" />{" "}
                          {sale.vehicleNo}
                        </div>
                      </td>

                      <td className="p-5 align-middle">
                        <span
                          className={`${theme.primaryBg} border ${theme.primaryBorder} ${theme.primaryText} px-2.5 py-1 rounded-md text-[11px] uppercase font-bold tracking-widest inline-flex items-center gap-2 w-max mb-2`}
                        >
                          <Layers size={12} /> {name}
                        </span>
                        <div className="text-xs text-zinc-400 font-medium">
                          Qty:{" "}
                          <span className="text-sm font-bold text-zinc-300">
                            {Number(sale.quantity).toLocaleString()}
                          </span>
                        </div>
                      </td>

                      <td className="p-5 align-middle">
                        <div className="text-zinc-300 font-medium text-xs mb-1.5">
                          {size}
                        </div>
                        {sale.pricePerQuantity && (
                          <div
                            className={`text-[11px] font-mono font-semibold ${theme.primaryText} bg-black/20 px-2 py-1 rounded-md border border-zinc-800/80 inline-block`}
                          >
                            ₹{sale.pricePerQuantity} / qty
                          </div>
                        )}
                      </td>

                      <td className="p-5 align-middle">
                        <div className="font-bold text-white font-mono mb-1.5 text-[15px]">
                          Total: ₹{Number(sale.amount).toLocaleString("en-IN")}
                        </div>
                        <div className="flex items-center gap-2 mb-1.5 text-xs font-mono">
                          <span className={`${theme.primaryText} font-bold`}>
                            Paid: ₹
                            {Number(
                              sale.amountPaid || sale.amount,
                            ).toLocaleString("en-IN")}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border inline-block ${
                              sale.paymentMode === "Online"
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                            }`}
                          >
                            {sale.paymentMode}
                          </span>
                        </div>
                        {Number(sale.amountDue) > 0 && (
                          <div className="text-xs font-mono">
                            <span className="text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded w-max inline-block text-[11px]">
                              Due: ₹
                              {Number(sale.amountDue).toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="p-5 md:pr-6 text-right align-middle overflow-visible">
                        <div className="flex justify-end gap-2 items-center relative">
                          <Link
                            to={`${isTransport ? `/transportation/sales/edit/${sale._id}` : `/enterprise/sales/edit/${sale._id}`}`}
                            className={`p-2 text-zinc-400 hover:${theme.primaryText} ${theme.primaryHoverBg} rounded-lg transition-colors`}
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
                            className={`p-2 rounded-lg transition-colors ${
                              isManager
                                ? "text-zinc-600 opacity-50 cursor-not-allowed"
                                : "text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                            }`}
                          >
                            <Trash2 size={16} />
                          </button>
                          {warningTooltip === sale._id && (
                            <div className="absolute bottom-full right-0 mb-2 z-[9999] bg-[#09090B] border border-red-500/30 text-red-400 text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
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
                      className="p-10 text-center text-zinc-500 italic"
                    >
                      No matching sales records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* CUSTOMER DUES (GROUPED) TAB */}
        {activeTab === "dues" && (
          <div className="p-4 custom-scrollbar min-h-[400px]">
            {groupedDuesByCustomer.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-zinc-800/50 border border-zinc-800 flex items-center justify-center text-zinc-500 mx-auto mb-4">
                  <AlertCircle size={28} />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">
                  No Pending Dues!
                </h3>
                <p className="text-zinc-500 text-sm">
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
                      className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                        isExpanded
                          ? "bg-[#09090B] border-rose-900/50 shadow-lg shadow-rose-900/10"
                          : "bg-zinc-900/10 border-zinc-800/60 hover:border-rose-900/30"
                      }`}
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
                            className={`p-3 rounded-xl transition-colors ${
                              isExpanded
                                ? "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                                : "bg-zinc-800/50 text-zinc-400"
                            }`}
                          >
                            <Users size={24} />
                          </div>
                          <div>
                            <h3
                              className={`text-lg font-bold tracking-wide transition-colors ${
                                isExpanded ? "text-white" : "text-zinc-300"
                              }`}
                            >
                              {cust.buyerName}
                            </h3>
                            <p className="text-zinc-500 text-xs mt-1">
                              Pending in {cust.records.length} bill(s)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 sm:gap-10 w-full sm:w-auto">
                          <div className="text-left sm:text-right hidden sm:block">
                            <p className="text-zinc-500 text-[11px] uppercase tracking-widest font-bold mb-1">
                              Total Purchases
                            </p>
                            <p className="text-zinc-300 font-mono font-bold">
                              ₹ {cust.totalBillAmount.toLocaleString("en-IN")}
                            </p>
                          </div>
                          <div className="text-left sm:text-right flex-1 sm:flex-none">
                            <p className="text-rose-500/70 text-[11px] uppercase tracking-widest font-bold mb-1">
                              Total Pending Due
                            </p>
                            <p className="text-rose-400 font-mono font-black text-xl">
                              ₹ {cust.totalDue.toLocaleString("en-IN")}
                            </p>
                          </div>
                          <ChevronRight
                            size={20}
                            className={`text-zinc-600 transition-transform duration-300 ${
                              isExpanded ? "rotate-90 text-rose-400" : ""
                            }`}
                          />
                        </div>
                      </button>

                      {/* EXPANDED BILL DETAILS */}
                      {isExpanded && (
                        <div className="border-t border-rose-900/20 bg-[#09090B] p-5 animate-in slide-in-from-top-2 fade-in duration-200">
                          <h4 className="text-xs font-bold text-rose-500/50 uppercase tracking-widest mb-4">
                            Pending Bill Details
                          </h4>
                          <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left min-w-[700px]">
                              <thead className="text-zinc-500 text-[11px] uppercase font-bold tracking-wider border-b border-zinc-800/60">
                                <tr>
                                  <th className="pb-3 pl-2">Date</th>
                                  <th className="pb-3">Challan & Info</th>
                                  <th className="pb-3">Item</th>
                                  <th className="pb-3">Size & Rate</th>
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
                              <tbody className="divide-y divide-zinc-800/60 text-sm">
                                {cust.records.map((record) => {
                                  const { name, size } = parseProduct(
                                    record.productName || "",
                                  );
                                  return (
                                    <tr
                                      key={record._id}
                                      className="hover:bg-zinc-800/30 transition-colors"
                                    >
                                      <td className="py-4 pl-2 text-zinc-400 font-mono text-xs">
                                        {record.date
                                          ? new Date(
                                              record.date,
                                            ).toLocaleDateString("en-GB")
                                          : "-"}
                                      </td>
                                      <td className="py-4">
                                        <div
                                          className={`${theme.primaryText} text-xs font-bold mb-1`}
                                        >
                                          {record.challanNo || "-"}
                                        </div>
                                        {record.address && (
                                          <div
                                            className="text-[11px] text-zinc-400 mt-1 max-w-[160px] truncate"
                                            title={record.address}
                                          >
                                            📍 {record.address}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-4 text-zinc-300 text-xs font-medium">
                                        {name}
                                      </td>
                                      <td className="py-4 align-middle">
                                        <div className="text-zinc-400 text-xs mb-1.5">
                                          {size}
                                        </div>
                                        {record.pricePerQuantity && (
                                          <div
                                            className={`text-[11px] font-mono font-semibold ${theme.primaryText} bg-black/20 px-2 py-0.5 rounded border border-zinc-800/80 w-max`}
                                          >
                                            ₹{record.pricePerQuantity}/qty
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-4 text-right text-zinc-300 font-mono text-sm">
                                        ₹{" "}
                                        {Number(
                                          record.amount || 0,
                                        ).toLocaleString("en-IN")}
                                      </td>
                                      <td
                                        className={`py-4 text-right font-mono font-bold text-sm ${theme.primaryText}`}
                                      >
                                        ₹{" "}
                                        {Number(
                                          record.amountPaid || 0,
                                        ).toLocaleString("en-IN")}
                                      </td>
                                      <td className="py-4 pr-2 text-right text-rose-400 font-mono font-bold text-[15px]">
                                        ₹{" "}
                                        {Number(
                                          record.amountDue || 0,
                                        ).toLocaleString("en-IN")}
                                      </td>
                                      <td className="py-4 text-center">
                                        <Link
                                          to={`${isTransport ? `/transportation/sales/edit/${record._id}` : `/enterprise/sales/edit/${record._id}`}`}
                                          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest bg-rose-500/10 text-rose-400 hover:bg-rose-500 border border-rose-500/20 hover:text-white px-3 py-1.5 rounded transition-all"
                                        >
                                          Settle <ArrowRight size={14} />
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

      {/* SECURE WIPE DATA MODAL */}
      {isDeleteAllOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => !wiping && setIsDeleteAllOpen(false)}
          />
          <div className="bg-[#09090B] border border-red-900/50 shadow-[0_0_40px_rgba(220,38,38,0.15)] rounded-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col p-6 sm:p-8">
            <div className="flex items-center gap-3 text-red-500 mb-6">
              <AlertOctagon size={28} />
              <h2 className="text-xl font-bold tracking-wide">
                Wipe Sales Database
              </h2>
            </div>

            {/* 🚀 BACKUP WARNING BOX */}
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
                    a complete CSV backup of all your current sales records.
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleFullBackup}
                    className="w-full sm:w-auto bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/30"
                  >
                    <Download size={14} /> Download Full Database Backup
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-red-100/70 text-sm mb-4">
              This action will{" "}
              <strong className="text-red-500">PERMANENTLY DELETE ALL</strong>{" "}
              sales records from the system. Please enter your Admin password to
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
                className="border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
              >
                Cancel
              </Button>

              <Button
                variant="danger"
                onClick={handleWipeAll}
                disabled={wiping || !deletePassword}
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

export default SalesReport;