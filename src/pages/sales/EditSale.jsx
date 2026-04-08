import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import salesService from "../../services/salesService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  ShoppingCart,
  ArrowLeft,
  Save,
  RefreshCcw,
  Banknote,
  CreditCard,
  Truck,
  ChevronDown,
} from "lucide-react";
import Button from "../../components/common/Button";
import ConfirmDialog from "../../components/common/ConfirmDialog";

// 🚀 NEW EDIT SALE SKELETON
const EditSaleSkeleton = () => (
  <div className="max-w-3xl mx-auto space-y-6 pb-10 w-full flex flex-col">
    <div className="w-32 h-5 bg-zinc-800/50 rounded-md animate-pulse mb-2"></div>
    <div className="bg-[#09090B] rounded-2xl border border-zinc-800/60 p-8 animate-pulse">
      <div className="flex items-center gap-4 mb-8 border-b border-zinc-800/60 pb-6">
        <div className="h-14 w-14 rounded-xl bg-zinc-800/60"></div>
        <div>
          <div className="h-6 w-48 bg-zinc-800/60 rounded mb-2"></div>
          <div className="h-3 w-32 bg-zinc-800/40 rounded"></div>
        </div>
      </div>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
          <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
          <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
        </div>
        <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
          <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
          <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
        </div>
        <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50">
          <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
          <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
        </div>
        <div className="flex justify-end gap-3 border-b border-zinc-800/60 mt-2 pt-6 pb-6">
          <div className="h-11 w-32 bg-zinc-800/50 rounded-xl"></div>
          <div className="h-11 w-40 bg-zinc-800/60 rounded-xl"></div>
        </div>
        <div className="h-3 w-48 mx-auto bg-zinc-800/40 rounded pt-2"></div>
      </div>
    </div>
  </div>
);

