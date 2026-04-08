import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import productionService from "../../services/productionService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import { IndianRupee, ArrowLeft, Save, RefreshCcw } from "lucide-react";
import Button from "../../components/common/Button";
import ConfirmDialog from "../../components/common/ConfirmDialog";

// 🚀 NEW EDIT PAYOUT SKELETON
const EditPayoutSkeleton = () => (
  <div className="max-w-3xl mx-auto space-y-6 pb-10 w-full flex flex-col">
    <div className="w-32 h-5 bg-zinc-800/50 rounded-md animate-pulse mb-2"></div>
    <div className="bg-[#09090B] rounded-2xl border border-zinc-800/60 p-8 animate-pulse">
      <div className="flex items-center gap-4 mb-8 border-b border-zinc-800/60 pb-6">
        <div className="h-14 w-14 rounded-xl bg-zinc-800/60"></div>
        <div>
          <div className="h-6 w-48 bg-zinc-800/60 rounded mb-2"></div>
          <div className="h-3 w-32 bg-zinc-800/40 rounded"></div>
        </div>
      </div>
      <div className="space-y-6">
        <div>
          <div className="h-3 w-24 bg-zinc-800/50 rounded mb-3"></div>
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-10 w-24 bg-zinc-800/40 rounded-xl"
              ></div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
          <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
          <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50">
          <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
          <div className="h-12 w-full bg-zinc-800/40 rounded-xl"></div>
        </div>
        <div className="flex justify-end gap-3 border-b border-zinc-800/60 mt-2 pt-6 pb-6">
          <div className="h-11 w-32 bg-zinc-800/50 rounded-xl"></div>
          <div className="h-11 w-40 bg-zinc-800/60 rounded-xl"></div>
        </div>
        <div className="h-3 w-48 mx-auto bg-zinc-800/40 rounded pt-2"></div>
      </div>
    </div>
  </div>
);

const EditPayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { toast } = useUI();
  const { admin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [auditInfo, setAuditInfo] = useState(null);

  const [originalLog, setOriginalLog] = useState(null);

  // 🔥 THEME HOOK
  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const theme = {
    primaryText: isTransport ? "text-cyan-400" : "text-indigo-400",
    primaryBg: isTransport ? "bg-cyan-500/10" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-cyan-500/20" : "border-indigo-500/20",
    primaryFocus: isTransport
      ? "focus:border-cyan-500/50 focus:ring-cyan-500/50"
      : "focus:border-indigo-500/50 focus:ring-indigo-500/50",
    glowOrb: isTransport ? "bg-cyan-500/5" : "bg-indigo-500/5",
  };

  const [labourData, setLabourData] = useState({
    date: "",
    labourName: "",
    payoutCategory: "Labour",
    quantityProduced: "",
    cost: "",
    amountPaid: "",
    amountDue: "",
  });

  const categories = ["Labour", "Contractor", "Consumer", "Other"];

  useEffect(() => {
    const fetchLog = async () => {
      try {
        const { data } = await productionService.getLabourPayoutById(id);
        const formattedDate = data.date
          ? new Date(data.date).toISOString().split("T")[0]
          : "";

        const initialData = {
          date: formattedDate,
          labourName: data.labourName || "",
          payoutCategory: data.payoutCategory || "Labour",
          quantityProduced: data.quantityProduced || "",
          cost: data.cost || "",
          amountPaid: data.amountPaid || "",
          amountDue: data.amountDue || "",
        };

        setLabourData(initialData);
        setOriginalLog(initialData);

        if (data.editHistory && data.editHistory.length > 0) {
          const lastEdit = data.editHistory[data.editHistory.length - 1];
          setAuditInfo({
            type: "LAST UPDATED BY",
            role: lastEdit.role || "ADMIN",
            at: new Date(lastEdit.at).toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
        } else {
          setAuditInfo(null);
        }
      } catch (err) {
        toast.error("Could not retrieve payout data.");
      } finally {
        setLoading(false);
      }
    };
    fetchLog();
  }, [id, toast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLabourData((prev) => {
      let newData = { ...prev, [name]: value };

      // Parse numerical values safely, treating empty string as 0
      const cost = newData.cost === "" ? 0 : Number(newData.cost);
      const paid = newData.amountPaid === "" ? 0 : Number(newData.amountPaid);
      const due = newData.amountDue === "" ? 0 : Number(newData.amountDue);

      if (name === "cost") {
        // When Cost is edited, update the Due
        if (newData.cost !== "") {
          newData.amountDue = Math.max(0, cost - paid).toString();
        }
      } else if (name === "amountPaid") {
        // When Paid is edited -> Update Due (if cost exists) OR Calculate Cost
        if (newData.cost !== "") {
          newData.amountDue = Math.max(0, cost - paid).toString();
        } else if (newData.amountDue !== "") {
          newData.cost = (paid + due).toString();
        }
      } else if (name === "amountDue") {
        // When Due is edited -> Update Paid (if cost exists) OR Calculate Cost
        if (newData.cost !== "") {
          newData.amountPaid = Math.max(0, cost - due).toString();
        } else if (newData.amountPaid !== "") {
          newData.cost = (paid + due).toString();
        }
      }

      return newData;
    });
  };

  const executeUpdate = async () => {
    setSaving(true);
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await productionService.updateLabourPayout(id, labourData, currentUser);
      toast.success("Payout record synchronized successfully.");
      sessionStorage.setItem("prod_report_needs_refresh", "true");
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update record.");
    } finally {
      setSaving(false);
      setIsDialogOpen(false);
    }
  };

  // 🚀 REPLACED LOADER WITH SKELETON
  if (loading) return <EditPayoutSkeleton />;

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 relative">
      <button
        onClick={() => navigate(-1)}
        className="group flex items-center text-zinc-500 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft
          size={18}
          className="mr-2 group-hover:-translate-x-1 transition-transform"
        />{" "}
        Return to Logs
      </button>

      <div className="bg-[#09090B] rounded-2xl border border-zinc-800/60 p-8 relative overflow-hidden">
        <div
          className={`absolute top-0 right-0 w-64 h-64 blur-3xl rounded-full pointer-events-none ${theme.glowOrb}`}
        ></div>

        <div className="flex items-center gap-4 mb-8 border-b border-zinc-800/60 pb-6 relative z-10">
          <div
            className={`p-3 rounded-xl border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
          >
            <IndianRupee size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Edit Payout / Due Record
            </h2>
            <p className="text-zinc-500 text-[11px] uppercase tracking-widest font-semibold mt-1">
              Ref ID: {id.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setIsDialogOpen(true);
          }}
          className="space-y-6 relative z-10"
        >
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3 ml-1">
              SELECT CATEGORY
            </label>
            <div className="flex flex-wrap gap-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    setLabourData({ ...labourData, payoutCategory: cat })
                  }
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all border ${
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Record Date
              </label>
              <input
                type="date"
                name="date"
                value={labourData.date}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all ${theme.primaryFocus}`}
                style={{ colorScheme: "dark" }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Party Name
              </label>
              <input
                type="text"
                name="labourName"
                placeholder="e.g. Rajesh Kumar"
                value={labourData.labourName}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all ${theme.primaryFocus}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Qty Produced (Optional)
              </label>
              <input
                type="number"
                name="quantityProduced"
                placeholder="0"
                value={labourData.quantityProduced}
                onChange={handleChange}
                onWheel={(e) => e.target.blur()}
                className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all ${theme.primaryFocus}`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Total Cost (Optional)
              </label>
              <input
                type="number"
                name="cost"
                placeholder="0.00"
                value={labourData.cost}
                onChange={handleChange}
                onWheel={(e) => e.target.blur()}
                className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none transition-all ${theme.primaryFocus}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-900/30 p-4 rounded-xl border border-zinc-800">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Amount Paid (₹)
              </label>
              <input
                type="number"
                name="amountPaid"
                placeholder="0.00"
                value={labourData.amountPaid}
                onChange={handleChange}
                onWheel={(e) => e.target.blur()}
                required
                className={`w-full px-4 py-3 bg-zinc-900/50 border ${theme.primaryBorder} rounded-xl ${theme.primaryText} font-bold text-lg outline-none transition-all ${theme.primaryFocus}`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Amount Due (₹) - Set to 0 to auto-add to Paid
              </label>
              <input
                type="number"
                name="amountDue"
                placeholder="0.00"
                value={labourData.amountDue}
                onChange={handleChange}
                onWheel={(e) => e.target.blur()}
                required
                className="w-full px-4 py-3 bg-zinc-900/50 border border-rose-500/30 rounded-xl text-rose-400 font-bold tracking-wider text-lg focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none transition-all"
              />
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 mt-2 border-b border-zinc-800/60 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="px-6 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white rounded-xl"
            >
              Discard
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="px-10 gap-2 rounded-xl"
              disabled={saving}
            >
              {saving ? (
                <RefreshCcw size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}{" "}
              Update Record
            </Button>
          </div>

          {auditInfo && (
            <div className="text-center text-[10px] font-mono text-zinc-500 uppercase tracking-widest pt-2">
              {auditInfo.type}{" "}
              <span className={`${theme.primaryText} font-bold mx-1`}>
                {auditInfo.role}
              </span>{" "}
              ON {auditInfo.at}
            </div>
          )}
        </form>
      </div>

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={executeUpdate}
        title="Update Record"
        message="Are you sure you want to save these changes to the payout record?"
        confirmText="Save Update"
        isDestructive={false}
      />
    </div>
  );
};

export default EditPayout;
