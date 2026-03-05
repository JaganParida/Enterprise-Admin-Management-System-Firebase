import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import employeeService from "../../services/employeeService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  Users,
  Plus,
  Phone,
  MapPin,
  Trash2,
  User,
  Edit,
  History,
  X,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const EmployeeList = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    id: null,
    name: "",
  });
  const [warningTooltip, setWarningTooltip] = useState(null);
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: [],
    itemName: "",
  });

  const isManager = admin?.data?.role === "manager";

  const fetchEmployees = async () => {
    try {
      const { data } = await employeeService.getAllEmployees();
      setEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employee list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleDeleteClick = (id, name) => {
    setDeleteModal({ isOpen: true, id, name });
  };

  const handleDisabledClick = (id) => {
    setWarningTooltip(id);
    setTimeout(() => setWarningTooltip(null), 2500);
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await employeeService.deleteEmployee(deleteModal.id);
      toast.info("Employee removed successfully");
      fetchEmployees();
    } catch (error) {
      toast.error("Failed to remove employee");
    } finally {
      setDeleteModal({ isOpen: false, id: null, name: "" });
    }
  };

  const openHistory = (emp) => {
    const sortedHistory = emp.editHistory ? [...emp.editHistory].reverse() : [];
    setHistoryModal({ isOpen: true, data: sortedHistory, itemName: emp.name });
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Active":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Inactive":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "On Leave":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 border border-emerald-500/20">
              <Users size={24} />
            </div>
            Employee Directory
          </h1>
          <p className="text-emerald-100/40 text-sm mt-1 ml-1">
            Manage your workforce and staff details.
          </p>
        </div>
        <Link to="/enterprise/employees/add">
          <Button className="gap-2 shadow-lg shadow-emerald-900/20">
            <Plus size={18} /> Add Employee
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((emp) => (
          <div
            key={emp._id}
            className="bg-[#050a08] border border-emerald-900/30 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group relative"
          >
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full group-hover:bg-emerald-500/10 transition-colors"></div>
            </div>

            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-3 bg-[#020403] rounded-xl border border-emerald-900/30 text-emerald-400">
                <User size={24} />
              </div>
              <div className="flex gap-2 items-center">
                <Link to={`/enterprise/employees/edit/${emp._id}`}>
                  <button className="p-2 rounded-lg text-emerald-100/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                    <Edit size={18} />
                  </button>
                </Link>

                <div className="relative flex items-center">
                  <button
                    onClick={() =>
                      isManager
                        ? handleDisabledClick(emp._id)
                        : handleDeleteClick(emp._id, emp.name)
                    }
                    className={`p-2 rounded-lg transition-colors ${
                      isManager
                        ? "text-emerald-100/20 opacity-50 cursor-not-allowed hover:bg-red-500/5 hover:text-red-400/50"
                        : "text-emerald-100/40 hover:text-red-400 hover:bg-red-500/10"
                    }`}
                  >
                    <Trash2 size={18} />
                  </button>

                  {warningTooltip === emp._id && (
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
            </div>

            <div className="relative z-10">
              <h3 className="text-lg font-bold text-white mb-1">
                {emp.name || "Unknown Employee"}
              </h3>

              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <p className="text-emerald-500 text-xs font-bold uppercase tracking-widest">
                    {emp.position || "N/A"}
                  </p>
                  <span
                    className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase border ${getStatusStyle(emp.status)}`}
                  >
                    {emp.status || "Active"}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-emerald-100/60 h-[40px]">
                <div className="flex items-center gap-3">
                  <Phone
                    size={14}
                    className="text-emerald-500/50 min-w-[14px]"
                  />
                  {emp.phone || "No phone"}
                </div>
                <div className="flex items-center gap-3 line-clamp-1">
                  <MapPin
                    size={14}
                    className="text-emerald-500/50 min-w-[14px]"
                  />
                  {emp.address || "No address provided"}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-emerald-900/20 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-emerald-100/30">
                    Base Salary
                  </span>
                  <span className="font-mono font-bold text-white">
                    ₹ {Number(emp.baseSalary || 0).toLocaleString()}
                  </span>
                </div>

                {/* 🛡️ HISTORY BADGE: Updated to show ADMIN/MANAGER roles WITH TIME/DATE */}
                {emp.editHistory && emp.editHistory.length > 0 ? (
                  <div
                    onClick={() => openHistory(emp)}
                    className="inline-flex flex-col gap-0.5 cursor-pointer bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg transition-all w-max"
                    title="Click to view full edit history"
                  >
                    <div className="text-[10px] font-mono text-emerald-400/90 flex items-center gap-1.5 uppercase tracking-widest font-bold leading-none">
                      <History size={10} />
                      {emp.editHistory[emp.editHistory.length - 1].role ||
                        "ADMIN"}
                      {emp.editHistory.length > 1 && (
                        <span className="bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded text-[8px] font-bold ml-1">
                          +{emp.editHistory.length - 1} MORE
                        </span>
                      )}
                    </div>
                    {/* ✅ TIME & DATE ADDED HERE */}
                    <span className="text-emerald-100/30 text-[9px] ml-4 font-medium">
                      {new Date(
                        emp.editHistory[emp.editHistory.length - 1].at,
                      ).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ) : emp.lastEditedRole ? (
                  <div className="text-[10px] font-mono text-emerald-400/70 font-bold uppercase tracking-widest w-max flex flex-col gap-0.5">
                    <span>✍️ {emp.lastEditedRole}</span>
                    {/* ✅ FALLBACK DATE FOR LEGACY RECORDS */}
                    {emp.lastEditedAt && (
                      <span className="text-emerald-100/30 text-[9px] ml-4 font-medium normal-case tracking-normal">
                        {new Date(emp.lastEditedAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}

        {employees.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 bg-[#050a08] border border-emerald-900/30 rounded-2xl text-emerald-100/40">
            <Users size={48} className="mb-4 opacity-20" />
            <p>No employees found. Add your first staff member.</p>
          </div>
        )}
      </div>

      {historyModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#050a08] border border-emerald-900/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-emerald-900/20 flex justify-between items-center bg-[#020403]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History size={18} className="text-emerald-500" />
                Log:{" "}
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
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {historyModal.data.map((edit, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-[#020403] p-4 rounded-xl border border-emerald-900/20 relative overflow-hidden group hover:border-emerald-500/30 transition-colors"
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
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, name: "" })}
        onConfirm={executeDelete}
        title="Remove Employee?"
        message={`Are you sure you want to remove ${deleteModal.name}? This cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
};

export default EmployeeList;
