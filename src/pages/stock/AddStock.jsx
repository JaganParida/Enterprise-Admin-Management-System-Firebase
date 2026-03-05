import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import stockService from "../../services/stockService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import { Package, ArrowLeft, Save } from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

const AddStock = () => {
  const navigate = useNavigate();
  const { toast } = useUI();
  const { admin } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "Raw Material",
    quantity: "",
    unit: "",
    price: "",
    supplier: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await stockService.createStock(formData, currentUser);
      toast.success("Stock item added successfully!");
      navigate("/enterprise/stock");
    } catch (err) {
      console.error("Error adding stock:", err);
      toast.error(err.response?.data?.message || "Failed to add stock.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        onClick={() => navigate("/enterprise/stock")}
        className="flex items-center text-emerald-100/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={18} className="mr-2" /> Back to List
      </button>

      <div className="bg-[#050a08] rounded-2xl shadow-xl border border-emerald-900/30 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>

        <div className="flex items-center gap-4 mb-8 border-b border-emerald-900/20 pb-6 relative z-10">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
            <Package size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Add New Stock Item</h2>
            <p className="text-emerald-100/40 text-sm">
              Enter details for inventory tracking
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <Input
            label="Item Name"
            name="name"
            placeholder="e.g. River Sand, Red Bricks, Cement"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-emerald-100/60 uppercase tracking-wider mb-2 ml-1">
                Category
              </label>
              <div className="relative">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#020403] border border-emerald-900/40 rounded-xl text-emerald-100 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 appearance-none transition-all"
                >
                  <option value="Raw Material">
                    Raw Material (Sand, Coal)
                  </option>
                  <option value="Finished Good">Finished Good (Bricks)</option>
                  <option value="Packaging">Packaging (Pallets)</option>
                  <option value="Other">Other (Tools, Fuel)</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500/50">
                  ▼
                </div>
              </div>
            </div>
            <Input
              label="Supplier / Brand"
              name="supplier"
              placeholder="e.g. UltraTech, Local Quarry"
              value={formData.supplier}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="Quantity"
              name="quantity"
              type="number"
              placeholder="0"
              value={formData.quantity}
              onChange={handleChange}
              required
            />

            <Input
              label="Unit"
              name="unit"
              placeholder="e.g. tons, pcs, kg"
              value={formData.unit}
              onChange={handleChange}
              required
            />

            <Input
              label="Price per Unit (₹)"
              name="price"
              type="number"
              placeholder="0.00"
              value={formData.price}
              onChange={handleChange}
              required
            />
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-emerald-900/20 mt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/enterprise/stock")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="px-8 shadow-lg shadow-emerald-900/20"
              disabled={loading}
            >
              <Save size={18} className="mr-2" />{" "}
              {loading ? "Saving..." : "Save Item"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStock;
