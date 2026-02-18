import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import employeeService from "../../services/employeeService";
import { useUI } from "../../context/UIProvider";
import { UserPlus, ArrowLeft, Save } from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

const AddEmployee = () => {
  const navigate = useNavigate();
  const { toast } = useUI();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    position: "",
    phone: "",
    address: "",
    baseSalary: "",
    joinDate: new Date().toISOString().split("T")[0],
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await employeeService.addEmployee(formData);
      toast.success("Employee added successfully!");
      navigate("/enterprise/employees");
    } catch (error) {
      console.error("Error adding employee:", error);
      toast.error(error.response?.data?.message || "Failed to add employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        onClick={() => navigate("/enterprise/employees")}
        className="flex items-center text-emerald-100/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={18} className="mr-2" /> Back to Directory
      </button>

      <div className="bg-[#050a08] rounded-2xl shadow-xl border border-emerald-900/30 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>

        <div className="flex items-center gap-4 mb-8 border-b border-emerald-900/20 pb-6 relative z-10">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
            <UserPlus size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Onboard New Staff</h2>
            <p className="text-emerald-100/40 text-sm">
              Enter personal and payroll details
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              name="name"
              placeholder="e.g. Rahul Kumar"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <Input
              label="Job Position"
              name="position"
              placeholder="e.g. Supervisor, Driver"
              value={formData.position}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Phone Number"
              name="phone"
              placeholder="e.g. 9876543210"
              value={formData.phone}
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

          <Input
            label="Address"
            name="address"
            placeholder="Permanent Address"
            value={formData.address}
            onChange={handleChange}
          />

          <Input
            label="Base Salary (₹)"
            name="baseSalary"
            type="number"
            placeholder="0.00"
            value={formData.baseSalary}
            onChange={handleChange}
            required
          />

          <div className="pt-6 flex justify-end gap-3 border-t border-emerald-900/20 mt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/enterprise/employees")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="px-8 shadow-lg shadow-emerald-900/20"
              disabled={loading}
            >
              <Save size={18} className="mr-2" />{" "}
              {loading ? "Saving..." : "Save Employee"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployee;
