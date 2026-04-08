import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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
import ConfirmDialog from "../../components/common/ConfirmDialog";

// 🚀 NEW EDIT PRODUCTION SKELETON
const EditProductionSkeleton = () => (
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
        <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

const EditProduction = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
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
    glowOrb: isTransport ? "bg-cyan-500/5" : "bg-indigo-500/5",
  };

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
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update record.");
    } finally {
      setSaving(false);
      setIsDialogOpen(false);
    }
  };

  // 🚀 REPLACED LOADER WITH SKELETON
  if (loading) return <EditProductionSkeleton />;

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
        Return to Logs
      </button>

      <div className="bg-[#09090B] rounded-2xl border border-zinc-800/60 p-8 relative overflow-hidden">
        <div
          className={`absolute top-0 right-0 w-64 h-64 blur-3xl rounded-full pointer-events-none ${theme.glowOrb}`}
        ></div>

        <div className="flex items-center gap-4 mb-8 border-b border-zinc-800/60 pb-6 relative z-10">
          <div
            className={`p-3 rounded-xl border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
          >
            <Factory size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Edit Production Log
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
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
              Production Date
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-1.5 ml-1">
                Product Classification
              </label>
              <div className="relative">
                <select
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all appearance-none cursor-pointer ${theme.primaryFocus}`}
                  required
                >
                  <option value="" className="bg-[#09090B] text-zinc-500">
                    Select Product...
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
                className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all ${theme.primaryFocus}`}
              />
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 mt-2 border-b border-zinc-800/60 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="px-6 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white rounded-xl"
            >
              Discard Changes
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
              Update Record
            </Button>
          </div>

          {auditInfo && (
            <div className="text-center text-[10px] font-mono text-zinc-500 uppercase tracking-widest pt-2">
              {auditInfo.type}{" "}
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
        message="Are you sure you want to save these changes to the production log?"
        confirmText="Save Update"
        isDestructive={false}
      />
    </div>
  );
};

export default EditProduction;
