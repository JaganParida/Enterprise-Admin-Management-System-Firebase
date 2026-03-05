import React, { useState, useEffect } from "react";
import employeeService from "../../services/employeeService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import { Banknote, Plus, History, Calendar } from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";

const SalaryManagement = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const [paymentData, setPaymentData] = useState({
    employeeId: "",
    amount: "",
    type: "Salary",
    date: new Date().toISOString().split("T")[0],
    remarks: "",
  });

  const fetchData = async () => {
    try {
      const empReq = employeeService.getAllEmployees();
      const histReq = employeeService.getSalaryHistory();
      const [empRes, histRes] = await Promise.all([empReq, histReq]);

      setEmployees(empRes.data);
      setHistory(histRes.data);
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Failed to load salary data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!paymentData.employeeId)
      return toast.error("Please select an employee");

    setPaying(true);
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await employeeService.addSalaryPayment(paymentData, currentUser);

      toast.success("Payment recorded successfully");
      const { data } = await employeeService.getSalaryHistory();
      setHistory(data);
      setPaymentData((prev) => ({ ...prev, amount: "", remarks: "" }));
    } catch (error) {
      toast.error("Failed to record payment");
    } finally {
      setPaying(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-1">
        <div className="bg-[#050a08] rounded-2xl shadow-xl border border-emerald-900/30 p-6 md:p-8 sticky top-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
              <Banknote size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Record Payment</h2>
              <p className="text-emerald-100/40 text-xs">
                Disburse salary or advance
              </p>
            </div>
          </div>

          <form onSubmit={handlePayment} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-emerald-100/60 uppercase tracking-wider mb-2 ml-1">
                Select Employee
              </label>
              <div className="relative">
                <select
                  className="w-full px-4 py-3 bg-[#020403] border border-emerald-900/40 rounded-xl text-emerald-100 outline-none focus:border-emerald-500/50 appearance-none transition-all"
                  value={paymentData.employeeId}
                  onChange={(e) =>
                    setPaymentData({
                      ...paymentData,
                      employeeId: e.target.value,
                    })
                  }
                  required
                >
                  <option value="" className="text-emerald-900">
                    Select Employee...
                  </option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.position})
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500/50">
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
                className="text-emerald-100"
                required
              />
              <div>
                <label className="block text-xs font-bold text-emerald-100/60 uppercase tracking-wider mb-2 ml-1">
                  Type
                </label>
                <select
                  className="w-full px-4 py-3 bg-[#020403] border border-emerald-900/40 rounded-xl text-emerald-100 outline-none focus:border-emerald-500/50"
                  value={paymentData.type}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, type: e.target.value })
                  }
                >
                  <option value="Salary">Salary</option>
                  <option value="Advance">Advance</option>
                  <option value="Bonus">Bonus</option>
                </select>
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
              className="w-full mt-4 shadow-lg shadow-emerald-900/20"
              disabled={paying}
            >
              <Plus size={18} /> {paying ? "Recording..." : "Record Payment"}
            </Button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="bg-[#050a08] rounded-2xl shadow-xl border border-emerald-900/30 overflow-hidden h-full">
          <div className="p-6 border-b border-emerald-900/20 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                <History size={20} />
              </div>
              Payment History
            </h2>
          </div>

          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left min-w-max">
              <thead className="bg-[#020403] text-emerald-100/40 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-5 md:pl-6 whitespace-nowrap">Date</th>
                  <th className="p-5 whitespace-nowrap">Employee</th>
                  <th className="p-5 whitespace-nowrap">Type</th>
                  <th className="p-5 text-right md:pr-6 whitespace-nowrap">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/20 text-sm">
                {history.map((record) => (
                  <tr
                    key={record._id}
                    className="hover:bg-emerald-900/10 transition-colors group"
                  >
                    <td className="p-5 md:pl-6 align-middle">
                      <div className="flex items-center gap-2 text-emerald-100/60 font-mono text-xs whitespace-nowrap">
                        <Calendar size={14} />
                        {new Date(record.date).toLocaleDateString("en-GB")}
                      </div>
                      {/* 🛡️ Payer Name Tag */}
                      {record.recordedRole && (
                        <div className="text-[9px] font-mono text-emerald-400/40 font-bold mt-2 uppercase tracking-widest whitespace-nowrap">
                          Paid By: {record.recordedRole}
                        </div>
                      )}
                    </td>
                    <td className="p-5 align-middle">
                      <div className="font-bold text-white whitespace-nowrap">
                        {record.employee ? record.employee.name : "Unknown"}
                        <span className="block text-[10px] text-emerald-100/40 font-normal mt-0.5">
                          {record.employee ? record.employee.position : "-"}
                        </span>
                      </div>
                    </td>
                    <td className="p-5 align-middle whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                          record.type === "Advance"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {record.type}
                      </span>
                    </td>
                    <td className="p-5 md:pr-6 text-right font-mono font-bold text-white align-middle whitespace-nowrap">
                      ₹ {record.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
                      className="p-8 text-center text-emerald-100/30"
                    >
                      No payment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryManagement;
