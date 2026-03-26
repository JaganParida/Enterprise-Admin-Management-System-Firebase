import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import employeeService from "../../services/employeeService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  UserCheck,
  ArrowLeft,
  Save,
  RefreshCcw,
  ChevronDown,
} from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const EditEmployee = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { toast } = useUI();
  const { admin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [auditInfo, setAuditInfo] = useState(null);

  // 🔥 THEME HOOK
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
    glowOrb: isTransport ? "bg-blue-500/5" : "bg-indigo-500/5",
  };

  const [formData, setFormData] = useState({
    name: "",
    position: "",
    phone: "",
    address: "",
    initialSalary: "",
    salaryTaken: "",
    idType: "Aadhar",
    idNumber: "",
    status: "Active",
    joinDate: "",
  });

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const { data } = await employeeService.getEmployeeById(id);
        setFormData({
          name: data.name || "",
          position: data.position || "",
          phone: data.phone || "",
          address: data.address || "",
          initialSalary: data.initialSalary || data.baseSalary || "",
          salaryTaken: data.salaryTaken || "",
          idType: data.idType || "Aadhar",
          idNumber: data.idNumber || "",
          status: data.status || "Active",
          joinDate: data.joinDate
            ? new Date(data.joinDate).toISOString().split("T")[0]
            : "",
        });

        if (data.lastEditedAt) {
          setAuditInfo({
            role: data.lastEditedRole || "Admin",
            at: new Date(data.lastEditedAt).toLocaleString(),
          });
        }
      } catch (err) {
        console.error("Fetch Error:", err);
        toast.error("Could not retrieve employee details.");
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id, toast]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleIdChange = (e) => {
    let val = e.target.value.toUpperCase();
    if (formData.idType === "Aadhar") {
      val = val.replace(/\D/g, "").slice(0, 12);
    } else if (formData.idType === "PAN") {
      val = val.replace(/[^A-Z0-9]/g, "").slice(0, 10);
    } else if (formData.idType === "Voter ID") {
      val = val.replace(/[^A-Z0-9]/g, "").slice(0, 10);
    } else if (formData.idType === "Driving License") {
      val = val.replace(/[^A-Z0-9-]/g, "").slice(0, 16);
    }
    setFormData({ ...formData, idNumber: val });
  };

  const handleIdTypeChange = (e) => {
    setFormData({ ...formData, idType: e.target.value, idNumber: "" });
  };

  const getIdPlaceholder = () => {
    switch (formData.idType) {
      case "Aadhar":
        return "e.g. 123456789012";
      case "PAN":
        return "e.g. ABCDE1234F";
      case "Voter ID":
        return "e.g. ABC1234567";
      case "Driving License":
        return "e.g. DL-1420110012345";
      default:
        return "Enter ID number...";
    }
  };

  const handleFormSubmitClick = (e) => {
    e.preventDefault();
    if (formData.phone.length !== 10) {
      return toast.error("Phone number must be exactly 10 digits");
    }
    if (formData.idType === "Aadhar" && formData.idNumber.length !== 12) {
      return toast.error("Aadhar Card must be exactly 12 digits");
    }
    if (formData.idType === "PAN" && formData.idNumber.length !== 10) {
      return toast.error("PAN Card must be exactly 10 characters");
    }
    setIsDialogOpen(true);
  };

  const executeUpdate = async () => {
    setSaving(true);
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await employeeService.updateEmployee(id, formData, currentUser);
      toast.success("Employee profile updated successfully.");
      navigate(-1);
    } catch (err) {
      console.error("Update Error:", err);
      toast.error("Failed to update employee.");
    } finally {
      setSaving(false);
      setIsDialogOpen(false);
    }
  };

  // 🚀 100% NO-LAG EARLY RETURN LOADER
  if (loading) {
    return (
      <div className="w-full h-full min-h-[80vh] flex flex-col items-center justify-center animate-in fade-in duration-500">
        <Loader />
        <p className="text-zinc-500 mt-4 font-mono text-[10px] font-bold uppercase tracking-widest animate-pulse">
          Loading Profile...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <button
        onClick={() => navigate(-1)}
        className="group flex items-center text-zinc-500 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft
          size={18}
          className="mr-2 group-hover:-translate-x-1 transition-transform"
        />{" "}
        Return to Directory
      </button>

      <div className="bg-[#09090B] rounded-2xl shadow-2xl border border-zinc-800/60 p-6 md:p-8 relative overflow-hidden">
        <div
          className={`absolute top-0 right-0 w-64 h-64 blur-3xl rounded-full pointer-events-none ${theme.glowOrb}`}
        ></div>
        <div className="flex items-center gap-4 mb-8 border-b border-zinc-800/60 pb-6 relative z-10">
          <div
            className={`p-3 rounded-xl border shadow-inner ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
          >
            <UserCheck size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Edit Employee
            </h2>
            <p className="text-zinc-500 text-[11px] uppercase tracking-widest font-semibold mt-1">
              ID: {id.slice(-6).toUpperCase()}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleFormSubmitClick}
          className="space-y-6 relative z-10"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <Input
              label="Job Position"
              name="position"
              value={formData.position}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={(e) => {
                let val = e.target.value.replace(/\D/g, "");
                if (val.length > 0 && !["6", "7", "8", "9"].includes(val[0]))
                  val = "";
                if (val.length <= 10) setFormData({ ...formData, phone: val });
              }}
              required
            />
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Status
              </label>
              <div className="relative">
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-[#020403] border border-zinc-800 rounded-xl text-zinc-100 outline-none appearance-none transition-all cursor-pointer ${theme.primaryFocus}`}
                >
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-zinc-900/30 p-5 rounded-2xl border border-zinc-800">
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Govt ID Type
              </label>
              <div className="relative">
                <select
                  name="idType"
                  value={formData.idType}
                  onChange={handleIdTypeChange}
                  className={`w-full px-4 py-3 bg-[#020403] border border-zinc-800 rounded-xl text-zinc-100 outline-none appearance-none cursor-pointer transition-all ${theme.primaryFocus}`}
                >
                  <option value="Aadhar">Aadhar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Driving License">Driving License</option>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <Input
                label={`${formData.idType} Number`}
                name="idNumber"
                value={formData.idNumber}
                onChange={handleIdChange}
                placeholder={getIdPlaceholder()}
                required
                className="font-mono uppercase tracking-wider"
              />
            </div>
          </div>

          <Input
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#020403]/50 p-5 rounded-2xl border border-zinc-800/60">
            <Input
              label="Initial Salary (₹)"
              name="initialSalary"
              type="number"
              value={formData.initialSalary}
              onChange={handleChange}
              required
              className={`${theme.primaryText} font-bold`}
            />
            <Input
              label="Salary Taken (₹) - Opt"
              name="salaryTaken"
              type="number"
              placeholder="0.00 (Optional)"
              value={formData.salaryTaken}
              onChange={handleChange}
              className="text-rose-400 font-bold"
            />
            <Input
              label="Joining Date"
              name="joinDate"
              type="date"
              value={formData.joinDate}
              onChange={handleChange}
              required
              className="text-zinc-100"
              style={{ colorScheme: "dark" }}
            />
          </div>

          {auditInfo && (
            <div className="pt-2 text-center text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-t border-zinc-800/60 mt-6 pt-4">
              Last updated by{" "}
              <span
                className={`${theme.primaryText} font-bold tracking-widest`}
              >
                {auditInfo.role}
              </span>{" "}
              on {auditInfo.at}
            </div>
          )}

          <div className="pt-6 flex justify-end gap-3 border-t border-zinc-800/60 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="px-6 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white rounded-xl"
            >
              Discard Changes
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
              Update Profile
            </Button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={executeUpdate}
        title="Update Employee Profile"
        message="Are you sure you want to save changes to this employee's records?"
        confirmText="Save Profile"
        isDestructive={false}
      />
    </div>
  );
};

export default EditEmployee;
