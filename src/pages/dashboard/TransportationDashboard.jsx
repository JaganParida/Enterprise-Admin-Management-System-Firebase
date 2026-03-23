import React, { useEffect, useState, useMemo, Suspense, lazy } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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

// LAZY LOAD HEAVY CHART COMPONENTS
const BarChart = lazy(() => import("../../components/charts/BarChart"));

// SKELETON LOADER FOR CHARTS
const ChartSkeleton = () => (
  <div className="w-full h-full bg-blue-900/10 animate-pulse rounded-xl border border-blue-900/20"></div>
);

const TransportationDashboard = () => {
  const { toast } = useUI();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  // 🔥 THEME HOOK
  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");
  const basePath = isTransport ? "/transportation" : "/enterprise";

  const theme = {
    primaryText: isTransport ? "text-cyan-400" : "text-indigo-400",
    primaryBg: isTransport ? "bg-cyan-500/10" : "bg-indigo-500/10",
    primaryBorder: isTransport ? "border-cyan-500/20" : "border-indigo-500/20",
    primaryHoverBorder: isTransport
      ? "hover:border-cyan-500/30"
      : "hover:border-indigo-500/30",
    glowOrb: isTransport ? "bg-cyan-500/5" : "bg-indigo-500/5",
    glowOrbHover: isTransport
      ? "group-hover:bg-cyan-500/10"
      : "group-hover:bg-indigo-500/10",
  };

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
  }, [toast]);

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
          const dateStr = `="${new Date(act.date || act.createdAt).toLocaleDateString("en-GB")}"`;
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
          backgroundColor: isTransport ? "#3b82f6" : "#6366f1",
          borderRadius: 6,
        },
        {
          label: "Total Maintenance (₹)",
          data: [data.cards.totalMaintenanceCost],
          backgroundColor: isTransport ? "#0ea5e9" : "#a855f7",
          borderRadius: 6,
        },
      ],
    };
  }, [data, isTransport]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "rgba(161, 161, 170, 0.8)",
          font: { family: "monospace", size: 11 },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(39, 39, 42, 0.3)" },
        ticks: {
          color: "rgba(161, 161, 170, 0.6)",
          font: { family: "monospace", size: 10 },
        },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: "rgba(161, 161, 170, 0.6)",
          font: { family: "monospace", size: 11 },
        },
        border: { display: false },
      },
    },
  };

  if (loading) return <Loader text="Initializing Fleet Command..." />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-20">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${theme.primaryBg} ${theme.primaryBorder}`}
            >
              <Truck className={theme.primaryText} size={28} />
            </div>
            Fleet Command
          </h1>
          <p className="text-zinc-400 mt-2 text-sm font-medium">
            Centralized logistics, fuel, and maintenance overview.
          </p>
        </div>

        <div className="flex gap-3 relative">
          <Button
            variant="outline"
            className="text-xs h-11 px-5 gap-2 rounded-xl border-zinc-800 text-zinc-300 hover:bg-zinc-800/50 hover:text-white transition-colors"
            onClick={handleExport}
          >
            <Download size={16} /> Export Report
          </Button>

          <div className="relative">
            <Button
              variant="primary"
              className="text-xs h-11 px-5 gap-2 rounded-xl shadow-lg active:scale-95 transition-all"
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
                <div className="absolute right-0 mt-3 w-64 bg-[#09090B]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 z-20 animate-in fade-in zoom-in-95 duration-200 origin-top-right ring-1 ring-white/5">
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-[0.2em]">
                      Add Record
                    </p>
                  </div>
                  <div className="space-y-1 p-1">
                    <Link
                      to={`${basePath}/logs`}
                      className="quick-link-item group flex items-center p-2 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors mr-3">
                        <Truck size={16} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-zinc-200">
                        Log Trip
                      </span>
                      <ChevronRight
                        size={14}
                        className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-white"
                      />
                    </Link>
                    <Link
                      to={`${basePath}/fuel`}
                      className="quick-link-item group flex items-center p-2 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors mr-3">
                        <Droplet size={16} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-zinc-200">
                        Log Fuel
                      </span>
                      <ChevronRight
                        size={14}
                        className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-white"
                      />
                    </Link>
                    <Link
                      to={`${basePath}/maintenance`}
                      className="quick-link-item group flex items-center p-2 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 transition-colors mr-3">
                        <Wrench size={16} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-zinc-200">
                        Log Maintenance
                      </span>
                      <ChevronRight
                        size={14}
                        className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-white"
                      />
                    </Link>
                    <Link
                      to={`${basePath}/jcb`}
                      className="quick-link-item group flex items-center p-2 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20 transition-colors mr-3">
                        <Timer size={16} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-zinc-200">
                        Log JCB Work
                      </span>
                      <ChevronRight
                        size={14}
                        className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-white"
                      />
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Distance"
          value={`${data.cards.totalDistance.toLocaleString()} KM`}
          icon={Gauge}
          color="blue"
          isTransport={isTransport}
          linkTo={`${basePath}/logs/report`}
        />
        <StatCard
          title="Total Trips"
          value={data.cards.totalTrips}
          icon={Truck}
          color="sky"
          isTransport={isTransport}
          linkTo={`${basePath}/logs/report`}
        />
        <StatCard
          title="Fuel Expense"
          value={`₹ ${data.cards.totalFuelCost.toLocaleString()}`}
          icon={Droplet}
          color="cyan"
          isTransport={isTransport}
          linkTo={`${basePath}/fuel/report`}
        />
        <StatCard
          title="Repair Expense"
          value={`₹ ${data.cards.totalMaintenanceCost.toLocaleString()}`}
          icon={Wrench}
          color="indigo"
          isTransport={isTransport}
          linkTo={`${basePath}/maintenance/report`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:auto-rows-fr h-auto">
        <div
          className={`lg:col-span-2 p-6 md:p-8 rounded-2xl bg-white/[0.02] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col h-full min-h-[400px] group ${theme.primaryHoverBorder} transition-all duration-500 backdrop-blur-md`}
        >
          <div
            className={`absolute -left-10 -top-10 w-40 h-40 blur-[80px] rounded-full transition-colors duration-700 pointer-events-none ${theme.glowOrb} ${theme.glowOrbHover}`}
          />

          <div className="flex justify-between items-center mb-6 shrink-0 relative z-10">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <div
                className={`p-2 rounded-lg border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
              >
                <Activity size={18} />
              </div>
              Expense Overview
            </h3>
          </div>

          <div className="relative flex-1 min-h-[300px] w-full z-10">
            <div className="absolute inset-0">
              <Suspense fallback={<ChartSkeleton />}>
                <BarChart data={expenseChartData} options={chartOptions} />
              </Suspense>
            </div>
          </div>
        </div>

        <div
          className={`p-6 md:p-8 rounded-2xl bg-white/[0.02] border border-white/5 shadow-2xl flex flex-col w-full h-full min-h-[400px] overflow-hidden ${theme.primaryHoverBorder} transition-all duration-500 backdrop-blur-md hover:border-white/10`}
        >
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3 shrink-0">
            <div
              className={`p-2 rounded-lg border ${theme.primaryBg} ${theme.primaryText} ${theme.primaryBorder}`}
            >
              <Activity size={18} />
            </div>
            Recent Fleet Activity
            <span className="text-xs font-normal text-zinc-500 ml-auto">
              Top 10
            </span>
          </h3>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {data.recentActivity.length > 0 ? (
              data.recentActivity.map((activity, index) => (
                <ActivityItem
                  key={index}
                  data={activity}
                  isTransport={isTransport}
                  basePath={basePath}
                  navigate={navigate}
                />
              ))
            ) : (
              <p className="text-center text-zinc-500 text-sm py-10 italic">
                No recent activity found.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 🚀 ENHANCED: StatCard with click navigation
const StatCard = ({ title, value, icon: Icon, color, isTransport, linkTo }) => {
  const navigate = useNavigate();
  const colors = isTransport
    ? {
        blue: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
        sky: "text-sky-400 bg-sky-500/10 border-sky-500/20",
        cyan: "text-teal-400 bg-teal-500/10 border-teal-500/20",
        indigo: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      }
    : {
        blue: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
        sky: "text-violet-400 bg-violet-500/10 border-violet-500/20",
        cyan: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        indigo: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      };
  const theme = colors[color] || colors.blue;
  const hoverShadow = isTransport
    ? "hover:shadow-[0_8px_24px_-6px_rgba(6,182,212,0.15)]"
    : "hover:shadow-[0_8px_24px_-6px_rgba(99,102,241,0.15)]";
  const hoverBorder = isTransport
    ? "hover:border-cyan-500/40"
    : "hover:border-indigo-500/40";

  return (
    <div
      onClick={() => linkTo && navigate(linkTo)}
      className={`bg-white/[0.02] backdrop-blur-md border border-white/5 p-6 rounded-2xl ${hoverBorder} transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden shadow-2xl shadow-black/20 hover:bg-white/[0.04] ${hoverShadow} ${linkTo ? "cursor-pointer" : ""}`}
    >
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-3.5 rounded-xl border ${theme}`}>
          <Icon size={22} />
        </div>
      </div>
      <div className="relative z-10 mt-6">
        <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">
          {title}
        </p>
        <h3 className="text-3xl font-bold text-white tracking-tight">
          {value}
        </h3>
      </div>
    </div>
  );
};

