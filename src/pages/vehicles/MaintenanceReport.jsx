import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import maintenanceService from "../../services/maintenanceService";
import { useUI } from "../../context/UIProvider";
import { useAuth } from "../../context/AuthContext";
import {
  FileText,
  Search,
  Trash2,
  Edit2,
  Truck,
  Filter,
  History,
  X,
  ChevronDown,
  Calendar,
  Download,
  AlertOctagon,
  ShieldAlert,
  Eye,
  EyeOff,
  Wrench,
  Map,
  IndianRupee,
  RefreshCcw,
} from "lucide-react";
import Loader from "../../components/common/Loader";
import Button from "../../components/common/Button";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const MaintenanceReport = () => {
  const { toast } = useUI();
  const { admin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔥 THEME HOOK
  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const theme = {
    primaryText: isTransport ? "text-[#38bdf8]" : "text-indigo-400",
    primaryBg: isTransport ? "bg-[#0c4a6e]/30" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-[#0284c7]/30" : "border-indigo-500/20",
    primaryFocus: isTransport
      ? "focus:border-[#0ea5e9]/50 focus:ring-1 focus:ring-[#0ea5e9]/50"
      : "focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50",
  };

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [warningTooltip, setWarningTooltip] = useState(null);
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    data: null,
    itemName: "",
  });

  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wiping, setWiping] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    amountFilter: "Any Amount",
    dateFilter: "All",
    exactDate: "",
  });

  const isManager =
    admin?.data?.role === "manager" || admin?.role === "manager";

  const fetchLogs = async () => {
    try {
      const { data } = await maintenanceService.getLogs();
      setLogs(data || []);
    } catch (error) {
      toast.error("Failed to load report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleDisabledClick = (action) => {
    setWarningTooltip(action);
    setTimeout(() => setWarningTooltip(null), 2500);
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await maintenanceService.deleteLog(deleteModal.id);
      toast.success("Maintenance record deleted successfully");
      fetchLogs();
    } catch (error) {
      toast.error("Failed to delete record");
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const openHistory = (log) => {
    const sortedHistory = log.editHistory ? [...log.editHistory].reverse() : [];
    setHistoryModal({
      isOpen: true,
      data: sortedHistory,
      itemName: `Maintenance for ${log.vehicleNo}`,
    });
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const logDateObj = log.date ? new Date(log.date) : new Date();
      const searchTerm = String(filters.search || "").toLowerCase();

      const matchSearch =
        String(log.vehicleNo || "")
          .toLowerCase()
          .includes(searchTerm) ||
        String(log.serviceType || "")
          .toLowerCase()
          .includes(searchTerm) ||
        String(log.description || "")
          .toLowerCase()
          .includes(searchTerm);

      let matchAmount = true;
      const amt = Number(log.cost) || 0;
      if (filters.amountFilter === "Under ₹10k") matchAmount = amt < 10000;
      else if (filters.amountFilter === "₹10k - ₹50k")
        matchAmount = amt >= 10000 && amt <= 50000;
      else if (filters.amountFilter === "Over ₹50k") matchAmount = amt > 50000;

      let matchDate = true;
      if (filters.exactDate && log.date) {
        matchDate = log.date.startsWith(filters.exactDate);
      } else if (filters.dateFilter !== "All" && log.date) {
        const today = new Date();
        const diffTime = Math.abs(today - logDateObj);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (filters.dateFilter === "Today") matchDate = diffDays <= 1;
        else if (filters.dateFilter === "Last7Days") matchDate = diffDays <= 7;
        else if (filters.dateFilter === "ThisMonth")
          matchDate =
            logDateObj.getMonth() === today.getMonth() &&
            logDateObj.getFullYear() === today.getFullYear();
      }

      return matchSearch && matchAmount && matchDate;
    });
  }, [logs, filters]);

  const activeFiltersCount =
    [filters.amountFilter, filters.dateFilter].filter(
      (f) => f !== "Any Amount" && f !== "All",
    ).length + (filters.exactDate ? 1 : 0);

  const handleFullBackup = () => {
    try {
      if (logs.length === 0) return toast.info("Database is empty.");
      const headers = [
        "Date",
        "Vehicle No",
        "Meter/Km",
        "Service Type",
        "Cost",
        "Description",
      ];
      const rows = logs.map((log) => {
        let dateStr = log.date
          ? `\t${new Date(log.date).toLocaleDateString("en-GB")}`
          : "-";
        return `${dateStr},"${log.vehicleNo}",${log.meterKm || 0},"${log.serviceType}",${log.cost},"${log.description}"`;
      });
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute(
        "download",
        `Full_Maintenance_Backup_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Secure full backup generated!");
    } catch (e) {
      toast.error("Backup failed.");
    }
  };

  const handleExport = () => {
    try {
      if (filteredLogs.length === 0) return toast.info("No records to export");
      const headers = [
        "Date",
        "Vehicle No",
        "Meter/Km",
        "Service Type",
        "Cost",
        "Description",
      ];
      const rows = filteredLogs.map((log) => {
        let dateStr = log.date
          ? `\t${new Date(log.date).toLocaleDateString("en-GB")}`
          : "-";
        return `${dateStr},"${log.vehicleNo}",${log.meterKm || 0},"${log.serviceType}",${log.cost},"${log.description}"`;
      });
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute(
        "download",
        `Maintenance_Report_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Exported successfully");
    } catch (error) {
      toast.error("Export failed");
    }
  };

  const handleWipeAll = async () => {
    if (isManager || !deletePassword)
      return toast.error("Verification failed.");
    setWiping(true);
    try {
      const adminEmail = admin?.data?.email || admin?.email;
      await maintenanceService.deleteAllLogs({
        password: deletePassword,
        email: adminEmail,
      });
      toast.success("Maintenance database cleared successfully.");
      setIsDeleteAllOpen(false);
      setDeletePassword("");
      setShowPassword(false);
      fetchLogs();
    } catch (error) {
      toast.error(error.message || "Incorrect Admin Password.");
    } finally {
      setWiping(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader />
      </div>
    );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 relative space-y-8 px-2 sm:px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
          >
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Maintenance Report
            </h1>
            <p className="text-xs uppercase tracking-widest mt-0.5 text-zinc-500">
              Advanced Analytics
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative h-[44px] w-full sm:w-auto">
            <Button
              variant="module"
              onClick={() =>
                isManager
                  ? handleDisabledClick("wipe-all")
                  : setIsDeleteAllOpen(true)
              }
              className={`h-full w-full sm:w-auto flex items-center justify-center gap-2 px-4 rounded-xl transition-all text-xs font-bold border-rose-500/40 text-rose-400 bg-rose-950/30 hover:bg-rose-900/40 hover:border-rose-400/60 ${isManager ? "opacity-50 !cursor-not-allowed" : ""}`}
            >
              <AlertOctagon size={16} /> Wipe Database
            </Button>
            {warningTooltip === "wipe-all" && (
              <div className="absolute top-full mt-2 right-0 md:left-1/2 md:-translate-x-1/2 z-[100] animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-[#09090B] border border-red-500/30 shadow-xl text-red-400 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max">
                  <span className="bg-red-500/20 p-1 rounded-md text-[10px] leading-none">
                    🚫
                  </span>{" "}
                  Admin Access Required
                </div>
              </div>
            )}
          </div>
          <Link
            to={
              isTransport
                ? "/transportation/maintenance"
                : "/enterprise/maintenance"
            }
            className="w-full sm:w-auto"
          >
            <Button
              variant="primary"
              className="h-[44px] px-6 text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 w-full whitespace-nowrap"
            >
              Back to Tracker
            </Button>
          </Link>
        </div>
      </div>

      <div
        className={`bg-[#09090B] rounded-3xl border overflow-visible shadow-2xl border-zinc-800/60`}
      >
        {/* SEARCH & EXPORT BAR */}
        <div
          className={`p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 rounded-t-3xl bg-zinc-900/10 border-zinc-800/60`}
        >
          <div className="relative w-full sm:w-80 group">
            <Search
              size={16}
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${filters.search ? theme.primaryText : "text-zinc-500 group-hover:text-zinc-400"}`}
            />
            <input
              type="text"
              placeholder="Search vehicle or service..."
              className={`w-full bg-[#09090B] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 outline-none transition-all shadow-inner ${theme.primaryFocus}`}
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </div>
          <Button
            variant="outline"
            onClick={handleExport}
            className="h-11 gap-2 text-xs font-bold tracking-widest border border-zinc-800 px-4 rounded-xl bg-[#09090B] text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors flex items-center w-full sm:w-auto justify-center"
          >
            <Download size={16} /> Export
          </Button>
        </div>

        {/* PROFESSIONAL FILTRATION UI */}
        <div
          className={`p-4 border-b bg-[#09090B] border-zinc-800/60 flex flex-wrap items-center gap-4 relative z-20`}
        >
          <div
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1 border-r border-zinc-800 mr-1 text-zinc-400`}
          >
            <Filter size={16} /> Filters
            {activeFiltersCount > 0 && (
              <span
                className={`ml-1 px-1.5 rounded ${theme.primaryBg} ${theme.primaryText}`}
              >
                {activeFiltersCount}
              </span>
            )}
          </div>

          <div className="relative group">
            <select
              value={filters.amountFilter}
              onChange={(e) =>
                setFilters({ ...filters, amountFilter: e.target.value })
              }
              className={`appearance-none bg-[#09090B] border border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-xs font-medium text-zinc-300 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
            >
              <option value="Any Amount">Any Amount</option>
              <option value="Under ₹10k">&lt; ₹10,000</option>
              <option value="₹10k - ₹50k">₹10k - ₹50k</option>
              <option value="Over ₹50k">&gt; ₹50,000</option>
            </select>
            <ChevronDown
              size={14}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:${theme.primaryText}`}
            />
          </div>

          <div className="relative group">
            <select
              value={filters.dateFilter}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  dateFilter: e.target.value,
                  exactDate: "",
                })
              }
              className={`appearance-none bg-[#09090B] border border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-xs font-medium text-zinc-300 outline-none cursor-pointer transition-all ${theme.primaryFocus}`}
            >
              <option value="All">Timeline: All</option>
              <option value="Today">Today</option>
              <option value="Last7Days">Last 7 Days</option>
              <option value="ThisMonth">This Month</option>
            </select>
            <ChevronDown
              size={14}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:${theme.primaryText}`}
            />
          </div>

          <div className="relative group flex items-center">
            <div
              className={`absolute left-3 flex items-center justify-center pointer-events-none transition-colors ${filters.exactDate ? theme.primaryText : "text-zinc-500"}`}
            >
              <Calendar size={14} />
            </div>
            <input
              type="date"
              value={filters.exactDate}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  exactDate: e.target.value,
                  dateFilter: "All",
                })
              }
              style={{ colorScheme: "dark" }}
              className={`appearance-none bg-[#09090B] border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium outline-none cursor-pointer transition-all ${theme.primaryFocus} ${filters.exactDate ? "text-white" : "text-zinc-500"}`}
            />
          </div>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              onClick={() =>
                setFilters({
                  search: "",
                  amountFilter: "Any Amount",
                  dateFilter: "All",
                  exactDate: "",
                })
              }
              className="!px-3 !py-1.5 !text-xs !rounded-full !ml-auto md:!ml-2 flex items-center gap-1.5"
            >
              <X size={14} /> Clear All
            </Button>
          )}
        </div>

        <div className="overflow-x-auto pb-4 custom-scrollbar min-h-[400px]">
          <table className="w-full text-left min-w-[750px] animate-in fade-in duration-300">
            <thead className="bg-[#09090B] text-zinc-500 text-[10px] uppercase font-bold tracking-[0.15em] border-b border-zinc-800">
              <tr>
                <th className="py-5 px-6 whitespace-nowrap">Date & Vehicle</th>
                <th className="py-5 px-6 whitespace-nowrap">Service Info</th>
                <th className="py-5 px-6 text-right whitespace-nowrap">Cost</th>
                <th className="py-5 px-6 text-right whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-sm">
              {filteredLogs.map((log) => {
                const hasEdits = log.editHistory && log.editHistory.length > 0;
                const latestLog = hasEdits
                  ? log.editHistory[log.editHistory.length - 1]
                  : null;

                return (
                  <tr
                    key={log._id}
                    className="hover:bg-zinc-800/30 transition-colors group"
                  >
                    <td className="p-5 px-6 align-top">
                      <p className="text-[11px] font-mono text-zinc-400 mb-1">
                        {new Date(log.date).toLocaleDateString("en-GB")}
                      </p>
                      <p className="font-bold text-white text-md uppercase tracking-wide flex items-center gap-2">
                        <Truck size={14} className="text-zinc-500" />{" "}
                        {log.vehicleNo}
                      </p>
                      {log.meterKm && (
                        <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                          <Map size={10} className="text-zinc-500" />{" "}
                          {log.meterKm} KM
                        </p>
                      )}
                      {hasEdits && (
                        <div
                          onClick={() => openHistory(log)}
                          className="mt-3 flex items-center gap-1.5 bg-zinc-800/50 border border-zinc-700/50 px-2 py-1 rounded-lg cursor-pointer w-max hover:opacity-80 transition-colors"
                        >
                          <History size={10} className="text-zinc-400" />
                          <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                            {latestLog.role || "ADMIN"}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-5 px-6 align-top">
                      <div
                        className={`text-xs text-zinc-200 mb-2 flex items-center gap-1.5 ${theme.primaryBg} w-max px-2.5 py-1 rounded-md font-medium border ${theme.primaryBorder} uppercase tracking-wide`}
                      >
                        <Wrench size={12} className={theme.primaryText} />{" "}
                        {log.serviceType || "Routine"}
                      </div>
                      {log.description && (
                        <div className="text-[10px] text-zinc-400 font-mono mt-1.5 line-clamp-2 pr-4">
                          {log.description}
                        </div>
                      )}
                    </td>
                    <td className="p-5 px-6 align-top text-right">
                      <p className="text-lg font-black text-white font-mono drop-shadow-sm mb-2">
                        ₹{(Number(log.cost) || 0).toLocaleString("en-IN")}
                      </p>
                    </td>
                    <td className="p-5 px-6 text-right align-top">
                      <div className="flex justify-end gap-2 items-center relative mt-1">
                        <button
                          onClick={() =>
                            navigate(
                              `${isTransport ? "/transportation/maintenance" : "/enterprise/maintenance"}`,
                              {
                                state: { editLog: log },
                              },
                            )
                          }
                          className={`p-2 text-zinc-500 hover:${theme.primaryText} hover:bg-zinc-800/50 rounded-lg transition-colors`}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() =>
                            isManager
                              ? handleDisabledClick(log._id)
                              : setDeleteModal({ isOpen: true, id: log._id })
                          }
                          className={`p-2 rounded-lg transition-colors ${isManager ? "text-zinc-600 opacity-50 cursor-not-allowed" : "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"}`}
                        >
                          <Trash2 size={16} />
                        </button>
                        {warningTooltip === log._id && (
                          <div className="absolute top-full right-0 mt-2 z-[9999] bg-[#09090B] border border-red-500/30 text-red-400 text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-2 w-max shadow-xl">
                            🚫 Access Denied
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="p-10 text-center text-zinc-500 italic"
                  >
                    No maintenance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Delete Record?"
        message="Are you sure you want to permanently delete this maintenance record?"
        confirmText="Delete"
        isDestructive={true}
      />

      {/* 🛑 SECURE WIPE DATA MODAL */}
      {isDeleteAllOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => !wiping && setIsDeleteAllOpen(false)}
          />
          <div className="bg-[#09090B] border border-red-900/50 shadow-[0_0_40px_rgba(220,38,38,0.15)] rounded-3xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col p-6 sm:p-8">
            <div className="flex items-center gap-3 text-red-500 mb-6">
              <AlertOctagon size={28} />
              <h2 className="text-xl font-bold tracking-wide">Wipe Database</h2>
            </div>
            <div className="bg-amber-500/10 border border-yellow-600/30 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  size={20}
                  className="text-yellow-500 shrink-0 mt-0.5"
                />
                <div>
                  <h3 className="text-yellow-500 font-bold text-sm mb-1">
                    Recommended: Safe Backup
                  </h3>
                  <p className="text-zinc-400 text-xs mb-4 leading-relaxed">
                    Before wiping the database, we highly recommend downloading
                    a complete CSV backup of all your current records.
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleFullBackup}
                    className="h-11 w-full sm:w-auto text-yellow-500 border-yellow-600/40 hover:bg-yellow-500/10"
                  >
                    <Download size={14} /> Download Full Database Backup
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-red-100/70 text-sm mb-4">
              This action will{" "}
              <strong className="text-red-500">PERMANENTLY DELETE ALL</strong>{" "}
              maintenance records. Please enter your Admin password to confirm.
            </p>
            <div className="relative mb-8">
              <input
                type={showPassword ? "text" : "password"}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter admin password..."
                className="w-full bg-[#09090B] border border-zinc-800 focus:border-red-500/50 rounded-xl px-4 py-3 text-zinc-200 outline-none transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="flex justify-end gap-3 items-center">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteAllOpen(false);
                  setDeletePassword("");
                }}
                disabled={wiping}
                className="h-11 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleWipeAll}
                disabled={wiping || !deletePassword}
                className="h-11"
              >
                {wiping ? (
                  <RefreshCcw size={16} className="animate-spin" />
                ) : null}
                {wiping ? "Wiping..." : "Confirm Wipe"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 HISTORY MODAL REFINED UI */}
      {historyModal.isOpen && historyModal.data && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() =>
              setHistoryModal({ isOpen: false, data: null, itemName: "" })
            }
          />
          <div
            className={`bg-[#09090B] border ${theme.primaryBorder} rounded-3xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200`}
          >
            <div
              className={`flex items-center justify-between p-5 border-b ${theme.primaryBorder} ${theme.primaryBg} shrink-0`}
            >
              <div className="flex items-center gap-2 text-white font-bold tracking-wide text-sm">
                <History size={16} className={theme.primaryText} />
                Log History:{" "}
                <span className={`${theme.primaryText} font-normal`}>
                  {historyModal.itemName}
                </span>
              </div>
              <button
                onClick={() =>
                  setHistoryModal({ isOpen: false, data: null, itemName: "" })
                }
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-3">
              {historyModal.data.map((log, index) => (
                <div
                  key={index}
                  className={`bg-[#09090B] border ${index === 0 ? theme.primaryBorder : "border-zinc-800"} rounded-xl p-4 flex items-center justify-between relative overflow-hidden`}
                >
                  {index === 0 && (
                    <div
                      className={`absolute left-0 top-0 w-1 h-full ${theme.primaryBg}`}
                    ></div>
                  )}
                  <div className="flex items-center gap-4 pl-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${index === 0 ? `${theme.primaryBg} ${theme.primaryText}` : "bg-zinc-800 text-zinc-500"}`}
                    >
                      {(log.role || "A")[0].toUpperCase()}
                    </div>
                    <div>
                      <h4
                        className={`font-bold tracking-widest uppercase text-sm ${index === 0 ? "text-white" : "text-zinc-500"}`}
                      >
                        {log.role || "ADMIN"}
                      </h4>
                      <p className="text-zinc-500 text-[10px] mt-0.5 font-mono">
                        {log.by || "admin@system.com"}
                      </p>
                      <p
                        className={`text-[10px] font-mono mt-1 ${index === 0 ? theme.primaryText : "text-zinc-600"}`}
                      >
                        {new Date(log.at).toLocaleString("en-GB", {
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
                  {index === 0 && (
                    <div
                      className={`${theme.primaryBg} ${theme.primaryBorder} ${theme.primaryText} text-[10px] font-bold px-3 py-1 rounded-lg tracking-widest uppercase border`}
                    >
                      LATEST
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceReport;
