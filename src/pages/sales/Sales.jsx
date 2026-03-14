import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const { toast } = useUI();
  const { admin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sales, setSales] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(false);

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
    glowOrb: isTransport ? "bg-cyan-500/10" : "bg-indigo-500/10",
    paymentOnline: isTransport
      ? "bg-cyan-500 text-white border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
      : "bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]",
    paymentCash: isTransport
      ? "bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
      : "bg-indigo-500 text-white border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]",
  };

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    challanNo: "",
    buyerName: "",
    address: "",
    vehicleNo: "",
    productName: "",
    quantity: "",
    pricePerQuantity: "",
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

      // Auto-calculate Total Amount
      if (name === "quantity" || name === "pricePerQuantity") {
        const qty = Number(newData.quantity) || 0;
        const rate = Number(newData.pricePerQuantity) || 0;
        if (qty > 0 && rate > 0) {
          newData.amount = (qty * rate).toString();
        }
      }

      const totalAmount = Number(newData.amount) || 0;

      if (
        ["amount", "quantity", "pricePerQuantity", "amountPaid"].includes(name)
      ) {
        const paid = Number(newData.amountPaid) || 0;
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
        pricePerQuantity: "",
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
        <div className="bg-[#09090B] rounded-2xl border border-zinc-800/60 p-6 md:p-8 relative overflow-hidden">
          <div
            className={`absolute top-0 right-0 w-40 h-40 blur-3xl rounded-full pointer-events-none ${theme.glowOrb}`}
          ></div>

          <div className="flex items-center gap-3 mb-8 relative z-10">
            <div
              className={`p-2.5 rounded-xl border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
            >
              <ShoppingCart size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Record Sale
              </h2>
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-0.5">
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
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all ${theme.primaryFocus}`}
                  style={{ colorScheme: "dark" }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                  Challan No. (Opt)
                </label>
                <input
                  type="text"
                  name="challanNo"
                  value={formData.challanNo}
                  onChange={handleChange}
                  placeholder="e.g. CH-101"
                  className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all placeholder:text-zinc-600 ${theme.primaryFocus}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Name of the Buyer
              </label>
              <input
                type="text"
                name="buyerName"
                value={formData.buyerName}
                onChange={handleChange}
                required
                placeholder="e.g. Satyam Mohanty"
                className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all placeholder:text-zinc-600 ${theme.primaryFocus}`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Delivery Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                placeholder="Full site address"
                className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all placeholder:text-zinc-600 ${theme.primaryFocus}`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Vehicle Number
              </label>
              <div className="relative group">
                <div
                  className={`absolute top-1/2 -translate-y-1/2 left-4 text-zinc-500 transition-colors ${theme.primaryText}`}
                >
                  <Truck size={16} />
                </div>
                <input
                  type="text"
                  name="vehicleNo"
                  value={formData.vehicleNo}
                  onChange={handleChange}
                  required
                  placeholder="e.g. OD 02 AB 1234"
                  className={`w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all placeholder:text-zinc-600 ${theme.primaryFocus}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                  Product
                </label>
                <div className="relative">
                  <select
                    name="productName"
                    value={formData.productName}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all appearance-none cursor-pointer ${theme.primaryFocus}`}
                  >
                    <option value="" className="bg-[#09090B] text-zinc-500">
                      Select...
                    </option>
                    <optgroup
                      label="Bricks"
                      className={`bg-[#09090B] font-bold ${theme.primaryText}`}
                    >
                      <option
                        value="Bricks (10 inch)"
                        className="text-zinc-100 font-normal"
                      >
                        Bricks (10 inch)
                      </option>
                      <option
                        value="Bricks (9 inch)"
                        className="text-zinc-100 font-normal"
                      >
                        Bricks (9 inch)
                      </option>
                      <option
                        value="Bricks (8 inch)"
                        className="text-zinc-100 font-normal"
                      >
                        Bricks (8 inch)
                      </option>
                    </optgroup>
                    <optgroup
                      label="Paver Blocks"
                      className={`bg-[#09090B] font-bold ${theme.primaryText}`}
                    >
                      <option
                        value="Zig Zag (60mm)"
                        className="text-zinc-100 font-normal"
                      >
                        Zig Zag (60mm)
                      </option>
                      <option
                        value="Zig Zag (80mm)"
                        className="text-zinc-100 font-normal"
                      >
                        Zig Zag (80mm)
                      </option>
                      <option
                        value="6/12 Brick (60mm)"
                        className="text-zinc-100 font-normal"
                      >
                        6/12 Brick (60mm)
                      </option>
                      <option
                        value="6/12 Brick (80mm)"
                        className="text-zinc-100 font-normal"
                      >
                        6/12 Brick (80mm)
                      </option>
                      <option
                        value="6/6 Brick (60mm)"
                        className="text-zinc-100 font-normal"
                      >
                        6/6 Brick 60mm
                      </option>
                      <option
                        value="6/6 Brick (80mm)"
                        className="text-zinc-100 font-normal"
                      >
                        6/6 Brick (80mm)
                      </option>
                    </optgroup>
                    <optgroup
                      label="Chequered Tiles"
                      className={`bg-[#09090B] font-bold ${theme.primaryText}`}
                    >
                      <option
                        value="Hexagon"
                        className="text-zinc-100 font-normal"
                      >
                        Hexagon
                      </option>
                      <option
                        value="Brick Design (9inch)"
                        className="text-zinc-100 font-normal"
                      >
                        Brick Design (9inch)
                      </option>
                      <option
                        value="Curve Stone"
                        className="text-zinc-100 font-normal"
                      >
                        Curve Stone
                      </option>
                      <option
                        value="Cover Block"
                        className="text-zinc-100 font-normal"
                      >
                        Cover Block
                      </option>
                    </optgroup>
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                  Quantity
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  onWheel={(e) => e.target.blur()}
                  required
                  placeholder="0"
                  className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all placeholder:text-zinc-600 ${theme.primaryFocus}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                  Price per Qty (₹)
                </label>
                <input
                  type="number"
                  name="pricePerQuantity"
                  value={formData.pricePerQuantity}
                  onChange={handleChange}
                  onWheel={(e) => e.target.blur()}
                  required
                  placeholder="0.00"
                  className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all placeholder:text-zinc-600 ${theme.primaryFocus}`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                  Total Bill (₹)
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  onWheel={(e) => e.target.blur()}
                  required
                  placeholder="0.00"
                  className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl ${theme.primaryText} font-bold text-lg outline-none transition-all placeholder:text-zinc-600 ${theme.primaryFocus}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3 ml-1">
                Payment Mode
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, paymentMode: "Cash" })
                  }
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all border ${
                    formData.paymentMode === "Cash"
                      ? theme.paymentCash
                      : `bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:${theme.primaryFocus.split(" ")[0]} hover:text-white`
                  }`}
                >
                  <Banknote size={16} /> Cash
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, paymentMode: "Online" })
                  }
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all border ${
                    formData.paymentMode === "Online"
                      ? theme.paymentOnline
                      : `bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:${theme.primaryFocus.split(" ")[0]} hover:text-white`
                  }`}
                >
                  <CreditCard size={16} /> Online
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-zinc-900/30 p-4 rounded-xl border border-zinc-800">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                  Amount Paid (₹)
                </label>
                <input
                  type="number"
                  name="amountPaid"
                  value={formData.amountPaid}
                  onChange={handleChange}
                  onWheel={(e) => e.target.blur()}
                  placeholder="0.00"
                  className={`w-full px-4 py-3 bg-zinc-900/50 border ${theme.primaryBorder} rounded-xl ${theme.primaryText} font-bold outline-none transition-all placeholder:text-zinc-600 ${theme.primaryFocus}`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                  Amount Due (₹)
                </label>
                <input
                  type="number"
                  name="amountDue"
                  value={formData.amountDue}
                  onChange={handleChange}
                  onWheel={(e) => e.target.blur()}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-rose-500/30 rounded-xl text-rose-400 font-bold outline-none transition-all focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 placeholder:text-zinc-600"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-4 rounded-xl"
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
        <div className="bg-[#09090B] rounded-2xl border border-zinc-800/60 overflow-hidden relative">
          <div className="p-5 border-b border-zinc-800/60 flex flex-col md:flex-row justify-between gap-4 items-center bg-[#09090B]">
            <div className="flex items-center gap-2 text-white font-bold">
              <History size={18} className={theme.primaryText} /> Recent Sales{" "}
              <span className="text-zinc-500 text-xs font-normal">
                (Last 10)
              </span>
            </div>
            <Link
              to={
                isTransport
                  ? "/transportation/sales/report"
                  : "/enterprise/sales/report"
              }
              className={`flex items-center gap-2 text-xs font-bold ${theme.primaryText} ${theme.primaryBg} hover:${theme.primaryHoverBg} border ${theme.primaryBorder} px-4 py-2 rounded-lg transition-all`}
            >
              View Full Report <ArrowRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto custom-scrollbar min-h-[400px]">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-[#09090B] text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-800/60">
                <tr>
                  <th className="p-5 pl-6">Date & Challan</th>
                  <th className="p-5">Buyer</th>
                  <th className="p-5">Item</th>
                  <th className="p-5">Size & Rate</th>
                  <th className="p-5 pr-6 text-right">Amount & Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
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
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      <td className="p-5 pl-6 align-middle">
                        <div className="font-mono text-zinc-400 text-xs">
                          {new Date(sale.date).toLocaleDateString("en-GB")}
                        </div>
                        <div
                          className={`text-[10px] ${theme.primaryText} font-bold tracking-wider mt-1 mb-2`}
                        >
                          {sale.challanNo || "NO CHALLAN"}
                        </div>

                        {hasEdits && (
                          <div className="mt-1.5 flex flex-col items-start w-max cursor-pointer hover:opacity-80 transition-opacity">
                            <div className="flex items-center gap-1.5 bg-zinc-800/50 border border-zinc-700/50 px-2 py-1 rounded-md">
                              <History size={10} className="text-zinc-400" />
                              <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                                {latestLog.role || "ADMIN"}
                              </span>
                              {historyCount > 1 && (
                                <span className="bg-zinc-700/50 text-zinc-400 px-1.5 py-0.5 rounded text-[8px] font-bold ml-1">
                                  +{historyCount - 1} MORE
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-zinc-500 font-mono mt-1 pl-1">
                              {formatLogDate(latestLog.at)}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-5 align-middle">
                        <div className="font-bold text-white tracking-wide mb-1">
                          {sale.buyerName}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 mt-1 flex items-center gap-1.5">
                          <Truck size={10} className="text-zinc-600" />{" "}
                          {sale.vehicleNo}
                        </div>
                      </td>
                      <td className="p-5 align-middle">
                        <div className="text-zinc-300 font-medium text-xs">
                          {name}
                        </div>
                        <div
                          className={`text-[10px] font-bold ${theme.primaryText} ${theme.primaryBg} border ${theme.primaryBorder} px-2 py-0.5 rounded mt-1 inline-block`}
                        >
                          Qty: {sale.quantity}
                        </div>
                      </td>
                      <td className="p-5 align-middle text-zinc-400 text-xs">
                        {size}
                        {sale.pricePerQuantity && (
                          <div className="text-[10px] text-zinc-500 mt-1">
                            ₹{sale.pricePerQuantity} / qty
                          </div>
                        )}
                      </td>
                      <td className="p-5 pr-6 align-middle text-right">
                        <div className="font-bold text-white font-mono text-lg mb-1.5">
                          ₹ {Number(sale.amount).toLocaleString("en-IN")}
                        </div>
                        <div className="flex flex-col items-end gap-1 mt-1">
                          <div className="flex items-center gap-2 mb-1 text-xs font-mono">
                            <span className={`${theme.primaryText} font-bold`}>
                              Paid: ₹
                              {Number(
                                sale.amountPaid || sale.amount,
                              ).toLocaleString("en-IN")}
                            </span>
                            <span
                              className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border inline-block ${
                                sale.paymentMode === "Online"
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                              }`}
                            >
                              {sale.paymentMode}
                            </span>
                          </div>
                          {Number(sale.amountDue) > 0 && (
                            <span className="text-[9px] font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 mt-1">
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
                      className="p-12 text-center text-zinc-500 text-sm italic"
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