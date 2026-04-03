import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import invoiceService from "../../services/invoiceService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import { Plus, Trash2, Save, FileText, AlertCircle } from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

const CreateInvoice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useUI();
  const { admin } = useAuth();
  const [loading, setLoading] = useState(false);

  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const theme = {
    primaryText: isTransport ? "text-cyan-400" : "text-indigo-400",
    primaryBg: isTransport ? "bg-cyan-500/10" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-cyan-500/20" : "border-indigo-500/20",
    primaryFocus: isTransport
      ? "focus:border-cyan-500/50 focus:ring-cyan-500/50"
      : "focus:border-indigo-500/50 focus:ring-indigo-500/50",
    indicatorLine: isTransport ? "bg-cyan-500" : "bg-indigo-500",
  };

  const [invoiceNumber, setInvoiceNumber] = useState("");
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
        const qty = parseFloat(updatedItem.quantity) || 0;
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
    const gstinRegex =
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!invoiceNumber.trim())
      tempErrors.invoiceNumber = "Invoice number is mandatory";
    if (!client.name.trim()) tempErrors.name = "Client name is mandatory";
    if (client.gst) {
      if (client.gst.length !== 15)
        tempErrors.gst = "GSTIN must be exactly 15 characters";
      else if (!gstinRegex.test(client.gst))
        tempErrors.gst = "Invalid Indian GST format";
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
    if (!validateForm())
      return toast.error("Please correct the errors in the form");
    setLoading(true);

    const cleanItems = items.map(({ isCustom, nameSelect, ...rest }) => ({
      ...rest,
      quantity: Number(String(rest.quantity).replace(/[^0-9.-]+/g, "")),
      price: Number(String(rest.price).replace(/[^0-9.-]+/g, "")),
      total: Number(String(rest.total).replace(/[^0-9.-]+/g, "")),
    }));

    const invoiceData = {
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
      // NOTE: Removed `invoiceService.cache.isValid = false`.
      // The service now handles optimistic cache updates natively.
      toast.success("Invoice generated successfully!");
      navigate(-1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 px-4 print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
            >
              <FileText size={24} />
            </div>{" "}
            Create Tax Invoice
          </h1>
          <p className="text-zinc-500 text-sm mt-1 ml-1">
            Generate a standardized bill.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`bg-[#09090B] border border-zinc-800 text-zinc-100 text-sm rounded-xl px-4 py-3 outline-none w-full sm:w-auto cursor-pointer transition-all ${theme.primaryFocus}`}
          >
            <option value="Pending">Status: Pending</option>
            <option value="Paid">Status: Paid</option>
          </select>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            style={{ colorScheme: "dark" }}
            className={`bg-[#09090B] border border-zinc-800 font-bold text-sm rounded-xl px-4 py-3 outline-none w-full sm:w-auto cursor-pointer transition-all ${theme.primaryText} ${theme.primaryFocus}`}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-[#09090B] p-6 md:p-8 rounded-2xl border border-zinc-800/60 shadow-lg relative overflow-hidden print:shadow-none print:border-none print:bg-transparent print:p-0">
          <h3 className="text-lg font-bold text-white mb-6 border-b border-zinc-800/60 pb-4 flex items-center gap-2 print:text-black print:border-gray-300">
            <span
              className={`w-1.5 h-6 rounded-full print:hidden ${theme.indicatorLine}`}
            ></span>{" "}
            Purchaser Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <Input
                label="Invoice Number"
                placeholder="e.g. 1003"
                value={invoiceNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setInvoiceNumber(val);
                  if (errors.invoiceNumber) {
                    const newErrors = { ...errors };
                    delete newErrors.invoiceNumber;
                    setErrors(newErrors);
                  }
                }}
                className={
                  errors.invoiceNumber
                    ? "border-rose-500/50 focus:ring-rose-500"
                    : ""
                }
              />
              {errors.invoiceNumber && (
                <p className="text-rose-500 text-[10px] font-bold uppercase ml-1 flex items-center gap-1 mt-1">
                  <AlertCircle size={10} /> {errors.invoiceNumber}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Input
                label="Client Name"
                placeholder="e.g. Ramesh Textiles"
                value={client.name}
                onChange={(e) => handleClientChange("name", e.target.value)}
                className={
                  errors.name ? "border-rose-500/50 focus:ring-rose-500" : ""
                }
              />
              {errors.name && (
                <p className="text-rose-500 text-[10px] font-bold uppercase ml-1 flex items-center gap-1 mt-1">
                  <AlertCircle size={10} /> {errors.name}
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
                className={
                  errors.gst ? "border-rose-500/50 focus:ring-rose-500" : ""
                }
              />
              {errors.gst && (
                <p className="text-rose-500 text-[10px] font-bold uppercase ml-1 flex items-center gap-1 mt-1">
                  <AlertCircle size={10} /> {errors.gst}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[#09090B] p-6 md:p-8 rounded-2xl border border-zinc-800/60 shadow-lg print:shadow-none print:border-none print:bg-transparent print:p-0">
          <h3 className="text-lg font-bold text-white mb-6 border-b border-zinc-800/60 pb-4 flex items-center gap-2 print:text-black print:border-gray-300">
            <span
              className={`w-1.5 h-6 rounded-full print:hidden ${theme.indicatorLine}`}
            ></span>{" "}
            Description of Goods
          </h3>
          <div className="overflow-x-auto pb-4 custom-scrollbar print:overflow-visible print:w-full">
            <table className="w-full text-left mb-4 min-w-[800px] print:min-w-0">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-800/60 font-bold print:text-gray-500">
                  <th className="pb-3 w-[35%] pl-2">Product Name</th>
                  <th className="pb-3 w-[15%]">HSN Code</th>
                  <th className="pb-3 w-20 text-center">Qnty</th>
                  <th className="pb-3 w-28 text-center">Rate / Price</th>
                  <th className="pb-3 w-32 text-right pr-4">Amount (₹)</th>
                  <th className="pb-3 w-10 text-center print:hidden"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 print:divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className="group">
                    <td className="py-4 pr-3 pl-2">
                      {!item.isCustom ? (
                        <div className="relative">
                          <select
                            className={`w-full bg-zinc-900/50 border ${errors[`item_${item.id}_name`] ? "border-rose-500/50 focus:border-rose-500" : `border-zinc-800 ${theme.primaryFocus}`} rounded-lg px-3 py-2.5 text-zinc-100 outline-none text-sm cursor-pointer appearance-none transition-all print:bg-transparent print:text-black`}
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
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-[10px] print:hidden">
                            ▼
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type="text"
                            className={`w-full bg-zinc-900/50 border ${errors[`item_${item.id}_name`] ? "border-rose-500/50 focus:border-rose-500" : `border-zinc-800 ${theme.primaryFocus}`} rounded-lg px-3 py-2.5 text-zinc-100 outline-none text-sm pr-12 transition-all print:bg-transparent print:text-black`}
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
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400 hover:text-rose-300 text-xs print:hidden"
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
                        className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-100 outline-none text-sm text-center transition-all print:bg-transparent print:text-black print:border-none ${theme.primaryFocus}`}
                        value={item.hsn}
                        onChange={(e) =>
                          handleItemChange(item.id, "hsn", e.target.value)
                        }
                      />
                    </td>
                    <td className="py-4 pr-3">
                      <input
                        type="number"
                        className={`w-full bg-zinc-900/50 border ${errors[`item_${item.id}_qty`] ? "border-rose-500/50 focus:border-rose-500" : `border-zinc-800 ${theme.primaryFocus}`} rounded-lg px-2 py-2.5 text-zinc-100 text-center outline-none text-sm transition-all print:bg-transparent print:text-black print:border-none`}
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
                        className={`w-full bg-zinc-900/50 border ${errors[`item_${item.id}_price`] ? "border-rose-500/50 focus:border-rose-500" : `border-zinc-800 ${theme.primaryFocus}`} rounded-lg px-3 py-2.5 text-zinc-100 text-right outline-none text-sm transition-all print:bg-transparent print:text-black print:border-none`}
                        value={item.price}
                        onChange={(e) =>
                          handleItemChange(item.id, "price", e.target.value)
                        }
                        onWheel={(e) => e.target.blur()}
                      />
                    </td>
                    <td className="py-4 font-bold text-white font-mono text-sm text-right pr-4 print:text-black">
                      {Number(item.total || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-4 text-center print:hidden">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-zinc-600 hover:text-rose-400 transition-colors p-2 rounded-lg"
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
            className="text-xs border-zinc-800 text-zinc-300 hover:bg-zinc-800/50 hover:text-white mt-2 rounded-xl print:hidden"
          >
            <Plus size={16} className="mr-1" /> Add Row
          </Button>
        </div>

        <div className="bg-[#09090B] p-8 rounded-2xl border border-zinc-800/60 shadow-lg flex justify-end print:shadow-none print:border-none print:bg-transparent print:p-0">
          <div className="w-full md:w-80 space-y-4">
            <div className="flex justify-between text-zinc-400 text-sm font-medium print:text-gray-600">
              <span>G. Total (Before Tax):</span>
              <span className="font-mono text-white print:text-black">
                ₹ {totals.subTotal.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between items-center text-zinc-400 text-sm print:text-gray-600">
              <span>Tax Category:</span>
              <select
                className={`bg-zinc-900/50 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-300 text-xs print:bg-transparent print:text-black print:border-none print:appearance-none outline-none transition-all cursor-pointer ${theme.primaryFocus}`}
                value={gstRate}
                onChange={(e) => setGstRate(parseFloat(e.target.value))}
              >
                <option value="0" className="bg-[#09090B]">
                  0%
                </option>
                <option value="5" className="bg-[#09090B]">
                  GST 5%
                </option>
                <option value="12" className="bg-[#09090B]">
                  GST 12%
                </option>
                <option value="18" className="bg-[#09090B]">
                  GST 18%
                </option>
              </select>
            </div>
            {gstRate > 0 && (
              <>
                <div className="flex justify-between text-zinc-500 text-xs print:text-gray-600">
                  <span>CGST @ {gstRate / 2}%:</span>
                  <span className="font-mono print:text-black">
                    ₹{" "}
                    {totals.cgst.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500 text-xs print:text-gray-600">
                  <span>SGST @ {gstRate / 2}%:</span>
                  <span className="font-mono print:text-black">
                    ₹{" "}
                    {totals.sgst.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </>
            )}
            <div
              className={`border-t border-zinc-800/60 pt-4 flex justify-between text-xl font-bold print:text-black print:border-gray-300 ${theme.primaryText}`}
            >
              <span className="text-base text-white print:text-black">
                Net Total:
              </span>
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

        <div className="flex flex-col sm:flex-row justify-end gap-4 pb-10 print:hidden">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            type="button"
            className="w-full sm:w-auto border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white rounded-xl"
          >
            Discard
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="w-full sm:w-auto px-10 rounded-xl"
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
