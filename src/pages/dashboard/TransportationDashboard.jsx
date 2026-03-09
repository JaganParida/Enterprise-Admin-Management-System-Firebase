import React, { useEffect, useState, useMemo, Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import transportDashboardService from "../../services/transportDashboardService";
import { useUI } from "../../context/UIProvider";
import {
  Truck,
  Droplet,
  Wrench,
  Gauge,
  Activity,
  Plus,
  Download,
  Calendar,
  ChevronRight,
  Timer,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";

// ✅ LAZY LOAD HEAVY CHART COMPONENTS
const BarChart = lazy(() => import("../../components/charts/BarChart"));

// ✅ SKELETON LOADER FOR CHARTS
const ChartSkeleton = () => (
  <div className="w-full h-full bg-blue-900/10 animate-pulse rounded-xl"></div>
);

const TransportationDashboard = () => {
  const { toast } = useUI();
  const [loading, setLoading] = useState(true);
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  const [data, setData] = useState({
    cards: {
      totalDistance: 0,
      totalTrips: 0,
      totalFuelCost: 0,
      totalMaintenanceCost: 0,
    },
    chartData: { fuels: [], maintenances: [] },
    recentActivity: [],
  });

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await transportDashboardService.getStats();
        setData(response.data);
      } catch (error) {
        toast.error("Failed to load transport metrics.");
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const handleExport = () => {
    try {
      if (!data) return toast.info("No data to export");

      const today = new Date().toLocaleDateString("en-GB");
      let csvContent = "\uFEFF";

      csvContent += `FLEET COMMAND SUMMARY REPORT\nGenerated On:,="${today}"\n\n`;
      csvContent += `METRICS OVERVIEW\n`;
      csvContent += `Total Distance (KM),Total Trips,Total Fuel Expense (Rs),Total Repair Expense (Rs)\n`;
      csvContent += `${data.cards.totalDistance},${data.cards.totalTrips},${data.cards.totalFuelCost},${data.cards.totalMaintenanceCost}\n\n`;

      csvContent += `RECENT FLEET ACTIVITY\n`;
      csvContent += `Date,Activity Type,Vehicle No,Details,Amount/Cost (Rs)\n`;

      if (data.recentActivity && data.recentActivity.length > 0) {
        const rows = data.recentActivity.map((act) => {
          const dateStr = `="${new Date(act.date).toLocaleDateString("en-GB")}"`;
          const type = act.activityType || "Unknown";
          const vehicle = act.vehicleNo || "-";
          let details = "";
          let amount = "-";

          if (type === "Trip") {
            details = `"${act.loadingPoint} to ${act.unloadingSite}"`;
            amount = act.totalAmount || "-";
          } else if (type === "Fuel") {
            details = `"${act.liters} L"`;
            amount = act.totalCost;
          } else if (type === "Maintenance") {
            details = `"${act.serviceType}"`;
            amount = act.cost;
          } else if (type === "JCB") {
            details = `"${act.totalHours}h ${act.totalMinutes}m • ${act.location}"`;
            amount = "-";
          }

          return `${dateStr},${type},${vehicle},${details},${amount}`;
        });
        csvContent += rows.join("\n");
      } else {
        csvContent += "No recent activity found.\n";
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Fleet_Report_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Dashboard report exported successfully!");
    } catch (error) {
      toast.error("Failed to export report.");
    }
  };

  const expenseChartData = useMemo(() => {
    return {
      labels: ["Expenses Overview"],
      datasets: [
        {
          label: "Total Fuel Cost (₹)",
          data: [data.cards.totalFuelCost],
          backgroundColor: "#06b6d4",
          borderRadius: 6,
        },
        {
          label: "Total Maintenance (₹)",
          data: [data.cards.totalMaintenanceCost],
          backgroundColor: "#f59e0b",
          borderRadius: 6,
        },
      ],
    };
  }, [data]);

  // 🚀 ADDED CHART OPTIONS TO FORCE FILL CONTAINER & MATCH DARK THEME
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // This is crucial for filling the div
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "rgba(255, 255, 255, 0.7)",
          font: { family: "monospace", size: 11 },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(59, 130, 246, 0.1)", // Subtle blue grid lines
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.5)",
          font: { family: "monospace", size: 10 },
        },
        border: { display: false },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.5)",
          font: { family: "monospace", size: 11 },
        },
        border: { display: false },
      },
    },
  };

  if (loading) return <Loader text="Initializing Fleet Command..." />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 h-full flex flex-col">
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-20">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Truck className="text-blue-500" size={32} /> Fleet Command
          </h1>
          <p className="text-blue-100/40 mt-1 text-sm">
            Centralized logistics, fuel, and maintenance overview.
          </p>
        </div>

        <div className="flex gap-3 relative">
          <Button
            variant="outline"
            className="text-xs h-10 gap-2 border-blue-900/30 hover:bg-blue-900/10 text-blue-400"
            onClick={handleExport}
          >
            <Download size={16} /> Export Report
          </Button>

          <div className="relative">
            <Button
              variant="primary"
              className="text-xs h-10 gap-2 shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-500 border-none"
              onClick={() => setShowQuickMenu(!showQuickMenu)}
            >
              <Plus size={16} /> Quick Action
            </Button>

            {showQuickMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowQuickMenu(false)}
                ></div>
                <div className="absolute right-0 mt-3 w-64 bg-[#030816]/95 backdrop-blur-xl border border-blue-900/40 rounded-2xl shadow-2xl p-2 z-20 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <div className="px-3 py-2 border-b border-blue-900/20 mb-1">
                    <p className="text-[10px] uppercase font-bold text-blue-100/30 tracking-[0.2em]">
                      Add Record
                    </p>
                  </div>
                  <div className="space-y-1 p-1">
                    <Link
                      to="/transportation/logs"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-100/70 hover:text-white hover:bg-blue-900/20 transition-all cursor-pointer text-sm font-medium group"
                    >
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                        <Truck size={16} />
                      </div>
                      <span className="flex-1">Log Trip</span>
                      <ChevronRight
                        size={14}
                        className="opacity-0 group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0 transition-all"
                      />
                    </Link>
                    <Link
                      to="/transportation/fuel"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-100/70 hover:text-white hover:bg-cyan-900/20 transition-all cursor-pointer text-sm font-medium group"
                    >
                      <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                        <Droplet size={16} />
                      </div>
                      <span className="flex-1">Log Fuel</span>
                      <ChevronRight
                        size={14}
                        className="opacity-0 group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0 transition-all"
                      />
                    </Link>
                    <Link
                      to="/transportation/maintenance"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-100/70 hover:text-white hover:bg-amber-900/20 transition-all cursor-pointer text-sm font-medium group"
                    >
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                        <Wrench size={16} />
                      </div>
                      <span className="flex-1">Log Maintenance</span>
                      <ChevronRight
                        size={14}
                        className="opacity-0 group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0 transition-all"
                      />
                    </Link>
                    <Link
                      to="/transportation/jcb"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-100/70 hover:text-white hover:bg-amber-900/20 transition-all cursor-pointer text-sm font-medium group"
                    >
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20 transition-colors">
                        <Timer size={16} />
                      </div>
                      <span className="flex-1">Log JCB Work</span>
                      <ChevronRight
                        size={14}
                        className="opacity-0 group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0 transition-all"
                      />
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* --- STATS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Distance"
          value={`${data.cards.totalDistance.toLocaleString()} KM`}
          icon={Gauge}
          color="indigo"
        />
        <StatCard
          title="Total Trips"
          value={data.cards.totalTrips}
          icon={Truck}
          color="blue"
        />
        <StatCard
          title="Fuel Expense"
          value={`₹ ${data.cards.totalFuelCost.toLocaleString()}`}
          icon={Droplet}
          color="cyan"
        />
        <StatCard
          title="Repair Expense"
          value={`₹ ${data.cards.totalMaintenanceCost.toLocaleString()}`}
          icon={Wrench}
          color="amber"
        />
      </div>

      {/* --- ANALYTICS & ACTIVITY SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:auto-rows-fr h-auto">
        {/* 🚀 CHART PANEL FIX: Removed flex-center, added absolute inset wrapper */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#030816] border border-blue-900/30 shadow-2xl relative overflow-hidden flex flex-col h-full min-h-[400px]">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity size={18} className="text-blue-500" /> Expense Overview
            </h3>
          </div>

          {/* Absolute Inset forces Chart.js to stretch completely to the edges of the parent container */}
          <div className="relative flex-1 min-h-[300px] w-full">
            <div className="absolute inset-0">
              <Suspense fallback={<ChartSkeleton />}>
                <BarChart data={expenseChartData} options={chartOptions} />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="p-6 rounded-3xl bg-[#030816] border border-blue-900/30 shadow-2xl flex flex-col w-full h-full min-h-[400px] overflow-hidden">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 shrink-0">
            <Activity size={18} className="text-blue-500" /> Recent Fleet
            Activity
            <span className="text-xs font-normal text-blue-100/40 ml-2">
              (Top 10)
            </span>
          </h3>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {data.recentActivity.length > 0 ? (
              data.recentActivity.map((activity, index) => (
                <ActivityItem key={index} data={activity} />
              ))
            ) : (
              <p className="text-center text-blue-200/30 text-sm py-10 italic">
                No recent activity found.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => {
  const themes = {
    blue: "text-blue-400 bg-blue-600/10 border-blue-400/10",
    indigo: "text-indigo-400 bg-indigo-600/10 border-indigo-400/10",
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };
  const theme = themes[color] || themes.blue;

  return (
    <div className="p-5 lg:p-6 bg-[#030816] border border-blue-900/30 rounded-2xl flex flex-col items-center text-center hover:bg-blue-900/10 transition-all group relative overflow-hidden">
      <div
        className={`absolute -right-5 -top-5 w-20 h-20 bg-${color}-500/5 blur-2xl rounded-full group-hover:bg-${color}-500/10 transition-all`}
      />
      <div
        className={`p-3 rounded-xl mb-3 transition-transform group-hover:scale-105 border ${theme}`}
      >
        <Icon size={20} />
      </div>
      <p className="text-[10px] text-blue-200/30 uppercase font-semibold tracking-wider mb-1">
        {title}
      </p>
      <h4 className="text-xl lg:text-2xl font-bold text-white">{value}</h4>
    </div>
  );
};

const ActivityItem = ({ data }) => {
  let Icon = Truck;
  let colorTheme = "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
  let title = `Trip: ${data.vehicleNo}`;
  let desc = `${data.loadingPoint || ""} to ${data.unloadingSite || ""}`;
  let amount = data.totalAmount ? `₹${data.totalAmount}` : null;

  if (data.activityType === "Fuel") {
    Icon = Droplet;
    colorTheme = "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
    title = `Refuel: ${data.vehicleNo}`;
    desc = `${data.liters} L at ${data.stationName || "Pump"}`;
    amount = `₹${data.totalCost}`;
  } else if (data.activityType === "Maintenance") {
    Icon = Wrench;
    colorTheme = "text-amber-400 bg-amber-500/10 border-amber-500/20";
    title = `Repair: ${data.vehicleNo}`;
    desc = data.serviceType;
    amount = `₹${data.cost}`;
  } else if (data.activityType === "JCB") {
    Icon = Timer;
    colorTheme = "text-amber-500 bg-amber-500/10 border-amber-500/30";
    title = `JCB: ${data.vehicleNo}`;
    desc = `${data.totalHours}h ${data.totalMinutes}m • ${data.location}`;
    amount = null;
  }

  return (
    <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-blue-900/20 transition-colors border border-transparent hover:border-blue-900/30">
      <div className={`p-2 rounded-xl border shrink-0 ${colorTheme}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <p className="text-sm font-bold text-white truncate">{title}</p>
          {amount && (
            <p className="text-xs font-bold text-emerald-400 font-mono ml-2">
              {amount}
            </p>
          )}
        </div>
        <p className="text-xs text-blue-200/50 truncate mt-0.5">{desc}</p>
        <p className="text-[10px] text-blue-200/30 mt-1 font-mono">
          <Calendar size={10} className="inline mr-1" />
          {new Date(data.date).toLocaleDateString("en-GB")}
        </p>
      </div>
    </div>
  );
};

export default TransportationDashboard;
