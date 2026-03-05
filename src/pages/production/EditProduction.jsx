import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import productionService from "../../services/productionService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import { Factory, ArrowLeft, Save, RefreshCcw } from "lucide-react";
import Input from "../../components/common/Input";
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
        const formattedDate = data.date ? new Date(data.date).toISOString().split("T")[0] : "";
        
        setFormData({
          date: formattedDate,
          productName: data.productName || "",
          quantity: data.quantity || "",
        });

        if (data.lastEditedAt) {
          setAuditInfo({
            role: data.lastEditedRole || "Admin",
            at: new Date(data.lastEditedAt).toLocaleString("en-GB"),
          });
        }
      } catch (err) {
        console.error("Fetch Error:", err);
        toast.error("Could not retrieve production log data.");
      } finally {
        setLoading(false);
      }
    };
    fetchLog();
  }, [id, toast]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const executeUpdate = async () => {
    setSaving(true);
    try {
      const currentUser = admin?.data || admin || { email: "Unknown", role: "admin" };
      await productionService.updateProduction(id, formData, currentUser);
      toast.success("Production record synchronized successfully.");
      navigate("/enterprise/production");
    } catch (err) {
      console.error("Update Error:", err);
      toast.error(err.response?.data?.message || "Failed to update record.");
    } finally {
      setSaving(false);
      setIsDialogOpen(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader />
      <span className="text-emerald-500/40 text-[10px] font-mono uppercase tracking-widest animate-pulse">Decrypting Record...</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <button onClick={() => navigate("/enterprise/production")} className="group flex items-center text-emerald-100/50 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Return to Logs
      </button>

      <div className="bg-[#050a08] rounded-2xl shadow-2xl border border-emerald-900/30 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>

        <div className="flex items-center gap-4 mb-8 border-b border-emerald-900/10 pb-6 relative z-10">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20 shadow-inner">
            <Factory size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Edit Production Log</h2>
            <p className="text-emerald-100/30 text-[11px] uppercase tracking-widest font-semibold mt-1">Ref ID: {id.slice(-8).toUpperCase()}</p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); setIsDialogOpen(true); }} className="space-y-6 relative z-10">
          <Input label="Production Date" name="date" type="date" value={formData.date} onChange={handleChange} required className="bg-[#020403] border-emerald-900/40 text-emerald-100" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-emerald-100/40 uppercase tracking-[0.2em] mb-2 ml-1">Product Classification</label>
              <div className="relative">
                <select
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#020403] border border-emerald-900/40 rounded-xl text-emerald-100 outline-none focus:border-emerald-500/50 appearance-none transition-all cursor-pointer"
                  required
                >
                  <option value="" className="bg-[#050a08] text-emerald-100/30">Select Product...</option>
                  <optgroup label="Bricks" className="bg-[#020403] text-emerald-500 font-bold">
                    <option value="10 inch" className="bg-[#050a08] text-emerald-100">10 inch</option>
                    <option value="9 inch" className="bg-[#050a08] text-emerald-100">9 inch</option>
                    <option value="8 inch" className="bg-[#050a08] text-emerald-100">8 inch</option>
                  </optgroup>
                  <optgroup label="Paver blocks" className="bg-[#020403] text-emerald-500 font-bold">
                    <option value="Zig Zag (60mm)" className="bg-[#050a08] text-emerald-100">Zig Zag (60mm)</option>
                    <option value="Zig Zag (80mm)" className="bg-[#050a08] text-emerald-100">Zig Zag (80mm)</option>
                    <option value="6-12 Brick (60mm)" className="bg-[#050a08] text-emerald-100">6-12 Brick (60mm)</option>
                    <option value="6-12 Brick (80mm)" className="bg-[#050a08] text-emerald-100">6-12 Brick (80mm)</option>
                    <option value="6/6 Brick (60mm)" className="bg-[#050a08] text-emerald-100">6/6 Brick (60mm)</option>
                    <option value="6/6 Brick (80mm)" className="bg-[#050a08] text-emerald-100">6/6 Brick (80mm)</option>
                  </optgroup>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500/30 text-[10px]">▼</div>
              </div>
            </div>
            <Input label="Output Quantity (Pcs)" name="quantity" type="number" value={formData.quantity} onChange={handleChange} onWheel={(e) => e.target.blur()} required />
          </div>

          {auditInfo && (
            <div className="pt-2 text-center text-[10px] font-mono text-emerald-100/30 uppercase tracking-widest border-t border-emerald-900/10 mt-6 pt-4">
              Last integrity check by <span className="text-emerald-400/70 font-bold">{auditInfo.role}</span> on {auditInfo.at}
            </div>
          )}

          <div className="pt-6 flex justify-end gap-4 mt-2">
            <Button type="button" variant="secondary" onClick={() => navigate("/enterprise/production")} className="px-6 border-emerald-900/30 text-emerald-100/50">Discard</Button>
            <Button type="submit" className="px-10 shadow-xl shadow-emerald-900/20 gap-2 border border-emerald-500/30" disabled={saving}>
              {saving ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? "Updating..." : "Commit Changes"}
            </Button>
          </div>
        </form>
      </div>

      <ConfirmDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} onConfirm={executeUpdate} title="Update Record" message="Confirm changes to production log?" confirmText="Save Update" isDestructive={false} />
    </div>
  );
};

export default EditProduction;