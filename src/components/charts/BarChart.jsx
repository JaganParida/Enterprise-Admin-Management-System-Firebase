import React from "react";
import { Bar } from "react-chartjs-2";
import { useLocation } from "react-router-dom";
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
  const location = useLocation();
  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const theme = {
    primary: isTransport ? "#3b82f6" : "#6366f1", // Blue vs Indigo
    primaryGlow: isTransport
      ? "rgba(59, 130, 246, 0.15)"
      : "rgba(99, 102, 241, 0.15)",
    hoverRing: isTransport
      ? "hover:border-blue-500/40 hover:shadow-[0_0_40px_rgba(59,130,246,0.1)]"
      : "hover:border-indigo-500/40 hover:shadow-[0_0_40px_rgba(99,102,241,0.1)]",
    orb1: isTransport ? "bg-blue-500/10" : "bg-indigo-500/10",
    orb2: isTransport ? "bg-cyan-500/5" : "bg-purple-500/5",
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top",
        align: "end",
        labels: {
          color: "rgba(161, 161, 170, 0.9)", // zinc-400
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: 6,
          font: { family: "'Inter', sans-serif", size: 12, weight: "500" },
        },
      },
      title: {
        display: !!title,
        text: title,
        align: "start",
        color: "rgba(250, 250, 250, 1)", // zinc-50
        font: {
          size: 16,
          family: "'Inter', sans-serif",
          weight: "600",
          letterSpacing: "-0.02em",
        },
        padding: { top: 0, bottom: 24 },
      },
      tooltip: {
        backgroundColor: "rgba(9, 9, 11, 0.85)", // Zinc-950 with opacity
        titleColor: "rgba(250, 250, 250, 1)",
        bodyColor: "rgba(161, 161, 170, 1)",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        padding: 14,
        usePointStyle: true,
        cornerRadius: 12,
        titleFont: { size: 13, family: "'Inter', sans-serif", weight: "600" },
        bodyFont: { size: 12, family: "'Inter', sans-serif" },
        boxPadding: 6,
      },
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: {
          color: "rgba(161, 161, 170, 0.5)",
          font: { family: "'Inter', sans-serif", size: 11 },
          padding: 8,
        },
      },
      y: {
        grid: {
          color: "rgba(255, 255, 255, 0.04)", // Very subtle grid
          borderDash: [4, 4],
          drawBorder: false,
        },
        ticks: {
          color: "rgba(161, 161, 170, 0.5)",
          font: { family: "'Inter', sans-serif", size: 11 },
          padding: 12,
          maxTicksLimit: 6,
        },
        beginAtZero: true,
      },
    },
    elements: {
      bar: {
        borderRadius: 4,
        borderSkipped: false,
        backgroundColor: theme.primary,
        hoverBackgroundColor: "#ffffff", // Makes bars pop white on hover
      },
    },
  };

  return (
    <div
      className={`relative flex flex-col p-6 sm:p-8 w-full h-[320px] md:h-[400px] rounded-[24px] bg-gradient-to-b from-[#121214] to-[#09090B] border border-white/[0.08] overflow-hidden group transition-all duration-500 ${theme.hoverRing}`}
    >
      {/* Ambient Glass Glows */}
      <div
        className={`absolute -top-20 -right-20 w-64 h-64 blur-[80px] rounded-full pointer-events-none transition-all duration-700 opacity-30 group-hover:opacity-60 ${theme.orb1}`}
      />
      <div
        className={`absolute -bottom-20 -left-20 w-64 h-64 blur-[80px] rounded-full pointer-events-none opacity-20 ${theme.orb2}`}
      />

      <div className="relative z-10 w-full flex-1 min-h-0">
        <Bar options={options} data={data} />
      </div>
    </div>
  );
};

export default BarChart;
