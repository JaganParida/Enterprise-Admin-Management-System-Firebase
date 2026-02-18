import React, { useEffect, useState, Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import dashboardService from "../../services/dashboardService";
import { useUI } from "../../context/UIProvider";
import {
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  Activity,
  DollarSign,
  Download,
  Plus,
  Factory,
  Wallet,
  FileText,
  ChevronRight,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";

// ✅ LAZY LOAD HEAVY CHART COMPONENTS
const BarChart = lazy(() => import("../../components/charts/BarChart"));
// const LineChart = lazy(() => import("../../components/charts/LineChart")); // Uncomment if used later

// ✅ SKELETON LOADER FOR CHARTS (Prevents layout shift/glitch)
const ChartSkeleton = () => (
  <div className="w-full h-full bg-emerald-900/10 animate-pulse rounded-xl"></div>
);

const Dashboard = () => {
  const { toast } = useUI();
  const [loading, setLoading] = useState(true);
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  // Default State Structure
  const [data, setData] = useState({
    cards: {
      balance: 0,
      revenue: 0,
      activeEmployees: 0,
      stockValue: 0,
      lowStock: 0,
      pendingInvoices: 0,
    },
    charts: {
      production: [],
      finance: [],
    },
    recentActivity: [],
  });

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // ✅ REMOVED ARTIFICIAL TIMEOUT DELAY FOR INSTANT LOADING
        const response = await dashboardService.getStats();
        setData(response.data);
      } catch (error) {
        console.error("Dashboard Load Error:", error);
        toast.error("Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  // Export to Excel/CSV Function
  const handleExport = () => {
    try {
      const headers = ["Section,Metric,Value,Date/Note"];
      const rows = [];

      rows.push(`OVERVIEW,Current Cash Balance,${data.cards.balance},`);
      rows.push(`OVERVIEW,Total Stock Value,${data.cards.stockValue},`);
      rows.push(`OVERVIEW,Paid Revenue,${data.cards.revenue},`);
      rows.push(`OVERVIEW,Active Employees,${data.cards.activeEmployees},`);
      rows.push(`OVERVIEW,Low Stock Items,${data.cards.lowStock},Alert`);
      rows.push(
        `OVERVIEW,Pending Invoices,${data.cards.pendingInvoices},Action Needed`,
      );

      data.charts.production.forEach((item) => {
        rows.push(`PRODUCTION,Daily Output,${item.quantity},${item.date}`);
      });

      const income =
        data.charts.finance.find((f) => f.name === "Income")?.value || 0;
      const expense =
        data.charts.finance.find((f) => f.name === "Expense")?.value || 0;
      rows.push(`FINANCE,Total Income,${income},`);
      rows.push(`FINANCE,Total Expense,${expense},`);
      rows.push(`FINANCE,Net Profit,${income - expense},`);

      const csvContent = [headers, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Enterprise_Report_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Dashboard report exported to Excel");
    } catch (error) {
      console.error("Export Error", error);
      toast.error("Failed to export data");
    }
  };

  // Format Chart Data
  const productionChartData = {
    labels: data.charts.production.map((d) => d.date),
    datasets: [
      {
        label: "Units Produced",
        data: data.charts.production.map((d) => d.quantity),
        backgroundColor: "#10b981",
        borderRadius: 4,
      },
    ],
  };

  const financeChartData = {
    labels: ["Income", "Expense"],
    datasets: [
      {
        label: "Financials (₹)",
        data: [
          data.charts.finance.find((f) => f.name === "Income")?.value || 0,
          data.charts.finance.find((f) => f.name === "Expense")?.value || 0,
        ],
        backgroundColor: ["#10b981", "#ef4444"],
        borderRadius: 4,
      },
    ],
  };

  if (loading) return <Loader text="Initializing Command Center..." />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-20">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Factory className="text-emerald-500" size={32} /> Enterprise Hub
          </h1>
          <p className="text-emerald-100/40 mt-1 text-sm">
            Real-time factory production & financial command center.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 relative">
          <Button
            variant="outline"
            className="text-xs h-10 gap-2 border-emerald-900/30 hover:bg-emerald-900/10"
            onClick={handleExport}
          >
            <Download size={16} /> Export Report
          </Button>

          <div className="relative">
            <Button
              variant="primary"
              className="text-xs h-10 gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
              onClick={() => setShowQuickMenu(!showQuickMenu)}
            >
              <Plus size={16} /> Quick Action
            </Button>

            {/* Quick Menu Dropdown */}
            {showQuickMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowQuickMenu(false)}
                ></div>
                <div className="absolute right-0 mt-3 w-64 bg-[#050a08]/95 backdrop-blur-xl border border-emerald-500/20 rounded-2xl shadow-2xl p-2 z-20 animate-in fade-in zoom-in-95 duration-200 origin-top-right ring-1 ring-black/50">
                  <div className="px-3 py-2 border-b border-white/5 mb-1">
                    <p className="text-[10px] uppercase font-bold text-emerald-100/30 tracking-[0.2em]">
                      Create New Entry
                    </p>
                  </div>

                  <div className="space-y-1 p-1">
                    <Link
                      to="/enterprise/stock/add"
                      className="quick-link-item group flex items-center p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 group-hover:text-amber-300 transition-colors mr-3">
                        <Package size={16} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-emerald-50">
                        Stock Item
                      </span>
                      <ChevronRight
                        size={14}
                        className="opacity-0 group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0 transition-all text-emerald-50"
                      />
                    </Link>

                    <Link
                      to="/enterprise/production"
                      className="quick-link-item group flex items-center p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-colors mr-3">
                        <Factory size={16} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-emerald-50">
                        Production Log
                      </span>
                      <ChevronRight
                        size={14}
                        className="opacity-0 group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0 transition-all text-emerald-50"
                      />
                    </Link>

                    <Link
                      to="/enterprise/cash/add"
                      className="quick-link-item group flex items-center p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 transition-colors mr-3">
                        <Wallet size={16} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-emerald-50">
                        Cash Transaction
                      </span>
                      <ChevronRight
                        size={14}
                        className="opacity-0 group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0 transition-all text-emerald-50"
                      />
                    </Link>

                    <Link
                      to="/enterprise/invoices/create"
                      className="quick-link-item group flex items-center p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 group-hover:text-purple-300 transition-colors mr-3">
                        <FileText size={16} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-emerald-50">
                        New Invoice
                      </span>
                      <ChevronRight
                        size={14}
                        className="opacity-0 group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0 transition-all text-emerald-50"
                      />
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Cash Balance"
          value={`₹ ${data.cards.balance.toLocaleString()}`}
          icon={Wallet}
          color="emerald"
          trend="Available Funds"
          trendUp={data.cards.balance > 0}
        />
        <StatCard
          title="Stock Value"
          value={`₹ ${data.cards.stockValue.toLocaleString()}`}
          icon={Package}
          color="blue"
          trend={`${data.cards.lowStock} Low Stock Items`}
          trendUp={data.cards.lowStock === 0}
        />
        <StatCard
          title="Paid Revenue"
          value={`₹ ${data.cards.revenue.toLocaleString()}`}
          icon={DollarSign}
          color="purple"
          trend={`${data.cards.pendingInvoices} Pending Invoices`}
          trendUp={true}
        />
        <StatCard
          title="Workforce"
          value={data.cards.activeEmployees}
          icon={Users}
          color="amber"
          trend="Active Personnel"
          trendUp={true}
        />
      </div>

      {/* --- RESTRUCTURED ANALYTICS SECTION --- */}
      <div className="space-y-6">
        {/* ROW 1: Charts Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[400px]">
          {/* LEFT COLUMN: Production Chart */}
          <div className="lg:col-span-2 p-6 md:p-8 rounded-[32px] bg-[#050a08] border border-emerald-900/30 shadow-lg relative flex flex-col h-[350px] lg:h-full w-full overflow-hidden">
            <div className="flex justify-between items-center mb-6 shrink-0 relative z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity size={20} className="text-emerald-500" /> Production
                Trend
              </h3>
              <span className="text-xs text-emerald-100/40 font-mono bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-900/30">
                Last 7 Days
              </span>
            </div>

            {/* Strict CSS wrapper to force chart to fill 100% of the flex space */}
            <div className="relative flex-1 w-full min-h-0">
              <div className="absolute inset-0 [&>div]:!h-full [&>div]:!w-full [&>div]:!bg-transparent [&>div]:!border-none [&>div]:!shadow-none [&>div]:!p-0 [&>div]:!rounded-none [&>div]:!m-0">
                {data.charts.production.length > 0 ? (
                  /* ✅ ADDED SUSPENSE FOR LAZY LOADING */
                  <Suspense fallback={<ChartSkeleton />}>
                    <BarChart data={productionChartData} />
                  </Suspense>
                ) : (
                  <div className="flex h-full items-center justify-center text-emerald-100/30 text-sm">
                    No production data yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Finance Mini Chart */}
          <div className="lg:col-span-1 p-6 md:p-8 rounded-[32px] bg-[#050a08] border border-emerald-900/30 shadow-lg relative flex flex-col h-[350px] lg:h-full w-full overflow-hidden">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 shrink-0 relative z-10">
              <TrendingUp size={20} className="text-emerald-500" /> Cash Flow
            </h3>

            {/* Strict CSS wrapper to force chart to fill 100% of the flex space */}
            <div className="relative flex-1 w-full min-h-0">
              <div className="absolute inset-0 [&>div]:!h-full [&>div]:!w-full [&>div]:!bg-transparent [&>div]:!border-none [&>div]:!shadow-none [&>div]:!p-0 [&>div]:!rounded-none [&>div]:!m-0">
                {/* ✅ ADDED SUSPENSE FOR LAZY LOADING */}
                <Suspense fallback={<ChartSkeleton />}>
                  <BarChart data={financeChartData} />
                </Suspense>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: System Status Full Width Banner */}
        <div className="w-full p-6 md:p-8 rounded-[32px] bg-[#050a08] border border-emerald-900/30 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden group">
          {/* Background Glow */}
          <div className="absolute -left-10 -top-10 w-40 h-40 bg-amber-500/5 blur-[80px] rounded-full group-hover:bg-amber-500/10 transition-colors duration-700 pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shadow-lg">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                System Health: Inventory
              </h3>
              <p className="text-sm text-emerald-100/40">
                Real-time critical items check
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full md:w-auto justify-between md:justify-end relative z-10 border-t md:border-t-0 md:border-l border-emerald-900/30 pt-4 md:pt-0 md:pl-8">
            <div className="flex flex-col items-start md:items-end">
              <span className="text-[10px] uppercase tracking-widest text-emerald-100/40 font-bold mb-1">
                Stock Status
              </span>
              <span
                className={`text-2xl font-black ${data.cards.lowStock > 0 ? "text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]" : "text-emerald-500"}`}
              >
                {data.cards.lowStock > 0
                  ? `${data.cards.lowStock} Items Low`
                  : "Optimal"}
              </span>
            </div>
            <Link to="/enterprise/stock" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-8 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-bold uppercase transition-all shadow-lg hover:shadow-emerald-900/20 whitespace-nowrap">
                Manage Inventory
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-Component: Reusable Stat Card
const StatCard = ({ title, value, icon: Icon, color, trend, trendUp }) => {
  const colors = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    red: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };
  const theme = colors[color] || colors.emerald;
  const glowColor =
    color === "red"
      ? "rose"
      : color === "amber"
        ? "amber"
        : color === "blue"
          ? "blue"
          : "emerald";

  return (
    <div className="bg-[#050a08] border border-emerald-900/30 p-6 rounded-[32px] hover:border-emerald-500/30 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden">
      <div
        className={`absolute -right-10 -top-10 w-32 h-32 bg-${glowColor}-500/5 blur-3xl rounded-full group-hover:bg-${glowColor}-500/10 transition-all duration-500`}
      ></div>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-3.5 rounded-2xl border shadow-lg ${theme}`}>
          <Icon size={24} />
        </div>
        <span
          className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border ${trendUp ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}
        >
          {trend}
        </span>
      </div>
      <div className="relative z-10 mt-6">
        <p className="text-emerald-100/40 text-xs font-bold uppercase tracking-wider mb-1">
          {title}
        </p>
        <h3 className="text-3xl font-bold text-white tracking-tight">
          {value}
        </h3>
      </div>
    </div>
  );
};

export default Dashboard;
