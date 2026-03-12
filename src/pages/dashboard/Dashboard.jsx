import React, { useEffect, useState, Suspense, lazy } from "react";
import { Link, useLocation } from "react-router-dom";
import dashboardService from "../../services/dashboardService";
import { useUI } from "../../context/UIProvider";
import {
  TrendingUp,
  Package,
  Users,
  Activity,
  DollarSign,
  Download,
  Plus,
  Factory,
  FileText,
  ChevronRight,
  ShoppingCart,
  Calendar,
} from "lucide-react";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";

const BarChart = lazy(() => import("../../components/charts/BarChart"));
const LineChart = lazy(() => import("../../components/charts/LineChart"));

const ChartSkeleton = () => (
  <div className="w-full h-full bg-zinc-800/30 animate-pulse rounded-2xl"></div>
);

const Dashboard = () => {
  const { toast } = useUI();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [showQuickMenu, setShowQuickMenu] = useState(false);

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
    primaryHoverBorder: isTransport
      ? "hover:border-blue-500/30"
      : "hover:border-indigo-500/30",
    gradientBtn: isTransport
      ? "from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-blue-900/20"
      : "from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-indigo-900/20",
    glowOrb: isTransport
      ? "bg-blue-500/5 group-hover:bg-blue-500/10"
      : "bg-indigo-500/5 group-hover:bg-indigo-500/10",
  };

  const [data, setData] = useState({
    cards: {
      balance: 0,
      revenue: 0,
      activeEmployees: 0,
      stockValue: 0,
      lowStock: 0,
      pendingInvoices: 0,
    },
    charts: { production: [], sales: [] },
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
  }, [toast]);

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

      if (data.recentActivity && data.recentActivity.length > 0) {
        rows.push(`\nRECENT ACTIVITY,Type,Details,Amount/Qty,Date`);
        data.recentActivity.forEach((act) => {
          rows.push(
            `ACTIVITY,${act.activityType},"${act.productName || act.clientName || "N/A"}",${act.amount || act.grandTotal || act.quantity || 0},${new Date(act.date).toLocaleDateString("en-GB")}`,
          );
        });
      }

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

  const productionChartData = {
    labels: data.charts.production.map((d) => d.date),
    datasets: [
      {
        label: "Units Produced",
        data: data.charts.production.map((d) => d.quantity),
        productNames: data.charts.production.map((d) => d.productName),
        backgroundColor: isTransport
          ? "rgba(6, 182, 212, 0.85)"
          : "rgba(124, 58, 237, 0.85)", // Cyan vs Violet
        hoverBackgroundColor: isTransport
          ? "rgba(8, 145, 178, 1)"
          : "rgba(139, 92, 246, 1)",
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 48,
      },
    ],
  };

  const salesChartData = {
    labels: data.charts.sales.map((d) => d.date),
    datasets: [
      {
        label: "Sales Revenue",
        data: data.charts.sales.map((d) => d.amount),
        productNames: data.charts.sales.map((d) => d.productName),
        borderColor: isTransport ? "#0ea5e9" : "#3b82f6", // Sky vs Blue
        backgroundColor: isTransport
          ? "rgba(14, 165, 233, 0.15)"
          : "rgba(59, 130, 246, 0.15)",
        borderWidth: 3,
        pointBackgroundColor: "#09090B",
        pointBorderColor: isTransport ? "#0ea5e9" : "#3b82f6",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const sharedOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    layout: { padding: { left: 0, right: 0, top: 10, bottom: 0 } },
  };

  const productionChartOptions = {
    ...sharedOptions,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(9, 9, 11, 0.95)",
        titleColor: isTransport ? "#22d3ee" : "#a78bfa", // Cyan vs Violet
        bodyColor: "#f4f4f5",
        borderColor: "rgba(39, 39, 42, 1)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context) => `Date: ${context[0].label}`,
          label: function (context) {
            const val = context.raw;
            const productName = context.dataset.productNames
              ? context.dataset.productNames[context.dataIndex]
              : "";
            return productName
              ? [
                  `Product: ${productName}`,
                  `Output: ${val.toLocaleString("en-IN")} Units`,
                ]
              : `Output: ${val.toLocaleString("en-IN")} Units`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(255, 255, 255, 0.03)",
          drawBorder: false,
          borderDash: [5, 5],
        },
        ticks: {
          color: "rgba(161, 161, 170, 0.8)",
          font: { family: "monospace", size: 10 },
          padding: 10,
        },
        border: { display: false },
      },
      x: {
        grid: { display: false, drawBorder: false },
        ticks: {
          color: "rgba(161, 161, 170, 0.8)",
          font: { family: "monospace", size: 11 },
          padding: 10,
        },
        border: { display: false },
      },
    },
  };

  const blueChartOptions = {
    ...sharedOptions,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(9, 9, 11, 0.95)",
        titleColor: isTransport ? "#38bdf8" : "#60a5fa", // Sky vs Blue
        bodyColor: "#f4f4f5",
        borderColor: "rgba(39, 39, 42, 1)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context) => `Date: ${context[0].label}`,
          label: function (context) {
            const val = context.raw;
            const productName = context.dataset.productNames
              ? context.dataset.productNames[context.dataIndex]
              : "";
            return productName
              ? [
                  `Item Sold: ${productName}`,
                  `Revenue: ₹${val.toLocaleString("en-IN")}`,
                ]
              : `Revenue: ₹${val.toLocaleString("en-IN")}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(255, 255, 255, 0.03)",
          drawBorder: false,
          borderDash: [5, 5],
        },
        ticks: {
          color: "rgba(161, 161, 170, 0.8)",
          font: { family: "monospace", size: 10 },
          padding: 10,
          callback: (value) => `₹${value.toLocaleString()}`,
        },
        border: { display: false },
      },
      x: {
        grid: { display: false, drawBorder: false },
        ticks: {
          color: "rgba(161, 161, 170, 0.8)",
          font: { family: "monospace", size: 11 },
          padding: 10,
        },
        border: { display: false },
      },
    },
  };

  if (loading) return <Loader text="Initializing Command Center..." />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-20">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${theme.primaryBg} ${theme.primaryBorder}`}
            >
              <Factory className={theme.primaryText} size={28} />
            </div>
            Enterprise Hub
          </h1>
          <p className="text-zinc-400 mt-2 text-sm font-medium">
            Real-time factory production & financial command center.
          </p>
        </div>
        <div className="flex gap-3 relative">
          <Button
            variant="outline"
            className="text-xs h-11 px-5 gap-2 rounded-xl border-zinc-800 text-zinc-300 hover:bg-zinc-800/50 hover:text-white hover:border-zinc-700 transition-colors"
            onClick={handleExport}
          >
            <Download size={16} /> Export Report
          </Button>
          <div className="relative">
            <Button
              variant="primary"
              className={`text-xs h-11 px-5 gap-2 rounded-xl bg-gradient-to-r text-white active:scale-95 transition-all ${theme.gradientBtn}`}
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
                <div className="absolute right-0 mt-3 w-64 bg-[#09090B]/95 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl p-2 z-20 animate-in fade-in zoom-in-95 duration-200 origin-top-right ring-1 ring-black/50">
                  <div className="px-3 py-2 border-b border-zinc-800/60 mb-1">
                    <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-[0.2em]">
                      Create New Entry
                    </p>
                  </div>
                  <div className="space-y-1 p-1">
                    <Link
                      to="/enterprise/sales"
                      className="quick-link-item group flex items-center p-2 rounded-xl hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors mr-3">
                        <ShoppingCart size={16} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-zinc-200">
                        Sales Entry
                      </span>
                      <ChevronRight
                        size={14}
                        className="opacity-0 group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0 transition-all text-zinc-400"
                      />
                    </Link>
                    <Link
                      to="/enterprise/production"
                      className="quick-link-item group flex items-center p-2 rounded-xl hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors mr-3">
                        <Factory size={16} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-zinc-200">
                        Production Log
                      </span>
                      <ChevronRight
                        size={14}
                        className="opacity-0 group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0 transition-all text-zinc-400"
                      />
                    </Link>
                    <Link
                      to="/enterprise/invoices/create"
                      className="quick-link-item group flex items-center p-2 rounded-xl hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors mr-3">
                        <FileText size={16} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-zinc-200">
                        New Invoice
                      </span>
                      <ChevronRight
                        size={14}
                        className="opacity-0 group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0 transition-all text-zinc-400"
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
          title="Total Sales"
          value={`₹ ${data.cards.balance.toLocaleString()}`}
          icon={ShoppingCart}
          color="blue"
          trend="Overall Dispatch"
          trendUp={true}
          isTransport={isTransport}
        />
        <StatCard
          title="Stock Value"
          value={`₹ ${data.cards.stockValue.toLocaleString()}`}
          icon={Package}
          color="indigo"
          trend={`${data.cards.lowStock} Low Stock Items`}
          trendUp={data.cards.lowStock === 0}
          isTransport={isTransport}
        />
        <StatCard
          title="Invoice Billed"
          value={`₹ ${data.cards.revenue.toLocaleString()}`}
          icon={DollarSign}
          color="purple"
          trend={`${data.cards.pendingInvoices} Pending Invoices`}
          trendUp={true}
          isTransport={isTransport}
        />
        <StatCard
          title="Workforce"
          value={data.cards.activeEmployees}
          icon={Users}
          color="sky"
          trend="Active Personnel"
          trendUp={true}
          isTransport={isTransport}
        />
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ========================================== */}
          {/* PRODUCTION CHART */}
          {/* ========================================== */}
          <div
            className={`lg:col-span-2 p-6 md:p-8 rounded-2xl bg-[#09090B] border border-zinc-800/60 shadow-lg relative flex flex-col w-full h-[450px] overflow-hidden group ${theme.primaryHoverBorder} transition-all duration-500`}
          >
            <div
              className={`absolute -left-10 -top-10 w-40 h-40 blur-[80px] rounded-full transition-colors duration-700 pointer-events-none ${theme.glowOrb}`}
            />

            <div className="flex justify-between items-center shrink-0 relative z-10 mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <div className={`p-2 rounded-lg ${theme.primaryBg}`}>
                  <Activity size={18} className={theme.primaryText} />
                </div>
                Production Trend
              </h3>
              <span className="text-xs text-zinc-400 font-mono bg-zinc-800/30 px-3 py-1.5 rounded-lg border border-zinc-800/80">
                Last 7 Days
              </span>
            </div>

            <div className="relative flex-1 w-full min-h-0 [&>div]:!h-full [&>div]:!w-full [&_canvas]:!h-full [&_canvas]:!w-full">
              {data.charts.production.length > 0 ? (
                <Suspense fallback={<ChartSkeleton />}>
                  <BarChart
                    data={productionChartData}
                    options={productionChartOptions}
                  />
                </Suspense>
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
                  No production data in last 7 days
                </div>
              )}
            </div>
          </div>

          {/* ========================================== */}
          {/* RECENT ACTIVITY */}
          {/* ========================================== */}
          <div className="p-6 md:p-8 rounded-2xl bg-[#09090B] border border-zinc-800/60 shadow-lg flex flex-col w-full h-[450px] overflow-hidden hover:border-zinc-700 transition-all duration-500">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3 shrink-0">
              <div className="p-2 rounded-lg bg-zinc-800/50">
                <Activity size={18} className="text-zinc-300" />
              </div>
              Recent Activity
              <span className="text-xs font-normal text-zinc-500 ml-auto">
                Top 10
              </span>
            </h3>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar min-h-0">
              {data.recentActivity.length > 0 ? (
                data.recentActivity.map((activity, index) => (
                  <ActivityItem
                    key={index}
                    data={activity}
                    isTransport={isTransport}
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

        {/* ========================================== */}
        {/* SALES CHART */}
        {/* ========================================== */}
        <div className="w-full p-6 md:p-8 rounded-2xl bg-[#09090B] border border-zinc-800/60 shadow-lg relative flex flex-col h-[450px] overflow-hidden group hover:border-blue-500/30 transition-all duration-500">
          <div className="absolute -left-10 -top-10 w-40 h-40 bg-blue-500/5 blur-[80px] rounded-full group-hover:bg-blue-500/10 transition-colors duration-700 pointer-events-none" />

          <div className="flex justify-between items-center shrink-0 relative z-10 mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp size={18} className="text-blue-400" />
              </div>
              Sales Revenue Trend
            </h3>
            <span className="text-xs text-zinc-400 font-mono bg-zinc-800/30 px-3 py-1.5 rounded-lg border border-zinc-800/80">
              Last 7 Days
            </span>
          </div>

          <div className="relative flex-1 w-full min-h-0 [&>div]:!h-full [&>div]:!w-full [&_canvas]:!h-full [&_canvas]:!w-full">
            {data.charts.sales.length > 0 ? (
              <Suspense fallback={<ChartSkeleton />}>
                <LineChart data={salesChartData} options={blueChartOptions} />
              </Suspense>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
                No sales data in last 7 days
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  trend,
  trendUp,
  isTransport,
}) => {
  const colors = isTransport
    ? {
        indigo: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
        blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        purple: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
        sky: "text-sky-400 bg-sky-500/10 border-sky-500/20",
        zinc: "text-zinc-400 bg-zinc-800/50 border-zinc-700",
      }
    : {
        indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
        blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
        sky: "text-sky-400 bg-sky-500/10 border-sky-500/20",
        zinc: "text-zinc-400 bg-zinc-800/50 border-zinc-700",
      };

  const theme = colors[color] || colors.zinc;
  const hoverClass = isTransport
    ? "hover:border-blue-500/30 hover:shadow-[0_8px_24px_-6px_rgba(59,130,246,0.15)]"
    : "hover:border-indigo-500/30 hover:shadow-[0_8px_24px_-6px_rgba(99,102,241,0.15)]";

  return (
    <div
      className={`bg-[#09090B] border border-zinc-800/60 p-6 rounded-2xl ${hoverClass} transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden shadow-sm`}
    >
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-3.5 rounded-xl border ${theme}`}>
          <Icon size={22} />
        </div>
        <span
          className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border ${
            trendUp
              ? isTransport
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          }`}
        >
          {trend}
        </span>
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

const ActivityItem = ({ data, isTransport }) => {
  let Icon = Factory;
  let colorTheme = isTransport
    ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
    : "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
  let title = `Production: ${data.productName || "Product"}`;
  let desc = `${Number(data.quantity || 0).toLocaleString()} Units Produced`;
  let amount = null;

  if (data.activityType === "Sale") {
    Icon = ShoppingCart;
    colorTheme = "text-blue-400 bg-blue-500/10 border-blue-500/20";
    title = `Sale: ${data.customerName || "Customer"}`;
    desc = data.productName || "Items Sold";
    amount = `₹${Number(data.amount || 0).toLocaleString("en-IN")}`;
  } else if (data.activityType === "Invoice") {
    Icon = FileText;
    colorTheme = isTransport
      ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
      : "text-purple-400 bg-purple-500/10 border-purple-500/20";
    title = `Invoice: ${data.invoiceNumber || "INV"}`;
    desc = `Billed to ${data.clientName || "Client"}`;
    amount = `₹${Number(data.grandTotal || 0).toLocaleString("en-IN")}`;
  }

  return (
    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-zinc-800/40 transition-colors border border-transparent hover:border-zinc-700/50">
      <div className={`p-2 rounded-lg border shrink-0 ${colorTheme}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <p className="text-sm font-bold text-zinc-100 truncate">{title}</p>
          {amount && (
            <p className="text-xs font-bold text-zinc-300 font-mono ml-2">
              {amount}
            </p>
          )}
        </div>
        <p className="text-xs text-zinc-400 truncate mt-0.5">{desc}</p>
        <p className="text-[10px] text-zinc-500 mt-1.5 font-mono flex items-center gap-1">
          <Calendar size={10} />
          {new Date(data.date || data.createdAt).toLocaleDateString("en-GB")}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
