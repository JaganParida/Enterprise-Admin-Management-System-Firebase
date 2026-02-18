import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WifiOff, ArrowLeft, Terminal, Timer } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();
  const [logStep, setLogStep] = useState(0);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    const timers = [
      setTimeout(() => setLogStep(1), 500),
      setTimeout(() => setLogStep(2), 1200),
      setTimeout(() => setLogStep(3), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#020403] flex items-center justify-center p-4 relative overflow-hidden font-mono selection:bg-red-500/30">
      <style>
        {`
          @keyframes scan-line { 0% { transform: translateX(-150%); } 100% { transform: translateX(500%); } }
          .animate-scan { animation: scan-line 2s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        `}
      </style>

      {/* Background 404 Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.03] blur-sm">
        <h1 className="text-[25rem] font-black text-red-600 tracking-tighter">
          404
        </h1>
      </div>

      {/* Main Card */}
      <div className="relative z-10 max-w-lg w-full bg-[#050a08]/80 backdrop-blur-2xl border border-red-900/50 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/5">
        <div className="h-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-900 animate-pulse"></div>
        <div className="flex justify-between items-center px-6 py-4 border-b border-red-900/30 bg-black/20">
          <div className="flex items-center gap-3">
            <WifiOff className="text-red-500 animate-pulse" size={20} />
            <span className="text-red-500 font-bold tracking-widest text-xs uppercase">
              Connection_Lost
            </span>
          </div>
          <div className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400 font-bold">
            ERR_CODE_404
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Terminal Animation */}
          <div className="space-y-3 font-mono text-sm">
            <div className="flex items-center gap-2 text-emerald-500/50 pb-2">
              <Terminal size={14} />
              <span>System diagnostic initiated...</span>
            </div>

            <div className="space-y-2 pl-4 border-l-2 border-red-900/30">
              {/* ✅ Character Encoded for Safety */}
              <p
                className={`transition-all duration-500 ${logStep >= 1 ? "opacity-100" : "opacity-0"} text-emerald-100/40 text-xs`}
              >
                {"> Scanning sector 7G..."}
              </p>
              <p
                className={`transition-all duration-500 ${logStep >= 2 ? "opacity-100" : "opacity-0"} text-red-400 text-xs`}
              >
                {"> Critical Error: Path vector undefined."}
              </p>
              <p
                className={`transition-all duration-500 ${logStep >= 3 ? "opacity-100" : "opacity-0"} text-emerald-100/40 italic text-xs`}
              >
                {"> Rerouting protocol required."}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold">
              <span className="text-emerald-100/30">Link Stability</span>
              <span className="text-red-500 animate-pulse">Critical</span>
            </div>
            <div className="h-1.5 w-full bg-red-900/20 rounded-full overflow-hidden relative">
              <div className="h-full w-[30%] bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-scan rounded-full"></div>
            </div>
          </div>

          <div className="text-center py-2">
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
              Page Not Found
            </h2>
            <p className="text-emerald-100/40 text-xs leading-relaxed max-w-xs mx-auto">
              Requested resource is unavailable. Automatic navigation system
              engaged.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => navigate("/")}
              className="w-full group relative flex items-center justify-center gap-3 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-emerald-50 transition-all shadow-lg"
            >
              <ArrowLeft
                size={18}
                className="group-hover:-translate-x-1 transition-transform"
              />
              <span>MANUAL REROUTE</span>
            </button>
            <div className="flex items-center justify-center gap-2 text-[10px] text-emerald-100/30">
              <Timer size={12} />
              <span>
                Auto-redirecting in{" "}
                <span className="text-white font-bold">{countdown}s</span>
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-red-950/20 border-t border-red-900/20 text-center flex justify-between items-center">
          <p className="text-[9px] text-red-400/40 font-mono">
            ID: ENTERPRISE_HUB // V.2.4.0
          </p>
          <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-red-500/50 animate-ping"></div>
            <div className="w-1 h-1 rounded-full bg-red-500/20"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
