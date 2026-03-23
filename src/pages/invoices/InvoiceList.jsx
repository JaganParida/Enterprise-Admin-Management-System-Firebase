import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import invoiceService from "../../services/invoiceService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  FileText,
  Plus,
  Eye,
  Search,
  Trash2,
  Download,
  Edit,
  History,
  X,
  Filter,
  AlertOctagon,
  ShieldAlert,
  EyeOff,
  RefreshCcw,
  ChevronDown,
  Calendar,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";
// 🚀 ADDED IMPORTS FOR MONTHLY BACKUP & DB CHECK
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../config/firebase";

// 🚀 HELPER: Get Previous Month for Backup Warning (YYYY-MM format)
const getPreviousMonthString = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
};

const InvoiceList = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const location = useLocation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // 🚀 Highlight Animation State
  const searchParams = new URLSearchParams(location.search);
  const urlHighlightId = searchParams.get("highlight");
  const [activeHighlight, setActiveHighlight] = useState(null);

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
      ? "hover:bg-cyan-500/10"
      : "hover:bg-indigo-500/10",
    primaryFocus: isTransport
      ? "focus:border-cyan-500/50 focus:ring-cyan-500/50"
      : "focus:border-indigo-500/50 focus:ring-indigo-500/50",
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterAmount, setFilterAmount] = useState("All");
  const [filterDate, setFilterDate] = useState("All");
  const [filterExactDate, setFilterExactDate] = useState("");

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [warningTooltip, setWarningTooltip] = useState(null);
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    itemName: "",
  });

  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wiping, setWiping] = useState(false);

  // 🚀 SMART BACKUP STATES
  const [backupMonth, setBackupMonth] = useState(getPreviousMonthString());
  const [showBackupWarning, setShowBackupWarning] = useState(null);

  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";

  // 🚀 UPDATED: Check Backend Database + Local Storage for Backup Warning
  useEffect(() => {
    const checkBackupNeeded = async () => {
      const prevMonth = getPreviousMonthString();

      // Agar local storage me backup verified nahi hai
      if (!localStorage.getItem(`backup_invoices_${prevMonth}`)) {
        try {
          // Check karo ki kya database me pichle mahine ka koi data hai (using prefix matching hack for ISO dates)
          const q = query(
            collection(db, "invoices"),
            where("date", ">=", prevMonth),
            where("date", "<=", prevMonth + "\uf8ff"),
            limit(1),
          );
          const snap = await getDocs(q);

          // Agar data hai, toh hi warning dikhao
          if (!snap.empty) {
            setShowBackupWarning(prevMonth);
          }
        } catch (error) {
          console.error("Failed to check backup status:", error);
        }
      }
    };

    checkBackupNeeded();
  }, []);

  const fetchInvoices = async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const response = await invoiceService.getAllInvoices(
        {
          status: filterStatus,
          search: searchTerm,
          amount: filterAmount,
          date: filterDate,
          exactDate: filterExactDate,
        },
        isLoadMore ? lastDoc : null,
      );

      if (isLoadMore) {
        setInvoices((prev) => [...prev, ...(response.data || [])]);
      } else {
        setInvoices(response.data || []);
      }

      setLastDoc(response.lastVisible || null);
      setHasMore(response.data && response.data.length === 50);
    } catch (error) {
      if (error.message && error.message.toLowerCase().includes("index")) {
        toast.error(
          "Firebase Index required! Check browser console to click the create link.",
          { duration: 6000 },
        );
      } else {
        toast.error("Failed to load invoices");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchInvoices(false);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, filterStatus, filterAmount, filterDate, filterExactDate]);

  // 🚀 Auto-Scroll & Low-Opacity Fade-Out Animation Logic
  useEffect(() => {
    if (urlHighlightId && !loading) {
      setActiveHighlight(urlHighlightId);

      setTimeout(() => {
        const element = document.getElementById(urlHighlightId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500);

      const timer = setTimeout(() => {
        setActiveHighlight(null);
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [urlHighlightId, loading]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      let matchesAmount = true;
      if (filterAmount !== "All") {
        const amount = Number(inv.grandTotal) || 0;
        if (filterAmount === "Under10k") matchesAmount = amount < 10000;
        else if (filterAmount === "10k-50k")
          matchesAmount = amount >= 10000 && amount <= 50000;
        else if (filterAmount === "Above50k") matchesAmount = amount > 50000;
      }

      let matchesDate = true;
      if (filterExactDate && inv.date) {
        const invDateObj = new Date(inv.date);
        const formattedInvDate = `${invDateObj.getFullYear()}-${String(invDateObj.getMonth() + 1).padStart(2, "0")}-${String(invDateObj.getDate()).padStart(2, "0")}`;
        matchesDate = formattedInvDate === filterExactDate;
      } else if (filterDate !== "All" && inv.date) {
        const invDate = new Date(inv.date);
        const today = new Date();
        const diffTime = Math.abs(today - invDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (filterDate === "Last7Days") matchesDate = diffDays <= 7;
        else if (filterDate === "Last30Days") matchesDate = diffDays <= 30;
        else if (filterDate === "ThisMonth")
          matchesDate =
            invDate.getMonth() === today.getMonth() &&
            invDate.getFullYear() === today.getFullYear();
      }
      return matchesAmount && matchesDate;
    });
  }, [invoices, filterAmount, filterDate, filterExactDate]);

  const activeFiltersCount =
    [filterStatus, filterAmount, filterDate].filter((f) => f !== "All").length +
    (filterExactDate ? 1 : 0);

  const formatModalDate = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return (
      d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) +
      ", " +
      d.toLocaleTimeString("en-GB")
    );
  };

  const formatInlineDate = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return (
      d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
      ", " +
      d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    );
  };

  // 🚀 ONLY EXPORTS VISIBLE DATA
  const handleExport = () => {
    try {
      if (filteredInvoices.length === 0)
        return toast.info("No records to export.");
      const headers = [
        "Date,Invoice No,Client Name,SubTotal,GST Rate,Grand Total,Status",
      ];
      const rows = filteredInvoices.map((inv) => {
        const dateStr = inv.date
          ? `\t${new Date(inv.date).toLocaleDateString("en-GB")}`
          : "-";
        const number = String(inv.invoiceNumber || "").replace(/^INV-/i, "");
        return `${dateStr},"${number}","${inv.client?.name || ""}",${inv.subTotal || 0},${inv.gstRate || 0}%,${inv.grandTotal || 0},"${inv.status || ""}"`;
      });
      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute(
        "download",
        `Invoice_View_Report_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Visible records exported to CSV!");
    } catch (error) {
      toast.error("Export failed.");
    }
  };

  // 🚀 100% FULL DATABASE EXPORT FOR SPECIFIC MONTH
  const handleFullBackup = async (monthToFetch = backupMonth) => {
    try {
      if (!monthToFetch) return toast.error("Please select a month to backup.");
      toast.info(`Fetching backup for ${monthToFetch}... Please wait.`);

      const q = query(
        collection(db, "invoices"),
        where("date", ">=", monthToFetch),
        where("date", "<=", monthToFetch + "\uf8ff"),
      );
      const snapshot = await getDocs(q);
      const allData = snapshot.docs.map((doc) => doc.data());

      if (allData.length === 0)
        return toast.info(`No records found for ${monthToFetch}.`);

      const headers = [
        "Date,Invoice No,Client Name,SubTotal,GST Rate,Grand Total,Status",
      ];
      const rows = allData.map((inv) => {
        const dateStr = inv.date
          ? `\t${new Date(inv.date).toLocaleDateString("en-GB")}`
          : "-";
        const number = String(inv.invoiceNumber || "").replace(/^INV-/i, "");
        return `${dateStr},"${number}","${inv.client?.name || ""}",${inv.subTotal || 0},${inv.gstRate || 0}%,${inv.grandTotal || 0},"${inv.status || ""}"`;
      });
      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `Full_Backup_Invoices_${monthToFetch}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Backup for ${monthToFetch} downloaded securely!`);

      // 🚀 Instantly removes the warning after successful backup
      localStorage.setItem(`backup_invoices_${monthToFetch}`, "true");
      if (showBackupWarning === monthToFetch) {
        setShowBackupWarning(null);
      }
    } catch (e) {
      console.error(e);
      toast.error("Backup failed.");
    }
  };

  const handleWipeAll = async () => {
    if (isManager || !deletePassword)
      return toast.error("Verification failed.");
    setWiping(true);
    try {
      const currentUser = admin?.data || admin || {};
      await invoiceService.deleteAllInvoices({
        password: deletePassword,
        email: currentUser.email,
        user: currentUser,
      });
      toast.success("Invoices database cleared successfully.");
      setIsDeleteAllOpen(false);
      setDeletePassword("");
      setShowPassword(false);
      fetchInvoices(false);
    } catch (error) {
      toast.error(error.message || "Incorrect Admin Password.");
    } finally {
      setWiping(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      setInvoices(
        invoices.map((inv) =>
          inv._id === id ? { ...inv, status: newStatus } : inv,
        ),
      );
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await invoiceService.updateStatus(id, newStatus, currentUser);
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update status");
      fetchInvoices(false);
    }
  };

  const handleDeleteClick = (id) => setDeleteModal({ isOpen: true, id });
  const handleDisabledClick = (id) => {
    setWarningTooltip(id);
    setTimeout(() => setWarningTooltip(null), 2500);
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      const currentUser = admin?.data || admin || {};
      await invoiceService.deleteInvoice(deleteModal.id, currentUser);
      toast.info("Invoice deleted successfully");
      fetchInvoices(false);
    } catch (error) {
      toast.error(error.message || "Failed to delete invoice");
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const openHistory = (inv) => {
    const sortedHistory = Array.isArray(inv?.editHistory)
      ? [...inv.editHistory].reverse()
      : [];
    const formattedNumber = String(inv?.invoiceNumber || "").replace(
      /^INV-/i,
      "",
    );
    setHistoryModal({
      isOpen: true,
      data: sortedHistory,
      itemName: `${formattedNumber} - ${inv?.client?.name}`,
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 px-4 print:w-full print:max-w-none print:m-0 print:p-0 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div
            className={`p-2 rounded-lg border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
          >
            <FileText size={24} />
          </div>{" "}
          Invoice Ledger
        </h1>
        <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <div className="relative">
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
              className={`h-11 flex items-center gap-2 px-4 transition-all text-xs font-bold border-rose-500/40 text-rose-400 bg-rose-950/30 hover:bg-rose-900/40 hover:border-rose-400/60 whitespace-nowrap ${isManager ? "opacity-50 !cursor-not-allowed" : ""}`}
            >
              <AlertOctagon size={16} /> Wipe Database
            </Button>
            {warningTooltip === "wipe-all" && (
              <div className="absolute top-full mt-2 right-0 md:left-1/2 md:-translate-x-1/2 z-[100] animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-[#09090B] border border-red-500/30 shadow-xl text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
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
            className="h-11 px-5 gap-2 rounded-xl border-zinc-800 text-zinc-300 hover:bg-zinc-800/50 hover:text-white hover:border-zinc-700 transition-colors text-xs"
            onClick={handleExport}
          >
            <Download size={16} /> Export View
          </Button>
          <Link
            to={`${isTransport ? "/transportation/invoices/create" : "/enterprise/invoices/create"}`}
          >
            <Button
              variant="primary"
              className="h-11 gap-2 shadow-lg whitespace-nowrap text-xs"
            >
              <Plus size={16} /> Create Bill
            </Button>
          </Link>
        </div>
      </div>

      {/* 🚀 SMART BACKUP WARNING */}
      {showBackupWarning && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 fade-in shadow-[0_0_20px_rgba(245,158,11,0.1)] w-full">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/20 p-2.5 rounded-full text-amber-500">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h4 className="text-amber-400 font-bold text-sm tracking-wide">
                Monthly Data Backup Required
              </h4>
              <p className="text-amber-100/60 text-xs mt-0.5">
                You haven't downloaded the invoice backup for{" "}
                <strong>
                  {new Date(showBackupWarning + "-01").toLocaleString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
                . Download it now to keep records secure.
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleFullBackup(showBackupWarning)}
            variant="outline"
            className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10 whitespace-nowrap"
          >
            <Download size={14} className="mr-2" /> Download Backup
          </Button>
        </div>
      )}

      <div className="bg-[#09090B] rounded-2xl shadow-xl border border-zinc-800/60 overflow-visible relative print:shadow-none print:border-none print:bg-white">
        {loading && !loadingMore && (
          <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-sm rounded-2xl">
            <Loader />
          </div>
        )}
        <div className="p-5 border-b border-zinc-800/60 flex flex-col md:flex-row justify-between gap-4 items-center bg-[#09090B] rounded-t-2xl print:hidden">
          <div className="relative w-full md:w-96 group">
            <Search
              size={16}
              className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${searchTerm ? theme.primaryText : "text-zinc-500 group-hover:text-zinc-400"}`}
            />
            <input
              type="text"
              placeholder="Search by invoice number..."
              className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-zinc-100 outline-none transition-all ${theme.primaryFocus}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="p-4 border-b border-zinc-800/60 flex flex-wrap items-center gap-4 bg-zinc-900/20 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 px-3 py-1 border-r border-zinc-800 mr-1">
            <Filter size={16} /> Filters{" "}
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
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`appearance-none bg-transparent border border-zinc-800 rounded-full pl-4 pr-10 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
            >
              <option value="All" className="bg-[#09090B]">
                All Status
              </option>
              <option value="Pending" className="bg-[#09090B]">
                Pending
              </option>
              <option value="Paid" className="bg-[#09090B]">
                Paid
              </option>
              <option value="Cancelled" className="bg-[#09090B]">
                Cancelled
              </option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:text-zinc-400"
            />
          </div>
          <div className="relative group">
            <select
              value={filterAmount}
              onChange={(e) => setFilterAmount(e.target.value)}
              className={`appearance-none bg-transparent border border-zinc-800 rounded-full pl-4 pr-10 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
            >
              <option value="All" className="bg-[#09090B]">
                Any Amount
              </option>
              <option value="Under10k" className="bg-[#09090B]">
                Under ₹10,000
              </option>
              <option value="10k-50k" className="bg-[#09090B]">
                ₹10k - ₹50k
              </option>
              <option value="Above50k" className="bg-[#09090B]">
                Above ₹50,000
              </option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:text-zinc-400"
            />
          </div>
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
                Any Date
              </option>
              <option value="Last7Days" className="bg-[#09090B]">
                Last 7 Days
              </option>
              <option value="Last30Days" className="bg-[#09090B]">
                Last 30 Days
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
              className={`appearance-none bg-transparent border rounded-full pl-9 pr-4 py-1.5 text-xs font-medium outline-none cursor-pointer transition-all ${theme.primaryFocus} ${filterExactDate ? `${theme.primaryBg} ${theme.primaryBorder} text-indigo-100` : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"}`}
            />
          </div>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              onClick={() => {
                setFilterStatus("All");
                setFilterAmount("All");
                setFilterDate("All");
                setFilterExactDate("");
                setSearchTerm("");
              }}
              className="!px-3 !py-1.5 !text-xs !rounded-full !ml-auto md:!ml-2 flex items-center gap-1.5"
            >
              <X size={14} /> Clear All
            </Button>
          )}
        </div>

        <div className="overflow-x-auto pb-4 custom-scrollbar print:overflow-visible print:w-full">
          <table className="w-full text-left min-w-max print:min-w-0">
            <thead className="bg-[#09090B] text-zinc-500 text-[10px] uppercase tracking-widest font-bold print:bg-white print:text-black border-b border-zinc-800/60">
              <tr>
                <th className="p-5 md:pl-6 whitespace-nowrap">
                  Invoice # & Date
                </th>
                <th className="p-5 whitespace-nowrap min-w-[200px]">Client</th>
                <th className="p-5 whitespace-nowrap">Total Amount</th>
                <th className="p-5 whitespace-nowrap">Status</th>
                <th className="p-5 md:pr-6 text-right whitespace-nowrap print:hidden">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-sm print:divide-gray-200">
              {filteredInvoices.map((inv) => (
                <tr
                  key={inv._id}
                  id={inv._id}
                  className={`transition-all duration-1000 ease-out group print:text-black border-l-4 ${
                    activeHighlight === inv._id
                      ? `${isTransport ? "bg-cyan-500/[0.08] shadow-[inset_0_0_20px_rgba(6,182,212,0.05)] border-cyan-500" : "bg-indigo-500/[0.08] shadow-[inset_0_0_20px_rgba(99,102,241,0.05)] border-indigo-500"}`
                      : "border-transparent hover:bg-zinc-800/30"
                  }`}
                >
                  <td className="p-5 md:pl-6 align-middle">
                    <div
                      className={`font-mono font-bold whitespace-nowrap print:text-black ${theme.primaryText}`}
                    >
                      {inv.invoiceNumber
                        ? String(inv.invoiceNumber).replace(/^INV-/i, "")
                        : "N/A"}
                    </div>
                    <div className="text-zinc-500 text-[10px] mt-1 whitespace-nowrap font-medium tracking-wide print:text-gray-500">
                      {inv.date
                        ? new Date(inv.date).toLocaleDateString("en-GB")
                        : "Unknown Date"}
                    </div>
                  </td>
                  <td className="p-5 align-middle">
                    <div className="font-medium text-zinc-100 whitespace-nowrap print:text-black">
                      {inv.client?.name || "Unknown"}
                    </div>
                    {Array.isArray(inv.editHistory) &&
                      inv.editHistory.length > 0 && (
                        <div
                          onClick={() => openHistory(inv)}
                          className="mt-1.5 inline-flex flex-col gap-0.5 cursor-pointer bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 p-1.5 rounded-lg transition-all w-max print:hidden group/btn"
                        >
                          <div className="text-[9px] font-mono text-zinc-300 flex items-center gap-1 uppercase tracking-widest font-bold leading-none">
                            <History
                              size={10}
                              className="text-zinc-400 group-hover/btn:-rotate-12 transition-transform"
                            />{" "}
                            {inv.editHistory[inv.editHistory.length - 1]
                              ?.role || "ADMIN"}
                          </div>
                          <span className="text-zinc-500 text-[8px] ml-4 font-medium">
                            {formatInlineDate(
                              inv.editHistory[inv.editHistory.length - 1]?.at,
                            )}
                          </span>
                        </div>
                      )}
                  </td>
                  <td className="p-5 font-bold text-white font-mono align-middle whitespace-nowrap print:text-black">
                    ₹ {(Number(inv.grandTotal) || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="p-5 align-middle whitespace-nowrap">
                    <select
                      value={inv.status}
                      onChange={(e) =>
                        handleStatusChange(inv._id, e.target.value)
                      }
                      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1.5 rounded-md border outline-none cursor-pointer transition-colors print:appearance-none print:border-none print:bg-transparent print:text-black ${inv.status === "Paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : inv.status === "Cancelled" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}
                    >
                      <option
                        value="Pending"
                        className="bg-[#09090B] text-amber-400"
                      >
                        Pending
                      </option>
                      <option
                        value="Paid"
                        className="bg-[#09090B] text-emerald-400"
                      >
                        Paid
                      </option>
                      <option
                        value="Cancelled"
                        className="bg-[#09090B] text-rose-400"
                      >
                        Cancelled
                      </option>
                    </select>
                  </td>
                  <td className="p-5 md:pr-6 align-middle overflow-visible print:hidden">
                    <div className="flex justify-end gap-1.5 items-center relative overflow-visible">
                      <Link
                        to={`${isTransport ? `/transportation/invoices/view/${inv._id}` : `/enterprise/invoices/view/${inv._id}`}`}
                        className={`p-1.5 text-zinc-500 hover:${theme.primaryText} ${theme.primaryHoverBg} rounded-md transition-colors`}
                        title="View PDF"
                      >
                        <Eye size={16} />
                      </Link>
                      <Link
                        to={`${isTransport ? `/transportation/invoices/edit/${inv._id}` : `/enterprise/invoices/edit/${inv._id}`}`}
                        className={`p-1.5 text-zinc-500 hover:${theme.primaryText} ${theme.primaryHoverBg} rounded-md transition-colors`}
                        title="Edit Invoice"
                      >
                        <Edit size={16} />
                      </Link>
                      <div className="relative overflow-visible">
                        <button
                          onClick={() =>
                            isManager
                              ? handleDisabledClick(inv._id)
                              : handleDeleteClick(inv._id)
                          }
                          className={`p-1.5 rounded-md transition-colors ${isManager ? "text-zinc-600 opacity-50 cursor-not-allowed" : "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"}`}
                        >
                          <Trash2 size={16} />
                        </button>
                        {warningTooltip === inv._id && (
                          <div className="absolute bottom-full right-0 mb-2 z-[9999] bg-[#09090B] border border-red-500/30 shadow-2xl text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                            <span className="bg-red-500/20 p-1 rounded text-[8px] leading-none">
                              🚫
                            </span>{" "}
                            Access Denied
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan="5"
                    className="p-10 text-center text-zinc-500 text-sm italic print:text-black"
                  >
                    No invoices match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {hasMore && filteredInvoices.length > 0 && (
            <div className="flex justify-center p-6 border-t border-zinc-800/60 print:hidden">
              <Button
                onClick={() => fetchInvoices(true)}
                disabled={loadingMore}
                variant="outline"
                className="text-zinc-400 border-zinc-700 hover:text-white hover:bg-zinc-800/50"
              >
                {loadingMore ? (
                  <RefreshCcw size={16} className="animate-spin mr-2" />
                ) : null}{" "}
                {loadingMore ? "Loading..." : "Load Next 50 Invoices"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* History Modal */}
      {historyModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-[#09090B] border border-zinc-800/60 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative Z-50">
            <div className="p-5 border-b border-zinc-800/60 flex justify-between items-center bg-[#09090B]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History size={18} className={theme.primaryText} /> Log History:{" "}
                <span className="text-zinc-300 text-sm ml-1">
                  {historyModal.itemName}
                </span>
              </h3>
              <button
                onClick={() =>
                  setHistoryModal({ isOpen: false, data: [], itemName: "" })
                }
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
              {historyModal.data.map((edit, idx) => (
                <div
                  key={idx}
                  className={`bg-zinc-900/30 border ${idx === 0 ? theme.primaryBorder : "border-zinc-800"} rounded-xl p-4 flex items-center justify-between relative overflow-hidden group ${theme.primaryHoverBorder} transition-colors`}
                >
                  {idx === 0 && (
                    <div
                      className={`absolute left-0 top-0 w-1 h-full ${theme.primaryBg}`}
                    ></div>
                  )}
                  <div className="flex items-center gap-4 pl-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg uppercase ${idx === 0 ? `${theme.primaryBg} ${theme.primaryText}` : "bg-zinc-800/50 text-zinc-400"}`}
                    >
                      {edit.role ? edit.role.charAt(0) : "A"}
                    </div>
                    <div>
                      <div
                        className={`font-bold uppercase tracking-widest text-sm ${idx === 0 ? "text-white" : "text-zinc-400"}`}
                      >
                        {edit.role || "Admin"}
                      </div>
                      <div className="text-zinc-500 text-[10px] font-mono lowercase">
                        {edit.by}
                      </div>
                      <div
                        className={`text-[10px] font-mono mt-1 tracking-wider ${idx === 0 ? theme.primaryText : "text-zinc-500"}`}
                      >
                        {formatModalDate(edit.at)}
                      </div>
                    </div>
                  </div>
                  {idx === 0 && (
                    <div
                      className={`${theme.primaryBg} border ${theme.primaryBorder} ${theme.primaryText} text-[10px] px-3 py-1 rounded-md font-bold tracking-widest uppercase`}
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

      {/* Wipe Data Modal */}
      {isDeleteAllOpen && !isManager && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 print:hidden">
          <div
            className="absolute inset-0"
            onClick={() => !wiping && setIsDeleteAllOpen(false)}
          />
          <div className="bg-[#09090B] border border-red-900/50 shadow-[0_0_40px_rgba(220,38,38,0.15)] rounded-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col p-6 sm:p-8">
            <div className="flex items-center gap-3 text-red-500 mb-6">
              <AlertOctagon size={28} />
              <h2 className="text-xl font-bold tracking-wide">
                Wipe Invoice Database
              </h2>
            </div>

            {/* 🚀 UPDATED: WIPE MODAL BACKUP SECTION WITH MONTH SELECTOR */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  size={20}
                  className="text-amber-500 shrink-0 mt-0.5"
                />
                <div className="w-full">
                  <h3 className="text-amber-500 font-bold text-sm mb-1">
                    Recommended: Safe Backup
                  </h3>
                  <p className="text-amber-100/60 text-xs mb-3 leading-relaxed">
                    Before wiping, please download the backup for a specific
                    month to prevent browser crash.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                    <input
                      type="month"
                      value={backupMonth}
                      onChange={(e) => setBackupMonth(e.target.value)}
                      style={{ colorScheme: "dark" }}
                      className="w-full sm:w-32 bg-zinc-900/50 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none transition-all"
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleFullBackup(backupMonth)}
                      className="w-full sm:flex-1 h-9 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/30"
                    >
                      <Download size={14} className="mr-2" /> Download Backup
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-red-100/70 text-sm mb-4">
              This action will{" "}
              <strong className="text-red-500">PERMANENTLY DELETE ALL</strong>{" "}
              invoice records. Please enter your Admin password to confirm.
            </p>
            <div className="relative mb-8">
              <input
                type={showPassword ? "text" : "password"}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your admin password..."
                className="w-full bg-zinc-900/50 border border-red-900/30 focus:border-red-500/50 rounded-xl px-4 py-3 text-red-100 outline-none transition-all"
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
                className="h-11 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleWipeAll}
                disabled={wiping || !deletePassword}
                className="h-11 rounded-xl flex items-center gap-2"
              >
                {wiping ? (
                  <RefreshCcw size={16} className="animate-spin" />
                ) : null}{" "}
                {wiping ? "Wiping..." : "Confirm Wipe"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Delete Invoice?"
        message="Are you sure you want to delete this invoice?"
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
};

export default InvoiceList;
