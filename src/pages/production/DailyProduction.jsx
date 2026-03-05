import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import productionService from "../../services/productionService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Factory,
  Plus,
  Save,
  Layers,
  Edit,
  Trash2,
  ArrowRight,
  History,
  X,
  Users,
  IndianRupee,
} from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const DailyProduction = () => {
  const { toast } = useUI();
  const { admin } = useAuth();

  // 🚀 TAB STATE FOR SLIDING FORMS
  const [activeTab, setActiveTab] = useState("production"); // 'production' | 'labour'

  // Production States
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Labour States
  const [submittingLabour, setSubmittingLabour] = useState(false);

  // Modals
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [warningTooltip, setWarningTooltip] = useState(null);
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    itemName: "",
  });

  const isManager = admin?.data?.role === "manager";

  // FORM 1: PRODUCTION LOG STATE
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    productName: "",
    quantity: "",
  });

  // FORM 2: LABOUR CONTRACTOR PAYMENT STATE
  const [labourData, setLabourData] = useState({
    labourName: "",
    quantityProduced: "",
    cost: "",
    amountPaid: "",
  });

  // Auto Calculate Amount Due
  const amountDue =
    (Number(labourData.cost) || 0) - (Number(labourData.amountPaid) || 0);

  const fetchProduction = async () => {
    try {
      const { data } = await productionService.getAllProduction();
      setEntries(data || []);
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

  // --- Handlers for Production ---
  const handleProdChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProdSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await productionService.addProduction(formData, currentUser);
      toast.success("Production log entry saved!");
      fetchProduction();
      setFormData({
        date: new Date().toISOString().split("T")[0],
        productName: "",
        quantity: "",
      });
    } catch (error) {
      console.error("Error adding production:", error);
      toast.error(error.response?.data?.message || "Failed to save entry.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Handlers for Labour Payment ---
  const handleLabourChange = (e) => {
    const { name, value } = e.target;
    setLabourData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLabourSubmit = async (e) => {
    e.preventDefault();
    setSubmittingLabour(true);
    try {
      // 🚧 Replace this with actual Labour API call later
      await new Promise((resolve) => setTimeout(resolve, 800));

      toast.success(`Payment for ${labourData.labourName} recorded!`);
      setLabourData({
        labourName: "",
        quantityProduced: "",
        cost: "",
        amountPaid: "",
      });
    } catch (error) {
      toast.error("Failed to record labour payment.");
    } finally {
      setSubmittingLabour(false);
    }
  };

  // --- Utility Handlers ---
  const handleDeleteClick = (entry) => {
    setEntryToDelete(entry);
    setIsDialogOpen(true);
  };

  const handleDisabledClick = (entryId) => {
    setWarningTooltip(entryId);
    setTimeout(() => setWarningTooltip(null), 2500);
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;
    try {
      await productionService.deleteProduction(entryToDelete._id);
      toast.success("Production log deleted successfully.");
      fetchProduction();
    } catch (error) {
      console.error("Error deleting log:", error);
      toast.error("Failed to delete log.");
    } finally {
      setIsDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  const openHistory = (entry) => {
    const sortedHistory = Array.isArray(entry.editHistory)
      ? [...entry.editHistory].reverse()
      : [];
    setHistoryModal({
      isOpen: true,
      data: sortedHistory,
      itemName: `${entry.quantity} ${entry.productName}`,
    });
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* 🚀 LEFT COLUMN: SLIDING FORMS CONTAINER */}
      <div className="lg:col-span-1">
        <div
          className={`bg-[#050a08] rounded-2xl shadow-xl border p-6 md:p-8 relative overflow-hidden transition-colors duration-700 ${activeTab === "production" ? "border-emerald-900/30" : "border-blue-900/30"}`}
        >
          {/* Dynamic Background Glow */}
          <div
            className={`absolute top-0 right-0 w-40 h-40 blur-3xl rounded-full pointer-events-none transition-colors duration-700 ${activeTab === "production" ? "bg-emerald-500/10" : "bg-blue-500/10"}`}
          ></div>

          {/* 🚀 TAB SWITCHER NAVBAR */}
          <div className="flex p-1.5 bg-[#020403] rounded-xl border border-emerald-900/20 mb-8 relative z-10 shadow-inner">
            <button
              onClick={() => setActiveTab("production")}
              className={`flex-1 py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === "production"
                  ? "bg-emerald-500/20 text-emerald-400 shadow-md border border-emerald-500/20"
                  : "text-emerald-100/30 hover:text-emerald-100/60 transparent"
              }`}
            >
              <Factory size={14} /> Production
            </button>
            <button
              onClick={() => setActiveTab("labour")}
              className={`flex-1 py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === "labour"
                  ? "bg-blue-500/20 text-blue-400 shadow-md border border-blue-500/20"
                  : "text-emerald-100/30 hover:text-blue-100/60 transparent"
              }`}
            >
              <Users size={14} /> Labour
            </button>
          </div>

          {/* 🚀 SLIDING FORMS RENDERER */}
          <div className="relative z-10">
            {activeTab === "production" ? (
              <div
                key="production"
                className="animate-in fade-in slide-in-from-left-8 duration-300"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
                    <Plus size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Log Production
                    </h2>
                    <p className="text-emerald-100/40 text-[10px] uppercase tracking-widest mt-0.5">
                      Daily Output
                    </p>
                  </div>
                </div>

                <form onSubmit={handleProdSubmit} className="space-y-4">
                  <Input
                    label="Production Date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleProdChange}
                    required
                    className="text-emerald-100"
                  />
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
                      Brick Type / Product
                    </label>
                    <div className="relative">
                      <select
                        name="productName"
                        className="w-full px-4 py-3 bg-[#020403] border border-emerald-900/40 rounded-xl text-emerald-100 outline-none focus:border-emerald-500/50 appearance-none transition-all cursor-pointer"
                        value={formData.productName}
                        onChange={handleProdChange}
                        required
                      >
                        <option
                          value=""
                          className="bg-[#050a08] text-emerald-100/30"
                        >
                          Select Product...
                        </option>
                        <optgroup
                          label="Bricks"
                          className="bg-[#020403] text-emerald-500 font-bold"
                        >
                          <option
                            value="10 inch"
                            className="bg-[#050a08] text-emerald-100 font-normal"
                          >
                            10 inch
                          </option>
                          <option
                            value="9 inch"
                            className="bg-[#050a08] text-emerald-100 font-normal"
                          >
                            9 inch
                          </option>
                          <option
                            value="8 inch"
                            className="bg-[#050a08] text-emerald-100 font-normal"
                          >
                            8 inch
                          </option>
                        </optgroup>
                        <optgroup
                          label="Paver Blocks"
                          className="bg-[#020403] text-emerald-500 font-bold"
                        >
                          <option
                            value="Zig Zag (60mm)"
                            className="bg-[#050a08] text-emerald-100 font-normal"
                          >
                            Zig Zag (60mm)
                          </option>
                          <option
                            value="Zig Zag (80mm)"
                            className="bg-[#050a08] text-emerald-100 font-normal"
                          >
                            Zig Zag (80mm)
                          </option>
                          <option
                            value="6-12 Brick (60mm)"
                            className="bg-[#050a08] text-emerald-100 font-normal"
                          >
                            6-12 Brick (60mm)
                          </option>
                          <option
                            value="6-12 Brick (80mm)"
                            className="bg-[#050a08] text-emerald-100 font-normal"
                          >
                            6-12 Brick (80mm)
                          </option>
                          <option
                            value="6/6 Brick (60mm)"
                            className="bg-[#050a08] text-emerald-100 font-normal"
                          >
                            6/6 Brick (60mm)
                          </option>
                          <option
                            value="6/6 Brick (80mm)"
                            className="bg-[#050a08] text-emerald-100 font-normal"
                          >
                            6/6 Brick (80mm)
                          </option>
                        </optgroup>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500/50">
                        ▼
                      </div>
                    </div>
                  </div>
                  <Input
                    label="Quantity Produced"
                    name="quantity"
                    type="number"
                    placeholder="e.g. 5000"
                    value={formData.quantity}
                    onChange={handleProdChange}
                    onWheel={(e) => e.target.blur()}
                    required
                  />

                  <Button
                    type="submit"
                    className="w-full mt-2 shadow-lg shadow-emerald-900/20"
                    disabled={submitting}
                  >
                    <Save size={18} className="mr-2" />{" "}
                    {submitting ? "Saving..." : "Save Production"}
                  </Button>
                </form>
              </div>
            ) : (
              <div
                key="labour"
                className="animate-in fade-in slide-in-from-right-8 duration-300"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20">
                    <IndianRupee size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Labour Payout
                    </h2>
                    <p className="text-blue-100/40 text-[10px] uppercase tracking-widest mt-0.5">
                      Contractor Record
                    </p>
                  </div>
                </div>

                <form onSubmit={handleLabourSubmit} className="space-y-4">
                  <Input
                    label="Labour Name"
                    name="labourName"
                    placeholder="e.g. Rajesh Kumar"
                    value={labourData.labourName}
                    onChange={handleLabourChange}
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Qty Produced"
                      name="quantityProduced"
                      type="number"
                      placeholder="0"
                      value={labourData.quantityProduced}
                      onChange={handleLabourChange}
                      onWheel={(e) => e.target.blur()}
                      required
                    />
                    <Input
                      label="Total Cost (₹)"
                      name="cost"
                      type="number"
                      placeholder="0.00"
                      value={labourData.cost}
                      onChange={handleLabourChange}
                      onWheel={(e) => e.target.blur()}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 items-end">
                    <Input
                      label="Amount Paid (₹)"
                      name="amountPaid"
                      type="number"
                      placeholder="0.00"
                      value={labourData.amountPaid}
                      onChange={handleLabourChange}
                      onWheel={(e) => e.target.blur()}
                      required
                    />
                    {/* 🧠 AUTO CALCULATED AMOUNT DUE */}
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
                        Amount Due (₹)
                      </label>
                      <div
                        className={`w-full px-4 py-3 border rounded-xl outline-none font-bold text-sm tracking-wider flex items-center h-[46px] transition-colors ${
                          amountDue > 0
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                            : "bg-[#020403] border-emerald-900/40 text-emerald-400"
                        }`}
                      >
                        ₹ {amountDue.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 border-none shadow-lg shadow-blue-900/20"
                    disabled={submittingLabour}
                  >
                    <IndianRupee size={16} className="mr-2" />{" "}
                    {submittingLabour ? "Processing..." : "Record Payment"}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🚀 RIGHT COLUMN: PRODUCTION HISTORY TABLE */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-[#050a08] rounded-2xl shadow-xl border border-emerald-900/30 overflow-visible">
          <div className="p-6 border-b border-emerald-900/20 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                <Factory size={20} />
              </div>
              Recent Output Log
            </h2>
            <Link
              to="/enterprise/production/report"
              className="group flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all w-full sm:w-auto justify-center"
            >
              View Full Report{" "}
              <ArrowRight
                size={14}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </div>

          <div className="overflow-x-auto pb-4 custom-scrollbar">
            <table className="w-full text-left min-w-max">
              <thead className="bg-[#020403] text-emerald-100/40 text-[10px] uppercase tracking-widest font-bold">
                <tr>
                  <th className="p-5 md:pl-6 whitespace-nowrap min-w-[200px]">
                    Product Type & Date
                  </th>
                  <th className="p-5 text-right whitespace-nowrap">
                    Output Qty
                  </th>
                  <th className="p-5 md:pr-6 text-right whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/20 text-sm">
                {entries.map((entry) => (
                  <tr
                    key={entry._id}
                    className="hover:bg-emerald-900/10 transition-colors group"
                  >
                    <td className="p-5 md:pl-6 align-middle">
                      <div className="font-bold text-emerald-100/90 group-hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap tracking-wide">
                        <Layers size={14} className="text-emerald-500/50" />{" "}
                        {entry.productName}
                      </div>

                      {Array.isArray(entry.editHistory) &&
                      entry.editHistory.length > 0 ? (
                        <div
                          onClick={() => openHistory(entry)}
                          className="mt-2 flex flex-col gap-0.5 cursor-pointer bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg transition-all w-max whitespace-nowrap"
                          title="Click to view full edit history"
                        >
                          <div className="text-[10px] font-mono text-emerald-400/90 flex items-center gap-1.5 uppercase tracking-widest font-bold">
                            <History size={10} />{" "}
                            {entry.editHistory[entry.editHistory.length - 1]
                              ?.role || "ADMIN"}
                            {entry.editHistory.length > 1 && (
                              <span className="bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded text-[8px] ml-1">
                                +{entry.editHistory.length - 1} MORE
                              </span>
                            )}
                          </div>
                          <span className="text-emerald-100/30 text-[9px] ml-4 font-medium">
                            {entry.editHistory[entry.editHistory.length - 1]?.at
                              ? new Date(
                                  entry.editHistory[
                                    entry.editHistory.length - 1
                                  ].at,
                                ).toLocaleString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>
                      ) : entry.lastEditedRole ? (
                        <div className="text-[10px] font-mono text-emerald-400/70 font-bold mt-1.5 uppercase tracking-widest whitespace-nowrap w-max">
                          ✍️ {entry.lastEditedRole}
                        </div>
                      ) : (
                        <div className="text-[10px] text-emerald-100/40 mt-1 font-mono tracking-widest">
                          {new Date(entry.date).toLocaleDateString("en-GB")}
                        </div>
                      )}
                    </td>
                    <td className="p-5 align-middle text-right whitespace-nowrap">
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/20 tracking-wider">
                        {Number(entry.quantity).toLocaleString()} pcs
                      </span>
                    </td>
                    <td className="p-5 md:pr-6 align-middle overflow-visible">
                      <div className="flex justify-end gap-2 items-center relative overflow-visible">
                        <Link
                          to={`/enterprise/production/edit/${entry._id}`}
                          className="p-2 text-emerald-100/40 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </Link>
                        <div className="relative overflow-visible">
                          <button
                            onClick={() =>
                              isManager
                                ? handleDisabledClick(entry._id)
                                : handleDeleteClick(entry)
                            }
                            className={`p-2 rounded-lg transition-colors ${isManager ? "text-emerald-100/20 opacity-50 cursor-not-allowed hover:bg-red-500/5 hover:text-red-400/50" : "text-emerald-100/40 hover:text-red-400 hover:bg-red-500/10"}`}
                          >
                            <Trash2 size={18} />
                          </button>
                          {warningTooltip === entry._id && (
                            <div className="absolute bottom-full right-0 mb-2 z-[9999] animate-in fade-in zoom-in-95 duration-200">
                              <div className="bg-[#050a08] border border-red-500/30 shadow-xl shadow-red-900/20 text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                                <span className="bg-red-500/20 p-1 rounded-md text-[10px] leading-none">
                                  🚫
                                </span>{" "}
                                Action Denied
                              </div>
                              <div className="absolute -bottom-1 right-3 w-2 h-2 bg-[#050a08] border-b border-r border-red-500/30 rotate-45"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td
                      colSpan="3"
                      className="p-10 text-center text-emerald-100/30 italic"
                    >
                      No production logs found. Add your first output!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* History Modal */}
      {historyModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#050a08] border border-emerald-900/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-emerald-900/20 flex justify-between items-center bg-[#020403]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History size={18} className="text-emerald-500" /> Log History:{" "}
                <span className="text-emerald-400 text-sm ml-1">
                  {historyModal.itemName}
                </span>
              </h3>
              <button
                onClick={() =>
                  setHistoryModal({ isOpen: false, data: [], itemName: "" })
                }
                className="text-emerald-100/40 hover:text-white p-1 hover:bg-emerald-500/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
              {historyModal.data.map((edit, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-[#020403] p-4 rounded-xl border border-emerald-900/20 relative group hover:border-emerald-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-black text-sm uppercase shadow-inner">
                      {edit.role ? edit.role.charAt(0) : "A"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-100 uppercase tracking-widest">
                        {edit.role || "Admin"}
                      </p>
                      <p className="text-[9px] text-emerald-100/30 font-mono mt-0.5">
                        {edit.by}
                      </p>
                      <p className="text-[10px] text-emerald-400/60 font-mono mt-1">
                        {edit.at
                          ? new Date(edit.at).toLocaleString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  {idx === 0 && (
                    <span className="relative z-10 text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md uppercase font-black tracking-widest border border-emerald-500/20">
                      Latest
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Production Log"
        message={`Are you sure you want to delete this log?`}
        confirmText="Delete Log"
        isDestructive={true}
      />
    </div>
  );
};

export default DailyProduction;
