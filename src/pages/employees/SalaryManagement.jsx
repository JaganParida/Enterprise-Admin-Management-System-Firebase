import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import employeeService from "../../services/employeeService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import { Banknote, Plus, History, Calendar, RefreshCcw } from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";

const SalaryManagement = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const location = useLocation();

  // ─── CONCEPT 1: Initialize from RAM cache — zero reads on re-navigation ──────
  const cachedEmployees = employeeService.getCachedEmployees({ status: "All" });
  const cachedLogs = employeeService.getCachedSalaryLogs();

  const [employees, setEmployees] = useState(() => cachedEmployees || []);
  const [history, setHistory] = useState(() => cachedLogs || []);

  // Only show full-page loader if BOTH caches are cold (true first-ever load)
  const [loading, setLoading] = useState(() => !cachedEmployees || !cachedLogs);
  const [paying, setPaying] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── FIXED: useRef prevents double-fetch in React StrictMode and re-renders ──
  const hasFetched = useRef(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const highlightId = searchParams.get("highlight");

  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const theme = {
    primaryText: isTransport ? "text-blue-400" : "text-indigo-400",
    primaryBg: isTransport ? "bg-blue-500/10" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-blue-500/20" : "border-indigo-500/20",
    primaryFocus: isTransport
      ? "focus:border-blue-500/50 focus:ring-blue-500/50"
      : "focus:border-indigo-500/50 focus:ring-indigo-500/50",
  };

  const [paymentData, setPaymentData] = useState({
    employeeId: "",
    amount: "",
    type: "Salary",
    date: new Date().toISOString().split("T")[0],
    remarks: "",
  });

  // ─── CONCEPT 1: fetchData respects cache — only hits server when needed ───────
  const fetchData = useCallback(async () => {
    try {
      const [empRes, histRes] = await Promise.all([
        employeeService.getAllEmployees({ status: "All" }),
        employeeService.getSalaryHistory(),
      ]);
      setEmployees(empRes.data);
      setHistory(histRes.data);
      setLastDoc(histRes.lastVisible || null);
      setHasMore(!!(histRes.data && histRes.data.length === 50));
    } catch {
      toast.error("Failed to load salary data");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // ── FIXED: Only fetch once. If cache was warm, skip the fetch entirely.
    // This implements zero-read navigation from Concept 1.
    if (hasFetched.current) return;
    hasFetched.current = true;

    if (cachedEmployees && cachedLogs) {
      // Both caches are warm — no server read needed
      setLoading(false);
      return;
    }

    // At least one cache is cold — fetch from server
    fetchData();
  }, [fetchData, cachedEmployees, cachedLogs]);

  // ─── CONCEPT 4: Load More for salary history ─────────────────────────────────
  const loadMoreHistory = async () => {
    if (!lastDoc) return;
    setLoadingMore(true);
    try {
      const response = await employeeService.getSalaryHistory(lastDoc);
      setHistory((prev) => [...prev, ...(response.data || [])]);
      setLastDoc(response.lastVisible || null);
      setHasMore(!!(response.data && response.data.length === 50));
    } catch {
      toast.error("Failed to load more history");
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (highlightId && !loading) {
      setTimeout(() => {
        const element = document.getElementById(highlightId);
        if (element)
          element.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
    }
  }, [highlightId, loading]);

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!paymentData.employeeId)
      return toast.error("Please select an employee");
    if (!paymentData.amount || Number(paymentData.amount) <= 0)
      return toast.error("Please enter a valid amount");

    setPaying(true);
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      const selectedEmp = employees.find(
        (emp) => emp._id === paymentData.employeeId,
      );

      const payloadToSave = {
        ...paymentData,
        amount: Number(paymentData.amount),
        employeeName: selectedEmp?.name || "Unknown",
        employeePosition: selectedEmp?.position || "-",
      };

      const res = await employeeService.addSalaryPayment(
        payloadToSave,
        currentUser,
      );

      // ── CONCEPT 2: Optimistic UI — prepend to history without re-fetching ──
      const newRecord = {
        _id: res.data._id,
        ...payloadToSave,
        employee: {
          name: payloadToSave.employeeName,
          position: payloadToSave.employeePosition,
        },
      };

      setHistory((prev) => [newRecord, ...prev].slice(0, 50));

      // ── CONCEPT 2: Optimistic update of employee's salaryTaken in local state ──
      setEmployees((prev) =>
        prev.map((emp) =>
          emp._id === paymentData.employeeId
            ? {
                ...emp,
                salaryTaken:
                  Number(emp.salaryTaken || 0) + Number(paymentData.amount),
              }
            : emp,
        ),
      );

      toast.success("Payment recorded & Salary updated!");
      setPaymentData((prev) => ({ ...prev, amount: "", remarks: "" }));
    } catch {
      toast.error("Failed to record payment");
      // On error, re-fetch to ensure consistency
      fetchData();
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full min-h-[80vh] flex flex-col items-center justify-center animate-in fade-in duration-500">
        <Loader />
        <p className="text-zinc-500 mt-4 font-mono text-[10px] font-bold uppercase tracking-widest animate-pulse">
          Loading Salary Data...
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Record Payment Form ── */}
      <div className="lg:col-span-1">
        <div className="bg-[#09090B] rounded-2xl shadow-xl border border-zinc-800/60 p-6 md:p-8 sticky top-24">
          <div className="flex items-center gap-3 mb-8">
            <div
              className={`p-2.5 rounded-xl border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
            >
              <Banknote size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Record Payment</h2>
              <p className="text-zinc-500 text-xs mt-0.5">
                Disburse salary or advance
              </p>
            </div>
          </div>
          <form onSubmit={handlePayment} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 ml-1">
                Select Employee
              </label>
              <div className="relative">
                <select
                  className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none appearance-none transition-all cursor-pointer ${theme.primaryFocus}`}
                  value={paymentData.employeeId}
                  onChange={(e) =>
                    setPaymentData({
                      ...paymentData,
                      employeeId: e.target.value,
                    })
                  }
                  required
                >
                  <option value="" className="text-zinc-500 bg-[#09090B]">
                    Select Employee...
                  </option>
                  {employees.map((emp) => (
                    <option
                      key={emp._id}
                      value={emp._id}
                      className="bg-[#09090B]"
                    >
                      {emp.name} ({emp.position})
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-[10px]">
                  ▼
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date"
                type="date"
                value={paymentData.date}
                onChange={(e) =>
                  setPaymentData({ ...paymentData, date: e.target.value })
                }
                className="text-zinc-100"
                style={{ colorScheme: "dark" }}
                required
              />
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 ml-1">
                  Type
                </label>
                <div className="relative">
                  <select
                    className={`w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 outline-none appearance-none transition-all cursor-pointer ${theme.primaryFocus}`}
                    value={paymentData.type}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, type: e.target.value })
                    }
                  >
                    <option value="Salary" className="bg-[#09090B]">
                      Salary
                    </option>
                    <option value="Advance" className="bg-[#09090B]">
                      Advance
                    </option>
                    <option value="Bonus" className="bg-[#09090B]">
                      Bonus
                    </option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-[10px]">
                    ▼
                  </div>
                </div>
              </div>
            </div>
            <Input
              label="Amount (₹)"
              type="number"
              placeholder="0.00"
              value={paymentData.amount}
              onChange={(e) =>
                setPaymentData({ ...paymentData, amount: e.target.value })
              }
              required
            />
            <Input
              label="Remarks"
              placeholder="Optional notes"
              value={paymentData.remarks}
              onChange={(e) =>
                setPaymentData({ ...paymentData, remarks: e.target.value })
              }
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full mt-4 rounded-xl"
              disabled={paying}
            >
              <Plus size={18} className="mr-2" />
              {paying ? "Recording..." : "Record Payment"}
            </Button>
          </form>
        </div>
      </div>

      {/* ── Payment History Table ── */}
      <div className="lg:col-span-2">
        <div className="bg-[#09090B] rounded-2xl shadow-xl border border-zinc-800/60 overflow-hidden h-full">
          <div className="p-6 border-b border-zinc-800/60 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-3">
              <div
                className={`p-2 rounded-lg border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
              >
                <History size={20} />
              </div>
              Payment History
            </h2>
          </div>
          <div className="overflow-x-auto pb-4 custom-scrollbar">
            <table className="w-full text-left min-w-max">
              <thead className="bg-[#09090B] text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-800/60">
                <tr>
                  <th className="p-5 md:pl-6 whitespace-nowrap">Date</th>
                  <th className="p-5 whitespace-nowrap">Employee</th>
                  <th className="p-5 whitespace-nowrap">Type</th>
                  <th className="p-5 text-right md:pr-6 whitespace-nowrap">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
                {history.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-10 text-center text-zinc-500 text-sm"
                    >
                      No payment records yet.
                    </td>
                  </tr>
                ) : (
                  history.map((record) => (
                    <tr
                      key={record._id}
                      id={record._id}
                      className={`transition-all duration-700 group ${
                        highlightId === record._id
                          ? `bg-white/10 shadow-[inset_0_0_15px_rgba(255,255,255,0.05)] border-l-4 ${isTransport ? "border-cyan-500" : "border-indigo-500"}`
                          : "hover:bg-zinc-800/30"
                      }`}
                    >
                      <td className="p-5 md:pl-6 align-middle">
                        <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs whitespace-nowrap">
                          <Calendar size={14} className="text-zinc-600" />
                          {new Date(record.date).toLocaleDateString("en-GB")}
                        </div>
                      </td>
                      <td className="p-5 align-middle">
                        <div className="font-bold text-white whitespace-nowrap">
                          {record.employee ? record.employee.name : "Unknown"}
                          <span className="block text-[10px] text-zinc-500 font-normal mt-0.5">
                            {record.employee ? record.employee.position : "-"}
                          </span>
                        </div>
                      </td>
                      <td className="p-5 align-middle whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${record.type === "Advance" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : `${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}`}
                        >
                          {record.type}
                        </span>
                      </td>
                      <td className="p-5 md:pr-6 text-right font-mono font-bold text-white align-middle whitespace-nowrap">
                        ₹ {Number(record.amount).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* ── CONCEPT 4: Load More for history ── */}
            {hasMore && history.length > 0 && (
              <div className="flex justify-center p-6 border-t border-zinc-800/60">
                <Button
                  onClick={loadMoreHistory}
                  disabled={loadingMore}
                  variant="outline"
                  className="text-zinc-400 border-zinc-700 hover:text-white hover:bg-zinc-800/50"
                >
                  {loadingMore ? (
                    <RefreshCcw size={16} className="animate-spin mr-2" />
                  ) : null}
                  {loadingMore ? "Loading..." : "Load Older Records"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryManagement;
