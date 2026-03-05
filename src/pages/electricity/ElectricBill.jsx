import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import electricService from "../../services/electricService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext"; // 👈 Context import kiya
import {
  Zap,
  Activity,
  Save,
  Trash2,
  CheckCircle,
  AlertCircle,
  Edit2,
  X,
  Download,
  History,
} from "lucide-react";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const BarChart = lazy(() => import("../../components/charts/BarChart"));

const ChartSkeleton = () => (
  <div className="w-full h-full bg-emerald-900/10 animate-pulse rounded-xl"></div>
);

const ElectricBill = () => {
  const { toast } = useUI();
  const { admin } = useAuth(); // 👈 Login details
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [editId, setEditId] = useState(null);

  // NAYE STATES
  const [warningTooltip, setWarningTooltip] = useState(null);
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    itemName: "",
  });

  const isManager = admin?.data?.role === "manager";

  const [formData, setFormData] = useState({
    month: "",
    billDate: new Date().toISOString().split("T")[0],
    unitsConsumed: "",
    ratePerUnit: "",
    status: "Pending",
  });

  const predictedAmount =
    (parseFloat(formData.unitsConsumed) || 0) *
    (parseFloat(formData.ratePerUnit) || 0);

  const fetchBills = async () => {
    try {
      const { data } = await electricService.getBills();
      setBills(data);
    } catch (error) {
      console.error("Error fetching bills:", error);
      toast.error("Failed to load bill history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const handleExport = () => {
    try {
      if (bills.length === 0) return toast.info("No bill records to export");
      const headers = [
        "Month",
        "Bill Date",
        "Units (kWh)",
        "Rate/Unit",
        "Total Amount",
        "Status",
      ];
      const rows = bills.map((bill) => {
        const date = bill.billDate
          ? `\t${new Date(bill.billDate).toLocaleDateString("en-GB")}`
          : "-";
        return [
          `"${bill.month || "-"}"`,
          date,
          bill.unitsConsumed || 0,
          bill.ratePerUnit || 0,
          bill.totalAmount || 0,
          bill.status || "-",
        ].join(",");
      });
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Electric_Bills_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Utility records exported to Excel");
    } catch (error) {
      toast.error("Failed to export bills");
    }
  };

  const chartData = useMemo(() => {
    const sortedBills = [...bills]
      .sort((a, b) => new Date(a.billDate) - new Date(b.billDate))
      .slice(-6);
    return {
      labels: sortedBills.map((b) => b.month),
      datasets: [
        {
          label: "Bill Amount (₹)",
          data: sortedBills.map((b) => b.totalAmount),
          backgroundColor: "#fbbf24",
          borderRadius: 6,
          barThickness: 30,
        },
      ],
    };
  }, [bills]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      if (editId) {
        await electricService.updateBill(editId, formData, currentUser);
        toast.success("Bill updated successfully!");
      } else {
        await electricService.addBill(formData, currentUser);
        toast.success("New bill recorded!");
      }
      fetchBills();
      resetForm();
    } catch (error) {
      toast.error("Failed to save bill");
    }
  };

  const handleEdit = (bill) => {
    setEditId(bill._id);
    setFormData({
      month: bill.month,
      billDate: new Date(bill.billDate).toISOString().split("T")[0],
      unitsConsumed: bill.unitsConsumed,
      ratePerUnit: bill.ratePerUnit,
      status: bill.status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (id) => setDeleteModal({ isOpen: true, id });

  const handleDisabledClick = (id) => {
    setWarningTooltip(id);
    setTimeout(() => setWarningTooltip(null), 2500);
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await electricService.deleteBill(deleteModal.id);
      toast.info("Bill deleted successfully");
      fetchBills();
    } catch (error) {
      toast.error("Failed to delete bill");
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const openHistory = (bill) => {
    const sortedHistory = bill.editHistory
      ? [...bill.editHistory].reverse()
      : [];
    setHistoryModal({
      isOpen: true,
      data: sortedHistory,
      itemName: `Bill for ${bill.month}`,
    });
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({
      month: "",
      billDate: new Date().toISOString().split("T")[0],
      unitsConsumed: "",
      ratePerUnit: "",
      status: "Pending",
    });
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-20">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Zap className="text-yellow-400" size={32} /> Electricity Metrics
          </h1>
          <p className="text-emerald-100/40 mt-1 text-sm">
            Monitor factory power consumption & billing history.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 text-xs border-emerald-900/30 hover:bg-emerald-500/10 text-emerald-400"
          onClick={handleExport}
        >
          <Download size={16} /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:items-stretch">
        <div className="lg:col-span-1 h-full">
          <div
            className={`h-full flex flex-col justify-between rounded-[32px] shadow-xl border p-6 md:p-8 relative overflow-hidden transition-colors ${editId ? "bg-emerald-900/10 border-emerald-500/30" : "bg-[#050a08] border-emerald-900/30"}`}
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 blur-[60px] rounded-full pointer-events-none" />
            <div className="flex items-center gap-3 mb-8 relative z-10 shrink-0">
              <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-2xl border border-yellow-500/20 shadow-lg shadow-yellow-500/10">
                {editId ? <Edit2 size={24} /> : <Zap size={24} />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {editId ? "Update Bill" : "Record Bill"}
                </h3>
                <p className="text-emerald-100/40 text-xs uppercase font-bold tracking-wider mt-1">
                  Monthly Log
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6 relative z-10 flex-1 flex flex-col"
            >
              <div className="space-y-5 flex-1">
                <Input
                  label="Bill Month"
                  placeholder="e.g. Oct 2025"
                  value={formData.month}
                  onChange={(e) =>
                    setFormData({ ...formData, month: e.target.value })
                  }
                  required
                />
                <Input
                  label="Bill Date"
                  type="date"
                  value={formData.billDate}
                  onChange={(e) =>
                    setFormData({ ...formData, billDate: e.target.value })
                  }
                  required
                  className="text-emerald-100"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Units (kWh)"
                    type="number"
                    step="any"
                    placeholder="0"
                    value={formData.unitsConsumed}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unitsConsumed: e.target.value,
                      })
                    }
                    required
                  />
                  <Input
                    label="Rate / Unit (₹)"
                    type="number"
                    step="any"
                    placeholder="0"
                    value={formData.ratePerUnit}
                    onChange={(e) =>
                      setFormData({ ...formData, ratePerUnit: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="p-5 bg-emerald-950/20 rounded-2xl border border-emerald-900/30 space-y-4 mt-2">
                  <div className="flex justify-between items-center border-b border-emerald-900/20 pb-4">
                    <span className="text-[10px] font-black text-emerald-100/60 uppercase tracking-widest">
                      Payment Status
                    </span>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className={`text-xs rounded-lg px-3 py-1.5 outline-none border font-bold ${formData.status === "Paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs font-semibold text-emerald-100/40 uppercase tracking-wider">
                      Calculated Total
                    </span>
                    <span className="text-2xl font-black text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.3)]">
                      <span className="text-sm mr-1 font-bold text-yellow-500">
                        ₹
                      </span>
                      {predictedAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-6 mt-auto">
                {editId && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={resetForm}
                    className="flex-1 bg-transparent border-emerald-900/50 text-emerald-200/50 hover:text-white rounded-xl"
                  >
                    <X size={18} /> Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  className={`flex-1 shadow-xl border-none py-4 rounded-xl font-bold text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.02] ${editId ? "bg-emerald-600" : "bg-gradient-to-r from-yellow-600 to-amber-600 text-white shadow-yellow-500/20"}`}
                >
                  <Save size={18} className="mr-2" />{" "}
                  {editId ? "Update" : "Save Bill"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 h-full">
          <div className="p-6 md:p-8 rounded-[32px] bg-[#050a08] border border-emerald-900/30 shadow-lg relative flex flex-col h-full min-h-[450px]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity size={20} className="text-emerald-500" /> Consumption
                Trend
              </h3>
              <span className="text-xs text-emerald-100/40 font-mono bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-900/30">
                Past Records
              </span>
            </div>
            <div className="relative flex-1 w-full min-h-0 z-10">
              <div className="absolute inset-0">
                {bills.length > 0 ? (
                  <Suspense fallback={<ChartSkeleton />}>
                    <BarChart data={chartData} />
                  </Suspense>
                ) : (
                  <div className="flex h-full items-center justify-center text-emerald-100/30 text-sm italic">
                    No data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full">
        <div className="bg-[#050a08] rounded-[32px] shadow-xl border border-emerald-900/30 overflow-hidden flex flex-col w-full">
          <div className="p-6 md:p-8 border-b border-emerald-900/20 shrink-0 bg-white/[0.01]">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <History size={20} className="text-emerald-500" /> Bill History
              log
            </h3>
          </div>

          <div className="overflow-x-auto w-full custom-scrollbar pb-4 p-2">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-[#020403] text-emerald-100/40 text-[10px] uppercase font-black tracking-widest sticky top-0 z-10 border-b border-emerald-900/20">
                <tr>
                  <th className="py-4 px-5">Month & Date</th>
                  <th className="py-4 px-5">Units</th>
                  <th className="py-4 px-5">Rate</th>
                  <th className="py-4 px-5 text-right">Amount</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/10 text-sm">
                {bills.map((bill) => (
                  <tr
                    key={bill._id}
                    className="hover:bg-emerald-900/10 transition-colors group"
                  >
                    <td className="p-5 align-middle">
                      <div className="text-white font-bold whitespace-nowrap">
                        {bill.month}
                      </div>

                      {/* 🛡️ ROLE-BASED HISTORY BADGE */}
                      {bill.editHistory && bill.editHistory.length > 0 ? (
                        <div
                          onClick={() => openHistory(bill)}
                          className="mt-2 flex flex-col gap-0.5 cursor-pointer bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg transition-all w-max whitespace-nowrap"
                          title="Click to view full edit history"
                        >
                          <div className="text-[10px] font-mono text-emerald-400/90 flex items-center gap-1.5 uppercase tracking-widest font-bold leading-none">
                            <History size={10} />
                            {bill.editHistory[bill.editHistory.length - 1]
                              .role || "ADMIN"}
                            {bill.editHistory.length > 1 && (
                              <span className="bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded text-[8px] font-bold ml-1">
                                +{bill.editHistory.length - 1} MORE
                              </span>
                            )}
                          </div>
                          <span className="text-emerald-100/30 text-[9px] ml-4 font-medium">
                            {new Date(
                              bill.editHistory[bill.editHistory.length - 1].at,
                            ).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ) : bill.lastEditedRole ? (
                        <div className="text-[10px] font-mono text-emerald-400/70 font-bold mt-1.5 uppercase tracking-widest whitespace-nowrap w-max flex flex-col gap-0.5">
                          <span>✍️ {bill.lastEditedRole}</span>
                          {bill.lastEditedAt && (
                            <span className="text-emerald-100/30 text-[9px] ml-4 font-medium normal-case tracking-normal">
                              {new Date(bill.lastEditedAt).toLocaleString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-emerald-100/30 text-[10px] font-mono mt-1 font-normal whitespace-nowrap">
                          {new Date(bill.billDate).toLocaleDateString("en-GB")}
                        </div>
                      )}
                    </td>
                    <td className="p-5 font-mono text-emerald-100/80 align-middle">
                      {bill.unitsConsumed}{" "}
                      <span className="text-[10px] text-emerald-100/30 font-sans">
                        kWh
                      </span>
                    </td>
                    <td className="p-5 font-mono text-emerald-400/80 text-xs align-middle">
                      ₹{bill.ratePerUnit}
                    </td>
                    <td className="p-5 text-right font-black text-yellow-400 align-middle whitespace-nowrap">
                      <span className="text-[10px] mr-0.5 text-yellow-500/50">
                        ₹
                      </span>
                      {bill.totalAmount.toLocaleString()}
                    </td>
                    <td className="p-5 text-center align-middle">
                      <span
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border inline-flex items-center gap-1.5 ${bill.status === "Paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}
                      >
                        {bill.status === "Paid" ? (
                          <CheckCircle size={12} />
                        ) : (
                          <AlertCircle size={12} />
                        )}{" "}
                        {bill.status}
                      </span>
                    </td>
                    <td className="p-5 align-middle">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(bill)}
                          className="p-2 bg-emerald-900/20 text-emerald-100/40 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"
                        >
                          <Edit2 size={16} />
                        </button>

                        <div className="relative flex items-center">
                          <button
                            onClick={() =>
                              isManager
                                ? handleDisabledClick(bill._id)
                                : handleDeleteClick(bill._id)
                            }
                            className={`p-2 rounded-xl transition-all ${isManager ? "text-emerald-100/20 opacity-50 cursor-not-allowed hover:bg-red-500/5" : "bg-rose-900/20 text-rose-100/40 hover:text-rose-400 hover:bg-rose-500/10"}`}
                          >
                            <Trash2 size={16} />
                          </button>

                          {warningTooltip === bill._id && (
                            <div className="absolute bottom-full right-0 mb-2 z-[99] animate-in fade-in zoom-in-95 duration-200">
                              <div className="bg-[#050a08] border border-red-500/30 shadow-2xl shadow-red-900/40 text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
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
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {historyModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#050a08] border border-emerald-900/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-emerald-900/20 flex justify-between items-center bg-[#020403]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History size={18} className="text-emerald-500" /> Log:{" "}
                <span className="text-emerald-400 text-sm">
                  {historyModal.itemName}
                </span>
              </h3>
              <button
                onClick={() =>
                  setHistoryModal({ isOpen: false, data: [], itemName: "" })
                }
                className="text-emerald-100/40 hover:text-white p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {historyModal.data.map((edit, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-[#020403] p-4 rounded-xl border border-emerald-900/20 group hover:border-emerald-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-black text-sm uppercase shadow-inner">
                      {edit.role ? edit.role.charAt(0) : "A"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-100 uppercase tracking-widest">
                        {edit.role || "Admin"}
                      </p>
                      <p className="text-[9px] text-emerald-100/30 font-mono">
                        {edit.by}
                      </p>
                      <p className="text-[10px] text-emerald-400/60 font-mono mt-1">
                        {new Date(edit.at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  {idx === 0 && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md uppercase font-black border border-emerald-500/20">
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
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Delete Bill?"
        message="Are you sure you want to delete this bill record? This cannot be undone."
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
};

export default ElectricBill;
