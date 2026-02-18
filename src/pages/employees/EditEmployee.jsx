import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import employeeService from "../../services/employeeService";
import { useUI } from "../../context/UIProvider";
import { UserCheck, ArrowLeft, Save, RefreshCcw } from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const EditEmployee = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useUI();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    position: "",
    phone: "",
    address: "",
    baseSalary: "",
    status: "Active",
    joinDate: "",
  });

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        // ✅ REMOVED ARTIFICIAL TIMEOUT
        const { data } = await employeeService.getEmployeeById(id);

        setFormData({
          name: data.name || "",
          position: data.position || "",
          phone: data.phone || "",
          address: data.address || "",
          baseSalary: data.baseSalary || "",
          status: data.status || "Active",
          joinDate: data.joinDate
            ? new Date(data.joinDate).toISOString().split("T")[0]
            : "",
        });
      } catch (err) {
        console.error("Fetch Error:", err);
        toast.error("Could not retrieve employee details.");
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFormSubmitClick = (e) => {
    e.preventDefault();
    setIsDialogOpen(true);
  };

  const executeUpdate = async () => {
    setSaving(true);
    try {
      await employeeService.updateEmployee(id, formData);
      toast.success("Employee profile updated successfully.");
      navigate("/enterprise/employees");
    } catch (err) {
      console.error("Update Error:", err);
      toast.error("Failed to update employee.");
    } finally {
      setSaving(false);
      setIsDialogOpen(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader />
        <span className="text-emerald-500/40 text-[10px] font-mono uppercase tracking-widest animate-pulse">
          Loading Profile...
        </span>
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <button
        onClick={() => navigate("/enterprise/employees")}
        className="group flex items-center text-emerald-100/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft
          size={18}
          className="mr-2 group-hover:-translate-x-1 transition-transform"
        />
        Return to Directory
      </button>

      <div className="bg-[#050a08] rounded-2xl shadow-2xl border border-emerald-900/30 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>

        <div className="flex items-center gap-4 mb-8 border-b border-emerald-900/10 pb-6 relative z-10">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20 shadow-inner">
            <UserCheck size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Edit Employee
            </h2>
            <p className="text-emerald-100/30 text-[11px] uppercase tracking-widest font-semibold mt-1">
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
              onChange={handleChange}
              required
            />

            <div>
              <label className="block text-xs font-bold text-emerald-100/60 uppercase tracking-wider mb-2 ml-1">
                Status
              </label>
              <div className="relative">
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#020403] border border-emerald-900/40 rounded-xl text-emerald-100 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 appearance-none transition-all"
                >
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500/50">
                  ▼
                </div>
              </div>
            </div>
          </div>

          <Input
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Base Salary (₹)"
              name="baseSalary"
              type="number"
              value={formData.baseSalary}
              onChange={handleChange}
              required
            />
            <Input
              label="Joining Date"
              name="joinDate"
              type="date"
              value={formData.joinDate}
              onChange={handleChange}
              required
              className="text-emerald-100"
            />
          </div>

          <div className="pt-8 flex justify-end gap-4 border-t border-emerald-900/10 mt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/enterprise/employees")}
              className="px-6 border-emerald-900/30 text-emerald-100/50 hover:bg-emerald-900/20"
            >
              Discard Changes
            </Button>
            <Button
              type="submit"
              className="px-10 shadow-xl shadow-emerald-900/20 gap-2 border border-emerald-500/30"
              disabled={saving}
            >
              {saving ? (
                <RefreshCcw size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {saving ? "Updating..." : "Update Profile"}
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
