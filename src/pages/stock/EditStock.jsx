import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import stockService from "../../services/stockService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Package,
  ArrowLeft,
  Save,
  RefreshCcw,
  ChevronDown,
} from "lucide-react";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const EditStock = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useUI();
  const { admin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [auditInfo, setAuditInfo] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "Purchasing Item",
    quantity: "",
    unit: "",
    price: "",
  });

  const [isCustomItem, setIsCustomItem] = useState(false);
  const [isCustomUnit, setIsCustomUnit] = useState(false);

  const strictItems = { Cement: "bags", Chemical: "litre", Aggregate: "cum" };
  const optionalUnitItems = ["Sand", "Gypsum", "LDA"];
  const allPredefined = [
    ...Object.keys(strictItems),
    ...optionalUnitItems,
    "Color",
  ];

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const { data } = await stockService.getStockById(id);
        const dbCategory =
          data.category === "Raw Material" ? "Purchasing Item" : data.category;

        setFormData({
          name: data.name || "",
          category: dbCategory || "Purchasing Item",
          quantity: data.quantity || "",
          unit: data.unit || "",
          price: data.price || "",
        });

        const fetchedName = data.name || "";
        if (allPredefined.includes(fetchedName)) {
          setIsCustomItem(false);
          setIsCustomUnit(
            !Object.keys(strictItems).includes(fetchedName) &&
              fetchedName !== "Color",
          );
        } else {
          setIsCustomItem(true);
          setIsCustomUnit(true);
        }

        if (data.lastEditedAt) {
          setAuditInfo({
            role: data.lastEditedRole || "Admin",
            at: new Date(data.lastEditedAt).toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
        }
      } catch (err) {
        toast.error("Could not retrieve item data.");
      } finally {
        setLoading(false);
      }
    };
    fetchStock();
  }, [id]);

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

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFormSubmitClick = (e) => {
    e.preventDefault();
    setIsDialogOpen(true);
  };

  const executeUpdate = async () => {
    setSaving(true);
    try {
      const currentUserData = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await stockService.updateStock(id, formData, currentUserData);
      toast.success("Inventory record synchronized.");
      // 🚀 FLUSH CACHE
      sessionStorage.setItem("stock_needs_refresh", "true");
      navigate("/enterprise/stock");
    } catch (err) {
      toast.error("Failed to update stock record.");
    } finally {
      setSaving(false);
      setIsDialogOpen(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader />
        <span className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest animate-pulse">
          Decrypting Record...
        </span>
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 relative">
      <button
        onClick={() => navigate("/enterprise/stock")}
        className="group flex items-center text-zinc-500 hover:text-white mb-6 transition-colors text-sm"
      >
        <ArrowLeft
          size={16}
          className="mr-2 group-hover:-translate-x-1 transition-transform"
        />{" "}
        Return to Inventory List
      </button>

      <div className="bg-[#09090B] rounded-2xl border border-zinc-800/60 p-6 md:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none"></div>

        <div className="flex items-center gap-4 mb-8 border-b border-zinc-800/60 pb-6 relative z-10">
          <div className="p-3 bg-[#111116] rounded-xl text-indigo-400 border border-indigo-500/20 shadow-sm">
            <Package size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Edit Stock Item
            </h2>
            <p className="text-zinc-500 text-[11px] uppercase tracking-widest font-semibold mt-1">
              Ref ID: {id.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleFormSubmitClick}
          className="space-y-6 relative z-10"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                Select Item Name
              </label>
              <div className="relative">
                <select
                  onChange={handleItemSelect}
                  value={isCustomItem ? "Other" : formData.name}
                  className="w-full px-4 py-3 bg-[#111116] border border-zinc-800/80 rounded-xl text-sm font-semibold text-zinc-100 outline-none focus:border-indigo-500/50 hover:bg-[#18181f] appearance-none cursor-pointer transition-all shadow-sm"
                >
                  <option value="Cement" className="bg-[#09090B]">
                    Cement
                  </option>
                  <option value="Chemical" className="bg-[#09090B]">
                    Chemical
                  </option>
                  <option value="Aggregate" className="bg-[#09090B]">
                    Aggregate
                  </option>
                  <option value="Color" className="bg-[#09090B]">
                    Color
                  </option>
                  <option value="Sand" className="bg-[#09090B]">
                    Sand
                  </option>
                  <option value="Gypsum" className="bg-[#09090B]">
                    Gypsum
                  </option>
                  <option value="LDA" className="bg-[#09090B]">
                    LDA
                  </option>
                  <option value="Other" className="bg-[#09090B]">
                    Other (Custom Item)
                  </option>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500"
                />
              </div>
            </div>

            {isCustomItem && (
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                  Custom Item Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-[#111116] border border-zinc-800/80 rounded-xl text-sm font-semibold text-zinc-100 outline-none focus:border-indigo-500/50 shadow-sm"
                />
              </div>
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
                  className="w-full px-4 py-3 bg-[#111116] border border-zinc-800/80 rounded-xl text-sm font-semibold text-zinc-100 outline-none focus:border-indigo-500/50 hover:bg-[#18181f] appearance-none transition-all shadow-sm"
                >
                  <option value="Purchasing Item" className="bg-[#09090B]">
                    Purchasing Item
                  </option>
                  <option value="Finished Good" className="bg-[#09090B]">
                    Finished Good
                  </option>
                  <option value="Other" className="bg-[#09090B]">
                    Other
                  </option>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                onWheel={(e) => e.target.blur()}
                required
                className="w-full px-4 py-3 bg-[#111116] border border-zinc-800/80 rounded-xl text-sm font-semibold text-zinc-100 outline-none focus:border-indigo-500/50 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                Unit{" "}
                {isCustomUnit && (
                  <span className="lowercase tracking-normal text-zinc-600">
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
                    className="w-full px-4 py-3 bg-[#111116] border border-zinc-800/80 rounded-xl text-sm font-semibold text-zinc-100 outline-none focus:border-indigo-500/50 appearance-none shadow-sm"
                  >
                    <option value="kg" className="bg-[#09090B]">
                      kg
                    </option>
                    <option value="bags" className="bg-[#09090B]">
                      bags
                    </option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500"
                  />
                </div>
              ) : isCustomUnit ? (
                <input
                  type="text"
                  name="unit"
                  placeholder="e.g. tons"
                  value={formData.unit}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#111116] border border-zinc-800/80 rounded-xl text-sm font-semibold text-zinc-100 outline-none focus:border-indigo-500/50 placeholder:text-zinc-600 shadow-sm"
                />
              ) : (
                <div className="w-full px-4 py-3 bg-zinc-900/30 border border-zinc-800/80 rounded-xl text-zinc-500 font-bold cursor-not-allowed h-[46px] flex items-center text-sm shadow-sm">
                  {formData.unit || "-"}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                Base Price (₹)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                onWheel={(e) => e.target.blur()}
                required
                className="w-full px-4 py-3 bg-[#111116] border border-zinc-800/80 rounded-xl text-sm font-bold text-indigo-400 outline-none focus:border-indigo-500/50 shadow-sm"
              />
            </div>
          </div>

          {auditInfo && (
            <div className="pt-2 text-center text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-t border-zinc-800/60 mt-6 pt-4">
              Last updated by{" "}
              <span className="text-indigo-400 font-bold">
                {auditInfo.role}
              </span>{" "}
              on {auditInfo.at}
            </div>
          )}

          <div className="pt-6 flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={() => navigate("/enterprise/stock")}
              className="h-10 px-6 border border-zinc-800 text-zinc-400 hover:bg-[#16161a] hover:text-white rounded-lg text-xs font-bold transition-colors"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name}
              className="h-10 px-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center shadow-sm disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <RefreshCcw size={16} className="animate-spin mr-2" />
              ) : (
                <Save size={16} className="mr-2" />
              )}{" "}
              {saving ? "Processing..." : "Commit Update"}
            </button>
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
