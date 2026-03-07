import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import productionService from "../../services/productionService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Factory,
  ArrowLeft,
  Save,
  RefreshCcw,
  ChevronDown,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const EditProduction = () => {
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
    productName: "",
    quantity: "",
  });

  useEffect(() => {
    const fetchLog = async () => {
      try {
        const { data } = await productionService.getProductionById(id);
        const formattedDate = data.date
          ? new Date(data.date).toISOString().split("T")[0]
          : "";

        setFormData({
          date: formattedDate,
          productName: data.productName || "",
          quantity: data.quantity || "",
        });

        if (data.editHistory && data.editHistory.length > 0) {
          const lastEdit = data.editHistory[data.editHistory.length - 1];
          setAuditInfo({
            type: "LAST UPDATED BY",
            role: lastEdit.role || "ADMIN",
            at: new Date(lastEdit.at).toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
        } else {
          setAuditInfo(null);
        }
      } catch (err) {
        toast.error("Could not retrieve production log data.");
      } finally {
        setLoading(false);
      }
    };
    fetchLog();
  }, [id, toast]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const executeUpdate = async () => {
    setSaving(true);
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await productionService.updateProduction(id, formData, currentUser);
      toast.success("Production record synchronized successfully.");
      navigate("/enterprise/production/report");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update record.");
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
        onClick={() => navigate("/enterprise/production/report")}
        className="group flex items-center text-emerald-100/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft
          size={18}
          className="mr-2 group-hover:-translate-x-1 transition-transform"
        />{" "}
        Return to Logs
      </button>

      <div className="bg-[#050a08] rounded-2xl shadow-2xl border border-emerald-900/30 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>

        <div className="flex items-center gap-4 mb-8 border-b border-emerald-900/10 pb-6 relative z-10">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20 shadow-inner">
            <Factory size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Edit Production Log
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
          {/* Fixed Date Input */}
          <div>
            <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
              Production Date
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-[0.2em] mb-1.5 ml-1">
                Product Classification
              </label>
              <div className="relative">
                <select
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner appearance-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 cursor-pointer"
                  required
                >
                  <option value="" className="bg-[#050a08] text-emerald-100/30">
                    Select Product...
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
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500/50"
                />
              </div>
            </div>

            {/* Fixed Qty Input */}
            <div>
              <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
                Output Quantity (Pcs)
              </label>
              <input
                type="number"
                name="quantity"
                placeholder="e.g. 5000"
                value={formData.quantity}
                onChange={handleChange}
                onWheel={(e) => e.target.blur()}
                required
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-4 mt-2 border-b border-emerald-900/10 pb-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/enterprise/production/report")}
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
              Update Record
            </Button>
          </div>

          {auditInfo && (
            <div className="text-center text-[10px] font-mono text-emerald-100/30 uppercase tracking-[0.1em] opacity-80 pt-2">
              {auditInfo.type}{" "}
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
        message="Are you sure you want to save these changes to the production log?"
        confirmText="Save Update"
        isDestructive={false}
      />
    </div>
  );
};

export default EditProduction;
