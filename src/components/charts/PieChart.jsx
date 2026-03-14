import React from "react";
import { Pie } from "react-chartjs-2";
import { useLocation } from "react-router-dom";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const PieChart = ({ data, title }) => {
  const location = useLocation();
  const currentPath = typeof window !== "undefined" && location.pathname === "/" ? window.location.pathname : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const colors = {
    tooltipTitle: isTransport ? "#60a5fa" : "#818cf8", // blue-400 vs indigo-400
    hoverBorder: isTransport ? "hover:border-blue-500/30" : "hover:border-indigo-500/30",
    glow1: isTransport ? "bg-blue-500/5" : "bg-indigo-500/5",
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "rgba(161, 161, 170, 0.8)", // zinc-400
          usePointStyle: true,
          padding: 20,
          font: { family: "'Inter', sans-serif", size: 12, weight: "500" },
        },
      },
      title: {
        display: !!title,
        text: title,
        color: "rgba(244, 244, 245, 0.9)", // zinc-100
        font: { size: 16, family: "'Inter', sans-serif", weight: "bold" },
        padding: { top: 10, bottom: 20 },
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
    elements: {
      arc: {
        borderWidth: 2,
        borderColor: "#09090B", // Dark border between pie slices for seamless look
        hoverOffset: 10, // Pops out slightly on hover
      },
    },
  };

  return (
    <div className={`relative p-6 w-full h-[350px] md:h-[400px] rounded-[24px] bg-[#09090B] border border-white/5 shadow-xl overflow-hidden group transition-all duration-500 ${colors.hoverBorder}`}>
      {/* Decorative Glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 blur-[80px] rounded-full pointer-events-none transition-opacity duration-700 opacity-40 group-hover:opacity-100 ${colors.glow1}`} />

      <div className="relative z-10 w-full h-full flex justify-center pb-4">
        <Pie options={options} data={data} />
      </div>
    </div>
  );
};

export default PieChart;
