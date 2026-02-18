import React, { useState, useEffect } from "react";
import productionService from "../../services/productionService";
import { useUI } from "../../context/UIProvider";
import {
  Factory,
  Download,
  Calendar,
  Filter,
  Search,
  BarChart,
  Users,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { Link } from "react-router-dom";

const ProductionReport = () => {
  const { toast } = useUI();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // ✅ REMOVED ARTIFICIAL TIMEOUT DELAY
        const { data } = await productionService.getAllProduction();
        setLogs(data);
      } catch (error) {
        console.error("Fetch Error:", error);
        toast.error("Failed to load production data");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const handleExport = () => {
    try {
      if (logs.length === 0)
        return toast.info("No production records to export");

      const headers = ["Date,Product Name,Quantity Produced,Supervisor"];

      const rows = logs.map((log) => {
        let dateStr = "-";
        if (log.date) {
          const d = new Date(log.date);
          dateStr = `\t${d.toLocaleDateString("en-GB")}`;
        }

        const product = `"${log.productName || "Standard Brick"}"`;
        const quantity = log.quantity || 0;
        const supervisor = `"${log.supervisor || "-"}"`;

        return `${dateStr},${product},${quantity},${supervisor}`;
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Production_Report_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Production report exported successfully");
    } catch (error) {
      console.error("Export Error:", error);
      toast.error("Failed to export report");
    }
  };

  const totalProduction = logs.reduce(
    (acc, log) => acc + (log.quantity || 0),
    0,
  );
  const totalBatches = logs.length;
  const uniqueSupervisors = new Set(
    logs.map((l) => l.supervisor).filter(Boolean),
  ).size;

  const filteredLogs = logs.filter(
    (log) =>
      (log.productName &&
        log.productName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.supervisor &&
        log.supervisor.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  if (loading) return <Loader />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Production Report
          </h1>
          <p className="text-emerald-100/40 text-sm mt-1">
            Daily manufacturing output logs
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="gap-2 text-xs border-emerald-900/30"
          >
            <Filter size={16} /> Filter
          </Button>
          <Button
            variant="outline"
            className="gap-2 text-xs border-emerald-900/30 hover:bg-emerald-900/10"
            onClick={handleExport}
          >
            <Download size={16} /> Export CSV
          </Button>
          <Link to="/enterprise/production">
            <Button
              variant="primary"
              className="text-xs shadow-lg shadow-emerald-500/20"
            >
              + Log Production
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#050a08] to-[#020403] border border-emerald-900/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Factory size={80} className="text-blue-500" />
          </div>
          <p className="text-blue-100/50 text-xs font-bold uppercase tracking-widest mb-2">
            Total Output
          </p>
          <h3 className="text-3xl font-bold text-blue-400">
            {totalProduction.toLocaleString()}{" "}
            <span className="text-sm text-blue-100/40">Units</span>
          </h3>
        </div>

        <div className="p-6 rounded-2xl bg-[#050a08] border border-emerald-900/30">
          <div className="flex items-center gap-3 mb-2 text-emerald-400">
            <BarChart size={20} />
            <span className="font-bold">Total Batches</span>
          </div>
          <h3 className="text-2xl font-bold text-white">{totalBatches}</h3>
          <p className="text-xs text-emerald-100/40 mt-1">Logs recorded</p>
        </div>

        <div className="p-6 rounded-2xl bg-[#050a08] border border-emerald-900/30">
          <div className="flex items-center gap-3 mb-2 text-purple-400">
            <Users size={20} />
            <span className="font-bold">Active Supervisors</span>
          </div>
          <h3 className="text-2xl font-bold text-white">{uniqueSupervisors}</h3>
          <p className="text-xs text-purple-100/40 mt-1">Managing production</p>
        </div>
      </div>

      <div className="bg-[#050a08] rounded-2xl border border-emerald-900/30 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-emerald-900/20 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Production History</h2>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/30"
            />
            <input
              type="text"
              placeholder="Search product or supervisor..."
              className="bg-[#020403] border border-emerald-900/30 rounded-lg pl-9 pr-3 py-1.5 text-xs text-emerald-100 focus:border-emerald-500/50 outline-none w-56 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#020403] text-emerald-100/40 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-4 md:pl-6">Date</th>
                <th className="p-4">Product Name</th>
                <th className="p-4 text-right">Output Qty</th>
                <th className="p-4 text-right md:pr-6">Supervisor / Kiln</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/20 text-sm">
              {filteredLogs.map((log) => (
                <tr
                  key={log._id}
                  className="hover:bg-emerald-900/10 transition-colors"
                >
                  <td className="p-4 md:pl-6 text-emerald-100/70 font-mono text-xs">
                    {new Date(log.date).toLocaleDateString("en-GB")}
                  </td>
                  <td className="p-4 font-medium text-white">
                    {log.productName || "Standard Brick"}
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-emerald-400">
                    {log.quantity?.toLocaleString()} pcs
                  </td>
                  <td className="p-4 text-right text-emerald-100/60 md:pr-6">
                    {log.supervisor || "-"}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="p-8 text-center text-emerald-100/30"
                  >
                    No production logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductionReport;
