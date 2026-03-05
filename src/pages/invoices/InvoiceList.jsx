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
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const InvoiceList = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🚀 Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterAmount, setFilterAmount] = useState("All");
  const [filterDate, setFilterDate] = useState("All");
  const [filterExactDate, setFilterExactDate] = useState(""); // 📅 New Exact Date State

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [warningTooltip, setWarningTooltip] = useState(null);
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    itemName: "",
  });

  const isManager = admin?.data?.role === "manager";

  const fetchInvoices = async () => {
    try {
      const { data } = await invoiceService.getAllInvoices();
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleExport = () => {
    try {
      if (filteredInvoices.length === 0)
        return toast.info("No invoices to export");
      const headers = ["Date,Invoice No,Client Name,Status,Total Amount"];
      const rows = filteredInvoices.map((inv) => {
        const date = inv.date
          ? `\t${new Date(inv.date).toLocaleDateString("en-GB")}`
          : "-";
        const number = inv.invoiceNumber || "-";
        const client = `"${inv.client?.name || "Unknown"}"`;
        const status = inv.status || "Pending";
        const amount = inv.grandTotal || 0;
        return `${date},${number},${client},${status},${amount}`;
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Filtered_Invoices_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Filtered list exported successfully");
    } catch (error) {
      toast.error("Failed to export invoices");
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
    setHistoryModal({
      isOpen: true,
      data: sortedHistory,
      itemName: `${inv?.invoiceNumber} - ${inv?.client?.name}`,
    });
  };

  // 🚀 ADVANCED FILTERING LOGIC
  const filteredInvoices = invoices.filter((inv) => {
    // 1. Search Filter
    const matchesSearch =
      inv.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Status Filter
    const matchesStatus = filterStatus === "All" || inv.status === filterStatus;

    // 3. Amount Filter
    let matchesAmount = true;
    if (filterAmount !== "All") {
      const amount = Number(inv.grandTotal) || 0;
      if (filterAmount === "Under10k") matchesAmount = amount < 10000;
      else if (filterAmount === "10k-50k")
        matchesAmount = amount >= 10000 && amount <= 50000;
      else if (filterAmount === "Above50k") matchesAmount = amount > 50000;
    }

    // 4. 📅 Date Filter (Exact Date OR Range)
    let matchesDate = true;
    if (filterExactDate && inv.date) {
      // Compare exact date string (YYYY-MM-DD)
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

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 border border-emerald-500/20">
              <FileText size={24} />
            </div>
            Invoice Ledger
          </h1>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-2 text-xs border-emerald-900/30 hover:bg-emerald-900/10"
            onClick={handleExport}
          >
            <Download size={16} /> Export
          </Button>
          <Link to="/enterprise/invoices/create">
            <Button className="gap-2 shadow-lg shadow-emerald-900/20">
              <Plus size={18} /> Create
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-[#050a08] rounded-2xl shadow-xl border border-emerald-900/30 overflow-visible relative">
        {/* Top Search Bar */}
        <div className="p-5 border-b border-emerald-900/20 flex flex-col md:flex-row justify-between gap-4 items-center bg-[#020403]/50">
          <div className="relative w-full md:w-96">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/30"
            />
            <input
              type="text"
              placeholder="Search by client or invoice number..."
              className="w-full bg-[#020403] border border-emerald-900/40 rounded-xl pl-9 pr-3 py-2.5 text-sm text-emerald-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-emerald-100/40 text-xs font-mono">
            Showing {filteredInvoices.length} result(s)
          </div>
        </div>

        {/* 🚀 FILTER BAR WITH EXACT DATE PICKER */}
        <div className="p-3 border-b border-emerald-900/20 flex flex-wrap items-center gap-3 bg-[#020403]/80">
          <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold uppercase tracking-wider px-2 border-r border-emerald-900/40 mr-2">
            <Filter size={14} /> Filters
            {activeFiltersCount > 0 && (
              <span className="bg-emerald-500 text-[#020403] px-1.5 rounded-full ml-1">
                {activeFiltersCount}
              </span>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`text-xs px-3 py-1.5 rounded-full border outline-none cursor-pointer transition-colors ${filterStatus !== "All" ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-transparent border-emerald-900/40 text-emerald-100/60 hover:border-emerald-500/30"}`}
          >
            <option value="All" className="bg-[#050a08] text-emerald-100">
              All Status
            </option>
            <option value="Pending" className="bg-[#050a08] text-emerald-100">
              Pending
            </option>
            <option value="Paid" className="bg-[#050a08] text-emerald-100">
              Paid
            </option>
            <option value="Cancelled" className="bg-[#050a08] text-emerald-100">
              Cancelled
            </option>
          </select>

          {/* Amount Filter */}
          <select
            value={filterAmount}
            onChange={(e) => setFilterAmount(e.target.value)}
            className={`text-xs px-3 py-1.5 rounded-full border outline-none cursor-pointer transition-colors ${filterAmount !== "All" ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-transparent border-emerald-900/40 text-emerald-100/60 hover:border-emerald-500/30"}`}
          >
            <option value="All" className="bg-[#050a08] text-emerald-100">
              Any Amount
            </option>
            <option value="Under10k" className="bg-[#050a08] text-emerald-100">
              Under ₹10,000
            </option>
            <option value="10k-50k" className="bg-[#050a08] text-emerald-100">
              ₹10k - ₹50k
            </option>
            <option value="Above50k" className="bg-[#050a08] text-emerald-100">
              Above ₹50,000
            </option>
          </select>

          {/* Range Date Filter */}
          <select
            value={filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value);
              if (e.target.value !== "All") setFilterExactDate(""); // Reset exact date if range is selected
            }}
            className={`text-xs px-3 py-1.5 rounded-full border outline-none cursor-pointer transition-colors ${filterDate !== "All" ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-transparent border-emerald-900/40 text-emerald-100/60 hover:border-emerald-500/30"}`}
          >
            <option value="All" className="bg-[#050a08] text-emerald-100">
              Any Date
            </option>
            <option value="Last7Days" className="bg-[#050a08] text-emerald-100">
              Last 7 Days
            </option>
            <option
              value="Last30Days"
              className="bg-[#050a08] text-emerald-100"
            >
              Last 30 Days
            </option>
            <option value="ThisMonth" className="bg-[#050a08] text-emerald-100">
              This Month
            </option>
          </select>

          {/* 📅 Exact Date Calendar Filter */}
          <input
            type="date"
            value={filterExactDate}
            onChange={(e) => {
              setFilterExactDate(e.target.value);
              if (e.target.value) setFilterDate("All"); // Reset range filter if exact date is picked
            }}
            title="Pick Exact Date"
            style={{ colorScheme: "dark" }}
            className={`text-xs px-3 py-1.5 rounded-full border outline-none cursor-pointer transition-colors ${filterExactDate ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-transparent border-emerald-900/40 text-emerald-100/60 hover:border-emerald-500/30"}`}
          />

          {/* Clear Filters Button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                setFilterStatus("All");
                setFilterAmount("All");
                setFilterDate("All");
                setFilterExactDate("");
                setSearchTerm("");
              }}
              className="text-xs text-rose-400/80 hover:text-rose-400 underline underline-offset-2 ml-2 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <table className="w-full text-left min-w-max">
            <thead className="bg-[#020403] text-emerald-100/30 text-[10px] uppercase tracking-widest font-bold">
              <tr>
                <th className="p-5 md:pl-6 whitespace-nowrap">
                  Invoice # & Date
                </th>
                <th className="p-5 whitespace-nowrap min-w-[200px]">Client</th>
                <th className="p-5 whitespace-nowrap">Total Amount</th>
                <th className="p-5 whitespace-nowrap">Status</th>
                <th className="p-5 md:pr-6 text-right whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/10 text-sm">
              {filteredInvoices.map((inv) => {
                const latestEdit =
                  Array.isArray(inv?.editHistory) && inv.editHistory.length > 0
                    ? inv.editHistory[inv.editHistory.length - 1]
                    : null;
                return (
                  <tr
                    key={inv._id}
                    className="hover:bg-emerald-400/[0.02] transition-colors group"
                  >
                    <td className="p-5 md:pl-6 align-middle">
                      <div className="font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {inv.invoiceNumber || "N/A"}
                      </div>
                      <div className="text-emerald-100/40 text-[10px] mt-1 whitespace-nowrap font-medium tracking-wide">
                        {inv.date
                          ? new Date(inv.date).toLocaleDateString("en-GB")
                          : "Unknown Date"}
                      </div>
                    </td>
                    <td className="p-5 align-middle">
                      <div className="font-medium text-emerald-50 whitespace-nowrap">
                        {inv.client?.name || "Unknown"}
                      </div>
                      {/* History Badge */}
                      {Array.isArray(inv.editHistory) &&
                      inv.editHistory.length > 0 ? (
                        <div
                          onClick={() => openHistory(inv)}
                          className="mt-1.5 inline-flex flex-col gap-0.5 cursor-pointer bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg transition-all w-max whitespace-nowrap"
                        >
                          <div className="text-[9px] font-mono text-emerald-400/90 flex items-center gap-1 uppercase tracking-widest font-bold leading-none">
                            <History size={10} /> {latestEdit?.role || "ADMIN"}
                            {inv.editHistory.length > 1 && (
                              <span className="bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded text-[8px] ml-1">
                                +{inv.editHistory.length - 1} MORE
                              </span>
                            )}
                          </div>
                          <span className="text-emerald-100/30 text-[8px] ml-4 font-medium">
                            {latestEdit?.at
                              ? new Date(latestEdit.at).toLocaleString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : ""}
                          </span>
                        </div>
                      ) : inv.lastEditedRole ? (
                        <div className="text-[9px] font-mono text-emerald-400/50 font-bold mt-1.5 uppercase tracking-widest flex flex-col gap-0.5 w-max">
                          <span>✍️ {inv.lastEditedRole}</span>
                          {inv.lastEditedAt && (
                            <span className="text-emerald-100/20 normal-case tracking-normal ml-4">
                              {new Date(inv.lastEditedAt).toLocaleString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-[9px] text-emerald-100/20 mt-1 uppercase font-bold tracking-widest">
                          {inv.createdRole || "ADMIN"}
                        </div>
                      )}
                    </td>
                    <td className="p-5 font-bold text-white font-mono align-middle whitespace-nowrap">
                      ₹ {(Number(inv.grandTotal) || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="p-5 align-middle whitespace-nowrap">
                      <select
                        value={inv.status}
                        onChange={(e) =>
                          handleStatusChange(inv._id, e.target.value)
                        }
                        className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1.5 rounded-md border outline-none cursor-pointer transition-colors ${
                          inv.status === "Paid"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : inv.status === "Cancelled"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
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
                    <td className="p-5 md:pr-6 align-middle overflow-visible">
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
                            className={`p-1.5 rounded-md transition-colors ${isManager ? "text-emerald-100/10 opacity-50 cursor-not-allowed hover:bg-red-500/5 hover:text-red-400/50" : "text-emerald-100/30 hover:text-red-400 hover:bg-red-500/10"}`}
                          >
                            <Trash2 size={16} />
                          </button>
                          {warningTooltip === inv._id && (
                            <div className="absolute bottom-full right-0 mb-2 z-[9999] animate-in fade-in zoom-in-95 duration-200">
                              <div className="bg-[#050a08] border border-red-500/30 shadow-2xl text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                                <span className="bg-red-500/20 p-1 rounded text-[8px] leading-none">
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
              {filteredInvoices.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="p-10 text-center text-emerald-100/30 text-sm italic"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#050a08] border border-emerald-900/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-emerald-900/20 flex justify-between items-center bg-[#020403]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History size={18} className="text-emerald-500" /> Log History
              </h3>
              <button
                onClick={() =>
                  setHistoryModal({ isOpen: false, data: [], itemName: "" })
                }
                className="text-emerald-100/40 hover:text-white p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
              {historyModal.data.map((edit, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-[#020403] p-4 rounded-xl border border-emerald-900/20 group hover:border-emerald-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-black text-sm uppercase shadow-inner">
                      {edit.role ? edit.role.charAt(0) : "A"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-100 uppercase tracking-widest">
                        {edit.role || "Admin"}
                      </p>
                      <p className="text-[9px] text-emerald-100/30 font-mono mt-0.5">
                        {edit.by}
                      </p>
                      <p className="text-[10px] text-emerald-400/60 font-mono mt-1">
                        {edit.at
                          ? new Date(edit.at).toLocaleString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  {idx === 0 && (
                    <span className="relative z-10 text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md uppercase font-black tracking-widest border border-emerald-500/20">
                      Latest
                    </span>
                  )}
                </div>
              ))}
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
