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
  AlertCircle,
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
        setClient(data.client);

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
        setInvoiceNumber(data.invoiceNumber);

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
      invoiceNumber,
    };

    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await invoiceService.updateInvoice(id, invoiceData, currentUser);
      toast.success("Invoice updated successfully!");
      navigate("/enterprise/invoices");
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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 px-4">
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
            className="bg-[#050a08] border border-emerald-900/30 text-emerald-100 text-sm rounded-xl px-4 py-3 sm:py-2 outline-none focus:border-emerald-500/50 w-full sm:w-auto cursor-pointer"
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
            className="bg-[#050a08] border border-emerald-900/30 text-emerald-400 font-bold text-sm rounded-xl px-4 py-3 sm:py-2 outline-none focus:border-emerald-500/50 w-full sm:w-auto cursor-pointer"
          />
        </div>
      </div>

      <form onSubmit={handleFormSubmitClick} className="space-y-8">
        <div className="bg-[#050a08] p-6 md:p-8 rounded-2xl border border-emerald-900/30 shadow-lg relative overflow-hidden">
          <h3 className="text-lg font-bold text-white mb-6 border-b border-emerald-900/20 pb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>{" "}
            Purchaser Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <Input
                label="Client Name"
                value={client.name}
                onChange={(e) => handleClientChange("name", e.target.value)}
                required
                className={errors.name ? "border-rose-500/50" : ""}
              />
              {errors.name && (
                <p className="text-rose-500 text-[10px] font-bold uppercase ml-1 flex items-center gap-1">
                  <AlertCircle size={10} /> {errors.name}
                </p>
              )}
            </div>
            <Input
              label="Phone Number"
              value={client.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (val.length <= 10) handleClientChange("phone", val);
              }}
              required
            />
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
                              className="bg-[#050a08] text-emerald-100/30"
                            >
                              Select Product...
                            </option>
                            <optgroup
                              label="Bricks"
                              className="bg-[#020403] text-emerald-500 font-bold"
                            >
                              <option
                                value=" FLYASH Bricks (10 inch)"
                                className="bg-[#050a08] text-white font-normal"
                              >
                                Bricks 10 inch
                              </option>
                              <option
                                value="FLYASH Bricks (9 inch)"
                                className="bg-[#050a08] text-white font-normal"
                              >
                                Bricks 9 inch
                              </option>
                              <option
                                value="FLYASH Bricks 8 inch"
                                className="bg-[#050a08] text-white font-normal"
                              >
                                Bricks 8 inch
                              </option>
                            </optgroup>
                            <optgroup
                              label="Paver Blocks"
                              className="bg-[#020403] text-emerald-500 font-bold"
                            >
                              <option
                                value="Paver Blocks Zig Zag (60mm)"
                                className="bg-[#050a08] text-white font-normal"
                              >
                                Zig Zag (60mm)
                              </option>
                              <option
                                value=" Paver Blocks Zig Zag (80mm)"
                                className="bg-[#050a08] text-white font-normal"
                              >
                                Zig Zag (80mm)
                              </option>
                              <option
                                value="Paver Blocks 6-12 Brick (60mm)"
                                className="bg-[#050a08] text-white font-normal"
                              >
                                6-12 Brick (60mm)
                              </option>
                              <option
                                value="Paver Blocks 6-12 Brick (80mm)"
                                className="bg-[#050a08] text-white font-normal"
                              >
                                6-12 Brick (80mm)
                              </option>
                              <option
                                value="Paver Blocks 6/6 Brick (60mm)"
                                className="bg-[#050a08] text-white font-normal"
                              >
                                6/6 Brick 60mm
                              </option>
                              <option
                                value="Paver Blocks 6/6 Brick (80mm)"
                                className="bg-[#050a08] text-white font-normal"
                              >
                                6/6 Brick (80mm)
                              </option>
                            </optgroup>
                            <optgroup
                              label="Chequered Tiles"
                              className="bg-[#020403] text-emerald-500 font-bold"
                            >
                              <option
                                value="Chequered Tiles Hexagon"
                                className="bg-[#050a08] text-white font-normal"
                              >
                                Hexagon
                              </option>
                              <option
                                value="Chequered Tiles Brick Design (9inch)"
                                className="bg-[#050a08] text-white font-normal"
                              >
                                Brick Design (9inch)
                              </option>
                              <option
                                value="Chequered Tiles Curve Stone"
                                className="bg-[#050a08] text-white font-normal"
                              >
                                Curve Stone
                              </option>
                              <option
                                value="Chequered Tiles Cover Block"
                                className="bg-[#050a08] text-white font-normal"
                              >
                                Cover Block
                              </option>
                            </optgroup>
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
                            className="w-full bg-[#020403] border border-emerald-900/30 rounded-lg px-3 py-2.5 text-emerald-100 focus:border-emerald-500/50 outline-none text-sm"
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
                            Cancel
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
                        className="w-full bg-[#020403] border border-emerald-900/30 rounded-lg px-2 py-2.5 text-emerald-100 text-center focus:border-emerald-500/50 outline-none text-sm"
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
                        className="w-full bg-[#020403] border border-emerald-900/30 rounded-lg px-3 py-2.5 text-emerald-100 text-right focus:border-emerald-500/50 outline-none text-sm"
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

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pb-4 px-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/enterprise/invoices")}
            className="w-full sm:w-auto text-emerald-100/60 hover:text-white"
          >
            Discard
          </Button>
          <Button
            type="submit"
            className="w-full sm:w-auto px-10 shadow-emerald-500/20"
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
          <div className="text-center text-[10px] font-mono text-emerald-100/30 uppercase tracking-[0.1em] opacity-80 pt-2 border-t border-emerald-900/10 px-4">
            LAST UPDATED BY{" "}
            <span className="text-emerald-400 font-bold mx-1">
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
