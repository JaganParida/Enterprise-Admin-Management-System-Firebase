import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import invoiceService from "../../services/invoiceService";
import { useUI } from "../../context/UIProvider";
import { FileText, Plus, Eye, Search, Trash2, Download } from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
// ✅ IMPORT CONFIRM DIALOG HERE
import ConfirmDialog from "../../components/common/ConfirmDialog";

const InvoiceList = () => {
  const { toast } = useUI(); // Removed confirm hook
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ ADDED STATES FOR DIALOG
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  const fetchInvoices = async () => {
    try {
      // ✅ REMOVED ARTIFICIAL TIMEOUT DELAY FOR INSTANT LOADING
      const { data } = await invoiceService.getAllInvoices();

      setInvoices(data);
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
      if (invoices.length === 0) {
        return toast.info("No invoices to export");
      }

      const headers = ["Date,Invoice No,Client Name,Status,Total Amount"];

      const rows = invoices.map((inv) => {
        const date = inv.date
          ? `\t${new Date(inv.date).toLocaleDateString("en-GB")}`
          : "-";

        const number = inv.invoiceNumber || "-";
        const client = `"${inv.client.name || "Unknown"}"`;
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
        `Invoice_List_${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Invoice list exported successfully");
    } catch (error) {
      console.error("Export Error:", error);
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

      await invoiceService.updateStatus(id, newStatus);
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update status");
      fetchInvoices();
    }
  };

  // ✅ 1. TRIGGER DIALOG
  const handleDeleteClick = (id) => {
    setDeleteModal({ isOpen: true, id });
  };

  // ✅ 2. EXECUTE DELETE
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

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) return <Loader />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 border border-emerald-500/20">
              <FileText size={24} />
            </div>
            Invoice History
          </h1>
          <p className="text-emerald-100/40 text-sm mt-1 ml-1">
            Manage, track, and update customer invoices.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-2 text-xs border-emerald-900/30 hover:bg-emerald-900/10"
            onClick={handleExport}
          >
            <Download size={16} /> Export CSV
          </Button>

          <Link to="/enterprise/invoices/create">
            <Button className="gap-2 shadow-lg shadow-emerald-900/20">
              <Plus size={18} /> New Invoice
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-[#050a08] rounded-2xl shadow-xl border border-emerald-900/30 overflow-hidden">
        <div className="p-6 border-b border-emerald-900/20 flex flex-col sm:flex-row justify-between gap-4 items-center">
          <h2 className="text-lg font-bold text-white">Recent Invoices</h2>
          <div className="relative w-full sm:w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/30"
            />
            <input
              type="text"
              placeholder="Search client or invoice #..."
              className="w-full bg-[#020403] border border-emerald-900/30 rounded-xl pl-9 pr-3 py-2 text-sm text-emerald-100 focus:border-emerald-500/50 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#020403] text-emerald-100/40 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-5 md:pl-6">Invoice #</th>
                <th className="p-5">Client</th>
                <th className="p-5">Date</th>
                <th className="p-5">Total Amount</th>
                <th className="p-5">Status</th>
                <th className="p-5 md:pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/20 text-sm">
              {filteredInvoices.map((inv) => (
                <tr
                  key={inv._id}
                  className="hover:bg-emerald-900/10 transition-colors group"
                >
                  <td className="p-5 md:pl-6 font-mono font-bold text-emerald-400">
                    {inv.invoiceNumber}
                  </td>
                  <td className="p-5 font-medium text-emerald-100/80">
                    {inv.client.name}
                  </td>
                  <td className="p-5 text-emerald-100/50">
                    {new Date(inv.date).toLocaleDateString()}
                  </td>
                  <td className="p-5 font-bold text-white font-mono">
                    ₹ {inv.grandTotal.toLocaleString()}
                  </td>
                  <td className="p-5">
                    <select
                      value={inv.status}
                      onChange={(e) =>
                        handleStatusChange(inv._id, e.target.value)
                      }
                      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded border outline-none cursor-pointer transition-colors ${
                        inv.status === "Paid"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : inv.status === "Cancelled"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="p-5 md:pr-6 flex justify-end gap-2">
                    <Link
                      to={`/enterprise/invoices/view/${inv._id}`}
                      className="p-2 text-emerald-100/40 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                    >
                      <Eye size={18} />
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(inv._id)}
                      className="p-2 text-emerald-100/20 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="p-8 text-center text-emerald-100/30 text-sm"
                  >
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ ADDED CONFIRM DIALOG MOUNT */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Delete Invoice?"
        message="Are you sure you want to delete this invoice? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
};

export default InvoiceList;
