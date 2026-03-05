import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import invoiceService from "../../services/invoiceService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Plus,
  Trash2,
  Save,
  FileText,
  ArrowLeft,
  RefreshCcw,
} from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const EditInvoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useUI();
  const { admin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [auditInfo, setAuditInfo] = useState(null);

  // Invoice State
  const [client, setClient] = useState({
    name: "",
    phone: "",
    address: "",
    gst: "",
  });
  const [items, setItems] = useState([
    { id: 1, name: "", quantity: 1, price: 0, total: 0 },
  ]);
  const [gstRate, setGstRate] = useState(18);
  const [invoiceDate, setInvoiceDate] = useState("");
  const [status, setStatus] = useState("Pending");
  const [invoiceNumber, setInvoiceNumber] = useState("");

  const [totals, setTotals] = useState({
    subTotal: 0,
    gstAmount: 0,
    grandTotal: 0,
  });

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const { data } = await invoiceService.getInvoiceById(id);
        setClient(data.client);
        setItems(data.items);
        setGstRate(data.gstRate);
        setInvoiceDate(data.date);
        setStatus(data.status);
        setInvoiceNumber(data.invoiceNumber);

        if (data.lastEditedAt) {
          setAuditInfo({
            role: data.lastEditedRole || "Admin",
            at: new Date(data.lastEditedAt).toLocaleString(),
          });
        }
      } catch (error) {
        console.error("Fetch Error:", error);
        toast.error("Could not load invoice data.");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  useEffect(() => {
    const subTotal = items.reduce((acc, item) => acc + (item.total || 0), 0);
    const gstAmount = (subTotal * gstRate) / 100;
    const grandTotal = subTotal + gstAmount;
    setTotals({ subTotal, gstAmount, grandTotal });
  }, [items, gstRate]);

  const handleItemChange = (itemId, field, value) => {
    const newItems = items.map((item) => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        const qty = parseFloat(updatedItem.quantity) || 0;
        const price = parseFloat(updatedItem.price) || 0;
        updatedItem.total = qty * price;
        return updatedItem;
      }
      return item;
    });
    setItems(newItems);
  };

  const addItem = () =>
    setItems([
      ...items,
      { id: Date.now(), name: "", quantity: 1, price: 0, total: 0 },
    ]);
  const removeItem = (itemId) => {
    if (items.length > 1) setItems(items.filter((item) => item.id !== itemId));
  };

  const handleFormSubmitClick = (e) => {
    e.preventDefault();
    setIsDialogOpen(true);
  };

  const executeUpdate = async () => {
    setSaving(true);
    if (!client.name) {
      setSaving(false);
      setIsDialogOpen(false);
      return toast.error("Client name is required");
    }

    const invoiceData = {
      client,
      items,
      date: invoiceDate,
      subTotal: totals.subTotal,
      gstRate,
      gstAmount: totals.gstAmount,
      grandTotal: totals.grandTotal,
      status,
      invoiceNumber,
    };

    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await invoiceService.updateInvoice(id, invoiceData, currentUser);
      toast.success("Invoice updated successfully!");
      navigate("/enterprise/invoices");
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error(error.response?.data?.message || "Failed to update invoice");
    } finally {
      setSaving(false);
      setIsDialogOpen(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        onClick={() => navigate("/enterprise/invoices")}
        className="flex items-center text-emerald-100/50 hover:text-white mb-2 transition-colors"
      >
        <ArrowLeft size={18} className="mr-2" /> Back to Invoices
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 border border-emerald-500/20">
              <FileText size={24} />
            </div>
            Edit Invoice:{" "}
            <span className="text-emerald-400">{invoiceNumber}</span>
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-[#050a08] border border-emerald-900/30 text-emerald-100 text-sm rounded-xl px-4 py-3 sm:py-2 outline-none focus:border-emerald-500/50 w-full sm:w-auto"
          >
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <div className="text-emerald-100/60 text-sm font-mono border border-emerald-900/30 px-4 py-3 sm:py-2 rounded-xl bg-[#050a08] w-full sm:w-auto text-center sm:text-left">
            Date:{" "}
            <span className="text-emerald-400 font-bold">{invoiceDate}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleFormSubmitClick} className="space-y-8">
        {/* Client Details */}
        <div className="bg-[#050a08] p-6 md:p-8 rounded-2xl border border-emerald-900/30 shadow-lg relative overflow-hidden">
          <h3 className="text-lg font-bold text-white mb-6 border-b border-emerald-900/20 pb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>{" "}
            Client Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Client Name"
              value={client.name}
              onChange={(e) => setClient({ ...client, name: e.target.value })}
              required
            />
            <Input
              label="Phone Number"
              value={client.phone}
              onChange={(e) => setClient({ ...client, phone: e.target.value })}
              required
            />
            <Input
              label="Address"
              value={client.address}
              onChange={(e) =>
                setClient({ ...client, address: e.target.value })
              }
              className="md:col-span-2"
            />
            <Input
              label="GSTIN (Optional)"
              value={client.gst}
              onChange={(e) => setClient({ ...client, gst: e.target.value })}
            />
          </div>
        </div>

        {/* Items */}
        <div className="bg-[#050a08] p-6 md:p-8 rounded-2xl border border-emerald-900/30 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-6 border-b border-emerald-900/20 pb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-teal-500 rounded-full"></span> Invoice
            Items
          </h3>
          <div className="overflow-x-auto pb-4 custom-scrollbar">
            <table className="w-full text-left mb-4 min-w-[750px]">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-emerald-100/40 border-b border-emerald-900/20">
                  <th className="pb-3 w-[40%] pl-2">Item Description</th>
                  <th className="pb-3 w-24">Qty</th>
                  <th className="pb-3 w-32">Price (₹)</th>
                  <th className="pb-3 w-32">Total</th>
                  <th className="pb-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/10">
                {items.map((item) => (
                  <tr key={item.id} className="group">
                    <td className="py-4 pr-3 pl-2">
                      <input
                        type="text"
                        className="w-full bg-[#020403] border border-emerald-900/30 rounded-lg px-4 py-3 text-emerald-100 focus:border-emerald-500/50 outline-none text-sm"
                        value={item.name}
                        onChange={(e) =>
                          handleItemChange(item.id, "name", e.target.value)
                        }
                        required
                      />
                    </td>
                    <td className="py-4 pr-3">
                      <input
                        type="number"
                        step="any"
                        className="w-full bg-[#020403] border border-emerald-900/30 rounded-lg px-3 py-3 text-emerald-100 focus:border-emerald-500/50 outline-none text-sm text-center"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(item.id, "quantity", e.target.value)
                        }
                        min="0"
                      />
                    </td>
                    <td className="py-4 pr-3">
                      <input
                        type="number"
                        step="any"
                        className="w-full bg-[#020403] border border-emerald-900/30 rounded-lg px-3 py-3 text-emerald-100 focus:border-emerald-500/50 outline-none text-sm text-right"
                        value={item.price}
                        onChange={(e) =>
                          handleItemChange(item.id, "price", e.target.value)
                        }
                        min="0"
                      />
                    </td>
                    <td className="py-4 font-bold text-emerald-400 font-mono text-sm whitespace-nowrap">
                      ₹{" "}
                      {(item.total || 0).toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-4 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-emerald-900/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors p-2 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={addItem}
            className="text-xs mt-2 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
          >
            <Plus size={16} /> Add Another Item
          </Button>
        </div>

        {/* Totals */}
        <div className="bg-[#050a08] p-6 rounded-2xl border border-emerald-900/30 shadow-lg">
          <div className="flex justify-end">
            <div className="w-full md:w-1/2 space-y-4">
              <div className="flex justify-between text-emerald-100/60 text-sm">
                <span>Sub Total:</span>
                <span className="font-mono text-emerald-100">
                  ₹{" "}
                  {totals.subTotal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center text-emerald-100/60 text-sm">
                <span>GST Rate:</span>
                <select
                  className="bg-[#020403] border border-emerald-900/30 rounded-lg px-3 py-2 text-emerald-100 outline-none focus:border-emerald-500/50"
                  value={gstRate}
                  onChange={(e) => setGstRate(parseFloat(e.target.value))}
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>
              <div className="flex justify-between text-emerald-100/60 text-sm">
                <span>GST Amount:</span>
                <span className="font-mono text-emerald-100">
                  ₹{" "}
                  {totals.gstAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="border-t border-emerald-900/30 pt-4 flex justify-between text-xl font-bold text-emerald-400">
                <span>Grand Total:</span>
                <span>
                  ₹{" "}
                  {totals.grandTotal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {auditInfo && (
          <div className="pt-2 text-center text-[10px] font-mono text-emerald-100/30 uppercase tracking-widest border-t border-emerald-900/10 mt-6 pt-4">
            Last updated by{" "}
            <span className="text-emerald-400/70 font-bold tracking-widest">
              {auditInfo.role}
            </span>{" "}
            on {auditInfo.at}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pb-8">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/enterprise/invoices")}
            className="w-full sm:w-auto text-emerald-100/60 hover:text-white"
          >
            Discard Changes
          </Button>
          <Button
            type="submit"
            className="w-full sm:w-auto px-8 shadow-emerald-500/20"
            disabled={saving}
          >
            {saving ? (
              <RefreshCcw size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {saving ? " Updating..." : " Update Invoice"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={executeUpdate}
        title="Update Invoice"
        message="Are you sure you want to save changes to this invoice?"
        confirmText="Save Update"
        isDestructive={false}
      />
    </div>
  );
};

export default EditInvoice;
