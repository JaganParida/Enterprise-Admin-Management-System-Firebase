import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import invoiceService from "../../services/invoiceService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import { Plus, Trash2, Save, FileText, AlertCircle } from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

const CreateInvoice = () => {
  const navigate = useNavigate();
  const { toast } = useUI();
  const { admin } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form States
  const [client, setClient] = useState({
    name: "",
    phone: "",
    address: "",
    gst: "",
  });

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
  const [gstRate, setGstRate] = useState(5); // Default GST for Bricks is usually 5%
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [status, setStatus] = useState("Pending");

  // Validation State
  const [errors, setErrors] = useState({});

  const [totals, setTotals] = useState({
    subTotal: 0,
    gstAmount: 0,
    cgst: 0,
    sgst: 0,
    grandTotal: 0,
  });

  // Pre-defined Products
  const products = [
    { name: "Fly Ash Bricks (10 inch)", hsn: "6815" },
    { name: "Fly Ash Bricks (9 inch)", hsn: "6815" },
    { name: "Paver Blocks (Zig Zag 60mm)", hsn: "6810" },
    { name: "Paver Blocks (Zig Zag 80mm)", hsn: "6810" },
    { name: "Other Building Materials", hsn: "0000" },
  ];

  useEffect(() => {
    const subTotal = items.reduce((acc, item) => acc + (item.total || 0), 0);
    const gstAmount = (subTotal * gstRate) / 100;
    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;
    const grandTotal = subTotal + gstAmount;
    setTotals({ subTotal, gstAmount, cgst, sgst, grandTotal });
  }, [items, gstRate]);

  // Handle Client Input with Error Clearing
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

        // Handle dropdown selection vs custom input
        if (field === "nameSelect") {
          if (value === "Custom") {
            updatedItem.isCustom = true;
            updatedItem.name = "";
            updatedItem.hsn = "";
          } else {
            updatedItem.isCustom = false;
            updatedItem.name = value;
            const selectedProduct = products.find((p) => p.name === value);
            if (selectedProduct) {
              updatedItem.hsn = selectedProduct.hsn;
            }
          }
        }

        const qty = parseFloat(updatedItem.quantity) || 0;
        const price = parseFloat(updatedItem.price) || 0;
        updatedItem.total = qty * price;
        return updatedItem;
      }
      return item;
    });
    setItems(newItems);

    // Clear item-level errors
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

  // 🚀 Core Validation Logic
  const validateForm = () => {
    let tempErrors = {};
    const phoneRegex = /^[6-9]\d{9}$/;
    const gstinRegex =
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    if (!client.name.trim()) tempErrors.name = "Client name is mandatory";

    if (!client.phone) {
      tempErrors.phone = "Phone number is required";
    } else if (!phoneRegex.test(client.phone)) {
      tempErrors.phone = "Must start with 6-9 and be exactly 10 digits";
    }

    if (client.gst) {
      if (client.gst.length !== 15) {
        tempErrors.gst = "GSTIN must be exactly 15 characters";
      } else if (!gstinRegex.test(client.gst)) {
        tempErrors.gst = "Invalid Indian GST format (e.g. 21AAAAA0000A1Z5)";
      }
    }

    items.forEach((item) => {
      if (!item.name.trim()) tempErrors[`item_${item.id}_name`] = true;
      if (item.quantity <= 0) tempErrors[`item_${item.id}_qty`] = true;
      if (item.price <= 0) tempErrors[`item_${item.id}_price`] = true;
    });

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please correct the errors in the form");
      return;
    }

    setLoading(true);

    // Clean items array (remove the 'isCustom' property before sending to DB)
    const cleanItems = items.map(({ isCustom, nameSelect, ...rest }) => rest);

    const invoiceData = {
      client,
      items: cleanItems,
      date: invoiceDate,
      subTotal: totals.subTotal,
      gstRate,
      gstAmount: totals.gstAmount,
      grandTotal: totals.grandTotal,
      status,
    };

    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await invoiceService.createInvoice(invoiceData, currentUser);
      toast.success("Invoice generated successfully!");
      navigate("/enterprise/invoices");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 border border-emerald-500/20">
              <FileText size={24} />
            </div>
            Create Tax Invoice
          </h1>
          <p className="text-emerald-100/40 text-sm mt-1 ml-1">
            Generate a standardized bill.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-[#050a08] border border-emerald-900/30 text-emerald-100 text-sm rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 w-full sm:w-auto cursor-pointer"
          >
            <option value="Pending">Status: Pending</option>
            <option value="Paid">Status: Paid</option>
          </select>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            style={{ colorScheme: "dark" }}
            className="bg-[#050a08] border border-emerald-900/30 text-emerald-400 font-bold text-sm rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 w-full sm:w-auto cursor-pointer"
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Client Details */}
        <div className="bg-[#050a08] p-6 md:p-8 rounded-2xl border border-emerald-900/30 shadow-lg relative overflow-hidden">
          <h3 className="text-lg font-bold text-white mb-6 border-b border-emerald-900/20 pb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>{" "}
            Purchaser Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <Input
                label="Client Name"
                placeholder="e.g. Ramesh Textiles"
                value={client.name}
                onChange={(e) => handleClientChange("name", e.target.value)}
                className={errors.name ? "border-rose-500/50" : ""}
              />
              {errors.name && (
                <p className="text-rose-500 text-[10px] font-bold uppercase ml-1 flex items-center gap-1">
                  <AlertCircle size={10} /> {errors.name}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Input
                label="Phone Number"
                placeholder="e.g. 9876543210"
                value={client.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length <= 10) handleClientChange("phone", val);
                }}
                className={errors.phone ? "border-rose-500/50" : ""}
              />
              {errors.phone && (
                <p className="text-rose-500 text-[10px] font-bold uppercase ml-1 flex items-center gap-1">
                  <AlertCircle size={10} /> {errors.phone}
                </p>
              )}
            </div>

            <Input
              label="Full Address"
              placeholder="Purchaser billing address"
              value={client.address}
              onChange={(e) => handleClientChange("address", e.target.value)}
              className="md:col-span-2"
            />

            <div className="space-y-1">
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
                className={errors.gst ? "border-rose-500/50" : ""}
              />
              {errors.gst && (
                <p className="text-rose-500 text-[10px] font-bold uppercase ml-1 flex items-center gap-1">
                  <AlertCircle size={10} /> {errors.gst}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-[#050a08] p-6 md:p-8 rounded-2xl border border-emerald-900/30 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-6 border-b border-emerald-900/20 pb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-teal-500 rounded-full"></span>{" "}
            Description of Goods
          </h3>
          <div className="overflow-x-auto pb-4 custom-scrollbar">
            <table className="w-full text-left mb-4 min-w-[800px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-emerald-100/40 border-b border-emerald-900/20 font-bold">
                  <th className="pb-3 w-[35%] pl-2">Product Name</th>
                  <th className="pb-3 w-[15%]">HSN Code</th>
                  <th className="pb-3 w-20 text-center">Qnty</th>
                  <th className="pb-3 w-28 text-center">Rate / Price</th>
                  <th className="pb-3 w-32 text-right pr-4">Amount (₹)</th>
                  <th className="pb-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/10">
                {items.map((item) => (
                  <tr key={item.id} className="group">
                    <td className="py-4 pr-3 pl-2">
                      {!item.isCustom ? (
                        <div className="relative">
                          <select
                            className={`w-full bg-[#020403] border ${errors[`item_${item.id}_name`] ? "border-rose-500/50" : "border-emerald-900/30"} rounded-lg px-3 py-2.5 text-emerald-100 focus:border-emerald-500/50 outline-none text-sm cursor-pointer appearance-none`}
                            value={
                              products.some((p) => p.name === item.name)
                                ? item.name
                                : item.name
                                  ? "Custom"
                                  : ""
                            }
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
                              className="bg-[#050a08] text-emerald-100/30"
                            >
                              Select Product...
                            </option>
                            <optgroup
                              label="Bricks"
                              className="bg-[#020403] text-emerald-500 font-bold"
                            >
                              <option
                                value="Fly Ash Bricks (10 inch)"
                                className="bg-[#050a08] text-emerald-100 font-normal"
                              >
                                Fly Ash Bricks (10 inch)
                              </option>
                              <option
                                value="Fly Ash Bricks (9 inch)"
                                className="bg-[#050a08] text-emerald-100 font-normal"
                              >
                                Fly Ash Bricks (9 inch)
                              </option>
                            </optgroup>
                            <optgroup
                              label="Paver Blocks"
                              className="bg-[#020403] text-emerald-500 font-bold"
                            >
                              <option
                                value="Paver Blocks (Zig Zag 60mm)"
                                className="bg-[#050a08] text-emerald-100 font-normal"
                              >
                                Paver Blocks (Zig Zag 60mm)
                              </option>
                              <option
                                value="Paver Blocks (Zig Zag 80mm)"
                                className="bg-[#050a08] text-emerald-100 font-normal"
                              >
                                Paver Blocks (Zig Zag 80mm)
                              </option>
                            </optgroup>
                            <option
                              value="Other Building Materials"
                              className="bg-[#050a08] text-emerald-100 font-normal"
                            >
                              Other Building Materials
                            </option>
                            <option
                              value="Custom"
                              className="bg-[#020403] text-amber-400 font-bold border-t border-emerald-900/30 pt-2"
                            >
                              Custom Item...
                            </option>
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500/50 text-[10px]">
                            ▼
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type="text"
                            className={`w-full bg-[#020403] border ${errors[`item_${item.id}_name`] ? "border-rose-500/50" : "border-emerald-900/30"} rounded-lg px-3 py-2.5 text-emerald-100 focus:border-emerald-500/50 outline-none text-sm pr-12`}
                            placeholder="Type custom description..."
                            value={item.name}
                            onChange={(e) =>
                              handleItemChange(item.id, "name", e.target.value)
                            }
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleItemChange(item.id, "nameSelect", "")
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400 hover:text-rose-300 text-xs"
                          >
                            Undo
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-4 pr-3">
                      <input
                        type="text"
                        placeholder="HSN"
                        className="w-full bg-[#020403] border border-emerald-900/30 rounded-lg px-3 py-2.5 text-emerald-100 focus:border-emerald-500/50 outline-none text-sm text-center"
                        value={item.hsn}
                        onChange={(e) =>
                          handleItemChange(item.id, "hsn", e.target.value)
                        }
                      />
                    </td>
                    <td className="py-4 pr-3">
                      <input
                        type="number"
                        className={`w-full bg-[#020403] border ${errors[`item_${item.id}_qty`] ? "border-rose-500/50" : "border-emerald-900/30"} rounded-lg px-2 py-2.5 text-emerald-100 text-center focus:border-emerald-500/50 outline-none text-sm`}
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(item.id, "quantity", e.target.value)
                        }
                        onWheel={(e) => e.target.blur()}
                      />
                    </td>
                    <td className="py-4 pr-3">
                      <input
                        type="number"
                        className={`w-full bg-[#020403] border ${errors[`item_${item.id}_price`] ? "border-rose-500/50" : "border-emerald-900/30"} rounded-lg px-3 py-2.5 text-emerald-100 text-right focus:border-emerald-500/50 outline-none text-sm`}
                        value={item.price}
                        onChange={(e) =>
                          handleItemChange(item.id, "price", e.target.value)
                        }
                        onWheel={(e) => e.target.blur()}
                      />
                    </td>
                    <td className="py-4 font-bold text-emerald-400 font-mono text-sm text-right pr-4">
                      {Number(item.total || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-4 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-emerald-900/40 hover:text-rose-400 transition-colors p-2 rounded-lg"
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
            className="text-xs border-emerald-500/20 text-emerald-400 mt-2"
          >
            <Plus size={16} className="mr-1" /> Add Row
          </Button>
        </div>

        {/* Totals Section */}
        <div className="bg-[#050a08] p-8 rounded-2xl border border-emerald-900/30 shadow-lg flex justify-end">
          <div className="w-full md:w-80 space-y-4">
            <div className="flex justify-between text-emerald-100/60 text-sm font-medium">
              <span>G. Total (Before Tax):</span>
              <span className="font-mono text-emerald-100">
                ₹ {totals.subTotal.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between items-center text-emerald-100/60 text-sm">
              <span>Tax Category:</span>
              <select
                className="bg-[#020403] border border-emerald-900/30 rounded-lg px-2 py-1 text-emerald-100 text-xs"
                value={gstRate}
                onChange={(e) => setGstRate(parseFloat(e.target.value))}
              >
                <option value="0">0%</option>
                <option value="5">GST 5%</option>
                <option value="12">GST 12%</option>
                <option value="18">GST 18%</option>
              </select>
            </div>

            {gstRate > 0 && (
              <>
                <div className="flex justify-between text-emerald-100/40 text-xs">
                  <span>CGST @ {gstRate / 2}%:</span>
                  <span className="font-mono">
                    ₹{" "}
                    {totals.cgst.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-100/40 text-xs">
                  <span>SGST @ {gstRate / 2}%:</span>
                  <span className="font-mono">
                    ₹{" "}
                    {totals.sgst.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </>
            )}

            <div className="border-t border-emerald-900/20 pt-4 flex justify-between text-xl font-bold text-emerald-400">
              <span className="text-base text-white">Net Total:</span>
              <span className="font-mono">
                ₹{" "}
                {totals.grandTotal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pb-10">
          <Button
            variant="secondary"
            onClick={() => navigate("/enterprise/invoices")}
          >
            Discard
          </Button>
          <Button
            type="submit"
            className="px-10 shadow-emerald-900/40"
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