const ActivityItem = ({ data, isTransport, basePath, navigate }) => {
  let Icon = Truck;
  let colorTheme = isTransport
    ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
    : "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
  let title = `Trip: ${data.vehicleNo}`;
  let desc = `${data.loadingPoint || ""} to ${data.unloadingSite || ""}`;
  let amount = data.totalAmount ? `₹${data.totalAmount}` : null;
  let linkUrl = "";

  if (data.activityType === "Trip") {
    linkUrl = `${basePath}/logs/report?highlight=${data._id}`;
  } else if (data.activityType === "Fuel") {
    Icon = Droplet;
    colorTheme = "text-sky-400 bg-sky-500/10 border-sky-500/20";
    title = `Refuel: ${data.vehicleNo}`;
    desc = `${data.liters} L at ${data.stationName || "Pump"}`;
    amount = `₹${data.totalCost}`;
    linkUrl = `${basePath}/fuel/report?highlight=${data._id}`;
  } else if (data.activityType === "Maintenance") {
    Icon = Wrench;
    colorTheme = "text-blue-400 bg-blue-500/10 border-blue-500/20";
    title = `Repair: ${data.vehicleNo}`;
    desc = data.serviceType;
    amount = `₹${data.cost}`;
    linkUrl = `${basePath}/maintenance/report?highlight=${data._id}`;
  } else if (data.activityType === "JCB") {
    Icon = Timer;
    colorTheme = "text-amber-400 bg-amber-500/10 border-amber-500/20";
    title = `JCB: ${data.vehicleNo}`;
    desc = `${data.totalHours}h ${data.totalMinutes}m • ${data.location}`;
    amount = null;
    linkUrl = `${basePath}/jcb/report?highlight=${data._id}`;
  }

  return (
    <div
      onClick={() => navigate(linkUrl)}
      className="flex items-start gap-4 p-3 rounded-xl transition-all border border-transparent cursor-pointer hover:bg-white/[0.04] hover:border-white/10 active:scale-[0.98]"
    >
      <div
        className={`p-2 rounded-lg border shrink-0 transition-colors ${colorTheme}`}
      >
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <p className="text-sm font-bold text-zinc-100 truncate group-hover:text-white transition-colors">
            {title}
          </p>
          {amount && (
            <p
              className={`text-xs font-bold font-mono ml-2 transition-colors ${isTransport ? "text-cyan-400" : "text-indigo-400"}`}
            >
              {amount}
            </p>
          )}
        </div>
        <p className="text-xs text-zinc-400 truncate mt-0.5 group-hover:text-zinc-300 transition-colors">
          {desc}
        </p>
        <p className="text-[10px] text-zinc-500 mt-1.5 font-mono flex items-center gap-1">
          <Calendar size={10} />
          {new Date(data.date || data.createdAt).toLocaleDateString("en-GB")}
        </p>
      </div>
    </div>
  );
};

export default TransportationDashboard;
