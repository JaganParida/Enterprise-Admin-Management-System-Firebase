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
  Zap,
  FileText,
  ChevronRight,
  ShoppingCart,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";

const BarChart = lazy(() => import("../../components/charts/BarChart"));
const LineChart = lazy(() => import("../../components/charts/LineChart"));

const ChartSkeleton = () => (
  <div className="w-full h-full bg-emerald-900/10 animate-pulse rounded-xl"></div>
);

const Dashboard = () => {
  const { toast } = useUI();
  const [loading, setLoading] = useState(true);
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  const [data, setData] = useState({
    cards: {
      balance: 0,
      revenue: 0,
      activeEmployees: 0,
      stockValue: 0,
      lowStock: 0,
      pendingInvoices: 0,
    },
    charts: { production: [], sales: [], electricity: [] },
    recentActivity: [],
  });

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await dashboardService.getStats();
        setData(response.data);
      } catch (error) {
        toast.error("Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const handleExport = () => {
    try {
      const headers = ["Section,Metric,Value,Date/Note"];
      const rows = [];

      rows.push(`OVERVIEW,Total Sales Revenue,${data.cards.balance},`);
      rows.push(`OVERVIEW,Total Stock Value,${data.cards.stockValue},`);
      rows.push(`OVERVIEW,Invoice Revenue,${data.cards.revenue},`);
      rows.push(`OVERVIEW,Active Employees,${data.cards.activeEmployees},`);
      rows.push(`OVERVIEW,Low Stock Items,${data.cards.lowStock},Alert`);
      rows.push(
        `OVERVIEW,Pending Invoices,${data.cards.pendingInvoices},Action Needed`,
      );

      data.charts.production.forEach((item) => {
        rows.push(`PRODUCTION,Daily Output,${item.quantity},${item.date}`);
      });

      data.charts.sales.forEach((item) => {
        rows.push(`SALES,Daily Sales,${item.amount},${item.date}`);
      });

      const paid =
        data.charts.electricity.find((f) => f.name === "Paid")?.value || 0;
      const pending =
        data.charts.electricity.find((f) => f.name === "Overdue")?.value || 0;
      rows.push(`ELECTRICITY,Paid Bills,${paid},`);
      rows.push(`ELECTRICITY,Pending/Overdue Bills,${pending},`);

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
      toast.error("Failed to export data");
    }
  };

  // --- 🚀 ENHANCED CHART FORMATTERS WITH PRODUCT NAMES ---
  const productionChartData = {
    labels: data.charts.production.map((d) => d.date),
    datasets: [
      {
        label: "Units Produced",
        data: data.charts.production.map((d) => d.quantity),
        productNames: data.charts.production.map((d) => d.productName), // 👈 Crucial for tooltips
        backgroundColor: "#10b981",
        borderRadius: 4,
      },
    ],
  };

  const electricChartData = {
    labels: ["Paid", "Overdue"],
    datasets: [
      {
        label: "Electricity (₹)",
        data: [
          data.charts.electricity.find((f) => f.name === "Paid")?.value || 0,
          data.charts.electricity.find((f) => f.name === "Overdue")?.value || 0,
        ],
        backgroundColor: ["#10b981", "#ef4444"], // Emerald vs Rose
        borderRadius: 4,
      },
    ],
  };

  const salesChartData = {
    labels: data.charts.sales.map((d) => d.date),
    datasets: [
      {
        label: "Sales Revenue",
        data: data.charts.sales.map((d) => d.amount),
        productNames: data.charts.sales.map((d) => d.productName), // 👈 Crucial for tooltips
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
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
                    {/* 🚀 RELEVANT QUICK ACTIONS */}
                    <Link
                      to="/enterprise/sales"
                      className="quick-link-item group flex items-center p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 transition-colors mr-3">
                        <ShoppingCart size={16} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-emerald-50">
                        Sales Entry
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

                    <Link
                      to="/electricity"
                      className="quick-link-item group flex items-center p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 group-hover:text-amber-300 transition-colors mr-3">
                        <Zap size={16} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-emerald-50">
                        Electric Bill
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
          title="Total Sales"
          value={`₹ ${data.cards.balance.toLocaleString()}`}
          icon={ShoppingCart}
          color="emerald"
          trend="Overall Dispatch"
          trendUp={true}
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
          title="Invoice Billed"
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

      {/* --- ANALYTICS SECTION --- */}
      <div className="space-y-6">
        {/* ROW 1: Charts Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[400px]">
          {/* PRODUCTION CHART */}
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
            <div className="relative flex-1 w-full min-h-0">
              <div className="absolute inset-0 [&>div]:!h-full [&>div]:!w-full [&>div]:!bg-transparent [&>div]:!border-none [&>div]:!shadow-none [&>div]:!p-0 [&>div]:!rounded-none [&>div]:!m-0">
                {data.charts.production.length > 0 ? (
                  <Suspense fallback={<ChartSkeleton />}>
                    <BarChart data={productionChartData} />
                  </Suspense>
                ) : (
                  <div className="flex h-full items-center justify-center text-emerald-100/30 text-sm">
                    No production data in last 7 days
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ELECTRICITY CHART */}
          <div className="lg:col-span-1 p-6 md:p-8 rounded-[32px] bg-[#050a08] border border-emerald-900/30 shadow-lg relative flex flex-col h-[350px] lg:h-full w-full overflow-hidden">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 shrink-0 relative z-10">
              <Zap size={20} className="text-emerald-500" /> Electric Bill
              Status
            </h3>
            <div className="relative flex-1 w-full min-h-0">
              <div className="absolute inset-0 [&>div]:!h-full [&>div]:!w-full [&>div]:!bg-transparent [&>div]:!border-none [&>div]:!shadow-none [&>div]:!p-0 [&>div]:!rounded-none [&>div]:!m-0">
                <Suspense fallback={<ChartSkeleton />}>
                  <BarChart data={electricChartData} />
                </Suspense>
              </div>
            </div>
          </div>
        </div>

        {/* 🚀 ROW 2: FULL WIDTH SALES TRACKING CHART */}
        <div className="w-full p-6 md:p-8 rounded-[32px] bg-[#050a08] border border-blue-900/30 shadow-lg relative flex flex-col h-[400px] overflow-hidden group">
          <div className="absolute -left-10 -top-10 w-40 h-40 bg-blue-500/5 blur-[80px] rounded-full group-hover:bg-blue-500/10 transition-colors duration-700 pointer-events-none" />
          <div className="flex justify-between items-center mb-6 shrink-0 relative z-10">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-500" /> Sales Revenue
              Trend
            </h3>
            <span className="text-xs text-blue-100/40 font-mono bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-900/30">
              Last 7 Days
            </span>
          </div>
          <div className="relative flex-1 w-full min-h-0">
            <div className="absolute inset-0 [&>div]:!h-full [&>div]:!w-full [&>div]:!bg-transparent [&>div]:!border-none [&>div]:!shadow-none [&>div]:!p-0 [&>div]:!rounded-none [&>div]:!m-0">
              {data.charts.sales.length > 0 ? (
                <Suspense fallback={<ChartSkeleton />}>
                  <LineChart data={salesChartData} />
                </Suspense>
              ) : (
                <div className="flex h-full items-center justify-center text-blue-100/30 text-sm">
                  No sales data in last 7 days
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, trend, trendUp }) => {
  const colors = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    red: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };
  const theme = colors[color] || colors.emerald;
  return (
    <div className="bg-[#050a08] border border-emerald-900/30 p-6 rounded-[32px] hover:border-emerald-500/30 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden">
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
