import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import productionService from "../../services/productionService";
import { useUI } from "../../context/UIProvider";
import { Factory, ArrowLeft, Save, RefreshCcw } from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const EditProduction = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useUI();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    date: "",
    productName: "",
    quantity: "",
    supervisor: "",
  });

  useEffect(() => {
    const fetchLog = async () => {
      try {
        // ✅ REMOVED ARTIFICIAL TIMEOUT DELAY
        const { data } = await productionService.getProductionById(id);

        const formattedDate = data.date
          ? new Date(data.date).toISOString().split("T")[0]
          : "";
        setFormData({
          date: formattedDate,
          productName: data.productName || "",
          quantity: data.quantity || "",
          supervisor: data.supervisor || "",
        });
      } catch (err) {
        console.error("Fetch Error:", err);
        toast.error("Security Check: Could not retrieve production log data.");
      } finally {
        setLoading(false);
      }
    };
    fetchLog();
  }, [id]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFormSubmitClick = (e) => {
    e.preventDefault();
    setIsDialogOpen(true);
  };

  const executeUpdate = async () => {
    setSaving(true);
    try {
      await productionService.updateProduction(id, formData);
      toast.success("Production record updated successfully.");
      navigate("/enterprise/production");
    } catch (err) {
      console.error("Update Error:", err);
      toast.error(
        err.response?.data?.message || "Failed to update production record.",
      );
    } finally {
      setSaving(false);
      setIsDialogOpen(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader />
        <span className="text-emerald-500/40 text-[10px] font-mono uppercase tracking-widest animate-pulse">
          Decrypting Record...
        </span>
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <button
        onClick={() => navigate("/enterprise/production")}
        className="group flex items-center text-emerald-100/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft
          size={18}
          className="mr-2 group-hover:-translate-x-1 transition-transform"
        />{" "}
        Return to Production Logs
      </button>

      <div className="bg-[#050a08] rounded-2xl shadow-2xl border border-emerald-900/30 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-900/5 blur-3xl rounded-full pointer-events-none"></div>

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
          onSubmit={handleFormSubmitClick}
          className="space-y-6 relative z-10"
        >
          <Input
            label="Production Date"
            name="date"
            type="date"
            value={formData.date}
            onChange={handleChange}
            required
            className="bg-[#020403] border-emerald-900/40 text-emerald-100"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-emerald-100/40 uppercase tracking-[0.2em] mb-2 ml-1">
                Brick Type / Product
              </label>
              <div className="relative">
                <select
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#020403] border border-emerald-900/40 rounded-xl text-emerald-100 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 appearance-none transition-all cursor-pointer"
                  required
                >
                  <option value="" className="text-emerald-900">
                    Select Product...
                  </option>
                  <optgroup label="Red Clay Bricks">
                    <option value="Red Brick (Standard)">
                      Red Brick (Standard)
                    </option>
                    <option value="Red Brick (Premium)">
                      Red Brick (Premium)
                    </option>
                  </optgroup>
                  <optgroup label="Fly Ash & Cement">
                    <option value="Fly Ash Brick">Fly Ash Brick</option>
                    <option value="Concrete Block (4 inch)">
                      Concrete Block (4 inch)
                    </option>
                    <option value="Concrete Block (6 inch)">
                      Concrete Block (6 inch)
                    </option>
                    <option value="Paver Block (Zigzag)">
                      Paver Block (Zigzag)
                    </option>
                  </optgroup>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500/30 text-[10px]">
                  ▼
                </div>
              </div>
            </div>
            <Input
              label="Quantity Produced (Pieces)"
              name="quantity"
              type="number"
              value={formData.quantity}
              onChange={handleChange}
              required
            />
          </div>
          <Input
            label="Supervisor / Kiln"
            name="supervisor"
            placeholder="e.g. Rajesh (Kiln No. 2)"
            value={formData.supervisor}
            onChange={handleChange}
          />
          <div className="pt-8 flex justify-end gap-4 border-t border-emerald-900/10 mt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/enterprise/production")}
              className="px-6 border-emerald-900/30 text-emerald-100/50 hover:bg-emerald-900/20"
            >
              Discard Changes
            </Button>
            <Button
              type="submit"
              className="px-10 shadow-xl shadow-emerald-900/20 gap-2 border border-emerald-500/30"
              disabled={saving}
            >
              {saving ? (
                <RefreshCcw size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {saving ? "Processing..." : "Commit Update"}
            </Button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={executeUpdate}
        title="Update Production Log"
        message="Are you sure you want to save these changes to the production history?"
        confirmText="Save Update"
        isDestructive={false}
      />
    </div>
  );
};

export default EditProduction;
