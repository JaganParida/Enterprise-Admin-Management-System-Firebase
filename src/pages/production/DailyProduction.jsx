import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import productionService from "../../services/productionService";
import { useUI } from "../../context/UIProvider";
import {
  Factory,
  Plus,
  Save,
  Layers,
  Edit,
  Trash2,
  ArrowRight,
} from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const DailyProduction = () => {
  const { toast } = useUI();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    productName: "",
    quantity: "",
    supervisor: "",
  });

  const fetchProduction = async () => {
    try {
      // ✅ REMOVED ARTIFICIAL TIMEOUT DELAY
      const { data } = await productionService.getAllProduction();
      setEntries(data);
    } catch (error) {
      console.error("Error fetching production:", error);
      toast.error("Failed to load production history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduction();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await productionService.addProduction(formData);
      toast.success("Production log entry saved!");

      const { data } = await productionService.getAllProduction();
      setEntries(data);

      setFormData({
        date: new Date().toISOString().split("T")[0],
        productName: "",
        quantity: "",
        supervisor: "",
      });
    } catch (error) {
      console.error("Error adding production:", error);
      toast.error(error.response?.data?.message || "Failed to save entry.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (entry) => {
    setEntryToDelete(entry);
    setIsDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;

    try {
      await productionService.deleteProduction(entryToDelete._id);
      toast.success("Production log deleted successfully.");
      const { data } = await productionService.getAllProduction();
      setEntries(data);
    } catch (error) {
      console.error("Error deleting production log:", error);
      toast.error("Failed to delete log.");
    } finally {
      setIsDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) return <Loader />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-1">
        <div className="bg-[#050a08] rounded-2xl shadow-xl border border-emerald-900/30 p-6 md:p-8 sticky top-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
              <Plus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Log Production</h2>
              <p className="text-emerald-100/40 text-xs">
                Enter daily kiln/machine output
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Production Date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="text-emerald-100"
            />
            <div>
              <label className="block text-xs font-bold text-emerald-100/60 uppercase tracking-wider mb-2 ml-1">
                Brick Type / Product
              </label>
              <div className="relative">
                <select
                  name="productName"
                  className="w-full px-4 py-3 bg-[#020403] border border-emerald-900/40 rounded-xl text-emerald-100 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 appearance-none transition-all"
                  value={formData.productName}
                  onChange={handleChange}
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
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500/50">
                  ▼
                </div>
              </div>
            </div>
            <Input
              label="Quantity Produced (Pieces)"
              name="quantity"
              type="number"
              placeholder="e.g. 5000"
              value={formData.quantity}
              onChange={handleChange}
              required
            />
            <Input
              label="Supervisor / Kiln"
              name="supervisor"
              placeholder="e.g. Rajesh (Kiln No. 2)"
              value={formData.supervisor}
              onChange={handleChange}
            />
            <Button
              type="submit"
              className="w-full mt-4 shadow-lg shadow-emerald-900/20"
              disabled={submitting}
            >
              <Save size={18} />{" "}
              {submitting ? "Saving Log..." : "Save Production Log"}
            </Button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-[#050a08] rounded-2xl shadow-xl border border-emerald-900/30 overflow-hidden">
          <div className="p-6 border-b border-emerald-900/20 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                <Factory size={20} />
              </div>
              Recent Output Log
            </h2>
            <Link
              to="/enterprise/production/report"
              className="group flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
            >
              View Full Report{" "}
              <ArrowRight
                size={14}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#020403] text-emerald-100/40 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-5 md:pl-6">Date</th>
                  <th className="p-5">Product Type</th>
                  <th className="p-5">Output Qty</th>
                  <th className="p-5">Supervisor</th>
                  <th className="p-5 md:pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/20 text-sm">
                {entries.map((entry) => (
                  <tr
                    key={entry._id}
                    className="hover:bg-emerald-900/10 transition-colors group"
                  >
                    <td className="p-5 md:pl-6 text-emerald-100/60 font-mono text-xs">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="p-5 font-medium text-emerald-100/90 group-hover:text-white transition-colors flex items-center gap-2">
                      <Layers size={14} className="text-emerald-500/50" />{" "}
                      {entry.productName}
                    </td>
                    <td className="p-5">
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/20">
                        {entry.quantity.toLocaleString()} pcs
                      </span>
                    </td>
                    <td className="p-5 text-emerald-100/50 text-xs">
                      {entry.supervisor || "-"}
                    </td>
                    <td className="p-5 md:pr-6 text-right flex justify-end gap-2">
                      <Link
                        to={`/enterprise/production/edit/${entry._id}`}
                        className="p-2 text-emerald-100/40 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                      >
                        <Edit size={18} />
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(entry)}
                        className="p-2 text-emerald-100/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-8 text-center text-emerald-100/30"
                    >
                      No production logs found. Add your first kiln output!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Production Log"
        message={`Are you sure you want to delete the log for ${entryToDelete?.quantity} ${entryToDelete?.productName}?`}
        confirmText="Delete Log"
        isDestructive={true}
      />
    </div>
  );
};

export default DailyProduction;
