import React from "react";
import { Line } from "react-chartjs-2";
import { useLocation } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const LineChart = ({ data, title }) => {
  const location = useLocation();
  const currentPath = typeof window !== "undefined" && location.pathname === "/" ? window.location.pathname : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const colors = {
    tooltipTitle: isTransport ? "#60a5fa" : "#818cf8", // blue-400 vs indigo-400
    hoverBorder: isTransport ? "hover:border-blue-500/30" : "hover:border-indigo-500/30",
    glow1: isTransport ? "bg-blue-500/10" : "bg-indigo-500/10",
    glow2: isTransport ? "bg-cyan-500/5" : "bg-blue-500/5",
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "rgba(161, 161, 170, 0.8)", // zinc-400
          usePointStyle: true,
          boxWidth: 8,
          font: { family: "'Inter', sans-serif", size: 12, weight: "500" },
        },
      },
      title: {
        display: !!title,
        text: title,
        color: "rgba(244, 244, 245, 0.9)", // zinc-100
        font: { size: 14, family: "'Inter', sans-serif", weight: "bold" },
        padding: { top: 0, bottom: 15 },
      },
      tooltip: {
        backgroundColor: "rgba(9, 9, 11, 0.95)", // #09090B
        titleColor: colors.tooltipTitle,
        bodyColor: "#f4f4f5", // zinc-100
        borderColor: "rgba(255, 255, 255, 0.05)", // border-white/5
        borderWidth: 1,
        padding: 12,
        usePointStyle: true,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: {
          color: "rgba(161, 161, 170, 0.6)", // zinc-400
          font: { family: "'Inter', sans-serif" },
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        grid: {
          color: "rgba(39, 39, 42, 0.3)", // zinc-800
          borderDash: [5, 5],
          drawBorder: false,
        },
        ticks: {
          color: "rgba(161, 161, 170, 0.6)", // zinc-400
          font: { family: "'Inter', sans-serif" },
          padding: 10,
        },
        beginAtZero: true,
      },
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 3,
      },
      point: {
        radius: 3,
        hoverRadius: 6,
        borderWidth: 2,
        backgroundColor: "#09090B",
      },
    },
  };

  return (
    <div
      className={`relative flex flex-col p-4 sm:p-6 w-full h-[320px] md:h-[400px] rounded-[24px] bg-[#09090B] border border-white/5 shadow-xl overflow-hidden group transition-all duration-500 ${colors.hoverBorder}`}
    >
      {/* Glow Orbs */}
      <div
        className={`absolute -top-10 -right-10 w-40 h-40 blur-[60px] rounded-full pointer-events-none transition-opacity duration-700 opacity-40 group-hover:opacity-100 ${colors.glow1}`}
      />
      <div
        className={`absolute -bottom-10 -left-10 w-40 h-40 blur-[60px] rounded-full pointer-events-none ${colors.glow2}`}
      />

      <div className="relative z-10 w-full flex-1 min-h-0">
        <Line options={options} data={data} />
      </div>
    </div>
  );
};

export default LineChart;
