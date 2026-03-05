import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import stockService from "../../services/stockService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import { Package, ArrowLeft, Save, RefreshCcw } from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
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

  // 🚀 Strict Predefined Items (Locked Units)
  const strictItems = {
    Cement: "bags",
    Chemical: "litre",
    Aggregate: "cum",
  };

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

        // Convert old "Raw Material" to "Purchasing Item" safely
        const dbCategory =
          data.category === "Raw Material" ? "Purchasing Item" : data.category;

        setFormData({
          name: data.name || "",
          category: dbCategory || "Purchasing Item",
          quantity: data.quantity || "",
          unit: data.unit || "",
          price: data.price || "",
        });

        // 🚀 Detect if the item is custom or predefined
        const fetchedName = data.name || "";
        if (allPredefined.includes(fetchedName)) {
          setIsCustomItem(false);
          // Color, Sand, Gypsum, LDA require custom unit box (or specific dropdown)
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
            at: new Date(data.lastEditedAt).toLocaleString(),
          });
        }
      } catch (err) {
        console.error("Fetch Error:", err);
        toast.error("Security Check: Could not retrieve item data.");
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
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <button
        onClick={() => navigate("/enterprise/stock")}
        className="group flex items-center text-emerald-100/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft
          size={18}
          className="mr-2 group-hover:-translate-x-1 transition-transform"
        />{" "}
        Return to Inventory List
      </button>

      <div className="bg-[#050a08] rounded-2xl shadow-2xl border border-emerald-900/30 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-2 ml-1">
                Select Item Name
              </label>
              <div className="relative">
                <select
                  onChange={handleItemSelect}
                  value={isCustomItem ? "Other" : formData.name}
                  className="w-full px-4 py-3 bg-[#020403] border border-emerald-900/40 rounded-xl text-emerald-100 outline-none focus:border-emerald-500/50 appearance-none cursor-pointer"
                >
                  <option value="Cement" className="bg-[#050a08]">
                    Cement
                  </option>
                  <option value="Chemical" className="bg-[#050a08]">
                    Chemical
                  </option>
                  <option value="Aggregate" className="bg-[#050a08]">
                    Aggregate
                  </option>
                  <option value="Color" className="bg-[#050a08]">
                    Color
                  </option>
                  <option value="Sand" className="bg-[#050a08]">
                    Sand
                  </option>
                  <option value="Gypsum" className="bg-[#050a08]">
                    Gypsum
                  </option>
                  <option value="LDA" className="bg-[#050a08]">
                    LDA
                  </option>
                  <option value="Other" className="bg-[#050a08]">
                    Other (Custom Item)
                  </option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500/50">
                  ▼
                </div>
              </div>
            </div>

            {isCustomItem && (
              <Input
                label="Custom Item Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            )}

            <div className={`${isCustomItem ? "md:col-span-2" : ""}`}>
              <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-2 ml-1">
                Category
              </label>
              <div className="relative">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#020403] border border-emerald-900/40 rounded-xl text-emerald-100 outline-none focus:border-emerald-500/50 appearance-none cursor-pointer"
                >
                  <option value="Purchasing Item" className="bg-[#050a08]">
                    Purchasing Item
                  </option>
                  <option value="Finished Good" className="bg-[#050a08]">
                    Finished Good
                  </option>
                  <option value="Other" className="bg-[#050a08]">
                    Other
                  </option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500/50">
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
              value={formData.quantity}
              onChange={handleChange}
              onWheel={(e) => e.target.blur()}
              required
            />

            <div>
              <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-2 ml-1">
                Unit{" "}
                {isCustomUnit && (
                  <span className="text-emerald-100/30 lowercase tracking-normal">
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
                    className="w-full px-4 py-3 bg-[#020403] border border-emerald-900/40 rounded-xl text-emerald-400 font-bold outline-none cursor-pointer appearance-none"
                  >
                    <option value="kg" className="bg-[#050a08]">
                      kg
                    </option>
                    <option value="bags" className="bg-[#050a08]">
                      bags
                    </option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500/50">
                    ▼
                  </div>
                </div>
              ) : isCustomUnit ? (
                <input
                  type="text"
                  name="unit"
                  placeholder="e.g. tons"
                  value={formData.unit}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#020403] border border-emerald-900/40 rounded-xl text-emerald-100 outline-none focus:border-emerald-500/50 placeholder:text-emerald-100/20"
                />
              ) : (
                <div className="w-full px-4 py-3 bg-emerald-900/10 border border-emerald-900/20 rounded-xl text-emerald-400 font-bold cursor-not-allowed h-[50px] flex items-center">
                  {formData.unit || "-"}
                </div>
              )}
            </div>

            <Input
              label="Base Price (₹)"
              name="price"
              type="number"
              value={formData.price}
              onChange={handleChange}
              onWheel={(e) => e.target.blur()}
              required
            />
          </div>

          {auditInfo && (
            <div className="pt-2 text-center text-[10px] font-mono text-emerald-100/30 uppercase tracking-widest border-t border-emerald-900/10 mt-6 pt-4">
              Last updated by{" "}
              <span className="text-emerald-400/70 font-bold">
                {auditInfo.role}
              </span>{" "}
              on {auditInfo.at}
            </div>
          )}

          <div className="pt-6 flex justify-end gap-4 mt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/enterprise/stock")}
              className="px-6 border-emerald-900/30 text-emerald-100/50"
            >
              Discard Changes
            </Button>
            <Button
              type="submit"
              className="px-10 shadow-xl shadow-emerald-900/20 gap-2 border border-emerald-500/30"
              disabled={saving || !formData.name}
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
