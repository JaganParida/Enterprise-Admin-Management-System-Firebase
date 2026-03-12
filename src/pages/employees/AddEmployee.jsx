import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import employeeService from "../../services/employeeService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import { UserPlus, ArrowLeft, Save, ChevronDown } from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

const AddEmployee = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useUI();
  const { admin } = useAuth();
  const [loading, setLoading] = useState(false);

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
    salaryTaken: "", // Strictly Optional
    idType: "Aadhar",
    idNumber: "",
    joinDate: new Date().toISOString().split("T")[0],
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // SMART ID VALIDATION & AUTO-STOP LOGIC
  const handleIdChange = (e) => {
    let val = e.target.value.toUpperCase();
    if (formData.idType === "Aadhar") {
      val = val.replace(/\D/g, "").slice(0, 12); // Only 12 digits
    } else if (formData.idType === "PAN") {
      val = val.replace(/[^A-Z0-9]/g, "").slice(0, 10); // Only 10 Alphanumeric
    } else if (formData.idType === "Voter ID") {
      val = val.replace(/[^A-Z0-9]/g, "").slice(0, 10); // 10 Alphanumeric
    } else if (formData.idType === "Driving License") {
      val = val.replace(/[^A-Z0-9-]/g, "").slice(0, 16); // 16 Alphanumeric with hyphens
    }
    setFormData({ ...formData, idNumber: val });
  };

  const handleIdTypeChange = (e) => {
    setFormData({ ...formData, idType: e.target.value, idNumber: "" });
  };

  // SMART PLACEHOLDER LOGIC
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (formData.phone.length !== 10) {
      return toast.error("Phone number must be exactly 10 digits");
    }
    if (formData.idType === "Aadhar" && formData.idNumber.length !== 12) {
      return toast.error("Aadhar Card must be exactly 12 digits");
    }
    if (formData.idType === "PAN" && formData.idNumber.length !== 10) {
      return toast.error("PAN Card must be exactly 10 characters");
    }

    setLoading(true);
    try {
      const currentUser = admin?.data ||
        admin || { email: "Unknown", role: "admin" };
      await employeeService.addEmployee(formData, currentUser);
      toast.success("Employee added successfully!");
      navigate(-1); // Changed back to previous route logically
    } catch (error) {
      console.error("Error adding employee:", error);
      toast.error(error.response?.data?.message || "Failed to add employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-zinc-500 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={18} className="mr-2" /> Back to Directory
      </button>

      <div className="bg-[#09090B] rounded-2xl shadow-xl border border-zinc-800/60 p-6 md:p-8 relative overflow-hidden">
        <div
          className={`absolute top-0 right-0 w-64 h-64 blur-3xl rounded-full pointer-events-none ${theme.glowOrb}`}
        ></div>

        <div className="flex items-center gap-4 mb-8 border-b border-zinc-800/60 pb-6 relative z-10">
          <div
            className={`p-3 rounded-xl border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
          >
            <UserPlus size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Onboard New Staff</h2>
            <p className="text-zinc-500 text-sm mt-1">
              Enter personal, ID, and payroll details
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
            {/* INDIAN PHONE VALIDATION */}
            <Input
              label="Phone Number"
              name="phone"
              placeholder="e.g. 9876543210"
              value={formData.phone}
              onChange={(e) => {
                let val = e.target.value.replace(/\D/g, "");
                // Must start with 6, 7, 8, or 9
                if (val.length > 0 && !["6", "7", "8", "9"].includes(val[0])) {
                  val = "";
                }
                if (val.length <= 10) setFormData({ ...formData, phone: val });
              }}
              required
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
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
            label="Permanent Address"
            name="address"
            placeholder="Full Address"
            value={formData.address}
            onChange={handleChange}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#020403]/50 p-5 rounded-2xl border border-zinc-800/60">
            <Input
              label="Initial Salary (₹)"
              name="initialSalary"
              type="number"
              placeholder="0.00"
              value={formData.initialSalary}
              onChange={handleChange}
              required
              className={`${theme.primaryText} font-bold`}
            />
            {/* SALARY TAKEN (OPTIONAL UI) */}
            <Input
              label="Salary Taken (₹) - Opt"
              name="salaryTaken"
              type="number"
              placeholder="0.00 (Optional)"
              value={formData.salaryTaken}
              onChange={handleChange}
              className="text-rose-400 font-bold"
            />
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-zinc-800/60 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="px-6 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="px-10 rounded-xl"
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
