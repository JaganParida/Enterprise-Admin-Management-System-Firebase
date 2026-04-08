import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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
  LayoutTemplate,
} from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import ConfirmDialog from "../../components/common/ConfirmDialog";

// 🚀 NEW EDIT INVOICE SKELETON
const EditInvoiceSkeleton = () => (
  <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4 w-full flex flex-col">
    <div className="w-32 h-5 bg-zinc-800/50 rounded-md animate-pulse mb-2"></div>
    {/* Header */}
    <div className="bg-[#0A0A0C] p-6 rounded-2xl border border-white/5 h-[100px] animate-pulse flex justify-between items-center">
      <div className="flex gap-4 items-center">
        <div className="w-14 h-14 bg-zinc-800/60 rounded-xl"></div>
        <div>
          <div className="w-40 h-6 bg-zinc-800/60 rounded mb-2"></div>
          <div className="w-48 h-3 bg-zinc-800/40 rounded"></div>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="w-40 h-11 bg-zinc-800/50 rounded-xl"></div>
        <div className="w-32 h-11 bg-zinc-800/50 rounded-xl"></div>
        <div className="w-36 h-11 bg-zinc-800/50 rounded-xl"></div>
      </div>
    </div>
    {/* Purchaser */}
    <div className="bg-[#0A0A0C] p-6 lg:p-8 rounded-2xl border border-white/5 animate-pulse">
      <div className="w-48 h-6 bg-zinc-800/60 rounded mb-6"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
        <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
        <div className="md:col-span-2 h-12 w-full bg-zinc-800/40 rounded-xl"></div>
        <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
      </div>
    </div>
    {/* Table */}
    <div className="bg-[#0A0A0C] p-6 lg:p-8 rounded-2xl border border-white/5 animate-pulse h-[300px]">
      <div className="w-48 h-6 bg-zinc-800/60 rounded mb-6"></div>
      <div className="w-full h-10 bg-zinc-800/50 rounded-lg mb-4"></div>
      <div className="w-full h-12 bg-zinc-800/40 rounded-xl mb-3"></div>
      <div className="w-full h-12 bg-zinc-800/40 rounded-xl"></div>
    </div>
    {/* Totals */}
    <div className="bg-[#0A0A0C] p-6 lg:p-8 rounded-2xl border border-white/5 animate-pulse flex justify-end">
      <div className="w-full md:w-96 space-y-4">
        <div className="h-4 w-full bg-zinc-800/50 rounded"></div>
        <div className="h-8 w-full bg-zinc-800/40 rounded"></div>
        <div className="h-8 w-full bg-zinc-800/60 rounded mt-4"></div>
      </div>
    </div>
    {/* Actions */}
    <div className="flex justify-end gap-4 pb-10">
      <div className="h-12 w-32 bg-zinc-800/50 rounded-xl"></div>
      <div className="h-12 w-48 bg-zinc-800/60 rounded-xl"></div>
    </div>
  </div>
);

// Configuration for templates logic
const TEMPLATES = {
  MAA: { id: "MAA", label: "Maa Flyash (Blue)", hasQuantity: true },
  SANJIB: { id: "SANJIB", label: "Sanjib Parida (B&W)", hasQuantity: true },
  SANDEEP: {
    id: "SANDEEP",
    label: "Sandeep Parida (Yellow)",
    hasQuantity: true,
  },
  SACHIDA: {
    id: "SACHIDA",
    label: "Sachida Nanda (Service)",
    hasQuantity: false,
  },
};