const EditSale = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
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

  const theme = {
    primaryText: isTransport ? "text-cyan-400" : "text-indigo-400",
    primaryBg: isTransport ? "bg-cyan-500/10" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-cyan-500/20" : "border-indigo-500/20",
    primaryFocus: isTransport
      ? "focus:border-cyan-500/50 focus:ring-cyan-500/50"
      : "focus:border-indigo-500/50 focus:ring-indigo-500/50",
    glowOrb: isTransport ? "bg-cyan-500/5" : "bg-indigo-500/5",
    paymentOnline: isTransport
      ? "bg-cyan-500 text-white border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
      : "bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]",
    paymentCash: isTransport
      ? "bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
      : "bg-indigo-500 text-white border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]",
  };

  const [formData, setFormData] = useState({
    date: "",
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
    const fetchLog = async () => {
      try {
        const { data } = await salesService.getSaleById(id);
        let safeDate = "";
        if (data.date)
          safeDate = data.date.includes("T")
            ? data.date.split("T")[0]
            : data.date;

        setFormData({
          date: safeDate,
          challanNo: data.challanNo || "",
          buyerName: data.buyerName || "",
          address: data.address || "",
          vehicleNo: data.vehicleNo || "",
          productName: data.productName || "",
          quantity: data.quantity || "",
          pricePerQuantity: data.pricePerQuantity || "",
          amount: data.amount || "",
          amountPaid: data.amountPaid || "",
          amountDue: data.amountDue || "",
          paymentMode: data.paymentMode || "Cash",
        });

        if (data.editHistory && data.editHistory.length > 0) {
          const lastEdit = data.editHistory[data.editHistory.length - 1];
          setAuditInfo({
            role: lastEdit.role || "ADMIN",
            at: new Date(lastEdit.at).toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
        }
      } catch (err) {
        toast.error("Could not retrieve sales data.");
      } finally {
        setLoading(false);
      }
    };
    fetchLog();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      let newData = { ...prev, [name]: value };

      if (name === "vehicleNo") {
        let raw = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
        let formatted = "";

        if (raw.length > 0) formatted += raw.substring(0, 2);
        if (raw.length > 2) formatted += "-" + raw.substring(2, 4);
        if (raw.length > 4) {
          let remaining = raw.substring(4);
          if (/^[0-9]/.test(remaining)) {
            let match = remaining.match(/^([0-9]{1,4})?([A-Z]{0,2})?/);
            if (match && match[1]) formatted += "-" + match[1];
            if (match && match[2]) formatted += "-" + match[2];
          } else {
            let match = remaining.match(/^([A-Z]{1,3})?([0-9]{0,4})?/);
            if (match && match[1]) formatted += "-" + match[1];
            if (match && match[2]) formatted += "-" + match[2];
          }
        }

        if (
          value.endsWith("-") &&
          formatted.length < 14 &&
          formatted.replace(/-/g, "") === raw
        ) {
          formatted += "-";
        }

        newData.vehicleNo = formatted.substring(0, 14);
      }

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

  const executeUpdate = async () => {
    setSaving(true);
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await salesService.updateSale(id, formData, currentUser);
      toast.success("Sales record updated successfully.");
      sessionStorage.setItem("report_needs_refresh", "true");
      sessionStorage.setItem("entry_needs_refresh", "true");
      navigate(-1);
    } catch (err) {
      toast.error("Failed to update record.");
    } finally {
      setSaving(false);
      setIsDialogOpen(false);
    }
  };

  // 🚀 REPLACED LOADER WITH SKELETON
  if (loading) return <EditSaleSkeleton />;

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <button
        onClick={() => navigate(-1)}
        className="group flex items-center text-zinc-500 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft
          size={18}
          className="mr-2 group-hover:-translate-x-1 transition-transform"
        />{" "}
        Return to Report
      </button>
      <div className="bg-[#09090B] rounded-2xl border border-zinc-800/60 p-8 relative overflow-hidden">
        <div
          className={`absolute top-0 right-0 w-64 h-64 blur-3xl rounded-full pointer-events-none ${theme.glowOrb}`}
        ></div>
        <div className="flex items-center gap-4 mb-8 border-b border-zinc-800/60 pb-6 relative z-10">
          <div
            className={`p-3 rounded-xl border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
          >
            <ShoppingCart size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Edit Sale Record
            </h2>
            <p className="text-zinc-500 text-[11px] uppercase tracking-widest font-semibold mt-1">
              Ref ID: {id.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setIsDialogOpen(true);
          }}
          className="space-y-6 relative z-10"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Sale Date
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                placeholder="e.g. Ramesh Textiles"
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
                  maxLength="14"
                  placeholder="e.g. OD-02-AX-1234"
                  className={`w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all placeholder:text-zinc-600 ${theme.primaryFocus}`}
                />
              </div>
            </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <option value="Hexagon" className="text-zinc-100 font-normal">
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
                className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all placeholder:text-zinc-600 ${theme.primaryFocus}`}
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
                className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all placeholder:text-zinc-600 ${theme.primaryFocus}`}
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
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all border ${formData.paymentMode === "Cash" ? theme.paymentCash : `bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:${theme.primaryFocus.split(" ")[0]} hover:text-white`}`}
              >
                <Banknote size={16} /> Cash
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, paymentMode: "Online" })
                }
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all border ${formData.paymentMode === "Online" ? theme.paymentOnline : `bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:${theme.primaryFocus.split(" ")[0]} hover:text-white`}`}
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
                className={`w-full px-4 py-3 bg-zinc-900/50 border ${theme.primaryBorder} rounded-xl ${theme.primaryText} font-bold outline-none transition-all placeholder:text-zinc-600 ${theme.primaryFocus}`}
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
                className="w-full px-4 py-3 bg-zinc-900/50 border border-rose-500/30 rounded-xl text-rose-400 font-bold outline-none transition-all focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 mt-2 border-b border-zinc-800/60 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="px-6 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 rounded-xl"
            >
              Discard
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="px-10 gap-2 rounded-xl"
              disabled={saving}
            >
              {saving ? (
                <RefreshCcw size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}{" "}
              Update
            </Button>
          </div>
          {auditInfo && (
            <div className="text-center text-[10px] font-mono text-zinc-500 uppercase tracking-[0.1em] pt-2">
              LAST UPDATED BY{" "}
              <span className={`${theme.primaryText} font-bold mx-1`}>
                {auditInfo.role}
              </span>{" "}
              ON {auditInfo.at}
            </div>
          )}
        </form>
      </div>
      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={executeUpdate}
        title="Update Record"
        message="Are you sure you want to save these changes to the sales record?"
        confirmText="Save Update"
        isDestructive={false}
      />
    </div>
  );
};

export default EditSale;
