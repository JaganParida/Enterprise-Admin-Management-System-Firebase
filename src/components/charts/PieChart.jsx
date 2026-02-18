import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const PieChart = ({ data, title }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "rgba(236, 253, 245, 0.7)",
          usePointStyle: true,
          padding: 20,
          font: { family: "'Inter', sans-serif", size: 12, weight: "500" },
        },
      },
      title: {
        display: !!title,
        text: title,
        color: "rgba(255, 255, 255, 0.9)",
        font: { size: 16, family: "'Inter', sans-serif", weight: "bold" },
        padding: { top: 10, bottom: 20 },
      },
      tooltip: {
        backgroundColor: "rgba(2, 4, 3, 0.8)",
        titleColor: "#34d399",
        bodyColor: "#e5e7eb",
        borderColor: "rgba(16, 185, 129, 0.2)",
        borderWidth: 1,
        padding: 12,
        usePointStyle: true,
        cornerRadius: 12,
      },
    },
    elements: {
      arc: {
        borderWidth: 2,
        borderColor: "#0A0F0D", // Dark border between pie slices for seamless look
        hoverOffset: 10, // Pops out slightly on hover
      },
    },
  };

  return (
    <div className="relative p-6 w-full h-[350px] md:h-[400px] rounded-[32px] bg-[#0A0F0D]/60 backdrop-blur-xl border border-white/5 shadow-2xl overflow-hidden group transition-all duration-500 hover:border-emerald-500/20">
      {/* Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none transition-opacity duration-700 opacity-50 group-hover:opacity-100" />

      <div className="relative z-10 w-full h-full flex justify-center pb-4">
        <Pie options={options} data={data} />
      </div>
    </div>
  );
};

export default PieChart;