const EditInvoice = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useUI();
  const { admin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [auditInfo, setAuditInfo] = useState(null);

  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  // Premium Theme Colors
  const theme = {
    primaryText: isTransport ? "text-cyan-400" : "text-indigo-400",
    primaryBg: isTransport ? "bg-cyan-500/10" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-cyan-500/20" : "border-indigo-500/20",
    primaryFocus: isTransport
      ? "focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
      : "focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500",
    indicatorLine: isTransport ? "bg-cyan-500" : "bg-indigo-500",
    gradientBg: isTransport
      ? "from-cyan-600 to-blue-600"
      : "from-indigo-600 to-purple-600",
  };

  const [templateType, setTemplateType] = useState("MAA");
  const [client, setClient] = useState({ name: "", address: "", gst: "" });
  const [items, setItems] = useState([]);
  const [gstRate, setGstRate] = useState(5);
  const [invoiceDate, setInvoiceDate] = useState("");
  const [status, setStatus] = useState("Pending");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [errors, setErrors] = useState({});
  const [totals, setTotals] = useState({
    subTotal: 0,
    gstAmount: 0,
    cgst: 0,
    sgst: 0,
    grandTotal: 0,
  });

  const activeConfig = TEMPLATES[templateType];

  const getLabels = () => {
    if (templateType === "SACHIDA") {
      return {
        section: "Customer Details",
        name: "Name of the Customer / Party",
        desc: "DESCRIPTION OF SERVICE",
        qty: "Quantity",
        rate: "Price",
      };
    }
    if (templateType === "SANDEEP") {
      return {
        section: "Purchaser Details",
        name: "Name of the Purchaser",
        desc: "Description of Goods",
        qty: "Quantity",
        rate: "Unit Price",
      };
    }
    return {
      section: "Purchaser Details",
      name: "Name of the Purchaser",
      desc: "Description of Goods",
      qty: "Qnty",
      rate: "Rate / Price",
    };
  };
  const labels = getLabels();

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const { data } = await invoiceService.getInvoiceById(id);
        setTemplateType(data.templateType || "MAA");
        const { phone, ...clientDataWithoutPhone } = data.client;
        setClient(clientDataWithoutPhone);
        setItems(data.items.map((item) => ({ ...item, isCustom: true })));
        setGstRate(data.gstRate || 5);
        setInvoiceDate(
          data.date ? new Date(data.date).toISOString().split("T")[0] : "",
        );
        setStatus(data.status);
        setInvoiceNumber((data.invoiceNumber || "").replace(/^INV-/, ""));
        if (data.lastEditedAt) {
          setAuditInfo({
            role: data.lastEditedRole || "Admin",
            at: new Date(data.lastEditedAt).toLocaleString("en-GB"),
          });
        }
      } catch (error) {
        toast.error("Could not load invoice data.");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  useEffect(() => {
    setItems((prev) =>
      prev.map((item) => {
        const qty = activeConfig.hasQuantity
          ? parseFloat(item.quantity) || 0
          : 1;
        const price = parseFloat(item.price) || 0;
        return { ...item, total: qty * price };
      }),
    );
  }, [activeConfig.hasQuantity]);

  useEffect(() => {
    const subTotal = items.reduce((acc, item) => acc + (item.total || 0), 0);
    const gstAmount = (subTotal * gstRate) / 100;
    setTotals({
      subTotal,
      gstAmount,
      cgst: gstAmount / 2,
      sgst: gstAmount / 2,
      grandTotal: subTotal + gstAmount,
    });
  }, [items, gstRate]);

  const handleClientChange = (field, value) => {
    setClient({ ...client, [field]: value });
  };

  const handleItemChange = (itemId, field, value) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          let updated = { ...item, [field]: value };
          const qty = activeConfig.hasQuantity
            ? parseFloat(updated.quantity) || 0
            : 1;
          const price = parseFloat(updated.price) || 0;
          updated.total = qty * price;
          return updated;
        }
        return item;
      }),
    );
  };

  const addItem = () =>
    setItems([
      ...items,
      { id: Date.now(), name: "", hsn: "", quantity: 1, price: 0, total: 0 },
    ]);
  const removeItem = (itemId) => {
    if (items.length > 1) setItems(items.filter((i) => i.id !== itemId));
  };

  const validateForm = () => {
    let tempErrors = {};
    if (!invoiceNumber.trim())
      tempErrors.invoiceNumber = "Invoice number is mandatory";
    if (!client.name.trim()) tempErrors.name = "Client name is mandatory";
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleFormSubmitClick = (e) => {
    e.preventDefault();
    if (!validateForm()) return toast.error("Please correct the errors");
    setIsDialogOpen(true);
  };

  const executeUpdate = async () => {
    setSaving(true);
    const cleanItems = items.map(({ isCustom, ...rest }) => ({
      ...rest,
      quantity: activeConfig.hasQuantity ? Number(rest.quantity) : 1,
    }));
    const invoiceData = {
      templateType,
      client,
      items: cleanItems,
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
      navigate(-1);
    } catch (err) {
      toast.error("Failed to update invoice");
    } finally {
      setSaving(false);
      setIsDialogOpen(false);
    }
  };

  // 🚀 REPLACED LOADER WITH SKELETON
  if (loading) return <EditInvoiceSkeleton />;

  // Ultra-sleek transparent base class for table inputs
  const tableInputClasses = `w-full bg-transparent border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-white outline-none text-sm transition-all focus:bg-white/[0.02] ${theme.primaryFocus}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 px-4 print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white text-zinc-100 font-sans">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-zinc-400 hover:text-white mb-2 transition-colors font-semibold text-sm print:hidden"
      >
        <ArrowLeft size={18} className="mr-2" /> Back to Invoices
      </button>

      {/* PREMIUM HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 print:hidden bg-[#0A0A0C] p-6 rounded-2xl border border-white/5 shadow-2xl">
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-xl bg-gradient-to-br ${theme.gradientBg} shadow-lg shadow-indigo-500/20 text-white`}
          >
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white whitespace-nowrap">
              Edit Invoice
            </h1>
            <p className="text-zinc-500 text-sm mt-1 font-medium">
              Update record details safely.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* Template Selector */}
          <div className="relative flex items-center bg-transparent border border-white/10 hover:border-white/20 transition-all rounded-xl px-4 py-1.5 focus-within:ring-1 focus-within:border-indigo-500 focus-within:ring-indigo-500">
            <LayoutTemplate size={18} className="text-zinc-400 mr-3" />
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="bg-transparent text-white font-semibold text-sm outline-none cursor-pointer py-2 pr-4 appearance-none w-full whitespace-nowrap"
            >
              <option value="MAA" className="bg-[#0F0F12] text-white">
                M/S MAA FLYASH BRICKS (Blue)
              </option>
              <option value="SANJIB" className="bg-[#0F0F12] text-white">
                M/S SANJIB PARIDA (B&W)
              </option>
              <option value="SANDEEP" className="bg-[#0F0F12] text-white">
                M/S SANDEEP PARIDA (Yellow)
              </option>
              <option value="SACHIDA" className="bg-[#0F0F12] text-white">
                M/S SACHIDA NANDA PARIDA (Service)
              </option>
            </select>
          </div>

          {/* Status Selector */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ colorScheme: "dark" }}
            className={`bg-transparent border border-white/10 text-white font-medium text-sm rounded-xl px-5 py-3.5 outline-none cursor-pointer transition-all hover:border-white/20 ${theme.primaryFocus}`}
          >
            <option value="Pending" className="bg-[#0F0F12] text-white">
              Status: Pending
            </option>
            <option value="Paid" className="bg-[#0F0F12] text-white">
              Status: Paid
            </option>
            <option value="Cancelled" className="bg-[#0F0F12] text-white">
              Status: Cancelled
            </option>
          </select>

          {/* Date Picker */}
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            style={{ colorScheme: "dark" }}
            className={`bg-transparent border border-white/10 text-white font-medium text-sm rounded-xl px-5 py-3.5 outline-none cursor-pointer transition-all hover:border-white/20 ${theme.primaryFocus}`}
          />
        </div>
      </div>

      <form onSubmit={handleFormSubmitClick} className="space-y-6">
        {/* PURCHASER DETAILS CARD */}
        <div className="bg-[#0A0A0C] p-6 lg:p-8 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden">
          <h3 className="text-xl font-semibold text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-3 whitespace-nowrap tracking-tight">
            <span
              className={`w-1.5 h-6 rounded-full ${theme.indicatorLine}`}
            ></span>{" "}
            {labels.section}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Invoice Number"
              value={invoiceNumber}
              onChange={(e) =>
                setInvoiceNumber(e.target.value.replace(/\D/g, ""))
              }
              className={
                errors.invoiceNumber
                  ? "border-rose-500/50 bg-rose-500/5"
                  : "bg-transparent border-white/10 hover:border-white/20 focus:bg-white/[0.02]"
              }
            />
            <Input
              label={labels.name}
              value={client.name}
              onChange={(e) => handleClientChange("name", e.target.value)}
              required
              className={
                errors.name
                  ? "border-rose-500/50 bg-rose-500/5"
                  : "bg-transparent border-white/10 hover:border-white/20 focus:bg-white/[0.02]"
              }
            />
            <Input
              label="Address"
              value={client.address}
              onChange={(e) => handleClientChange("address", e.target.value)}
              className="md:col-span-2 bg-transparent border-white/10 hover:border-white/20 focus:bg-white/[0.02]"
            />
            <Input
              label="GSTIN"
              value={client.gst}
              onChange={(e) =>
                handleClientChange("gst", e.target.value.toUpperCase())
              }
              className="bg-transparent border-white/10 hover:border-white/20 focus:bg-white/[0.02]"
            />
          </div>
        </div>

        {/* ITEMS TABLE CARD */}
        <div className="bg-[#0A0A0C] p-6 lg:p-8 rounded-2xl border border-white/5 shadow-xl">
          <h3 className="text-xl font-semibold text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-3 whitespace-nowrap tracking-tight">
            <span
              className={`w-1.5 h-6 rounded-full ${theme.indicatorLine}`}
            ></span>{" "}
            {labels.desc}
          </h3>
          <div className="overflow-x-auto pb-4 custom-scrollbar">
            <table className="w-full text-left mb-2 min-w-[850px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-widest text-zinc-400 border-b border-white/10 font-semibold bg-white/[0.02]">
                  <th className="py-4 px-4 w-[35%] whitespace-nowrap rounded-tl-xl">
                    {labels.desc}
                  </th>
                  <th className="py-4 px-3 w-[15%] whitespace-nowrap">
                    HSN Code
                  </th>
                  {activeConfig.hasQuantity && (
                    <th className="py-4 px-3 w-20 text-center whitespace-nowrap">
                      {labels.qty}
                    </th>
                  )}
                  <th className="py-4 px-3 w-32 text-center whitespace-nowrap">
                    {labels.rate}
                  </th>
                  <th className="py-4 px-4 w-32 text-right whitespace-nowrap">
                    Amount (₹)
                  </th>
                  <th className="py-4 w-12 text-center rounded-tr-xl"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="group hover:bg-white/[0.01] transition-colors"
                  >
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        className={`${tableInputClasses} ${errors[`item_${item.id}_name`] ? "border-rose-500/50 bg-rose-500/5" : ""}`}
                        value={item.name}
                        onChange={(e) =>
                          handleItemChange(item.id, "name", e.target.value)
                        }
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        className={`${tableInputClasses} text-center`}
                        value={item.hsn}
                        onChange={(e) =>
                          handleItemChange(item.id, "hsn", e.target.value)
                        }
                      />
                    </td>
                    {activeConfig.hasQuantity && (
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          className={`${tableInputClasses} text-center ${errors[`item_${item.id}_qty`] ? "border-rose-500/50 bg-rose-500/5" : ""}`}
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "quantity",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                    )}
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        className={`${tableInputClasses} text-right ${errors[`item_${item.id}_price`] ? "border-rose-500/50 bg-rose-500/5" : ""}`}
                        value={item.price}
                        onChange={(e) =>
                          handleItemChange(item.id, "price", e.target.value)
                        }
                      />
                    </td>
                    <td className="py-3 px-4 font-bold text-white font-mono text-[15px] text-right tracking-wide whitespace-nowrap">
                      {Number(item.total || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 p-2.5 rounded-xl transition-all"
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
            variant="outline"
            onClick={addItem}
            className="text-sm font-semibold border-white/10 bg-white/5 text-white hover:bg-white/10 mt-2 rounded-xl py-2.5 px-5"
          >
            <Plus size={18} className="mr-2" /> Add Row
          </Button>
        </div>

        {/* TOTALS CARD */}
        <div className="bg-[#0A0A0C] p-6 lg:p-8 rounded-2xl border border-white/5 shadow-xl flex justify-end">
          <div className="w-full md:w-96 space-y-4">
            <div className="flex justify-between text-zinc-400 text-sm font-medium">
              <span>G. Total (Before Tax):</span>
              <span className="font-mono text-white tracking-wide">
                ₹ {totals.subTotal.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between items-center text-zinc-400 text-sm font-medium">
              <span>Tax Category:</span>
              <select
                style={{ colorScheme: "dark" }}
                className={`bg-transparent border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none cursor-pointer font-semibold transition-all hover:border-white/20 focus:bg-white/[0.02] ${theme.primaryFocus}`}
                value={gstRate}
                onChange={(e) => setGstRate(parseFloat(e.target.value))}
              >
                <option value="0" className="bg-[#0F0F12] text-white">
                  0%
                </option>
                <option value="5" className="bg-[#0F0F12] text-white">
                  GST 5%
                </option>
                <option value="12" className="bg-[#0F0F12] text-white">
                  GST 12%
                </option>
                <option value="18" className="bg-[#0F0F12] text-white">
                  GST 18%
                </option>
              </select>
            </div>
            {gstRate > 0 && (
              <>
                <div className="flex justify-between text-zinc-500 text-sm font-medium">
                  <span>CGST @ {gstRate / 2}%:</span>
                  <span className="font-mono text-zinc-300">
                    ₹{" "}
                    {totals.cgst.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500 text-sm font-medium">
                  <span>SGST @ {gstRate / 2}%:</span>
                  <span className="font-mono text-zinc-300">
                    ₹{" "}
                    {totals.sgst.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </>
            )}
            <div className="border-t border-white/10 pt-5 flex justify-between text-2xl font-bold text-white items-center">
              <span className="text-lg">Net Total:</span>
              <span className="font-mono text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 tracking-tight">
                ₹{" "}
                {totals.grandTotal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pb-4 px-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto border-white/10 text-zinc-300 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl py-3.5 px-8 font-semibold text-sm"
          >
            Discard
          </Button>
          <Button
            type="submit"
            className={`w-full sm:w-auto px-10 py-3.5 rounded-xl text-sm font-bold text-white border-0 bg-gradient-to-r ${theme.gradientBg} shadow-lg shadow-indigo-500/20 hover:brightness-110 transition-all`}
            disabled={saving}
          >
            {saving ? (
              <RefreshCcw size={18} className="animate-spin mr-2" />
            ) : (
              <Save size={18} className="mr-2" />
            )}{" "}
            {saving ? " Updating..." : " Update Invoice"}
          </Button>
        </div>

        {/* AUDIT INFO */}
        {auditInfo && (
          <div className="text-center text-[10px] font-mono text-zinc-500 uppercase tracking-[0.15em] pt-4 px-4 print:hidden">
            LAST UPDATED BY{" "}
            <span className={`${theme.primaryText} font-bold mx-1`}>
              {auditInfo.role}
            </span>{" "}
            ON {auditInfo.at}
          </div>
        )}
      </form>

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={executeUpdate}
        title="Update Invoice"
        message="Are you sure you want to save changes?"
        confirmText="Save Update"
        isDestructive={false}
      />
    </div>
  );
};

export default EditInvoice;
