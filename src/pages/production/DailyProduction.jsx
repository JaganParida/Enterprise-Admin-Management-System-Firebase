import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import productionService from "../../services/productionService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Factory,
  Save,
  Layers,
  Users,
  IndianRupee,
  AlertCircle,
  ChevronDown,
  FileText,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const DailyProduction = () => {
  const { toast } = useUI();
  const { admin } = useAuth();

  // 🚀 GLOBAL MODULE TAB STATE
  const [activeModule, setActiveModule] = useState("production"); // 'production', 'payouts', 'dues'

  const [entries, setEntries] = useState([]);
  const [labourEntries, setLabourEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittingLabour, setSubmittingLabour] = useState(false);

  // 🚀 CONFIRM DIALOG STATE
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: "",
  });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    productName: "",
    quantity: "",
  });

  const [labourData, setLabourData] = useState({
    date: new Date().toISOString().split("T")[0],
    labourName: "",
    payoutCategory: "Labour",
    quantityProduced: "",
    cost: "",
    amountPaid: "",
    amountDue: "",
  });

  const categories = ["Labour", "Contractor", "Consumer", "Other"];

  const fetchAllData = async () => {
    try {
      const prodRes = await productionService.getAllProduction();
      setEntries(prodRes.data || []);

      const labRes = await productionService.getAllLabourPayouts();
      setLabourEntries(labRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // 🚀 ONLY TOP 10 RECENT ENTRIES
  const topProductionEntries = entries.slice(0, 10);
  const topLabourEntries = labourEntries.slice(0, 10);
  const duesEntries = labourEntries.filter((e) => Number(e.amountDue) > 0);
  const topDuesEntries = duesEntries.slice(0, 10);

  // Dynamic count for the "VIEW ALL" button
  const getActiveTotalCount = () => {
    if (activeModule === "production") return entries.length;
    if (activeModule === "payouts") return labourEntries.length;
    if (activeModule === "dues") return duesEntries.length;
    return 0;
  };

  // 🚀 SMART PARSER
  const parseProduct = (fullName) => {
    if (!fullName) return { name: "-", size: "-" };
    if (fullName.includes("(")) {
      const parts = fullName.split("(");
      return { name: parts[0].trim(), size: parts[1].replace(")", "").trim() };
    }
    return { name: fullName, size: "-" };
  };

  // --- Handlers for Production ---
  const handleProdChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleProdSubmit = (e) => {
    e.preventDefault();
    setConfirmDialog({ isOpen: true, type: "production" });
  };

  const executeProdSubmit = async () => {
    setSubmitting(true);
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await productionService.addProduction(formData, currentUser);
      toast.success("Production log entry saved!");
      fetchAllData();
      setFormData({
        date: new Date().toISOString().split("T")[0],
        productName: "",
        quantity: "",
      });
    } catch (error) {
      toast.error("Failed to save entry.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Handlers for Labour Payment ---
  const handleLabourChange = (e) => {
    const { name, value } = e.target;

    setLabourData((prev) => {
      let newData = { ...prev, [name]: value };
      const cost = Number(newData.cost) || 0;

      if (name === "cost") {
        const paid = Number(newData.amountPaid) || 0;
        newData.amountDue = cost > 0 ? Math.max(0, cost - paid).toString() : "";
      } else if (name === "amountPaid") {
        const paid = Number(value) || 0;
        newData.amountDue = cost > 0 ? Math.max(0, cost - paid).toString() : "";
      } else if (name === "amountDue") {
        const due = Number(value) || 0;
        if (cost > 0) {
          newData.amountPaid = Math.max(0, cost - due).toString();
        }
      }
      return newData;
    });
  };

  const handleLabourSubmit = (e) => {
    e.preventDefault();
    setConfirmDialog({ isOpen: true, type: "labour" });
  };

  const executeLabourSubmit = async () => {
    setSubmittingLabour(true);
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await productionService.addLabourPayout(labourData, currentUser);
      toast.success(`Record for ${labourData.labourName} saved!`);
      fetchAllData();
      setLabourData({
        date: new Date().toISOString().split("T")[0],
        labourName: "",
        payoutCategory: "Labour",
        quantityProduced: "",
        cost: "",
        amountPaid: "",
        amountDue: "",
      });
    } catch (error) {
      toast.error("Failed to record payment.");
    } finally {
      setSubmittingLabour(false);
    }
  };

  // Dialog Confirm Router
  const handleDialogConfirm = () => {
    if (confirmDialog.type === "production") {
      executeProdSubmit();
    } else if (confirmDialog.type === "labour") {
      executeLabourSubmit();
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* 🚀 TOP HEADER WITH RESPONSIVE PILL TABS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <Factory size={24} />
            </div>
            Log Management
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Track daily output and manage payouts.
          </p>
        </div>

        {/* 🚀 NO SCROLLBAR PILL TABS */}
        <div className="w-full xl:w-auto bg-[#020403] p-1.5 rounded-2xl md:rounded-full border border-emerald-900/30 shadow-inner grid grid-cols-3 md:flex md:items-center gap-1">
          <button
            onClick={() => setActiveModule("production")}
            className={`col-span-1 px-2 md:px-8 py-2 md:py-2 text-[10px] sm:text-xs md:text-sm font-bold rounded-xl md:rounded-full transition-all truncate tracking-wide ${
              activeModule === "production"
                ? "bg-emerald-600 text-white shadow-[0_2px_10px_rgba(5,150,105,0.3)]"
                : "text-emerald-100/50 hover:text-emerald-100 hover:bg-white/5"
            }`}
          >
            Output
          </button>
          <button
            onClick={() => setActiveModule("payouts")}
            className={`col-span-1 px-2 md:px-8 py-2 md:py-2 text-[10px] sm:text-xs md:text-sm font-bold rounded-xl md:rounded-full transition-all truncate tracking-wide ${
              activeModule === "payouts"
                ? "bg-emerald-600 text-white shadow-[0_2px_10px_rgba(5,150,105,0.3)]"
                : "text-emerald-100/50 hover:text-emerald-100 hover:bg-white/5"
            }`}
          >
            Payouts
          </button>
          <button
            onClick={() => setActiveModule("dues")}
            className={`col-span-1 px-2 md:px-8 py-2 md:py-2 text-[10px] sm:text-xs md:text-sm font-bold rounded-xl md:rounded-full transition-all truncate tracking-wide ${
              activeModule === "dues"
                ? "bg-emerald-600 text-white shadow-[0_2px_10px_rgba(5,150,105,0.3)]"
                : "text-emerald-100/50 hover:text-emerald-100 hover:bg-white/5"
            }`}
          >
            Dues
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 🚀 LEFT COLUMN: FORMS */}
        <div className="lg:col-span-1">
          <div
            className={`bg-[#050a08] rounded-2xl shadow-xl border p-6 md:p-8 relative overflow-hidden transition-colors duration-700 ${
              activeModule === "production"
                ? "border-emerald-900/30"
                : activeModule === "payouts"
                  ? "border-blue-900/30"
                  : "border-rose-900/30"
            }`}
          >
            <div
              className={`absolute top-0 right-0 w-40 h-40 blur-3xl rounded-full pointer-events-none transition-colors duration-700 ${
                activeModule === "production"
                  ? "bg-emerald-500/10"
                  : activeModule === "payouts"
                    ? "bg-blue-500/10"
                    : "bg-rose-500/10"
              }`}
            ></div>

            <div className="relative z-10">
              {activeModule === "production" ? (
                <div
                  key="production"
                  className="animate-in fade-in slide-in-from-left-8 duration-300"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        Log New Production
                      </h2>
                    </div>
                  </div>

                  <form onSubmit={handleProdSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
                        Production Date
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleProdChange}
                        required
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                        style={{ colorScheme: "dark" }}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
                        Brick Type / Product
                      </label>
                      <div className="relative">
                        <select
                          name="productName"
                          value={formData.productName}
                          onChange={handleProdChange}
                          required
                          className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner appearance-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 cursor-pointer"
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
                              value="Bricks (10 inch)"
                              className="bg-[#050a08] text-white font-normal"
                            >
                              Bricks (10 inch)
                            </option>
                            <option
                              value="Bricks (9 inch)"
                              className="bg-[#050a08] text-white font-normal"
                            >
                              Bricks (9 inch)
                            </option>
                            <option
                              value="Bricks (8 inch)"
                              className="bg-[#050a08] text-white font-normal"
                            >
                              Bricks (8 inch)
                            </option>
                          </optgroup>
                          <optgroup
                            label="Paver Blocks"
                            className="bg-[#020403] text-emerald-500 font-bold"
                          >
                            <option
                              value="Zig Zag (60mm)"
                              className="bg-[#050a08] text-white font-normal"
                            >
                              Zig Zag (60mm)
                            </option>
                            <option
                              value="Zig Zag (80mm)"
                              className="bg-[#050a08] text-white font-normal"
                            >
                              Zig Zag (80mm)
                            </option>
                            <option
                              value="6-12 Brick (60mm)"
                              className="bg-[#050a08] text-white font-normal"
                            >
                              6-12 Brick (60mm)
                            </option>
                            <option
                              value="6-12 Brick (80mm)"
                              className="bg-[#050a08] text-white font-normal"
                            >
                              6-12 Brick (80mm)
                            </option>
                            <option
                              value="6/6 Brick (60mm)"
                              className="bg-[#050a08] text-white font-normal"
                            >
                              6/6 Brick 60mm
                            </option>
                            <option
                              value="6/6 Brick (80mm)"
                              className="bg-[#050a08] text-white font-normal"
                            >
                              6/6 Brick (80mm)
                            </option>
                          </optgroup>
                          <optgroup
                            label="Chequered Tiles"
                            className="bg-[#020403] text-emerald-500 font-bold"
                          >
                            <option
                              value="Hexagon"
                              className="bg-[#050a08] text-white font-normal"
                            >
                              Hexagon
                            </option>
                            <option
                              value="Brick Design (9inch)"
                              className="bg-[#050a08] text-white font-normal"
                            >
                              Brick Design (9inch)
                            </option>
                            <option
                              value="Curve Stone"
                              className="bg-[#050a08] text-white font-normal"
                            >
                              Curve Stone
                            </option>
                            <option
                              value="Cover Block"
                              className="bg-[#050a08] text-white font-normal"
                            >
                              Cover Block
                            </option>
                          </optgroup>
                        </select>
                        <ChevronDown
                          size={16}
                          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest mb-1.5 ml-1">
                        Quantity Produced
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        placeholder="e.g. 5000"
                        value={formData.quantity}
                        onChange={handleProdChange}
                        onWheel={(e) => e.target.blur()}
                        required
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full mt-2 shadow-lg shadow-emerald-900/20 bg-emerald-500 hover:bg-emerald-400 text-[#020403]"
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
                      <FileText size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        Record Payout / Due
                      </h2>
                    </div>
                  </div>

                  <form onSubmit={handleLabourSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-blue-100/60 uppercase tracking-widest mb-3 ml-1">
                        Party Category
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() =>
                              setLabourData({
                                ...labourData,
                                payoutCategory: cat,
                              })
                            }
                            className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${
                              labourData.payoutCategory === cat
                                ? "bg-[#3b82f6] text-[#020617] shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                                : "bg-black/40 border border-white/10 text-blue-100/50 hover:border-blue-500/50 hover:text-white"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-blue-100/60 uppercase tracking-widest mb-1.5 ml-1">
                          Record Date
                        </label>
                        <input
                          type="date"
                          name="date"
                          value={labourData.date}
                          onChange={handleLabourChange}
                          required
                          className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
                          style={{ colorScheme: "dark" }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-blue-100/60 uppercase tracking-widest mb-1.5 ml-1">
                          Name (Contractor/Consumer)
                        </label>
                        <input
                          type="text"
                          name="labourName"
                          placeholder="e.g. Rajesh Kumar"
                          value={labourData.labourName}
                          onChange={handleLabourChange}
                          required
                          className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-blue-100/60 uppercase tracking-widest mb-1.5 ml-1">
                          Qty Produced (Opt)
                        </label>
                        <input
                          type="number"
                          name="quantityProduced"
                          placeholder="0"
                          value={labourData.quantityProduced}
                          onChange={handleLabourChange}
                          onWheel={(e) => e.target.blur()}
                          className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-blue-100/60 uppercase tracking-widest mb-1.5 ml-1">
                          Total Cost (Opt)
                        </label>
                        <input
                          type="number"
                          name="cost"
                          placeholder="0.00"
                          value={labourData.cost}
                          onChange={handleLabourChange}
                          onWheel={(e) => e.target.blur()}
                          className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-blue-100/60 uppercase tracking-widest mb-1.5 ml-1">
                          Amount Paid (₹)
                        </label>
                        <input
                          type="number"
                          name="amountPaid"
                          placeholder="0.00"
                          value={labourData.amountPaid}
                          onChange={handleLabourChange}
                          onWheel={(e) => e.target.blur()}
                          required
                          className="w-full px-4 py-3 bg-black/40 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-lg shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-blue-100/60 uppercase tracking-widest mb-1.5 ml-1">
                          Amount Due (₹)
                        </label>
                        <input
                          type="number"
                          name="amountDue"
                          placeholder="0.00"
                          value={labourData.amountDue}
                          onChange={handleLabourChange}
                          onWheel={(e) => e.target.blur()}
                          required
                          className="w-full px-4 py-3 bg-black/40 border border-rose-500/30 rounded-xl text-rose-400 font-bold tracking-wider text-lg shadow-inner focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full mt-2 shadow-lg shadow-blue-900/20 bg-blue-500 hover:bg-blue-400 text-[#020617]"
                      disabled={submittingLabour}
                    >
                      <Save size={18} className="mr-2" />{" "}
                      {submittingLabour ? "Processing..." : "Save Record"}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🚀 RIGHT COLUMN: TOP 10 RECENT LOGS (NO ACTIONS) */}
        <div className="lg:col-span-2 space-y-6">
          <div
            className={`bg-[#050a08] rounded-2xl shadow-xl border overflow-visible transition-colors duration-500 ${
              activeModule === "production"
                ? "border-emerald-900/30"
                : activeModule === "payouts"
                  ? "border-blue-900/30"
                  : "border-rose-900/30"
            }`}
          >
            {/* 🚀 STRUCTURED RECENT LOGS HEADER */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                Recent Logs{" "}
                <span className="text-gray-500 text-sm font-normal hidden sm:inline-block">
                  (Top 10)
                </span>
              </h3>

              <Link
                to="/enterprise/production/report"
                className="text-[10px] sm:text-xs font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-3 sm:px-4 py-1.5 rounded-lg hover:bg-emerald-900/40 transition-colors uppercase tracking-widest whitespace-nowrap"
              >
                VIEW ALL {getActiveTotalCount()}
              </Link>
            </div>

            <div className="overflow-x-auto pb-4 custom-scrollbar min-h-[400px]">
              {activeModule === "production" && (
                <table className="w-full text-left animate-in fade-in duration-300">
                  <thead className="bg-[#020403] text-emerald-100/40 text-[10px] uppercase tracking-widest font-bold border-b border-emerald-900/20">
                    <tr>
                      <th className="p-5 md:pl-6 whitespace-nowrap">Date</th>
                      <th className="p-5 whitespace-nowrap">Item Name</th>
                      <th className="p-5 whitespace-nowrap">Size</th>
                      <th className="p-5 text-right whitespace-nowrap md:pr-6">
                        Output
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/20 text-sm">
                    {topProductionEntries.map((entry) => {
                      const { name, size } = parseProduct(entry.productName);
                      return (
                        <tr
                          key={entry._id}
                          className="hover:bg-emerald-900/10 transition-colors group"
                        >
                          <td className="p-5 md:pl-6 align-middle">
                            <div className="text-emerald-100/70 font-mono text-xs">
                              {new Date(entry.date).toLocaleDateString("en-GB")}
                            </div>
                          </td>
                          <td className="p-5 align-middle">
                            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest inline-flex items-center gap-2 w-max">
                              <Layers size={12} /> {name}
                            </span>
                          </td>
                          <td className="p-5 text-emerald-100 font-medium tracking-wide">
                            {size}
                          </td>
                          <td className="p-5 align-middle text-right whitespace-nowrap md:pr-6">
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/20 tracking-wider">
                              {Number(entry.quantity).toLocaleString()} pcs
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {topProductionEntries.length === 0 && (
                      <tr>
                        <td
                          colSpan="4"
                          className="p-10 text-center text-emerald-100/30 italic"
                        >
                          No production logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeModule === "payouts" && (
                <table className="w-full text-left animate-in fade-in duration-300">
                  <thead className="bg-[#020403] text-blue-100/30 text-[10px] uppercase tracking-widest font-bold border-b border-blue-900/20">
                    <tr>
                      <th className="p-5 md:pl-6 whitespace-nowrap">
                        Name & Date
                      </th>
                      <th className="p-5 text-right whitespace-nowrap">Cost</th>
                      <th className="p-5 text-right whitespace-nowrap">Paid</th>
                      <th className="p-5 md:pr-6 text-right whitespace-nowrap">
                        Due
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-900/10 text-sm">
                    {topLabourEntries.map((entry) => (
                      <tr
                        key={entry._id}
                        className="hover:bg-blue-900/10 transition-colors group"
                      >
                        <td className="p-5 md:pl-6 align-middle">
                          <div className="font-bold text-blue-100/90 group-hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap tracking-wide">
                            <Users size={14} className="text-blue-500/50" />{" "}
                            {entry.labourName}
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-widest">
                              {entry.payoutCategory || "Labour"}
                            </span>
                            <span className="text-[10px] text-blue-100/40 font-mono tracking-widest">
                              {new Date(entry.date).toLocaleDateString("en-GB")}
                            </span>
                          </div>
                        </td>
                        <td className="p-5 align-middle text-right whitespace-nowrap font-mono text-blue-100/60">
                          ₹ {Number(entry.cost || 0).toLocaleString()}
                        </td>
                        <td className="p-5 align-middle text-right whitespace-nowrap font-mono text-emerald-400 font-bold">
                          ₹ {Number(entry.amountPaid || 0).toLocaleString()}
                        </td>
                        <td className="p-5 md:pr-6 align-middle text-right whitespace-nowrap font-mono font-bold text-rose-400">
                          ₹ {Number(entry.amountDue || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {topLabourEntries.length === 0 && (
                      <tr>
                        <td colSpan="4" className="p-16 text-center">
                          <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mx-auto mb-4 shadow-inner">
                            <IndianRupee size={28} />
                          </div>
                          <h3 className="text-white font-bold text-lg mb-1">
                            No Payout Records
                          </h3>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeModule === "dues" && (
                <table className="w-full text-left animate-in fade-in duration-300">
                  <thead className="bg-[#020403] text-rose-100/30 text-[10px] uppercase tracking-widest font-bold border-b border-rose-900/20">
                    <tr>
                      <th className="p-5 md:pl-6 whitespace-nowrap">
                        Party Name & Date
                      </th>
                      <th className="p-5 text-right whitespace-nowrap">
                        Category
                      </th>
                      <th className="p-5 md:pr-6 text-right whitespace-nowrap">
                        Pending Due
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-900/10 text-sm">
                    {topDuesEntries.map((entry) => (
                      <tr
                        key={entry._id}
                        className="hover:bg-rose-900/10 transition-colors group"
                      >
                        <td className="p-5 md:pl-6 align-middle">
                          <div className="font-bold text-rose-100/90 group-hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap tracking-wide">
                            <AlertCircle
                              size={14}
                              className="text-rose-500/50"
                            />{" "}
                            {entry.labourName}
                          </div>
                          <div className="text-[10px] text-rose-100/40 mt-1 font-mono tracking-widest">
                            {new Date(entry.date).toLocaleDateString("en-GB")}
                          </div>
                        </td>
                        <td className="p-5 align-middle text-right whitespace-nowrap">
                          <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest">
                            {entry.payoutCategory || "Labour"}
                          </span>
                        </td>
                        <td className="p-5 md:pr-6 align-middle text-right whitespace-nowrap font-mono font-bold text-rose-400 text-lg">
                          ₹ {Number(entry.amountDue || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {topDuesEntries.length === 0 && (
                      <tr>
                        <td colSpan="3" className="p-16 text-center">
                          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mx-auto mb-4 shadow-inner">
                            <AlertCircle size={28} />
                          </div>
                          <h3 className="text-white font-bold text-lg mb-1">
                            No Pending Dues!
                          </h3>
                          <p className="text-rose-100/40 text-sm max-w-sm mx-auto">
                            All accounts are settled. Great job!
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* 🚀 CONFIRM DIALOG */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ isOpen: false, type: "" })}
          onConfirm={handleDialogConfirm}
          title="Save Record"
          message="Are you sure you want to log this record to the database?"
          confirmText="Save Record"
          isDestructive={false}
        />
      </div>
    </div>
  );
};

export default DailyProduction;
