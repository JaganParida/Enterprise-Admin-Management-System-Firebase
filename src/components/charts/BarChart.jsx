import React from "react";
import { Bar } from "react-chartjs-2";
import { useLocation } from "react-router-dom"; // <-- ADDED HOOK
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const BarChart = ({ data, title }) => {
  // AUTO-DETECT THEME
  const location = useLocation();
  const isTransport = location.pathname.includes("/transportation");
  const theme = isTransport ? "blue" : "emerald";

  // Theme Configuration Mapping
  const themeConfig = {
    emerald: {
      legendColor: "rgba(236, 253, 245, 0.7)",
      tooltipTitle: "#34d399",
      tooltipBorder: "rgba(16, 185, 129, 0.2)",
      bgClass: "bg-[#0A0F0D]/60 hover:border-emerald-500/20",
      glowTop: "bg-emerald-500/10",
      glowBottom: "bg-teal-500/5",
    },
    blue: {
      legendColor: "rgba(191, 219, 254, 0.7)", // Light blue text
      tooltipTitle: "#38bdf8", // Blue 400
      tooltipBorder: "rgba(59, 130, 246, 0.2)",
      bgClass: "bg-[#020617]/40 hover:border-blue-500/20 border-blue-500/10", // Deep navy blue slate
      glowTop: "bg-blue-500/10",
      glowBottom: "bg-indigo-500/5",
    },
  };

  const activeTheme = themeConfig[theme];

  const options = {
    responsive: true,
    maintainAspectRatio: false, // Must be false to fit the div
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: activeTheme.legendColor,
          usePointStyle: true,
          boxWidth: 8,
          font: { family: "'Inter', sans-serif", size: 12, weight: "500" },
        },
      },
      title: {
        display: !!title,
        text: title,
        color: "rgba(255, 255, 255, 0.9)",
        font: { size: 14, family: "'Inter', sans-serif", weight: "bold" },
        padding: { top: 0, bottom: 15 },
      },
      tooltip: {
        backgroundColor: "rgba(2, 4, 3, 0.8)",
        titleColor: activeTheme.tooltipTitle,
        bodyColor: "#e5e7eb",
        borderColor: activeTheme.tooltipBorder,
        borderWidth: 1,
        padding: 12,
        usePointStyle: true,
        cornerRadius: 12,
      },
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: {
          color: "rgba(255, 255, 255, 0.4)",
          font: { family: "'Inter', sans-serif" },
        },
      },
      y: {
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
          borderDash: [5, 5],
          drawBorder: false,
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.4)",
          font: { family: "'Inter', sans-serif" },
          padding: 10,
        },
        beginAtZero: true,
      },
    },
    elements: {
      bar: {
        borderRadius: 6,
        borderSkipped: false,
      },
    },
  };

  return (
    // Applied dynamic theme styling for the wrapper
    <div
      className={`relative flex flex-col p-4 sm:p-6 w-full h-[320px] md:h-[400px] rounded-2xl md:rounded-[32px] backdrop-blur-xl border border-white/5 shadow-2xl overflow-hidden group transition-all duration-500 ${activeTheme.bgClass}`}
    >
      {/* Dynamic Glow Orbs based on theme */}
      <div
        className={`absolute -top-10 -right-10 w-40 h-40 blur-[60px] rounded-full pointer-events-none transition-opacity duration-700 opacity-50 group-hover:opacity-100 ${activeTheme.glowTop}`}
      />
      <div
        className={`absolute -bottom-10 -left-10 w-40 h-40 blur-[60px] rounded-full pointer-events-none ${activeTheme.glowBottom}`}
      />

      {/* flex-1 min-h-0 strictly contains the canvas inside the parent div */}
      <div className="relative z-10 w-full flex-1 min-h-0">
        <Bar options={options} data={data} />
      </div>
    </div>
  );
};

export default BarChart;
