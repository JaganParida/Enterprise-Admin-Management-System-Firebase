import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import productionService from "../../services/productionService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import { IndianRupee, ArrowLeft, Save, RefreshCcw } from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const EditPayout = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useUI();
  const { admin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [auditInfo, setAuditInfo] = useState(null);

  const [originalLog, setOriginalLog] = useState(null);

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
      if (name === "amountDue" && originalLog) {
        const prevDue = Number(originalLog.amountDue) || 0;
        const prevPaid = Number(originalLog.amountPaid) || 0;
        const newDue = Number(value);
        if (newDue === 0 && prevDue > 0)
          newData.amountPaid = prevPaid + prevDue;
        else if (newDue > 0 && prevDue > 0) newData.amountPaid = prevPaid;
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
      navigate("/enterprise/production/report");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update record.");
    } finally {
      setSaving(false);
      setIsDialogOpen(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 relative">
      <button
        onClick={() => navigate("/enterprise/production/report")}
        className="group flex items-center text-blue-100/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft
          size={18}
          className="mr-2 group-hover:-translate-x-1 transition-transform"
        />{" "}
        Return to Logs
      </button>

      <div className="bg-[#050a08] rounded-2xl shadow-2xl border border-blue-900/30 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full pointer-events-none"></div>

        <div className="flex items-center gap-4 mb-8 border-b border-blue-900/10 pb-6 relative z-10">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20 shadow-inner">
            <IndianRupee size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Edit Payout / Due Record
            </h2>
            <p className="text-blue-100/30 text-[11px] uppercase tracking-widest font-semibold mt-1">
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
            <label className="block text-[10px] font-bold text-blue-100/60 uppercase tracking-widest mb-3 ml-1">
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
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Fixed Date Input */}
            <div>
              <label className="block text-[10px] font-bold text-blue-100/60 uppercase tracking-widest mb-1.5 ml-1">
                Record Date
              </label>
              <input
                type="date"
                name="date"
                value={labourData.date}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
                style={{ colorScheme: "dark" }}
              />
            </div>
            {/* Fixed Name Input */}
            <div>
              <label className="block text-[10px] font-bold text-blue-100/60 uppercase tracking-widest mb-1.5 ml-1">
                Party Name
              </label>
              <input
                type="text"
                name="labourName"
                value={labourData.labourName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fixed Qty Input */}
            <div>
              <label className="block text-[10px] font-bold text-blue-100/60 uppercase tracking-widest mb-1.5 ml-1">
                Qty Produced (Optional)
              </label>
              <input
                type="number"
                name="quantityProduced"
                value={labourData.quantityProduced}
                onChange={handleChange}
                onWheel={(e) => e.target.blur()}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
              />
            </div>
            {/* Fixed Cost Input */}
            <div>
              <label className="block text-[10px] font-bold text-blue-100/60 uppercase tracking-widest mb-1.5 ml-1">
                Total Cost (Optional)
              </label>
              <input
                type="number"
                name="cost"
                value={labourData.cost}
                onChange={handleChange}
                onWheel={(e) => e.target.blur()}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-900/5 p-4 rounded-xl border border-blue-900/20">
            {/* Fixed Amount Paid */}
            <div>
              <label className="block text-[10px] font-bold text-blue-100/60 uppercase tracking-widest mb-1.5 ml-1">
                Amount Paid (₹)
              </label>
              <input
                type="number"
                name="amountPaid"
                value={labourData.amountPaid}
                onChange={handleChange}
                onWheel={(e) => e.target.blur()}
                required
                className="w-full px-4 py-3 bg-black/40 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-lg shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none transition-all"
              />
            </div>
            {/* Fixed Due Input */}
            <div>
              <label className="block text-[10px] font-bold text-blue-100/60 uppercase tracking-widest mb-1.5 ml-1">
                Amount Due (₹) - Set to 0 to auto-add to Paid
              </label>
              <input
                type="number"
                name="amountDue"
                value={labourData.amountDue}
                onChange={handleChange}
                onWheel={(e) => e.target.blur()}
                required
                className="w-full px-4 py-3 bg-black/40 border border-rose-500/30 rounded-xl text-rose-400 font-bold tracking-wider text-lg shadow-inner focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 outline-none transition-all"
              />
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-4 mt-2 border-b border-blue-900/10 pb-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/enterprise/production/report")}
              className="px-6 border-blue-900/30 text-blue-100/50 hover:bg-blue-900/20 hover:text-blue-100"
            >
              Discard
            </Button>
            <Button
              type="submit"
              className="px-10 bg-blue-500 hover:bg-blue-400 text-[#020617] border-none shadow-lg shadow-blue-900/20 gap-2"
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
            <div className="text-center text-[10px] font-mono text-blue-100/30 uppercase tracking-[0.1em] opacity-80 pt-2">
              {auditInfo.type}{" "}
              <span className="text-blue-400 font-bold mx-1">
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
