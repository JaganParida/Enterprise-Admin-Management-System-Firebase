import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import salesService from "../../services/salesService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  ShoppingCart,
  Save,
  History,
  Truck,
  ArrowRight,
  Banknote,
  CreditCard,
  ChevronDown,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const Sales = () => {
  const { toast } = useUI();
  const { admin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sales, setSales] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    challanNo: "",
    buyerName: "",
    address: "",
    vehicleNo: "",
    productName: "",
    quantity: "",
    amount: "",
    amountPaid: "",
    amountDue: "",
    paymentMode: "Cash",
  });

  const fetchSales = async () => {
    try {
      const { data } = await salesService.getAllSales();
      setSales(data || []);
    } catch (error) {
      toast.error("Failed to load sales data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      let newData = { ...prev, [name]: value };
      const totalAmount = Number(newData.amount) || 0;

      if (name === "amount") {
        const paid = Number(newData.amountPaid) || 0;
        newData.amountDue =
          totalAmount > 0 ? Math.max(0, totalAmount - paid).toString() : "";
      } else if (name === "amountPaid") {
        const paid = Number(value) || 0;
        newData.amountDue =
          totalAmount > 0 ? Math.max(0, totalAmount - paid).toString() : "";
      } else if (name === "amountDue") {
        const due = Number(value) || 0;
        if (totalAmount > 0) {
          newData.amountPaid = Math.max(0, totalAmount - due).toString();
        }
      }
      return newData;
    });
  };

  const handleSubmitClick = (e) => {
    e.preventDefault();
    setConfirmDialog(true);
  };

  const executeSubmit = async () => {
    setSubmitting(true);
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await salesService.addSale(formData, currentUser);
      toast.success("Sale recorded successfully!");
      fetchSales();
      setFormData({
        ...formData,
        challanNo: "",
        buyerName: "",
        address: "",
        vehicleNo: "",
        productName: "",
        quantity: "",
        amount: "",
        amountPaid: "",
        amountDue: "",
        paymentMode: "Cash",
      });
    } catch (error) {
      toast.error("Failed to record sale.");
    } finally {
      setSubmitting(false);
    }
  };

  // 🚀 ITEM & SIZE PARSER
  const parseProduct = (fullName) => {
    if (!fullName) return { name: "-", size: "No unit" };
    if (fullName.includes("(")) {
      const parts = fullName.split("(");
      return { name: parts[0].trim(), size: parts[1].replace(")", "").trim() };
    }
    return { name: fullName, size: "No unit" };
  };

  const formatLogDate = (isoString) => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    return `${String(date.getDate()).padStart(2, "0")} ${date.toLocaleString("en-GB", { month: "short" })}, ${date.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="lg:col-span-1">
        <div className="bg-[#050a08] rounded-2xl shadow-2xl border p-6 md:p-8 relative overflow-hidden border-emerald-900/30">
          <div className="absolute top-0 right-0 w-40 h-40 blur-3xl rounded-full pointer-events-none bg-emerald-500/10"></div>

          <div className="flex items-center gap-3 mb-8 relative z-10">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Record Sale
              </h2>
              <p className="text-emerald-100/40 text-[10px] uppercase tracking-widest mt-0.5">
                New Dispatch Entry
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmitClick}
            className="space-y-5 relative z-10"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                  style={{ colorScheme: "dark" }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
                  Challan No. (Opt)
                </label>
                <input
                  type="text"
                  name="challanNo"
                  value={formData.challanNo}
                  onChange={handleChange}
                  placeholder="e.g. CH-101"
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
                Name of the Buyer
              </label>
              <input
                type="text"
                name="buyerName"
                value={formData.buyerName}
                onChange={handleChange}
                required
                placeholder="e.g. Satyam Mohanty"
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
                Delivery Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                placeholder="Full site address"
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
                Vehicle Number
              </label>
              <div className="relative">
                <div className="absolute top-1/2 -translate-y-1/2 left-4 text-emerald-100/30">
                  <Truck size={16} />
                </div>
                <input
                  type="text"
                  name="vehicleNo"
                  value={formData.vehicleNo}
                  onChange={handleChange}
                  required
                  placeholder="e.g. OD 02 AB 1234"
                  className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
                  Product
                </label>
                <div className="relative">
                  <select
                    name="productName"
                    value={formData.productName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner appearance-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 cursor-pointer"
                  >
                    <option
                      value=""
                      className="bg-[#050a08] text-emerald-100/30"
                    >
                      Select...
                    </option>
                    <optgroup
                      label="Bricks"
                      className="bg-[#020403] text-emerald-500 font-bold"
                    >
                      <option
                        value="Bricks (10 inch)"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        Bricks (10 inch)
                      </option>
                      <option
                        value="Bricks (9 inch)"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        Bricks (9 inch)
                      </option>
                      <option
                        value="Bricks (8 inch)"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        Bricks (8 inch)
                      </option>
                    </optgroup>
                    <optgroup
                      label="Paver Blocks"
                      className="bg-[#020403] text-emerald-500 font-bold"
                    >
                      <option
                        value="Zig Zag (60mm)"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        Zig Zag (60mm)
                      </option>
                      <option
                        value="Zig Zag (80mm)"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        Zig Zag (80mm)
                      </option>
                      <option
                        value="6-12 Brick (60mm)"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        6-12 Brick (60mm)
                      </option>
                      <option
                        value="6-12 Brick (80mm)"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        6-12 Brick (80mm)
                      </option>
                      <option
                        value="6/6 Brick (60mm)"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        6/6 Brick 60mm
                      </option>
                      <option
                        value="6/6 Brick (80mm)"
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
                        value="Hexagon"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        Hexagon
                      </option>
                      <option
                        value="Brick Design (9inch)"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        Brick Design (9inch)
                      </option>
                      <option
                        value="Curve Stone"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        Curve Stone
                      </option>
                      <option
                        value="Cover Block"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        Cover Block
                      </option>
                    </optgroup>
                    <optgroup
                      label="Raw Materials"
                      className="bg-[#020403] text-teal-500 font-bold"
                    >
                      <option
                        value="Cement (Bags)"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        Cement (Bags)
                      </option>
                      <option
                        value="Sand"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        Sand
                      </option>
                    </optgroup>
                    <optgroup
                      label="Aggregate"
                      className="bg-[#020403] text-amber-500 font-bold"
                    >
                      <option
                        value="Aggregate (60mm)"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        Aggregate (60mm)
                      </option>
                      <option
                        value="Aggregate (40mm)"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        Aggregate (40mm)
                      </option>
                      <option
                        value="Aggregate (20mm)"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        Aggregate (20mm)
                      </option>
                      <option
                        value="Aggregate (10mm)"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        Aggregate (10mm)
                      </option>
                      <option
                        value="Aggregate (6mm)"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        Aggregate (6mm)
                      </option>
                      <option
                        value="Dust"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        Dust
                      </option>
                      <option
                        value="GSP"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        GSP
                      </option>
                      <option
                        value="WMM"
                        className="bg-[#050a08] text-white font-normal"
                      >
                        WMM
                      </option>
                    </optgroup>
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
                  Quantity
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  placeholder="0"
                  onWheel={(e) => e.target.blur()}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
                Total Bill Amount (₹)
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                onWheel={(e) => e.target.blur()}
                required
                placeholder="0.00"
                className="w-full px-4 py-3 bg-black/40 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-lg outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 bg-emerald-900/10 p-4 rounded-xl border border-emerald-900/20">
              <div>
                <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
                  Amount Paid (₹)
                </label>
                <input
                  type="number"
                  name="amountPaid"
                  value={formData.amountPaid}
                  onChange={handleChange}
                  onWheel={(e) => e.target.blur()}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-black/40 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
                  Amount Due (₹)
                </label>
                <input
                  type="number"
                  name="amountDue"
                  value={formData.amountDue}
                  onChange={handleChange}
                  onWheel={(e) => e.target.blur()}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-black/40 border border-rose-500/30 rounded-xl text-rose-400 font-bold outline-none transition-all shadow-inner focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-3 ml-1">
                Payment Mode
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, paymentMode: "Cash" })
                  }
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all border ${formData.paymentMode === "Cash" ? "bg-emerald-500 text-[#020403] border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-black/40 border-white/10 text-emerald-100/50 hover:border-emerald-500/50 hover:text-white"}`}
                >
                  <Banknote size={16} /> Cash
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, paymentMode: "Online" })
                  }
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all border ${formData.paymentMode === "Online" ? "bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "bg-black/40 border-white/10 text-emerald-100/50 hover:border-blue-500/50 hover:text-white"}`}
                >
                  <CreditCard size={16} /> Online
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-4 shadow-xl shadow-emerald-900/20 bg-emerald-500 hover:bg-emerald-400 text-[#020403]"
              disabled={submitting}
            >
              {submitting ? (
                "Processing..."
              ) : (
                <>
                  <Save size={18} className="mr-2" /> Complete Sale
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-[#050a08] rounded-2xl shadow-xl border border-emerald-900/30 overflow-hidden relative">
          <div className="p-5 border-b border-emerald-900/20 flex flex-col md:flex-row justify-between gap-4 items-center bg-[#020403]/50">
            <div className="flex items-center gap-2 text-white font-bold">
              <History size={18} className="text-emerald-500" /> Recent Sales{" "}
              <span className="text-emerald-100/40 text-xs font-normal">
                (Last 10)
              </span>
            </div>
            <Link
              to="/enterprise/sales/report"
              className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 rounded-lg transition-all"
            >
              View Full Report <ArrowRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto custom-scrollbar min-h-[400px]">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-[#020403] text-emerald-100/30 text-[10px] uppercase tracking-widest font-bold">
                <tr>
                  <th className="p-5 pl-6">Date & Challan</th>
                  <th className="p-5">Buyer</th>
                  <th className="p-5">Item</th>
                  <th className="p-5">Size</th>
                  <th className="p-5 pr-6 text-right">Amount & Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/10 text-sm">
                {sales.slice(0, 10).map((sale) => {
                  const { name, size } = parseProduct(sale.productName);
                  const hasEdits =
                    sale.editHistory && sale.editHistory.length > 0;
                  const historyCount = hasEdits ? sale.editHistory.length : 0;
                  const latestLog = hasEdits
                    ? sale.editHistory[sale.editHistory.length - 1]
                    : null;

                  return (
                    <tr
                      key={sale._id}
                      className="hover:bg-emerald-900/10 transition-colors group"
                    >
                      <td className="p-5 pl-6 align-middle">
                        <div className="font-mono text-emerald-100/80 text-xs">
                          {new Date(sale.date).toLocaleDateString("en-GB")}
                        </div>
                        <div className="text-[10px] text-emerald-500 font-bold tracking-wider mt-1 mb-2">
                          {sale.challanNo || "-"}
                        </div>

                        {/* 🚀 EXACT MATCH FOR EDIT LOG UI (Only shows if edited) */}
                        {hasEdits && (
                          <div className="mt-1.5 flex flex-col items-start w-max">
                            <div className="flex items-center gap-1.5 bg-[#020403] border border-emerald-900/40 px-2 py-1 rounded-md">
                              <History size={10} className="text-emerald-500" />
                              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
                                {latestLog.role || "ADMIN"}
                              </span>
                              {historyCount > 1 && (
                                <span className="bg-emerald-900/60 text-emerald-300 px-1.5 py-0.5 rounded text-[8px] font-bold ml-1">
                                  +{historyCount - 1} MORE
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-emerald-100/40 font-mono mt-1 pl-1">
                              {formatLogDate(latestLog.at)}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-5 align-middle">
                        <div className="font-bold text-white tracking-wide">
                          {sale.buyerName}
                        </div>
                        <div className="text-[10px] font-mono text-emerald-100/40 mt-1 flex items-center gap-1">
                          <Truck size={10} /> {sale.vehicleNo}
                        </div>
                      </td>
                      <td className="p-5 align-middle">
                        <div className="text-emerald-100 font-medium text-xs">
                          {name}
                        </div>
                        <div className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded mt-1 inline-block">
                          Qty: {sale.quantity}
                        </div>
                      </td>
                      <td className="p-5 align-middle text-emerald-100/60 text-xs">
                        {size}
                      </td>
                      <td className="p-5 pr-6 align-middle text-right">
                        <div className="font-bold text-white font-mono text-lg">
                          ₹ {Number(sale.amount).toLocaleString("en-IN")}
                        </div>
                        <div className="flex flex-col items-end gap-1 mt-1">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border inline-block ${sale.paymentMode === "Online" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}
                          >
                            {sale.paymentMode}
                          </span>
                          {Number(sale.amountDue) > 0 && (
                            <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded mt-1">
                              DUE: ₹
                              {Number(sale.amountDue).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {sales.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-12 text-center text-emerald-100/30 text-sm italic"
                    >
                      No recent sales found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog}
        onClose={() => setConfirmDialog(false)}
        onConfirm={executeSubmit}
        title="Save Sale Record"
        message="Are you sure you want to log this sale to the database?"
        confirmText="Save Record"
        isDestructive={false}
      />
    </div>
  );
};

export default Sales;
