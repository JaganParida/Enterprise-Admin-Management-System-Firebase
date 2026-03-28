import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  Database,
  CheckCircle,
  RefreshCcw,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

// 🚀 GLOBAL MEMORY CACHE (No Page Reload Waste)
let globalProdCache = {
  entries: [],
  labourEntries: [],
  duesEntries: [],
  stats: { output: 0, paid: 0, due: 0 },
  fetched: false,
  isStatsSynced: true,
};

const DailyProduction = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useUI();
  const { admin } = useAuth();

  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");
  const basePath = isTransport ? "/transportation" : "/enterprise";

  const theme = {
    primaryText: isTransport ? "text-cyan-400" : "text-indigo-400",
    primaryBg: isTransport ? "bg-cyan-500/10" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-cyan-500/20" : "border-indigo-500/20",
    primaryTabBg: isTransport ? "bg-cyan-600" : "bg-indigo-600",
    primaryFocus: isTransport
      ? "focus:border-cyan-500/50 focus:ring-cyan-500/50"
      : "focus:border-indigo-500/50 focus:ring-indigo-500/50",
    glowOrb: isTransport ? "bg-cyan-500/5" : "bg-indigo-500/5",
    primaryHoverBg: isTransport
      ? "hover:bg-cyan-500/20"
      : "hover:bg-indigo-500/20",
  };

  const [activeModule, setActiveModule] = useState("production");
  const [entries, setEntries] = useState(globalProdCache.entries);
  const [labourEntries, setLabourEntries] = useState(
    globalProdCache.labourEntries,
  );
  const [duesEntries, setDuesEntries] = useState(globalProdCache.duesEntries);
  const [stats, setStats] = useState(globalProdCache.stats);
  const [loading, setLoading] = useState(!globalProdCache.fetched);
  const [submitting, setSubmitting] = useState(false);
  const [submittingLabour, setSubmittingLabour] = useState(false);

  const [syncingStats, setSyncingStats] = useState(false);
  const [isStatsSynced, setIsStatsSynced] = useState(
    globalProdCache.isStatsSynced,
  );

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
  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";

  useEffect(() => {
    const needsRefresh =
      sessionStorage.getItem("prod_entry_needs_refresh") === "true";

    const fetchTopData = async () => {
      if (needsRefresh) setLoading(true);
      try {
        const s = await productionService.getStats();
        const [prodRes, labRes, duesRes] = await Promise.all([
          productionService.getAllProduction({}, null, 10),
          productionService.getAllLabourPayouts({}, null, 10, false),
          productionService.getAllLabourPayouts({}, null, 10, true),
        ]);

        let isSynced = true;
        if (prodRes.data.length > 0 && s.output === 0) isSynced = false;
        else if (prodRes.data.length === 0 && s.output > 0) isSynced = false;

        setIsStatsSynced(isSynced);
        globalProdCache.isStatsSynced = isSynced;
        setStats(s);
        globalProdCache.stats = s;
        setEntries(prodRes.data || []);
        globalProdCache.entries = prodRes.data || [];
        setLabourEntries(labRes.data || []);
        globalProdCache.labourEntries = labRes.data || [];
        setDuesEntries(duesRes.data || []);
        globalProdCache.duesEntries = duesRes.data || [];
        globalProdCache.fetched = true;
      } catch (error) {
        toast.error("Failed to load history.");
      } finally {
        setLoading(false);
      }
    };

    if (!globalProdCache.fetched || needsRefresh) {
      sessionStorage.removeItem("prod_entry_needs_refresh");
      fetchTopData();
    } else {
      setLoading(false);
    }
  }, [toast]);

  // 🚀 UPDATED MASTER SYNC FUNCTION
  const handleSyncStats = async () => {
    if (isStatsSynced) return;
    setSyncingStats(true);
    toast.info("Recalculating all records...");
    try {
      const newStats = await productionService.syncAllStats();

      setStats(newStats);
      globalProdCache.stats = newStats;
      setIsStatsSynced(true);
      globalProdCache.isStatsSynced = true;
      toast.success("Database synchronized successfully!");
    } catch (e) {
      toast.error("Sync failed.");
    } finally {
      setSyncingStats(false);
    }
  };

  const parseProduct = (fullName) => {
    if (!fullName) return { name: "-", size: "-" };
    if (fullName.includes("(")) {
      const parts = fullName.split("(");
      return { name: parts[0].trim(), size: parts[1].replace(")", "").trim() };
    }
    return { name: fullName, size: "-" };
  };

  const handleProdChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleProdSubmit = (e) => {
    e.preventDefault();
    setConfirmDialog({ isOpen: true, type: "production" });
  };

  const executeProdSubmit = async () => {
    setSubmitting(true);
    try {
      const docRef = await productionService.addProduction(formData, admin);
      toast.success("Production log saved!");

      const qty = Number(formData.quantity) || 0;

      setEntries((prev) => {
        const newEntry = {
          _id: docRef.id,
          id: docRef.id,
          ...formData,
          quantity: qty,
          createdAt: new Date().toISOString(),
        };
        const updated = [newEntry, ...prev].slice(0, 10);
        globalProdCache.entries = updated;
        return updated;
      });

      setStats((prev) => {
        const newStats = { ...prev, output: prev.output + qty };
        globalProdCache.stats = newStats;
        return newStats;
      });

      sessionStorage.setItem("prod_report_needs_refresh", "true");
      setFormData({
        date: new Date().toISOString().split("T")[0],
        productName: "",
        quantity: "",
      });
    } catch (error) {
      toast.error("Failed to save entry.");
    } finally {
      setSubmitting(false);
      setConfirmDialog({ isOpen: false, type: "" });
    }
  };

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
        if (cost > 0) newData.amountPaid = Math.max(0, cost - due).toString();
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
      const docRef = await productionService.addLabourPayout(labourData, admin);
      toast.success(`Record for ${labourData.labourName} saved!`);

      const paid = Number(labourData.amountPaid) || 0;
      const due = Number(labourData.amountDue) || 0;

      const newEntry = {
        _id: docRef.id,
        id: docRef.id,
        ...labourData,
        cost: Number(labourData.cost),
        amountPaid: paid,
        amountDue: due,
        createdAt: new Date().toISOString(),
      };

      setLabourEntries((prev) => {
        const updated = [newEntry, ...prev].slice(0, 10);
        globalProdCache.labourEntries = updated;
        return updated;
      });

      if (due > 0) {
        setDuesEntries((prev) => {
          const updated = [newEntry, ...prev].slice(0, 10);
          globalProdCache.duesEntries = updated;
          return updated;
        });
      }

      setStats((prev) => {
        const newStats = {
          ...prev,
          paid: prev.paid + paid,
          due: prev.due + due,
        };
        globalProdCache.stats = newStats;
        return newStats;
      });

      sessionStorage.setItem("prod_report_needs_refresh", "true");
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
      setConfirmDialog({ isOpen: false, type: "" });
    }
  };

  const handleDialogConfirm = () => {
    if (confirmDialog.type === "production") executeProdSubmit();
    else if (confirmDialog.type === "labour") executeLabourSubmit();
  };

  const handleRowClick = (e, id) => {
    if (e.target.closest("button") || e.target.closest("a")) return;
    navigate(`${basePath}/production/report?highlight=${id}`);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
            >
              <Factory size={28} />
            </div>
            Log Management
          </h1>
          <p className="text-zinc-400 mt-2 text-xs md:text-sm font-medium">
            Track daily output and manage payouts.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
          <div className="w-full sm:w-auto bg-[#09090B] p-1.5 rounded-2xl md:rounded-full border border-zinc-800/60 flex items-center relative">
            {["production", "payouts", "dues"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveModule(tab)}
                className={`relative flex-1 sm:flex-none px-4 md:px-8 py-2.5 md:py-2 text-[10px] sm:text-xs md:text-sm font-bold rounded-xl md:rounded-full transition-all tracking-wide z-10 ${
                  activeModule === tab
                    ? "text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {activeModule === tab && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className={`absolute inset-0 rounded-xl md:rounded-full ${theme.primaryTabBg} shadow-sm -z-10`}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-20 capitalize">{tab}</span>
              </button>
            ))}
          </div>

          {!isManager && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSyncStats}
              disabled={syncingStats || isStatsSynced}
              title={
                isStatsSynced ? "System Already Updated" : "Click to Sync Stats"
              }
              className={`h-11 px-4 w-full sm:w-auto transition-all duration-500 flex justify-center ${
                isStatsSynced
                  ? "opacity-40 pointer-events-none cursor-not-allowed bg-emerald-500/5 text-emerald-500 border-emerald-500/20"
                  : "opacity-100 cursor-pointer border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {isStatsSynced ? (
                <CheckCircle size={16} />
              ) : (
                <Database
                  size={16}
                  className={
                    syncingStats ? "animate-pulse text-indigo-400" : ""
                  }
                />
              )}
              <span className="ml-2 hidden sm:block text-xs">
                {syncingStats
                  ? "Syncing..."
                  : isStatsSynced
                    ? "Updated"
                    : "Sync Stats"}
              </span>
            </Button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="lg:col-span-1"
        >
          <div className="bg-[#09090B] rounded-2xl border border-zinc-800/60 p-6 md:p-8 relative overflow-hidden transition-colors duration-700 shadow-2xl">
            <div
              className={`absolute top-0 right-0 w-40 h-40 blur-3xl rounded-full pointer-events-none transition-colors duration-700 ${theme.glowOrb}`}
            ></div>

            <div className="relative z-10">
              {activeModule === "production" ? (
                <div
                  key="production"
                  className="animate-in fade-in slide-in-from-left-4 duration-300"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className={`p-2.5 rounded-xl border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
                    >
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
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                        Production Date
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleProdChange}
                        required
                        className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all ${theme.primaryFocus}`}
                        style={{ colorScheme: "dark" }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                        Brick Type / Product
                      </label>
                      <div className="relative">
                        <select
                          name="productName"
                          value={formData.productName}
                          onChange={handleProdChange}
                          required
                          className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all appearance-none cursor-pointer ${theme.primaryFocus}`}
                        >
                          <option
                            value=""
                            className="bg-[#09090B] text-zinc-500"
                          >
                            Select Product...
                          </option>
                          <optgroup
                            label="Bricks"
                            className={`bg-[#09090B] font-bold ${theme.primaryText}`}
                          >
                            <option
                              value="Bricks (10 inch)"
                              className="text-zinc-100 font-normal"
                            >
                              Bricks (10 inch)
                            </option>
                            <option
                              value="Bricks (9 inch)"
                              className="text-zinc-100 font-normal"
                            >
                              Bricks (9 inch)
                            </option>
                            <option
                              value="Bricks (8 inch)"
                              className="text-zinc-100 font-normal"
                            >
                              Bricks (8 inch)
                            </option>
                          </optgroup>
                          <optgroup
                            label="Paver Blocks"
                            className={`bg-[#09090B] font-bold ${theme.primaryText}`}
                          >
                            <option
                              value="Zig Zag (60mm)"
                              className="text-zinc-100 font-normal"
                            >
                              Zig Zag (60mm)
                            </option>
                            <option
                              value="Zig Zag (80mm)"
                              className="text-zinc-100 font-normal"
                            >
                              Zig Zag (80mm)
                            </option>
                            <option
                              value="6-12 Brick (60mm)"
                              className="text-zinc-100 font-normal"
                            >
                              6-12 Brick (60mm)
                            </option>
                            <option
                              value="6-12 Brick (80mm)"
                              className="text-zinc-100 font-normal"
                            >
                              6-12 Brick (80mm)
                            </option>
                            <option
                              value="6/6 Brick (60mm)"
                              className="text-zinc-100 font-normal"
                            >
                              6/6 Brick 60mm
                            </option>
                            <option
                              value="6/6 Brick (80mm)"
                              className="text-zinc-100 font-normal"
                            >
                              6/6 Brick (80mm)
                            </option>
                          </optgroup>
                          <optgroup
                            label="Chequered Tiles"
                            className={`bg-[#09090B] font-bold ${theme.primaryText}`}
                          >
                            <option
                              value="Hexagon"
                              className="text-zinc-100 font-normal"
                            >
                              Hexagon
                            </option>
                            <option
                              value="Brick Design (9inch)"
                              className="text-zinc-100 font-normal"
                            >
                              Brick Design (9inch)
                            </option>
                            <option
                              value="Curve Stone"
                              className="text-zinc-100 font-normal"
                            >
                              Curve Stone
                            </option>
                            <option
                              value="Cover Block"
                              className="text-zinc-100 font-normal"
                            >
                              Cover Block
                            </option>
                          </optgroup>
                        </select>
                        <ChevronDown
                          size={16}
                          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                        Output Quantity (Pcs)
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        placeholder="e.g. 5000"
                        value={formData.quantity}
                        onChange={handleProdChange}
                        onWheel={(e) => e.target.blur()}
                        required
                        className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all ${theme.primaryFocus}`}
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full mt-2 rounded-xl shadow-lg"
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
                  className="animate-in fade-in slide-in-from-right-4 duration-300"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className={`p-2.5 rounded-xl border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
                    >
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
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3 ml-1">
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
                            className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                              labourData.payoutCategory === cat
                                ? `${theme.primaryBg} ${theme.primaryBorder} ${theme.primaryText}`
                                : "bg-transparent border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                          Record Date
                        </label>
                        <input
                          type="date"
                          name="date"
                          value={labourData.date}
                          onChange={handleLabourChange}
                          required
                          className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all ${theme.primaryFocus}`}
                          style={{ colorScheme: "dark" }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                          Name (Party)
                        </label>
                        <input
                          type="text"
                          name="labourName"
                          placeholder="e.g. Rajesh Kumar"
                          value={labourData.labourName}
                          onChange={handleLabourChange}
                          required
                          className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all ${theme.primaryFocus}`}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                          Qty Produced (Opt)
                        </label>
                        <input
                          type="number"
                          name="quantityProduced"
                          placeholder="0"
                          value={labourData.quantityProduced}
                          onChange={handleLabourChange}
                          onWheel={(e) => e.target.blur()}
                          className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all ${theme.primaryFocus}`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                          Total Cost (Opt)
                        </label>
                        <input
                          type="number"
                          name="cost"
                          placeholder="0.00"
                          value={labourData.cost}
                          onChange={handleLabourChange}
                          onWheel={(e) => e.target.blur()}
                          className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all ${theme.primaryFocus}`}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
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
                          className={`w-full px-4 py-3 bg-zinc-900/50 border ${theme.primaryBorder} rounded-xl ${theme.primaryText} font-bold text-lg outline-none transition-all ${theme.primaryFocus}`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
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
                          className="w-full px-4 py-3 bg-zinc-900/50 border border-rose-500/30 rounded-xl text-rose-400 font-bold tracking-wider text-lg focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full mt-2 rounded-xl shadow-lg"
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="lg:col-span-2 space-y-6"
        >
          <div className="bg-[#09090B] rounded-2xl border border-zinc-800/60 overflow-hidden transition-colors duration-500 shadow-2xl">
            <div className="p-4 sm:p-6 border-b border-zinc-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                Recent Logs{" "}
                <span className="text-zinc-500 text-sm font-normal hidden sm:inline-block">
                  (Top 10)
                </span>
              </h3>
              <Link
                to={`${basePath}/production/report`}
                className={`text-[10px] sm:text-xs font-bold ${theme.primaryText} ${theme.primaryBg} border ${theme.primaryBorder} px-4 py-2 rounded-lg hover:bg-${isTransport ? "cyan" : "indigo"}-500/20 transition-colors uppercase tracking-widest whitespace-nowrap w-full sm:w-auto text-center`}
              >
                VIEW ALL REPORTS
              </Link>
            </div>

            <div className="overflow-x-auto w-full pb-4 custom-scrollbar min-h-[400px]">
              {activeModule === "production" && (
                <table className="w-full text-left animate-in fade-in duration-300 min-w-[700px]">
                  <thead className="bg-[#09090B] text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-800/60">
                    <tr>
                      <th className="p-5 md:pl-6 whitespace-nowrap">Date</th>
                      <th className="p-5 whitespace-nowrap">Item Name</th>
                      <th className="p-5 whitespace-nowrap">Size</th>
                      <th className="p-5 text-right whitespace-nowrap md:pr-6">
                        Output
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-sm">
                    {entries.map((entry) => {
                      const { name, size } = parseProduct(entry.productName);
                      return (
                        <tr
                          key={entry._id}
                          onClick={(e) => handleRowClick(e, entry._id)}
                          className="hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                        >
                          <td className="p-5 md:pl-6 align-middle">
                            <div className="text-zinc-400 font-mono text-xs">
                              {new Date(entry.date).toLocaleDateString("en-GB")}
                            </div>
                          </td>
                          <td className="p-5 align-middle">
                            <span
                              className={`${theme.primaryBg} border ${theme.primaryBorder} ${theme.primaryText} px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest inline-flex items-center gap-2 w-max`}
                            >
                              <Layers size={12} /> {name}
                            </span>
                          </td>
                          <td className="p-5 text-zinc-300 font-medium tracking-wide">
                            {size}
                          </td>
                          <td className="p-5 align-middle text-right whitespace-nowrap md:pr-6">
                            <span
                              className={`px-3 py-1 ${theme.primaryBg} ${theme.primaryText} rounded-lg text-xs font-bold border ${theme.primaryBorder} tracking-wider`}
                            >
                              {Number(entry.quantity).toLocaleString()} pcs
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {entries.length === 0 && (
                      <tr>
                        <td
                          colSpan="4"
                          className="p-10 text-center text-zinc-500 italic"
                        >
                          No production logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeModule === "payouts" && (
                <table className="w-full text-left animate-in fade-in duration-300 min-w-[700px]">
                  <thead className="bg-[#09090B] text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-800/60">
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
                  <tbody className="divide-y divide-zinc-800/60 text-sm">
                    {labourEntries.map((entry) => (
                      <tr
                        key={entry._id}
                        onClick={(e) => handleRowClick(e, entry._id)}
                        className="hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                      >
                        <td className="p-5 md:pl-6 align-middle">
                          <div className="font-bold text-zinc-100 group-hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap tracking-wide">
                            <Users size={14} className="text-zinc-500" />{" "}
                            {entry.labourName}
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span
                              className={`${theme.primaryBg} border ${theme.primaryBorder} ${theme.primaryText} px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-widest`}
                            >
                              {entry.payoutCategory || "Labour"}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono tracking-widest">
                              {new Date(entry.date).toLocaleDateString("en-GB")}
                            </span>
                          </div>
                        </td>
                        <td className="p-5 align-middle text-right whitespace-nowrap font-mono text-zinc-400">
                          ₹ {Number(entry.cost || 0).toLocaleString()}
                        </td>
                        <td
                          className={`p-5 align-middle text-right whitespace-nowrap font-mono ${theme.primaryText} font-bold`}
                        >
                          ₹ {Number(entry.amountPaid || 0).toLocaleString()}
                        </td>
                        <td className="p-5 md:pr-6 align-middle text-right whitespace-nowrap font-mono font-bold text-rose-400">
                          ₹ {Number(entry.amountDue || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {labourEntries.length === 0 && (
                      <tr>
                        <td colSpan="4" className="p-16 text-center">
                          <div
                            className={`w-16 h-16 rounded-full ${theme.primaryBg} border ${theme.primaryBorder} flex items-center justify-center ${theme.primaryText} mx-auto mb-4`}
                          >
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
                <table className="w-full text-left animate-in fade-in duration-300 min-w-[700px]">
                  <thead className="bg-[#09090B] text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-800/60">
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
                  <tbody className="divide-y divide-zinc-800/60 text-sm">
                    {duesEntries.map((entry) => (
                      <tr
                        key={entry._id}
                        onClick={(e) => handleRowClick(e, entry._id)}
                        className="hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                      >
                        <td className="p-5 md:pl-6 align-middle">
                          <div className="font-bold text-zinc-100 group-hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap tracking-wide">
                            <AlertCircle
                              size={14}
                              className="text-rose-500/50"
                            />{" "}
                            {entry.labourName}
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-1 font-mono tracking-widest">
                            {new Date(entry.date).toLocaleDateString("en-GB")}
                          </div>
                        </td>
                        <td className="p-5 align-middle text-right whitespace-nowrap">
                          <span
                            className={`${theme.primaryBg} border ${theme.primaryBorder} ${theme.primaryText} px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest`}
                          >
                            {entry.payoutCategory || "Labour"}
                          </span>
                        </td>
                        <td className="p-5 md:pr-6 align-middle text-right whitespace-nowrap font-mono font-bold text-rose-400 text-lg">
                          ₹ {Number(entry.amountDue || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {duesEntries.length === 0 && (
                      <tr>
                        <td colSpan="3" className="p-16 text-center">
                          <div className="w-16 h-16 rounded-full bg-zinc-800/50 border border-zinc-800 flex items-center justify-center text-zinc-400 mx-auto mb-4">
                            <AlertCircle size={28} />
                          </div>
                          <h3 className="text-white font-bold text-lg mb-1">
                            No Pending Dues!
                          </h3>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </motion.div>
      </div>

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
  );
};

export default DailyProduction;
