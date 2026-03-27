import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  CheckCircle,
  Database,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

// 🚀 SAFE DATE FORMATTER
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const dateOnly = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const [y, m, d] = dateOnly.split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
    return dateStr;
  } catch (e) {
    return dateStr;
  }
};

const Sales = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useUI();
  const { admin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sales, setSales] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(false);

  const [syncingStats, setSyncingStats] = useState(false);
  const [isStatsSynced, setIsStatsSynced] = useState(true);

  const isTransport =
    typeof window !== "undefined"
      ? location.pathname.includes("/transportation")
      : false;
  const basePath = isTransport ? "/transportation" : "/enterprise";

  const theme = {
    primaryText: isTransport ? "text-cyan-400" : "text-indigo-400",
    primaryBg: isTransport ? "bg-cyan-500/10" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-cyan-500/20" : "border-indigo-500/20",
    primaryFocus: isTransport
      ? "focus:border-cyan-500/50 focus:ring-cyan-500/50"
      : "focus:border-indigo-500/50 focus:ring-indigo-500/50",
    glowOrb: isTransport ? "bg-cyan-500/10" : "bg-indigo-500/10",
    paymentOnline: isTransport
      ? "bg-cyan-500 text-white border-cyan-500"
      : "bg-blue-500 text-white border-blue-500",
    paymentCash: isTransport
      ? "bg-blue-500 text-white border-blue-500"
      : "bg-indigo-500 text-white border-indigo-500",
    primaryHoverBg: isTransport
      ? "hover:bg-cyan-500/20"
      : "hover:bg-indigo-500/20",
  };

  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";

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

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const s = await salesService.getStats();
        const { data } = await salesService.getAllSales({}, null, 10);

        let isSynced = true;
        if (data.length > 0 && s.total === 0) isSynced = false;
        else if (data.length === 0 && s.total > 0) isSynced = false;
        else if (s.total < 0 || s.cash < 0 || s.online < 0 || s.pendingDues < 0)
          isSynced = false;

        setIsStatsSynced(isSynced);
        setSales(data || []);
      } catch (error) {
        toast.error("Failed to load sales data.");
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, [toast]);

  const handleSyncStats = async () => {
    if (isStatsSynced) return;
    setSyncingStats(true);
    toast.info("Repairing stats...");
    try {
      await salesService.recalculateStats();
      setIsStatsSynced(true);
      toast.success("Dashboard stats repaired!");
    } catch (e) {
      toast.error("Sync failed.");
    } finally {
      setSyncingStats(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      let newData = { ...prev, [name]: value };
      if (name === "quantity" || name === "pricePerQuantity") {
        const qty = Number(newData.quantity) || 0;
        const rate = Number(newData.pricePerQuantity) || 0;
        if (qty > 0 && rate > 0) newData.amount = (qty * rate).toString();
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
        if (totalAmount > 0)
          newData.amountPaid = Math.max(0, totalAmount - due).toString();
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
      const docRef = await salesService.addSale(formData, currentUser);
      toast.success("Sale recorded successfully!");

      setSales((prevSales) => {
        const newSale = {
          _id: docRef.id,
          id: docRef.id,
          ...formData,
          amount: Number(formData.amount),
          amountPaid: Number(formData.amountPaid),
          amountDue: Number(formData.amountDue),
          createdAt: new Date().toISOString(),
        };
        return [newSale, ...prevSales].slice(0, 10);
      });

      setFormData({
        ...formData,
        challanNo: "",
        buyerName: "",
        address: "",
        vehicleNo: "",
        quantity: "",
        pricePerQuantity: "",
        amount: "",
        amountPaid: "",
        amountDue: "",
      });
    } catch (error) {
      toast.error("Failed to record sale.");
    } finally {
      setSubmitting(false);
      setConfirmDialog(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in pb-10">
      <div className="lg:col-span-1">
        <div className="bg-[#09090B] rounded-2xl border border-zinc-800/60 p-6 md:p-8 relative overflow-hidden">
          <div
            className={`absolute top-0 right-0 w-40 h-40 blur-3xl rounded-full pointer-events-none ${theme.glowOrb}`}
          ></div>

          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center gap-3">
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
                  Challan No.
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
                Buyer Name
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
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                placeholder="Site address"
                className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all placeholder:text-zinc-600 ${theme.primaryFocus}`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Vehicle No.
              </label>
              <div className="relative">
                <div
                  className={`absolute top-1/2 -translate-y-1/2 left-4 text-zinc-500 ${theme.primaryText}`}
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
              <div className="relative">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                  Product
                </label>
                <select
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none appearance-none ${theme.primaryFocus}`}
                >
                  <option value="" className="bg-[#09090B]">
                    Select...
                  </option>
                  <optgroup label="Bricks" className="bg-[#09090B] font-bold">
                    <option value="Bricks (10 inch)" className="font-normal">
                      Bricks (10 inch)
                    </option>
                    <option value="Bricks (9 inch)" className="font-normal">
                      Bricks (9 inch)
                    </option>
                  </optgroup>
                  <optgroup label="Pavers" className="bg-[#09090B] font-bold">
                    <option value="Zig Zag (60mm)" className="font-normal">
                      Zig Zag (60mm)
                    </option>
                    <option value="6-12 Brick (60mm)" className="font-normal">
                      6/12 Brick (60mm)
                    </option>
                  </optgroup>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-4 bottom-3 pointer-events-none text-zinc-500"
                />
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
                  required
                  placeholder="0"
                  className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none ${theme.primaryFocus}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                  Price/Qty
                </label>
                <input
                  type="number"
                  name="pricePerQuantity"
                  value={formData.pricePerQuantity}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                  className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none ${theme.primaryFocus}`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                  Total Bill
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                  className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl ${theme.primaryText} font-bold text-lg outline-none ${theme.primaryFocus}`}
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
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold border ${formData.paymentMode === "Cash" ? theme.paymentCash : "bg-zinc-900/50 border-zinc-800 text-zinc-400"}`}
                >
                  <Banknote size={16} /> Cash
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, paymentMode: "Online" })
                  }
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold border ${formData.paymentMode === "Online" ? theme.paymentOnline : "bg-zinc-900/50 border-zinc-800 text-zinc-400"}`}
                >
                  <CreditCard size={16} /> Online
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-zinc-900/30 p-4 rounded-xl border border-zinc-800">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                  Paid (₹)
                </label>
                <input
                  type="number"
                  name="amountPaid"
                  value={formData.amountPaid}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={`w-full px-4 py-3 bg-zinc-900/50 border ${theme.primaryBorder} rounded-xl ${theme.primaryText} font-bold outline-none ${theme.primaryFocus}`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                  Due (₹)
                </label>
                <input
                  type="number"
                  name="amountDue"
                  value={formData.amountDue}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-rose-500/30 rounded-xl text-rose-400 font-bold outline-none focus:border-rose-500/50"
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
          <div className="p-5 border-b border-zinc-800/60 flex justify-between items-center bg-[#09090B]">
            <div className="flex items-center gap-2 text-white font-bold">
              <History size={18} className={theme.primaryText} /> Recent Sales{" "}
              <span className="text-zinc-500 text-xs font-normal">
                (Last 10)
              </span>
            </div>
            <div className="flex gap-3">
              {/* 🚀 FIXED BUTTON: Visible, Low Opacity, Unclickable, Tooltip added */}
              {!isManager && (
                <Button
                  variant="outline"
                  onClick={handleSyncStats}
                  disabled={syncingStats || isStatsSynced}
                  title={
                    isStatsSynced
                      ? "System Already Updated"
                      : "Click to Sync Stats"
                  }
                  className={`h-9 px-3 transition-all duration-500 ${
                    isStatsSynced
                      ? "opacity-40 pointer-events-none cursor-not-allowed bg-emerald-500/5 text-emerald-500 border-emerald-500/20"
                      : "opacity-100 cursor-pointer border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  {isStatsSynced ? (
                    <CheckCircle size={14} />
                  ) : (
                    <Database
                      size={14}
                      className={
                        syncingStats ? "animate-pulse text-indigo-400" : ""
                      }
                    />
                  )}
                  <span className="ml-2 hidden lg:block text-xs">
                    {syncingStats
                      ? "Syncing..."
                      : isStatsSynced
                        ? "Up to Date"
                        : "Sync Stats"}
                  </span>
                </Button>
              )}
              <Link
                to={`${basePath}/sales/report`}
                className={`flex items-center gap-2 text-xs font-bold ${theme.primaryText} ${theme.primaryBg} hover:${theme.primaryHoverBg} border ${theme.primaryBorder} px-4 py-2 rounded-lg`}
              >
                <span className="hidden md:inline">Full Report</span>{" "}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-[#09090B] text-zinc-500 text-[10px] uppercase font-bold border-b border-zinc-800/60">
                <tr>
                  <th className="p-5 pl-6">Date/Challan</th>
                  <th className="p-5">Buyer</th>
                  <th className="p-5">Item/Qty</th>
                  <th className="p-5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
                {sales.map((sale) => (
                  <tr
                    key={sale._id}
                    onClick={(e) => {
                      if (!e.target.closest("a"))
                        navigate(
                          `${basePath}/sales/report?highlight=${sale._id}`,
                        );
                    }}
                    className="hover:bg-zinc-800/30 cursor-pointer"
                  >
                    <td className="p-5 pl-6">
                      <div className="font-mono text-zinc-400 text-xs">
                        {formatDate(sale.date)}
                      </div>
                      <div
                        className={`text-[10px] ${theme.primaryText} font-bold mt-1`}
                      >
                        {sale.challanNo || "-"}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="font-bold text-white mb-1">
                        {sale.buyerName}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                        <Truck size={10} /> {sale.vehicleNo}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="text-zinc-300 text-xs mb-1">
                        {sale.productName}
                      </div>
                      <div
                        className={`text-[10px] font-bold ${theme.primaryText} bg-zinc-800 px-2 py-0.5 rounded inline-block`}
                      >
                        Qty: {sale.quantity}
                      </div>
                    </td>
                    <td className="p-5 pr-6 text-right">
                      <div className="font-bold text-white font-mono text-lg">
                        ₹ {Number(sale.amount).toLocaleString("en-IN")}
                      </div>
                      <div className="text-xs font-mono text-zinc-400 mt-1">
                        Paid: ₹
                        {Number(sale.amountPaid || sale.amount).toLocaleString(
                          "en-IN",
                        )}
                      </div>
                      {Number(sale.amountDue) > 0 && (
                        <span className="text-[9px] font-mono text-rose-400 mt-1 block">
                          DUE: ₹{Number(sale.amountDue).toLocaleString("en-IN")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
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
        title="Save Record"
        message="Confirm this sale?"
        confirmText="Save"
        isDestructive={false}
      />
    </div>
  );
};
export default Sales;
