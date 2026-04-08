import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import invoiceService from "../../services/invoiceService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Plus,
  Trash2,
  Save,
  FileText,
  AlertCircle,
  LayoutTemplate,
} from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

// 🚀 NEW CREATE INVOICE SKELETON
const CreateInvoiceSkeleton = () => (
  <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4 w-full flex flex-col">
    {/* Header */}
    <div className="bg-[#0A0A0C] p-6 rounded-2xl border border-white/5 h-[100px] animate-pulse flex justify-between items-center">
      <div className="flex gap-4 items-center">
        <div className="w-14 h-14 bg-zinc-800/60 rounded-xl"></div>
        <div>
          <div className="w-48 h-6 bg-zinc-800/60 rounded mb-2"></div>
          <div className="w-40 h-3 bg-zinc-800/40 rounded"></div>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="w-40 h-11 bg-zinc-800/50 rounded-xl"></div>
        <div className="w-36 h-11 bg-zinc-800/50 rounded-xl"></div>
        <div className="w-36 h-11 bg-zinc-800/50 rounded-xl"></div>
      </div>
    </div>
    {/* Purchaser */}
    <div className="bg-[#0A0A0C] p-6 lg:p-8 rounded-2xl border border-white/5 animate-pulse">
      <div className="w-40 h-6 bg-zinc-800/60 rounded mb-6"></div>
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

const CreateInvoice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useUI();
  const { admin } = useAuth();

  // 🚀 SEPARATED STATES: One for page load, one for submitting
  const [isInitializing, setIsInitializing] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [templateType, setTemplateType] = useState("MAA");
  const [client, setClient] = useState({ name: "", address: "", gst: "" });
  const [items, setItems] = useState([
    {
      id: 1,
      name: "",
      hsn: "",
      quantity: 1,
      price: 0,
      total: 0,
      isCustom: false,
    },
  ]);
  const [gstRate, setGstRate] = useState(5);
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [status, setStatus] = useState("Pending");
  const [errors, setErrors] = useState({});
  const [totals, setTotals] = useState({
    subTotal: 0,
    gstAmount: 0,
    cgst: 0,
    sgst: 0,
    grandTotal: 0,
  });

  const activeConfig = TEMPLATES[templateType];

  const products = [
    { name: "Fly Ash Bricks (10 inch)", hsn: "6815" },
    { name: "Fly Ash Bricks (9 inch)", hsn: "6815" },
    { name: "Paver Blocks (Zig Zag 60mm)", hsn: "6810" },
    { name: "Paver Blocks (Zig Zag 80mm)", hsn: "6810" },
    { name: "Other Building Materials", hsn: "0000" },
  ];

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
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const handleItemChange = (id, field, value) => {
    const newItems = items.map((item) => {
      if (item.id === id) {
        let updatedItem = { ...item, [field]: value };
        if (field === "nameSelect") {
          if (value === "Custom") {
            updatedItem.isCustom = true;
            updatedItem.name = "";
            updatedItem.hsn = "";
          } else {
            updatedItem.isCustom = false;
            updatedItem.name = value;
            const selectedProduct = products.find((p) => p.name === value);
            if (selectedProduct) updatedItem.hsn = selectedProduct.hsn;
          }
        }
        const qty = activeConfig.hasQuantity
          ? parseFloat(updatedItem.quantity) || 0
          : 1;
        const price = parseFloat(updatedItem.price) || 0;
        updatedItem.total = qty * price;
        return updatedItem;
      }
      return item;
    });
    setItems(newItems);
    if (errors[`item_${id}_${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`item_${id}_${field}`];
      setErrors(newErrors);
    }
  };

  const addItem = () =>
    setItems([
      ...items,
      {
        id: Date.now(),
        name: "",
        hsn: "",
        quantity: 1,
        price: 0,
        total: 0,
        isCustom: false,
      },
    ]);
  const removeItem = (id) => {
    if (items.length > 1) setItems(items.filter((item) => item.id !== id));
  };

  const validateForm = () => {
    let tempErrors = {};
    if (!invoiceNumber.trim())
      tempErrors.invoiceNumber = "Invoice number is mandatory";
    if (!client.name.trim()) tempErrors.name = "Client name is mandatory";
    items.forEach((item) => {
      if (!item.name.trim()) tempErrors[`item_${item.id}_name`] = true;
      if (activeConfig.hasQuantity && item.quantity <= 0)
        tempErrors[`item_${item.id}_qty`] = true;
      if (item.price <= 0) tempErrors[`item_${item.id}_price`] = true;
    });
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm())
      return toast.error("Please correct the errors in the form");
    setLoading(true);

    const cleanItems = items.map(({ isCustom, nameSelect, ...rest }) => ({
      ...rest,
      quantity: activeConfig.hasQuantity
        ? Number(String(rest.quantity).replace(/[^0-9.-]+/g, ""))
        : 1,
      price: Number(String(rest.price).replace(/[^0-9.-]+/g, "")),
      total: Number(String(rest.total).replace(/[^0-9.-]+/g, "")),
    }));

    const invoiceData = {
      templateType,
      invoiceNumber,
      client,
      items: cleanItems,
      date: invoiceDate,
      subTotal: Number(String(totals.subTotal).replace(/[^0-9.-]+/g, "")),
      gstRate: Number(gstRate),
      gstAmount: Number(String(totals.gstAmount).replace(/[^0-9.-]+/g, "")),
      grandTotal: Number(String(totals.grandTotal).replace(/[^0-9.-]+/g, "")),
      status,
    };

    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await invoiceService.createInvoice(invoiceData, currentUser);
      toast.success("Invoice generated successfully!");
      navigate(-1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  // Ultra-sleek transparent base class for table inputs
  const tableInputClasses = `w-full bg-transparent border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-white outline-none text-sm transition-all focus:bg-white/[0.02] ${theme.primaryFocus}`;

  // 🚀 REPLACED LOADER WITH SKELETON
  if (isInitializing) return <CreateInvoiceSkeleton />;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 px-4 print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white text-zinc-100 font-sans">
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
              Create Tax Invoice
            </h1>
            <p className="text-zinc-500 text-sm mt-1 font-medium">
              Generate a high-quality standardized bill.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* Template Selector */}
          <div
            className={`relative flex items-center bg-transparent border border-white/10 hover:border-white/20 transition-all rounded-xl px-4 py-1.5 focus-within:ring-1 focus-within:border-indigo-500 focus-within:ring-indigo-500`}
          >
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PURCHASER DETAILS CARD */}
        <div className="bg-[#0A0A0C] p-6 lg:p-8 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden print:shadow-none print:border-none print:bg-transparent print:p-0">
          <h3 className="text-xl font-semibold text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-3 whitespace-nowrap tracking-tight">
            <span
              className={`w-1.5 h-6 rounded-full print:hidden ${theme.indicatorLine}`}
            ></span>{" "}
            {labels.section}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <Input
                label="Invoice Number"
                placeholder="e.g. 1003"
                value={invoiceNumber}
                onChange={(e) => {
                  setInvoiceNumber(e.target.value.replace(/\D/g, ""));
                  if (errors.invoiceNumber) {
                    const n = { ...errors };
                    delete n.invoiceNumber;
                    setErrors(n);
                  }
                }}
                className={
                  errors.invoiceNumber
                    ? "border-rose-500/50 focus:ring-rose-500 bg-rose-500/5"
                    : "bg-transparent border-white/10 hover:border-white/20 focus:bg-white/[0.02]"
                }
              />
              {errors.invoiceNumber && (
                <p className="text-rose-500 text-xs font-semibold ml-1 flex items-center gap-1 mt-1">
                  <AlertCircle size={12} /> {errors.invoiceNumber}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Input
                label={labels.name}
                placeholder="e.g. Ramesh Textiles"
                value={client.name}
                onChange={(e) => handleClientChange("name", e.target.value)}
                className={
                  errors.name
                    ? "border-rose-500/50 focus:ring-rose-500 bg-rose-500/5"
                    : "bg-transparent border-white/10 hover:border-white/20 focus:bg-white/[0.02]"
                }
              />
              {errors.name && (
                <p className="text-rose-500 text-xs font-semibold ml-1 flex items-center gap-1 mt-1">
                  <AlertCircle size={12} /> {errors.name}
                </p>
              )}
            </div>
            <Input
              label="Full Address"
              placeholder="Billing address"
              value={client.address}
              onChange={(e) => handleClientChange("address", e.target.value)}
              className="md:col-span-2 bg-transparent border-white/10 hover:border-white/20 focus:bg-white/[0.02]"
            />
            <Input
              label="GSTIN (Optional)"
              placeholder="e.g. 21AAAAA0000A1Z5"
              value={client.gst}
              onChange={(e) => {
                const val = e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "");
                if (val.length <= 15) handleClientChange("gst", val);
              }}
              className="bg-transparent border-white/10 hover:border-white/20 focus:bg-white/[0.02]"
            />
          </div>
        </div>

        {/* ITEMS TABLE CARD */}
        <div className="bg-[#0A0A0C] p-6 lg:p-8 rounded-2xl border border-white/5 shadow-xl print:shadow-none print:border-none print:bg-transparent print:p-0">
          <h3 className="text-xl font-semibold text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-3 whitespace-nowrap tracking-tight">
            <span
              className={`w-1.5 h-6 rounded-full print:hidden ${theme.indicatorLine}`}
            ></span>{" "}
            {labels.desc}
          </h3>
          <div className="overflow-x-auto pb-4 custom-scrollbar print:overflow-visible print:w-full">
            <table className="w-full text-left mb-2 min-w-[850px] print:min-w-0">
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
                  <th className="py-4 w-12 text-center print:hidden rounded-tr-xl"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 print:divide-gray-200">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="group hover:bg-white/[0.01] transition-colors"
                  >
                    <td className="py-3 px-3">
                      {!item.isCustom && templateType !== "SACHIDA" ? (
                        <select
                          style={{ colorScheme: "dark" }}
                          className={`${tableInputClasses} ${errors[`item_${item.id}_name`] ? "border-rose-500/50 bg-rose-500/5" : ""}`}
                          value={item.isCustom ? "Custom" : item.name || ""}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "nameSelect",
                              e.target.value,
                            )
                          }
                        >
                          <option
                            value=""
                            disabled
                            className="bg-[#09090B] text-zinc-500"
                          >
                            Select Product...
                          </option>
                          <optgroup
                            label="Bricks"
                            className={`bg-[#09090B] font-bold ${theme.primaryText}`}
                          >
                            <option
                              value=" FLYASH Bricks (10 inch)"
                              className="bg-[#09090B] text-zinc-100 font-normal"
                            >
                              Bricks 10 inch
                            </option>
                            <option
                              value="FLYASH Bricks (9 inch)"
                              className="bg-[#09090B] text-zinc-100 font-normal"
                            >
                              Bricks 9 inch
                            </option>
                            <option
                              value="FLYASH Bricks 8 inch"
                              className="bg-[#09090B] text-zinc-100 font-normal"
                            >
                              Bricks 8 inch
                            </option>
                          </optgroup>
                          <optgroup
                            label="Paver Blocks"
                            className={`bg-[#09090B] font-bold ${theme.primaryText}`}
                          >
                            <option
                              value="Paver Blocks Zig Zag (60mm)"
                              className="bg-[#09090B] text-zinc-100 font-normal"
                            >
                              Zig Zag (60mm)
                            </option>
                            <option
                              value="Paver Blocks Zig Zag (80mm)"
                              className="bg-[#09090B] text-zinc-100 font-normal"
                            >
                              Zig Zag (80mm)
                            </option>
                            <option
                              value="Paver Blocks 6/12 Brick (60mm)"
                              className="bg-[#09090B] text-zinc-100 font-normal"
                            >
                              6/12 Brick (60mm)
                            </option>
                            <option
                              value="Paver Blocks 6/12 Brick (80mm)"
                              className="bg-[#09090B] text-zinc-100 font-normal"
                            >
                              6/12 Brick (80mm)
                            </option>
                            <option
                              value="Paver Blocks 6/6 Brick (60mm)"
                              className="bg-[#09090B] text-zinc-100 font-normal"
                            >
                              6/6 Brick 60mm
                            </option>
                            <option
                              value="Paver Blocks 6/6 Brick (80mm)"
                              className="bg-[#09090B] text-zinc-100 font-normal"
                            >
                              6/6 Brick (80mm)
                            </option>
                          </optgroup>
                          <optgroup
                            label="Chequered Tiles"
                            className={`bg-[#09090B] font-bold ${theme.primaryText}`}
                          >
                            <option
                              value="Chequered Tiles Hexagon"
                              className="bg-[#09090B] text-zinc-100 font-normal"
                            >
                              Hexagon
                            </option>
                            <option
                              value="Chequered Tiles Brick Design (9inch)"
                              className="bg-[#09090B] text-zinc-100 font-normal"
                            >
                              Brick Design (9inch)
                            </option>
                            <option
                              value="Chequered Tiles Curve Stone"
                              className="bg-[#09090B] text-zinc-100 font-normal"
                            >
                              Curve Stone
                            </option>
                            <option
                              value="Chequered Tiles Cover Block"
                              className="bg-[#09090B] text-zinc-100 font-normal"
                            >
                              Cover Block
                            </option>
                          </optgroup>
                          <option
                            value="Other Building Materials"
                            className="bg-[#09090B] text-zinc-100 font-normal"
                          >
                            Other Building Materials
                          </option>
                          <option
                            value="Custom"
                            className="bg-[#09090B] text-amber-400 font-bold border-t border-zinc-800/60 pt-2"
                          >
                            Custom Item...
                          </option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          className={`${tableInputClasses} ${errors[`item_${item.id}_name`] ? "border-rose-500/50 bg-rose-500/5" : ""}`}
                          placeholder="Enter description..."
                          value={item.name}
                          onChange={(e) =>
                            handleItemChange(item.id, "name", e.target.value)
                          }
                        />
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        placeholder="HSN"
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
                    <td className="py-3 text-center print:hidden">
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
        <div className="bg-[#0A0A0C] p-6 lg:p-8 rounded-2xl border border-white/5 shadow-xl flex justify-end print:shadow-none print:border-none print:bg-transparent print:p-0">
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
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pb-10 print:hidden">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            type="button"
            className="w-full sm:w-auto border-white/10 text-zinc-300 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl py-3.5 px-8 font-semibold text-sm"
          >
            Discard
          </Button>
          <Button
            type="submit"
            className={`w-full sm:w-auto px-10 py-3.5 rounded-xl text-sm font-bold text-white border-0 bg-gradient-to-r ${theme.gradientBg} shadow-lg shadow-indigo-500/20 hover:brightness-110 transition-all`}
            disabled={loading}
          >
            <Save size={18} className="mr-2" />{" "}
            {loading ? "Generating..." : "Generate Tax Invoice"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateInvoice;
