import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import employeeService from "../../services/employeeService";
import { useUI } from "../../context/UIProvider";
import { Users, Plus, Phone, MapPin, Trash2, User, Edit } from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const EmployeeList = () => {
  const { toast } = useUI();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    id: null,
    name: "",
  });

  const fetchEmployees = async () => {
    try {
      // ✅ REMOVED ARTIFICIAL TIMEOUT
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

  if (loading) return <Loader />;

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
            className="bg-[#050a08] border border-emerald-900/30 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full group-hover:bg-emerald-500/10 transition-colors"></div>

            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-3 bg-[#020403] rounded-xl border border-emerald-900/30 text-emerald-400">
                <User size={24} />
              </div>
              <div className="flex gap-2">
                <Link to={`/enterprise/employees/edit/${emp._id}`}>
                  <button className="p-2 rounded-lg text-emerald-100/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                    <Edit size={18} />
                  </button>
                </Link>
                <button
                  onClick={() => handleDeleteClick(emp._id, emp.name)}
                  className="p-2 rounded-lg text-emerald-100/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-1">{emp.name}</h3>

            <div className="flex items-center gap-3 mb-4">
              <p className="text-emerald-500 text-xs font-bold uppercase tracking-widest">
                {emp.position}
              </p>
              <span
                className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase border ${getStatusStyle(emp.status)}`}
              >
                {emp.status || "Active"}
              </span>
            </div>

            <div className="space-y-2 text-sm text-emerald-100/60">
              <div className="flex items-center gap-3">
                <Phone size={14} className="text-emerald-500/50" />
                {emp.phone}
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={14} className="text-emerald-500/50" />
                {emp.address || "No address provided"}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-emerald-900/20 flex justify-between items-center">
              <span className="text-xs text-emerald-100/30">Base Salary</span>
              <span className="font-mono font-bold text-white">
                ₹ {emp.baseSalary.toLocaleString()}
              </span>
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
