import React, { useState, useEffect, useMemo } from "react";
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
  CreditCard,
  ShieldCheck,
  Search,
  Filter,
  AlertOctagon,
  ShieldAlert,
  Eye,
  EyeOff,
  Download,
  ChevronDown,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const EmployeeList = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🚀 Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSalary, setFilterSalary] = useState("All");

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

  const [idModal, setIdModal] = useState({
    isOpen: false,
    data: null,
  });

  // 🚀 Wipe Data States
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wiping, setWiping] = useState(false);

  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";

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

  // 🚀 FILTER LOGIC
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Search
      const matchesSearch =
        (emp.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.position || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.phone || "").includes(searchTerm);
      if (!matchesSearch) return false;

      // Status Filter
      const matchesStatus =
        filterStatus === "All" || emp.status === filterStatus;
      if (!matchesStatus) return false;

      // 🚀 Salary Taken Filter
      let matchSalary = true;
      const taken = Number(emp.salaryTaken) || 0;
      if (filterSalary === "No Salary Taken") matchSalary = taken === 0;
      else if (filterSalary === "Under ₹10k")
        matchSalary = taken > 0 && taken < 10000;
      else if (filterSalary === "₹10k - ₹50k")
        matchSalary = taken >= 10000 && taken <= 50000;
      else if (filterSalary === "Over ₹50k") matchSalary = taken > 50000;
      if (!matchSalary) return false;

      return true;
    });
  }, [employees, searchTerm, filterStatus, filterSalary]);

  const activeFiltersCount = [filterStatus, filterSalary].filter(
    (f) => f !== "All",
  ).length;

  const handleDeleteClick = (id, name) => {
    setDeleteModal({ isOpen: true, id, name });
  };

  const handleDisabledClick = (action) => {
    setWarningTooltip(action);
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

  // 🚀 EXPORT CSV (Filtered Data)
  const handleExport = () => {
    try {
      if (filteredEmployees.length === 0)
        return toast.info("No records to export");
      const headers = [
        "Name",
        "Position",
        "Phone",
        "Address",
        "ID Type",
        "ID Number",
        "Initial Salary",
        "Salary Taken",
        "Status",
        "Join Date",
      ];
      const rows = filteredEmployees.map((emp) => {
        const joinDate = emp.joinDate
          ? `\t${new Date(emp.joinDate).toLocaleDateString("en-GB")}`
          : "-";
        return `"${emp.name || "-"}","${emp.position || "-"}","\t${emp.phone || "-"}","${emp.address || "-"}","${emp.idType || "-"}","\t${emp.idNumber || "-"}","${emp.initialSalary || 0}","${emp.salaryTaken || 0}","${emp.status || "Active"}","${joinDate}"`;
      });
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute(
        "download",
        `Employees_Export_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("List Exported Successfully!");
    } catch (e) {
      toast.error("Export failed");
    }
  };

  // 🚀 FULL BACKUP (All Data before Wipe)
  const handleFullBackup = () => {
    try {
      if (employees.length === 0) return toast.info("Database is empty.");
      const headers = [
        "Name",
        "Position",
        "Phone",
        "Address",
        "ID Type",
        "ID Number",
        "Initial Salary",
        "Salary Taken",
        "Status",
        "Join Date",
      ];
      const rows = employees.map((emp) => {
        const joinDate = emp.joinDate
          ? `\t${new Date(emp.joinDate).toLocaleDateString("en-GB")}`
          : "-";
        return `"${emp.name || "-"}","${emp.position || "-"}","\t${emp.phone || "-"}","${emp.address || "-"}","${emp.idType || "-"}","\t${emp.idNumber || "-"}","${emp.initialSalary || 0}","${emp.salaryTaken || 0}","${emp.status || "Active"}","${joinDate}"`;
      });
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute(
        "download",
        `Full_Employee_Backup_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Secure full backup generated!");
    } catch (e) {
      toast.error("Backup failed.");
    }
  };

  const handleWipeAll = async () => {
    if (isManager || !deletePassword)
      return toast.error("Verification failed.");
    setWiping(true);
    try {
      await employeeService.deleteAllEmployees({ password: deletePassword });
      toast.success("Employee database cleared successfully.");
      setIsDeleteAllOpen(false);
      setDeletePassword("");
      setShowPassword(false);
      fetchEmployees();
    } catch (error) {
      toast.error(error.message || "Incorrect Admin Password.");
    } finally {
      setWiping(false);
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

  const formatIdNumber = (type, number) => {
    if (!number) return "N/A";
    if (type === "Aadhar" && number.length === 12) {
      return number.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
    }
    return number;
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* HEADER */}
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
        <div className="flex gap-3">
          <div className="relative">
            <button
              onClick={() =>
                isManager
                  ? handleDisabledClick("wipe-all")
                  : setIsDeleteAllOpen(true)
              }
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-xs font-bold shadow-lg ${
                isManager
                  ? "bg-red-500/5 text-red-500/50 border border-red-500/10 opacity-50 cursor-not-allowed"
                  : "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
              }`}
            >
              <AlertOctagon size={16} /> Wipe Database
            </button>
            {warningTooltip === "wipe-all" && (
              <div className="absolute top-full mt-2 right-0 md:left-1/2 md:-translate-x-1/2 z-[100] animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-[#050a08] border border-red-500/30 shadow-xl text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                  <span className="bg-red-500/20 p-1 rounded-md text-[10px] leading-none">
                    🚫
                  </span>{" "}
                  Admin Access Required
                </div>
              </div>
            )}
          </div>
          {/* 🚀 TOP EXPORT BUTTON */}
          <Button
            variant="outline"
            className="gap-2 text-xs border-emerald-900/30 hover:bg-emerald-900/10 text-emerald-400"
            onClick={handleExport}
          >
            <Download size={16} /> Export CSV
          </Button>
          <Link to="/enterprise/employees/add">
            <Button className="gap-2 shadow-lg shadow-emerald-900/20">
              <Plus size={18} /> Add Employee
            </Button>
          </Link>
        </div>
      </div>

      {/* 🚀 FILTERS SECTION */}
      <div className="bg-[#050a08] rounded-2xl shadow-xl border border-emerald-900/30 overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4">
        <div className="relative w-full md:w-96 group">
          <Search
            size={16}
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${searchTerm ? "text-emerald-500" : "text-gray-500 group-hover:text-gray-400"}`}
          />
          <input
            type="text"
            placeholder="Search by name, position or phone..."
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-500 px-2">
            <Filter size={14} /> Filter
            {activeFiltersCount > 0 && (
              <span className="bg-emerald-500 text-[#020403] px-1.5 rounded-full ml-1">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <div className="relative group">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none bg-black/30 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-xs font-medium text-gray-300 outline-none cursor-pointer transition-all focus:ring-2 focus:ring-emerald-500/20 hover:border-emerald-500/50"
            >
              <option value="All" className="bg-[#050a08]">
                Status: All
              </option>
              <option value="Active" className="bg-[#050a08]">
                Active
              </option>
              <option value="On Leave" className="bg-[#050a08]">
                On Leave
              </option>
              <option value="Inactive" className="bg-[#050a08]">
                Inactive
              </option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover:text-emerald-500"
            />
          </div>

          <div className="relative group">
            <select
              value={filterSalary}
              onChange={(e) => setFilterSalary(e.target.value)}
              className="appearance-none bg-black/30 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-xs font-medium text-gray-300 outline-none cursor-pointer transition-all focus:ring-2 focus:ring-emerald-500/20 hover:border-emerald-500/50"
            >
              <option value="All" className="bg-[#050a08]">
                Salary Taken: All
              </option>
              <option value="No Salary Taken" className="bg-[#050a08]">
                No Salary Taken
              </option>
              <option value="Under ₹10k" className="bg-[#050a08]">
                &lt; ₹10,000
              </option>
              <option value="₹10k - ₹50k" className="bg-[#050a08]">
                ₹10k - ₹50k
              </option>
              <option value="Over ₹50k" className="bg-[#050a08]">
                &gt; ₹50,000
              </option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover:text-emerald-500"
            />
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                setFilterStatus("All");
                setFilterSalary("All");
                setSearchTerm("");
              }}
              className="text-xs text-rose-400/80 hover:text-rose-400 underline ml-2 whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* DIRECTORY GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((emp) => (
          <div
            key={emp._id}
            className="bg-[#050a08] border border-emerald-900/30 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group relative flex flex-col"
          >
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full group-hover:bg-emerald-500/10 transition-colors"></div>
            </div>

            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-3 bg-[#020403] rounded-xl border border-emerald-900/30 text-emerald-400">
                <User size={24} />
              </div>
              <div className="flex gap-2 items-center">
                {/* ID CARD VIEW BUTTON */}
                {emp.idNumber && (
                  <button
                    onClick={() => setIdModal({ isOpen: true, data: emp })}
                    className="p-2 rounded-lg text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                    title="View Govt ID"
                  >
                    <CreditCard size={18} />
                  </button>
                )}

                <Link to={`/enterprise/employees/edit/${emp._id}`}>
                  <button
                    className="p-2 rounded-lg text-emerald-100/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                    title="Edit Profile"
                  >
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
                        ? "text-emerald-100/20 opacity-50 cursor-not-allowed"
                        : "text-emerald-100/40 hover:text-red-400 hover:bg-red-500/10"
                    }`}
                  >
                    <Trash2 size={18} />
                  </button>
                  {warningTooltip === emp._id && (
                    <div className="absolute bottom-full right-0 mb-2 z-[99] animate-in fade-in zoom-in-95 duration-200">
                      <div className="bg-[#050a08] border border-red-500/30 shadow-2xl text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                        <span className="bg-red-500/20 p-1 rounded-md text-[10px] leading-none">
                          🚫
                        </span>{" "}
                        Action Denied
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="relative z-10 flex-1 flex flex-col">
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

              <div className="space-y-2 text-sm text-emerald-100/60 flex-1">
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
                  {emp.address || "No address"}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-emerald-900/20 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100/40">
                    Initial Salary
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    ₹{" "}
                    {Number(
                      emp.initialSalary || emp.baseSalary || 0,
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100/40">
                    Salary Taken
                  </span>
                  <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                    ₹ {Number(emp.salaryTaken || 0).toLocaleString("en-IN")}
                  </span>
                </div>

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

        {filteredEmployees.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 bg-[#050a08] border border-emerald-900/30 rounded-2xl text-emerald-100/40">
            <Users size={48} className="mb-4 opacity-20" />
            <p>No employees found matching your filters.</p>
          </div>
        )}
      </div>

      {/* EDIT LOG MODAL */}
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
                          day: "2-digit",
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

      {/* 🚀 PREMIUM EMERALD GLASSY ID CARD MODAL (Closes on background click) */}
      {idModal.isOpen && idModal.data && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          {/* Overlay Background - Click to close */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setIdModal({ isOpen: false, data: null })}
          />

          {/* Wrapper for Card + Outside Close Button (pointer-events-none prevents blocking overlay click) */}
          <div className="relative w-full max-w-sm flex flex-col items-center animate-in zoom-in-95 duration-300 pointer-events-none">
            {/* Close Button Outside Card (pointer-events-auto ensures it's clickable) */}
            <button
              onClick={() => setIdModal({ isOpen: false, data: null })}
              className="absolute -top-14 right-0 text-emerald-100/50 hover:text-white transition-colors bg-[#050a08] hover:bg-emerald-900/20 p-2.5 rounded-full border border-emerald-900/30 pointer-events-auto shadow-lg shadow-emerald-900/20"
            >
              <X size={20} />
            </button>

            {/* The ID Card - Dark Emerald Glassy Theme */}
            <div className="w-full bg-gradient-to-br from-[#050a08] to-[#020403] rounded-3xl border border-emerald-500/30 p-8 relative overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.15)] pointer-events-auto">
              {/* Hologram / Background Graphic */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none"></div>
              <div className="absolute -top-10 -right-10 text-emerald-500/5 rotate-12 pointer-events-none">
                <ShieldCheck size={200} />
              </div>

              {/* Header */}
              <div className="flex justify-between items-start relative z-10 mb-8">
                <div>
                  <p className="text-emerald-500 font-black text-[10px] tracking-[0.3em] uppercase mb-1">
                    Republic of India
                  </p>
                  <h2 className="text-2xl font-black text-white tracking-widest uppercase">
                    {idModal.data.idType || "ID Card"}
                  </h2>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                  <CreditCard className="text-emerald-400" size={28} />
                </div>
              </div>

              {/* ID Number Box */}
              <div className="relative z-10 mb-8 bg-[#020403]/80 p-5 rounded-2xl border border-emerald-900/40 shadow-inner">
                <p className="text-emerald-100/40 text-[10px] uppercase tracking-widest mb-2">
                  ID Number
                </p>
                <p className="text-emerald-400 font-mono text-[22px] font-black tracking-widest drop-shadow-[0_0_15px_rgba(16,185,129,0.4)] break-all">
                  {formatIdNumber(idModal.data.idType, idModal.data.idNumber)}
                </p>
              </div>

              {/* Footer details */}
              <div className="flex justify-between items-end relative z-10 pt-4 border-t border-emerald-900/30">
                <div>
                  <p className="text-emerald-100/40 text-[10px] uppercase tracking-widest mb-1">
                    Employee Name
                  </p>
                  <p className="text-emerald-100 font-bold tracking-wider uppercase text-lg">
                    {idModal.data.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-100/40 text-[10px] uppercase tracking-widest mb-1">
                    Join Date
                  </p>
                  <p className="text-emerald-500 font-mono font-bold">
                    {idModal.data.joinDate
                      ? new Date(idModal.data.joinDate).toLocaleDateString(
                          "en-GB",
                        )
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🛑 SECURE WIPE DATA MODAL 🛑 */}
      {isDeleteAllOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => !wiping && setIsDeleteAllOpen(false)}
          />
          <div className="bg-[#050a08] border border-red-900/50 shadow-[0_0_40px_rgba(220,38,38,0.15)] rounded-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col p-6 sm:p-8">
            <div className="flex items-center gap-3 text-red-500 mb-6">
              <AlertOctagon size={28} />
              <h2 className="text-xl font-bold tracking-wide">
                Wipe Employee Database
              </h2>
            </div>

            {/* 🚀 BACKUP WARNING BOX */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  size={20}
                  className="text-yellow-500 shrink-0 mt-0.5"
                />
                <div>
                  <h3 className="text-yellow-500 font-bold text-sm mb-1">
                    Recommended: Safe Backup
                  </h3>
                  <p className="text-yellow-100/60 text-xs mb-4 leading-relaxed">
                    Before wiping the database, we highly recommend downloading
                    a complete CSV backup of all your current employee records.
                  </p>
                  <button
                    onClick={handleFullBackup}
                    className="w-full sm:w-auto px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Download size={14} /> Download Full Database Backup
                  </button>
                </div>
              </div>
            </div>

            <p className="text-red-100/70 text-sm mb-4">
              This action will{" "}
              <strong className="text-red-500">PERMANENTLY DELETE ALL</strong>{" "}
              employee records from the system. Please enter your Admin password
              to confirm.
            </p>

            <div className="relative mb-8">
              <input
                type={showPassword ? "text" : "password"}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your admin password..."
                className="w-full bg-[#020403] border border-red-900/30 focus:border-red-500/50 rounded-xl px-4 py-3 text-red-100 placeholder:text-red-100/20 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-red-100/30 hover:text-red-100/60 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteAllOpen(false);
                  setDeletePassword("");
                }}
                disabled={wiping}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-red-100/50 hover:text-red-100 hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleWipeAll}
                disabled={wiping || !deletePassword}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-red-600/20 text-red-500 border border-red-600/30 hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {wiping ? <Loader className="w-4 h-4" /> : null}
                {wiping ? "Wiping..." : "Confirm Wipe"}
              </button>
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
