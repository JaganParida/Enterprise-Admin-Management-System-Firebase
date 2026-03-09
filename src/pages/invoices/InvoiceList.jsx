import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const InvoiceList = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Wipe Data States
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wiping, setWiping] = useState(false);

  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";

  const fetchInvoices = async () => {
    try {
      const { data } = await invoiceService.getAllInvoices();
      setInvoices(data || []);
    } catch (error) {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Formatters
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

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "All" || inv.status === filterStatus;

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
    return matchesSearch && matchesStatus && matchesAmount && matchesDate;
  });

  const activeFiltersCount =
    [filterStatus, filterAmount, filterDate].filter((f) => f !== "All").length +
    (filterExactDate ? 1 : 0);

  const handleExport = () => {
    try {
      if (filteredInvoices.length === 0)
        return toast.info("No invoices to export");
      const headers = [
        "Date,Invoice No,Client Name,Status,SubTotal,GST Rate,Grand Total",
      ];
      const rows = filteredInvoices.map((inv) => {
        const date = inv.date
          ? `\t${new Date(inv.date).toLocaleDateString("en-GB")}`
          : "-";
        // Strip INV- prefix for export
        const number = inv.invoiceNumber
          ? String(inv.invoiceNumber).replace(/^INV-/i, "")
          : "-";
        const client = `"${inv.client?.name || "Unknown"}"`;
        const status = inv.status || "Pending";
        return `${date},${number},${client},${status},${inv.subTotal || 0},${inv.gstRate || 0}%,${inv.grandTotal || 0}`;
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Invoices_Export_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Exported successfully");
    } catch (error) {
      toast.error("Failed to export");
    }
  };

  const handleFullBackup = () => {
    try {
      if (invoices.length === 0) return toast.info("Database is empty.");
      // Removed Phone from export headers to match requirements
      const headers = [
        "Date,Invoice No,Client Name,SubTotal,GST Rate,Grand Total,Status",
      ];
      const rows = invoices.map((inv) => {
        const dateStr = inv.date
          ? `\t${new Date(inv.date).toLocaleDateString("en-GB")}`
          : "-";
        // Strip INV- prefix for backup
        const number = String(inv.invoiceNumber || "").replace(/^INV-/i, "");
        return `${dateStr},"${number}","${inv.client?.name || ""}",${inv.subTotal || 0},${inv.gstRate || 0}%,${inv.grandTotal || 0},"${inv.status || ""}"`;
      });
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute(
        "download",
        `Full_Invoices_Database_Backup_${new Date().toISOString().split("T")[0]}.csv`,
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
      // Passing both password and admin email to strictly verify identity
      const adminEmail = admin?.data?.email || admin?.email;
      await invoiceService.deleteAllInvoices({
        password: deletePassword,
        email: adminEmail,
      });
      toast.success("Invoices database cleared successfully.");
      setIsDeleteAllOpen(false);
      setDeletePassword("");
      setShowPassword(false);
      fetchInvoices();
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
      fetchInvoices();
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
      await invoiceService.deleteInvoice(deleteModal.id);
      toast.info("Invoice deleted successfully");
      fetchInvoices();
    } catch (error) {
      toast.error("Failed to delete invoice");
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const openHistory = (inv) => {
    const sortedHistory = Array.isArray(inv?.editHistory)
      ? [...inv.editHistory].reverse()
      : [];
    // Strip INV- prefix for modal title
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

  if (loading) return <Loader />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 px-4 print:w-full print:max-w-none print:m-0 print:p-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 border border-emerald-500/20">
            <FileText size={24} />
          </div>
          Invoice Ledger
        </h1>
        <div className="flex gap-3">
          <div className="relative">
            <button
              onClick={() =>
                isManager
                  ? (() => {
                      setWarningTooltip("wipe-all");
                      setTimeout(() => setWarningTooltip(null), 2500);
                    })()
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
          <Button
            variant="outline"
            className="gap-2 text-xs border-emerald-900/30 hover:bg-emerald-900/10"
            onClick={handleExport}
          >
            <Download size={16} /> Export
          </Button>
          <Link to="/enterprise/invoices/create">
            <Button className="gap-2 shadow-lg shadow-emerald-900/20 h-full">
              <Plus size={18} /> Create Bill
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-[#050a08] rounded-2xl shadow-xl border border-emerald-900/30 overflow-visible relative print:shadow-none print:border-none print:bg-white">
        <div className="p-5 border-b border-emerald-900/20 flex flex-col md:flex-row justify-between gap-4 items-center bg-[#020403]/50 print:hidden">
          <div className="relative w-full md:w-96">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/30"
            />
            <input
              type="text"
              placeholder="Search by client or invoice number..."
              className="w-full bg-[#020403] border border-emerald-900/40 rounded-xl pl-9 pr-3 py-2.5 text-sm text-emerald-100 focus:border-emerald-500/50 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-emerald-100/40 text-xs font-mono">
            Showing {filteredInvoices.length} bill(s)
          </div>
        </div>

        <div className="p-3 border-b border-emerald-900/20 flex flex-wrap items-center gap-3 bg-[#020403]/80 print:hidden">
          <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold uppercase tracking-wider px-2 border-r border-emerald-900/40 mr-2">
            <Filter size={14} /> Filters
            {activeFiltersCount > 0 && (
              <span className="bg-emerald-500 text-[#020403] px-1.5 rounded-full ml-1">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`text-xs px-3 py-1.5 rounded-full border outline-none cursor-pointer transition-colors ${filterStatus !== "All" ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-transparent border-emerald-900/40 text-emerald-100/60"}`}
          >
            <option value="All" className="bg-[#050a08]">
              All Status
            </option>
            <option value="Pending" className="bg-[#050a08]">
              Pending
            </option>
            <option value="Paid" className="bg-[#050a08]">
              Paid
            </option>
            <option value="Cancelled" className="bg-[#050a08]">
              Cancelled
            </option>
          </select>
          <select
            value={filterAmount}
            onChange={(e) => setFilterAmount(e.target.value)}
            className={`text-xs px-3 py-1.5 rounded-full border outline-none cursor-pointer transition-colors ${filterAmount !== "All" ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-transparent border-emerald-900/40 text-emerald-100/60"}`}
          >
            <option value="All" className="bg-[#050a08]">
              Any Amount
            </option>
            <option value="Under10k" className="bg-[#050a08]">
              Under ₹10,000
            </option>
            <option value="10k-50k" className="bg-[#050a08]">
              ₹10k - ₹50k
            </option>
            <option value="Above50k" className="bg-[#050a08]">
              Above ₹50,000
            </option>
          </select>
          <select
            value={filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value);
              if (e.target.value !== "All") setFilterExactDate("");
            }}
            className={`text-xs px-3 py-1.5 rounded-full border outline-none cursor-pointer transition-colors ${filterDate !== "All" ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-transparent border-emerald-900/40 text-emerald-100/60"}`}
          >
            <option value="All" className="bg-[#050a08]">
              Any Date
            </option>
            <option value="Last7Days" className="bg-[#050a08]">
              Last 7 Days
            </option>
            <option value="Last30Days" className="bg-[#050a08]">
              Last 30 Days
            </option>
            <option value="ThisMonth" className="bg-[#050a08]">
              This Month
            </option>
          </select>
          <input
            type="date"
            value={filterExactDate}
            onChange={(e) => {
              setFilterExactDate(e.target.value);
              if (e.target.value) setFilterDate("All");
            }}
            style={{ colorScheme: "dark" }}
            className={`text-xs px-3 py-1.5 rounded-full border bg-transparent cursor-pointer ${filterExactDate ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-emerald-900/40 text-emerald-100/60"}`}
          />
          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                setFilterStatus("All");
                setFilterAmount("All");
                setFilterDate("All");
                setFilterExactDate("");
                setSearchTerm("");
              }}
              className="text-xs text-rose-400/80 hover:text-rose-400 underline ml-2"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="overflow-x-auto pb-4 custom-scrollbar print:overflow-visible print:w-full">
          <table className="w-full text-left min-w-max print:min-w-0">
            <thead className="bg-[#020403] text-emerald-100/30 text-[10px] uppercase tracking-widest font-bold print:bg-white print:text-black">
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
            <tbody className="divide-y divide-emerald-900/10 text-sm print:divide-gray-200">
              {filteredInvoices.map((inv) => (
                <tr
                  key={inv._id}
                  className="hover:bg-emerald-400/[0.02] transition-colors group print:text-black"
                >
                  <td className="p-5 md:pl-6 align-middle">
                    <div className="font-mono font-bold text-emerald-400 whitespace-nowrap print:text-black">
                      {/* Dynamically strip INV- for display */}
                      {inv.invoiceNumber
                        ? String(inv.invoiceNumber).replace(/^INV-/i, "")
                        : "N/A"}
                    </div>
                    <div className="text-emerald-100/40 text-[10px] mt-1 whitespace-nowrap font-medium tracking-wide print:text-gray-500">
                      {inv.date
                        ? new Date(inv.date).toLocaleDateString("en-GB")
                        : "Unknown Date"}
                    </div>
                  </td>
                  <td className="p-5 align-middle">
                    <div className="font-medium text-emerald-50 whitespace-nowrap print:text-black">
                      {inv.client?.name || "Unknown"}
                    </div>
                    {Array.isArray(inv.editHistory) &&
                      inv.editHistory.length > 0 && (
                        <div
                          onClick={() => openHistory(inv)}
                          className="mt-1.5 inline-flex flex-col gap-0.5 cursor-pointer bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg transition-all w-max print:hidden"
                        >
                          <div className="text-[9px] font-mono text-emerald-400/90 flex items-center gap-1 uppercase tracking-widest font-bold leading-none">
                            <History size={10} />{" "}
                            {inv.editHistory[inv.editHistory.length - 1]
                              ?.role || "ADMIN"}
                          </div>
                          <span className="text-emerald-100/30 text-[8px] ml-4 font-medium">
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
                        className="bg-[#020403] text-amber-400"
                      >
                        Pending
                      </option>
                      <option
                        value="Paid"
                        className="bg-[#020403] text-emerald-400"
                      >
                        Paid
                      </option>
                      <option
                        value="Cancelled"
                        className="bg-[#020403] text-rose-400"
                      >
                        Cancelled
                      </option>
                    </select>
                  </td>
                  <td className="p-5 md:pr-6 align-middle overflow-visible print:hidden">
                    <div className="flex justify-end gap-1.5 items-center relative overflow-visible">
                      <Link
                        to={`/enterprise/invoices/view/${inv._id}`}
                        className="p-1.5 text-emerald-100/30 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors"
                        title="View PDF"
                      >
                        <Eye size={16} />
                      </Link>
                      <Link
                        to={`/enterprise/invoices/edit/${inv._id}`}
                        className="p-1.5 text-emerald-100/30 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors"
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
                          className={`p-1.5 rounded-md transition-colors ${isManager ? "text-emerald-100/10 opacity-50 cursor-not-allowed" : "text-emerald-100/30 hover:text-red-400 hover:bg-red-500/10"}`}
                        >
                          <Trash2 size={16} />
                        </button>
                        {warningTooltip === inv._id && (
                          <div className="absolute bottom-full right-0 mb-2 z-[9999] bg-[#050a08] border border-red-500/30 shadow-2xl text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
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
              {filteredInvoices.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="p-10 text-center text-emerald-100/30 text-sm italic print:text-black"
                  >
                    No invoices match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Modal */}
      {historyModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-[#050a08] border border-emerald-900/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative Z-50">
            <div className="p-5 border-b border-emerald-900/20 flex justify-between items-center bg-[#020403]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History size={18} className="text-emerald-500" /> Log History:{" "}
                <span className="text-emerald-400 text-sm ml-1">
                  {historyModal.itemName}
                </span>
              </h3>
              <button
                onClick={() =>
                  setHistoryModal({ isOpen: false, data: [], itemName: "" })
                }
                className="text-emerald-100/40 hover:text-white p-1 hover:bg-emerald-500/10 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
              {historyModal.data.map((edit, idx) => (
                <div
                  key={idx}
                  className="bg-[#020403] border border-emerald-900/20 rounded-xl p-4 flex items-center justify-between group hover:border-emerald-500/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-black text-lg uppercase shadow-inner">
                      {edit.role ? edit.role.charAt(0) : "A"}
                    </div>
                    <div>
                      <div className="text-emerald-100 font-bold uppercase tracking-widest text-sm">
                        {edit.role || "Admin"}
                      </div>
                      <div className="text-emerald-100/40 text-[10px] font-mono lowercase">
                        {edit.by}
                      </div>
                      <div className="text-emerald-400/80 text-[10px] font-mono mt-1 tracking-wider">
                        {formatModalDate(edit.at)}
                      </div>
                    </div>
                  </div>
                  {idx === 0 && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-3 py-1 rounded-md font-bold tracking-widest uppercase">
                      LATEST
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECURE WIPE DATA MODAL */}
      {isDeleteAllOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 print:hidden">
          <div
            className="absolute inset-0"
            onClick={() => !wiping && setIsDeleteAllOpen(false)}
          />
          <div className="bg-[#050a08] border border-red-900/50 shadow-[0_0_40px_rgba(220,38,38,0.15)] rounded-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col p-6 sm:p-8">
            <div className="flex items-center gap-3 text-red-500 mb-6">
              <AlertOctagon size={28} />
              <h2 className="text-xl font-bold tracking-wide">
                Wipe Invoice Database
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
                    a complete CSV backup of all your current invoice records.
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
              invoice records. Please enter your Admin password to confirm.
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
