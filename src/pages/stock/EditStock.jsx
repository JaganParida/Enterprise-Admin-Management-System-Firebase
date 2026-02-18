import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import stockService from "../../services/stockService";
import { useUI } from "../../context/UIProvider";
import { Package, ArrowLeft, Save, RefreshCcw } from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const EditStock = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useUI();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "Raw Material",
    quantity: "",
    unit: "kg",
    price: "",
    supplier: "",
  });

  useEffect(() => {
    const fetchStock = async () => {
      try {
        // ✅ REMOVED ARTIFICIAL TIMEOUT DELAY
        const { data } = await stockService.getStockById(id);

        setFormData({
          name: data.name || "",
          category: data.category || "Raw Material",
          quantity: data.quantity || "",
          unit: data.unit || "kg",
          price: data.price || "",
          supplier: data.supplier || "",
        });
      } catch (err) {
        console.error("Fetch Error:", err);
        toast.error("Security Check: Could not retrieve item data.");
      } finally {
        setLoading(false);
      }
    };
    fetchStock();
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
      await stockService.updateStock(id, formData);
      toast.success("Inventory record synchronized successfully.");
      navigate("/enterprise/stock");
    } catch (err) {
      console.error("Update Error:", err);
      toast.error(
        err.response?.data?.message || "Failed to update stock record.",
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
        onClick={() => navigate("/enterprise/stock")}
        className="group flex items-center text-emerald-100/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft
          size={18}
          className="mr-2 group-hover:-translate-x-1 transition-transform"
        />
        Return to Inventory List
      </button>

      <div className="bg-[#050a08] rounded-2xl shadow-2xl border border-emerald-900/30 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-900/5 blur-3xl rounded-full pointer-events-none"></div>

        <div className="flex items-center gap-4 mb-8 border-b border-emerald-900/10 pb-6 relative z-10">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20 shadow-inner">
            <Package size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Edit Stock Item
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
            label="Item Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="bg-[#020403] border-emerald-900/40"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-emerald-100/40 uppercase tracking-[0.2em] mb-2 ml-1">
                Classification
              </label>
              <div className="relative">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#020403] border border-emerald-900/40 rounded-xl text-emerald-100 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 appearance-none transition-all cursor-pointer"
                >
                  <option value="Raw Material">Raw Material</option>
                  <option value="Finished Good">Finished Good</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Other">Other</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500/30 text-[10px]">
                  ▼
                </div>
              </div>
            </div>
            <Input
              label="Supply Source"
              name="supplier"
              placeholder="Internal / External Vendor"
              value={formData.supplier}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="Quantity"
              name="quantity"
              type="number"
              value={formData.quantity}
              onChange={handleChange}
              required
            />
            <Input
              label="Unit (SKU)"
              name="unit"
              placeholder="e.g. kg, pcs"
              value={formData.unit}
              onChange={handleChange}
              required
            />
            <Input
              label="Base Price (₹)"
              name="price"
              type="number"
              value={formData.price}
              onChange={handleChange}
              required
            />
          </div>

          <div className="pt-8 flex justify-end gap-4 border-t border-emerald-900/10 mt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/enterprise/stock")}
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
        title="Confirm Update"
        message={`Are you sure you want to save changes to "${formData.name}"?`}
        confirmText="Save Update"
        isDestructive={false}
      />
    </div>
  );
};

export default EditStock;
