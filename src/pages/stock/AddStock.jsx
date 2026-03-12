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
    category: "Purchasing Item",
    quantity: "",
    unit: "",
    price: "",
  });

  const [isCustomItem, setIsCustomItem] = useState(false);
  const [isCustomUnit, setIsCustomUnit] = useState(false);

  // Strict Predefined Items (Locked Units)
  const strictItems = {
    Cement: "bags",
    Chemical: "litre",
    Aggregate: "cum",
  };

  // Items with Optional/Custom Units
  const optionalUnitItems = ["Sand", "Gypsum", "LDA"];

  const handleItemSelect = (e) => {
    const selectedItem = e.target.value;

    if (selectedItem === "Other") {
      setIsCustomItem(true);
      setIsCustomUnit(true);
      setFormData({ ...formData, name: "", unit: "" });
      return;
    }

    if (selectedItem === "Color") {
      setIsCustomItem(false);
      setIsCustomUnit(false);
      setFormData({ ...formData, name: selectedItem, unit: "kg" });
      return;
    }

    if (optionalUnitItems.includes(selectedItem)) {
      setIsCustomItem(false);
      setIsCustomUnit(true);
      setFormData({ ...formData, name: selectedItem, unit: "" });
      return;
    }

    if (strictItems[selectedItem]) {
      setIsCustomItem(false);
      setIsCustomUnit(false);
      setFormData({
        ...formData,
        name: selectedItem,
        unit: strictItems[selectedItem],
      });
    }
  };

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
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <button
        onClick={() => navigate("/enterprise/stock")}
        className="flex items-center text-zinc-500 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={18} className="mr-2" /> Back to List
      </button>

      <div className="bg-[#09090B] rounded-2xl border border-zinc-800/60 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none"></div>

        <div className="flex items-center gap-4 mb-8 border-b border-zinc-800/60 pb-6 relative z-10">
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
            <Package size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              Add New Stock Entry
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              Log incoming materials and supplies
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                Select Item Name
              </label>
              <div className="relative">
                <select
                  onChange={handleItemSelect}
                  defaultValue=""
                  required
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 appearance-none transition-all cursor-pointer"
                >
                  <option
                    value=""
                    disabled
                    className="bg-[#09090B] text-zinc-500"
                  >
                    -- Choose Material --
                  </option>
                  <option value="Cement" className="bg-[#09090B] text-zinc-300">
                    Cement
                  </option>
                  <option
                    value="Chemical"
                    className="bg-[#09090B] text-zinc-300"
                  >
                    Chemical
                  </option>
                  <option
                    value="Aggregate"
                    className="bg-[#09090B] text-zinc-300"
                  >
                    Aggregate
                  </option>
                  <option value="Color" className="bg-[#09090B] text-zinc-300">
                    Color
                  </option>
                  <option value="Sand" className="bg-[#09090B] text-zinc-300">
                    Sand
                  </option>
                  <option value="Gypsum" className="bg-[#09090B] text-zinc-300">
                    Gypsum
                  </option>
                  <option value="LDA" className="bg-[#09090B] text-zinc-300">
                    LDA
                  </option>
                  <option value="Other" className="bg-[#09090B] text-zinc-300">
                    Other (Custom Item)
                  </option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                  ▼
                </div>
              </div>
            </div>

            {isCustomItem && (
              <Input
                label="Custom Item Name"
                name="name"
                placeholder="Type item name..."
                value={formData.name}
                onChange={handleChange}
                required
              />
            )}

            <div className={`${isCustomItem ? "md:col-span-2" : ""}`}>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                Category
              </label>
              <div className="relative">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 appearance-none transition-all cursor-pointer"
                >
                  <option
                    value="Purchasing Item"
                    className="bg-[#09090B] text-zinc-300"
                  >
                    Purchasing Item
                  </option>
                  <option
                    value="Finished Good"
                    className="bg-[#09090B] text-zinc-300"
                  >
                    Finished Good
                  </option>
                  <option value="Other" className="bg-[#09090B] text-zinc-300">
                    Other
                  </option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                  ▼
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="Quantity"
              name="quantity"
              type="number"
              placeholder="0"
              value={formData.quantity}
              onChange={handleChange}
              onWheel={(e) => e.target.blur()}
              required
            />

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                Unit{" "}
                {isCustomUnit && (
                  <span className="text-zinc-600 lowercase tracking-normal">
                    (Optional)
                  </span>
                )}
              </label>

              {formData.name === "Color" && !isCustomUnit ? (
                <div className="relative">
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 font-bold outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                  >
                    <option value="kg" className="bg-[#09090B] text-zinc-300">
                      kg
                    </option>
                    <option value="bags" className="bg-[#09090B] text-zinc-300">
                      bags
                    </option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                    ▼
                  </div>
                </div>
              ) : isCustomUnit ? (
                <input
                  type="text"
                  name="unit"
                  placeholder="e.g. tons, cum"
                  value={formData.unit}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 placeholder:text-zinc-600"
                />
              ) : (
                <div className="w-full px-4 py-3 bg-zinc-900/30 border border-zinc-800 rounded-xl text-zinc-500 font-bold cursor-not-allowed flex items-center h-[50px]">
                  {formData.unit || "-"}
                </div>
              )}
            </div>

            <Input
              label="Price per Unit (₹)"
              name="price"
              type="number"
              placeholder="0.00"
              value={formData.price}
              onChange={handleChange}
              onWheel={(e) => e.target.blur()}
              required
            />
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-zinc-800/60 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/enterprise/stock")}
              className="border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="px-8 rounded-xl"
              disabled={loading || !formData.name}
            >
              <Save size={18} className="mr-2" />{" "}
              {loading ? "Saving..." : "Save Stock"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStock;
