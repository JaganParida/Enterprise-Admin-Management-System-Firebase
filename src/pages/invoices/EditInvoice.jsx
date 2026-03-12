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
  AlertCircle,
} from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

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
    primaryFocus: isTransport
      ? "focus:border-cyan-500/50 focus:ring-cyan-500/50"
      : "focus:border-indigo-500/50 focus:ring-indigo-500/50",
    indicatorLine: isTransport ? "bg-cyan-500" : "bg-indigo-500",
  };

  const [client, setClient] = useState({
    name: "",
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

  const products = [
    { name: "Bricks (10 inch)", hsn: "6815" },
    { name: "Bricks (9 inch)", hsn: "6815" },
    { name: "Bricks (8 inch)", hsn: "6815" },
    { name: "Paver Blocks (Zig Zag 60mm)", hsn: "6810" },
    { name: "Paver Blocks (Zig Zag 80mm)", hsn: "6810" },
    { name: "Paver Blocks (6-12 Brick 60mm)", hsn: "6810" },
    { name: "Paver Blocks (6-12 Brick 80mm)", hsn: "6810" },
    { name: "Paver Blocks (6/6 Brick 60mm)", hsn: "6810" },
    { name: "Paver Blocks (6/6 Brick 80mm)", hsn: "6810" },
  ];

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const { data } = await invoiceService.getInvoiceById(id);
        const { phone, ...clientDataWithoutPhone } = data.client;
        setClient(clientDataWithoutPhone);

        const processedItems = data.items.map((item) => ({
          ...item,
          isCustom: !products.some((p) => p.name === item.name),
        }));

        setItems(processedItems);
        setGstRate(data.gstRate || 5);
        setInvoiceDate(
          data.date ? new Date(data.date).toISOString().split("T")[0] : "",
        );
        setStatus(data.status);

        // Strip out "INV-" if it exists from the backend so the input only shows numbers
        const fetchedInvNo = data.invoiceNumber || "";
        setInvoiceNumber(fetchedInvNo.replace(/^INV-/, ""));

        if (data.lastEditedAt) {
          setAuditInfo({
            role: data.lastEditedRole || "Admin",
            at: new Date(data.lastEditedAt).toLocaleString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
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

  const handleItemChange = (itemId, field, value) => {
    const newItems = items.map((item) => {
      if (item.id === itemId) {
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
  const removeItem = (itemId) => {
    if (items.length > 1) setItems(items.filter((item) => item.id !== itemId));
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
      invoiceNumber, // Just saving the exact number entered
    };

    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await invoiceService.updateInvoice(id, invoiceData, currentUser);
      toast.success("Invoice updated successfully!");
      navigate(-1); // Use relative navigation for unified component
    } catch (error) {
      toast.error("Failed to update invoice");
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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 px-4 print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-zinc-500 hover:text-white mb-2 transition-colors print:hidden"
      >
        <ArrowLeft size={18} className="mr-2" /> Back to Invoices
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
            >
              <FileText size={24} />
            </div>
            Edit Invoice
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`bg-[#09090B] border border-zinc-800 text-zinc-100 text-sm rounded-xl px-4 py-3 sm:py-2 outline-none w-full sm:w-auto cursor-pointer transition-all ${theme.primaryFocus}`}
          >
            <option value="Pending">Status: Pending</option>
            <option value="Paid">Status: Paid</option>
            <option value="Cancelled">Status: Cancelled</option>
          </select>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            style={{ colorScheme: "dark" }}
            className={`bg-[#09090B] border border-zinc-800 font-bold text-sm rounded-xl px-4 py-3 sm:py-2 outline-none w-full sm:w-auto cursor-pointer transition-all ${theme.primaryText} ${theme.primaryFocus}`}
          />
        </div>
      </div>

      <form onSubmit={handleFormSubmitClick} className="space-y-8">
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
                value={client.name}
                onChange={(e) => handleClientChange("name", e.target.value)}
                required
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
              label="Address"
              value={client.address}
              onChange={(e) => handleClientChange("address", e.target.value)}
              className="md:col-span-2"
            />
            <Input
              label="GSTIN (Optional)"
              value={client.gst}
              onChange={(e) => {
                const val = e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "");
                if (val.length <= 15) handleClientChange("gst", val);
              }}
            />
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
            className="text-xs border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800/50 mt-2 rounded-xl print:hidden"
          >
            <Plus size={16} className="mr-1" /> Add Row
          </Button>
        </div>

        {/* Totals Section */}
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

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pb-4 px-4 print:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white rounded-xl"
          >
            Discard
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="w-full sm:w-auto px-10 rounded-xl"
            disabled={saving}
          >
            {saving ? (
              <RefreshCcw size={18} className="animate-spin mr-2" />
            ) : (
              <Save size={18} className="mr-2" />
            )}
            {saving ? " Updating..." : " Update Invoice"}
          </Button>
        </div>

        {auditInfo && (
          <div
            className={`text-center text-[10px] font-mono text-zinc-500 uppercase tracking-[0.1em] pt-2 border-t border-zinc-800/60 px-4 print:hidden`}
          >
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
        message="Are you sure you want to save changes to this invoice?"
        confirmText="Save Update"
        isDestructive={false}
      />
    </div>
  );
};

export default EditInvoice;
