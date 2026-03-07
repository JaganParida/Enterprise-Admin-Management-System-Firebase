import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const EditSale = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useUI();
  const { admin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [auditInfo, setAuditInfo] = useState(null);

  const [formData, setFormData] = useState({
    date: "",
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

  useEffect(() => {
    const fetchLog = async () => {
      try {
        const { data } = await salesService.getSaleById(id);
        const formattedDate = data.date
          ? new Date(data.date).toISOString().split("T")[0]
          : "";
        setFormData({
          date: formattedDate,
          challanNo: data.challanNo || "",
          buyerName: data.buyerName || "",
          address: data.address || "",
          vehicleNo: data.vehicleNo || "",
          productName: data.productName || "",
          quantity: data.quantity || "",
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
  }, [id, toast]);

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

  const executeUpdate = async () => {
    setSaving(true);
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await salesService.updateSale(id, formData, currentUser);
      toast.success("Sales record updated successfully.");
      navigate("/enterprise/sales/report");
    } catch (err) {
      toast.error("Failed to update record.");
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
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <button
        onClick={() => navigate("/enterprise/sales/report")}
        className="group flex items-center text-emerald-100/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft
          size={18}
          className="mr-2 group-hover:-translate-x-1 transition-transform"
        />{" "}
        Return to Report
      </button>

      <div className="bg-[#050a08] rounded-2xl shadow-2xl border border-emerald-900/30 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>

        <div className="flex items-center gap-4 mb-8 border-b border-emerald-900/10 pb-6 relative z-10">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20 shadow-inner">
            <ShoppingCart size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Edit Sale Record
            </h2>
            <p className="text-emerald-100/30 text-[11px] uppercase tracking-widest font-semibold mt-1">
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
              <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
                Sale Date
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
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
                Buyer Name
              </label>
              <input
                type="text"
                name="buyerName"
                value={formData.buyerName}
                onChange={handleChange}
                required
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
                  className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                />
              </div>
            </div>
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
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
                Product Description
              </label>
              <div className="relative">
                <select
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner appearance-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 cursor-pointer"
                >
                  <option value="" className="bg-[#050a08] text-emerald-100/30">
                    Select Material...
                  </option>
                  <optgroup
                    label="Bricks"
                    className="bg-[#020403] text-emerald-500 font-bold"
                  >
                    <option
                      value="Bricks (10 inch)"
                      className="text-white font-normal"
                    >
                      Bricks (10 inch)
                    </option>
                    <option
                      value="Bricks (9 inch)"
                      className="text-white font-normal"
                    >
                      Bricks (9 inch)
                    </option>
                    <option
                      value="Bricks (8 inch)"
                      className="text-white font-normal"
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
                      className="text-white font-normal"
                    >
                      Zig Zag (60mm)
                    </option>
                    <option
                      value="Zig Zag (80mm)"
                      className="text-white font-normal"
                    >
                      Zig Zag (80mm)
                    </option>
                    <option
                      value="6-12 Brick (60mm)"
                      className="text-white font-normal"
                    >
                      6-12 Brick (60mm)
                    </option>
                    <option
                      value="6-12 Brick (80mm)"
                      className="text-white font-normal"
                    >
                      6-12 Brick (80mm)
                    </option>
                    <option
                      value="6/6 Brick (60mm)"
                      className="text-white font-normal"
                    >
                      6/6 Brick 60mm
                    </option>
                    <option
                      value="6/6 Brick (80mm)"
                      className="text-white font-normal"
                    >
                      6/6 Brick (80mm)
                    </option>
                  </optgroup>
                  <optgroup
                    label="Chequered Tiles"
                    className="bg-[#020403] text-emerald-500 font-bold"
                  >
                    <option value="Hexagon" className="text-white font-normal">
                      Hexagon
                    </option>
                    <option
                      value="Brick Design (9inch)"
                      className="text-white font-normal"
                    >
                      Brick Design (9inch)
                    </option>
                    <option
                      value="Curve Stone"
                      className="text-white font-normal"
                    >
                      Curve Stone
                    </option>
                    <option
                      value="Cover Block"
                      className="text-white font-normal"
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
                      className="text-white font-normal"
                    >
                      Cement (Bags)
                    </option>
                    <option value="Sand" className="text-white font-normal">
                      Sand
                    </option>
                  </optgroup>
                  <optgroup
                    label="Aggregate"
                    className="bg-[#020403] text-amber-500 font-bold"
                  >
                    <option
                      value="Aggregate (60mm)"
                      className="text-white font-normal"
                    >
                      Aggregate (60mm)
                    </option>
                    <option
                      value="Aggregate (40mm)"
                      className="text-white font-normal"
                    >
                      Aggregate (40mm)
                    </option>
                    <option
                      value="Aggregate (20mm)"
                      className="text-white font-normal"
                    >
                      Aggregate (20mm)
                    </option>
                    <option
                      value="Aggregate (10mm)"
                      className="text-white font-normal"
                    >
                      Aggregate (10mm)
                    </option>
                    <option
                      value="Aggregate (6mm)"
                      className="text-white font-normal"
                    >
                      Aggregate (6mm)
                    </option>
                    <option value="Dust" className="text-white font-normal">
                      Dust
                    </option>
                    <option value="GSP" className="text-white font-normal">
                      GSP
                    </option>
                    <option value="WMM" className="text-white font-normal">
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
                onWheel={(e) => e.target.blur()}
                required
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                className="w-full px-4 py-3 bg-black/40 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-lg outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
              />
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-900/10 p-4 rounded-xl border border-emerald-900/20">
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

          <div className="pt-6 flex justify-end gap-4 mt-2 border-b border-emerald-900/10 pb-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/enterprise/sales/report")}
              className="px-6 border-emerald-900/30 text-emerald-100/50 hover:bg-emerald-900/20"
            >
              Discard
            </Button>
            <Button
              type="submit"
              className="px-10 shadow-xl shadow-emerald-900/20 gap-2 bg-emerald-500 hover:bg-emerald-400 text-[#020403] border-none"
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
            <div className="text-center text-[10px] font-mono text-emerald-100/30 uppercase tracking-[0.1em] opacity-80 pt-2">
              LAST UPDATED BY{" "}
              <span className="text-emerald-400 font-bold mx-1">
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
