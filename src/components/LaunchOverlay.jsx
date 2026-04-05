import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  ShieldCheck,
  Clock,
  ArrowRight,
  Terminal,
  Cpu,
} from "lucide-react";

const MaintenanceOverlay = () => {
  // Target Time Configuration
  const MAINTENANCE_END_TIME = "2026-04-05T20:26:00";
  const [targetTime] = useState(new Date(MAINTENANCE_END_TIME));

  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isMaintained, setIsMaintained] = useState(false);

  // Logic: Check if time has already passed on initial load
  // If current time > target time, isVisible will be false immediately
  const [isVisible, setIsVisible] = useState(() => {
    return new Date() < new Date(MAINTENANCE_END_TIME);
  });

  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
    } else {
      document.body.style.overflow = "unset";
      document.body.style.position = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      document.body.style.position = "unset";
    };
  }, [isVisible]);

  useEffect(() => {
    // If the overlay isn't visible because time passed, don't start the timer
    if (!isVisible) return;

    const interval = setInterval(() => {
      const now = new Date();
      const difference = targetTime - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        if (!isMaintained) setIsMaintained(true);
      } else {
        setTimeLeft({
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isMaintained, targetTime, isVisible]);

  // If time has passed (initial check) or user closed it, return null
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999999] bg-[#050505] text-white font-sans flex items-center justify-center overflow-hidden">
      {/* Precision Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      {/* Structural Accent Lines */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-t from-transparent via-indigo-500/20 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-5xl px-6"
      >
        <div className="flex flex-col items-center">
          {/* Status Header */}
          <div className="flex items-center gap-4 mb-12">
            <div
              className={`h-[1px] w-12 ${isMaintained ? "bg-emerald-500/30" : "bg-amber-500/30"}`}
            />
            <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.03] border border-white/10 rounded-md">
              <span className={`flex h-2 w-2 relative`}>
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isMaintained ? "bg-emerald-400" : "bg-amber-400"}`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${isMaintained ? "bg-emerald-500" : "bg-amber-500"}`}
                />
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-zinc-400">
                {isMaintained ? "Protocol: Restored" : "Protocol: Deployment"}
              </span>
            </div>
            <div
              className={`h-[1px] w-12 ${isMaintained ? "bg-emerald-500/30" : "bg-amber-500/30"}`}
            />
          </div>

          {/* Main Title - Clean Typography */}
          <h1 className="text-6xl md:text-8xl font-black tracking-[calc(-0.05em)] text-center leading-none mb-8">
            {isMaintained ? (
              <>
                SYSTEMS <span className="text-emerald-500">READY</span>
              </>
            ) : (
              <>
                UPGRADING <span className="text-indigo-500">CORE</span>
              </>
            )}
          </h1>

          <p className="text-zinc-500 text-sm md:text-base font-mono max-w-xl text-center leading-relaxed mb-16 uppercase tracking-widest opacity-80">
            {isMaintained
              ? "Optimization cycle complete. All enterprise nodes are synchronized and ready for traffic."
              : "Synchronizing secure nodes and hardening architecture. Automatic restoration in progress."}
          </p>

          {/* Functional UI Area */}
          {!isMaintained ? (
            <div className="grid grid-cols-3 gap-6 md:gap-12 mb-16">
              <TechnicalCounter value={timeLeft.hours} label="Hours" />
              <TechnicalCounter value={timeLeft.minutes} label="Minutes" />
              <TechnicalCounter value={timeLeft.seconds} label="Seconds" />
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsVisible(false)}
              className="group relative px-12 py-4 mb-5 bg-white text-black font-bold uppercase tracking-[0.2em] text-sm overflow-hidden"
            >
              <div className="absolute inset-0 bg-emerald-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative z-10 flex items-center gap-3 group-hover:text-white transition-colors duration-300">
                Enter Command Center <ArrowRight size={16} />
              </span>
            </motion.button>
          )}

          {/* System Terminal Snippet */}
          <div className="w-full max-w-md bg-white/[0.02] border border-white/5 p-4 font-mono text-[10px] text-zinc-600 rounded-lg">
            <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2 text-zinc-500">
              <Terminal size={12} /> System_Logs.txt
            </div>
            <div className="space-y-1">
              <p>
                <span className="text-emerald-500/50">[OK]</span> Database
                clusters online
              </p>
              <p>
                <span className="text-emerald-500/50">[OK]</span> SSL/TLS
                handshakes verified
              </p>
              <p>
                <span
                  className={
                    isMaintained
                      ? "text-emerald-500/50"
                      : "text-amber-500/50 animate-pulse"
                  }
                >
                  {isMaintained
                    ? "[OK] Integration complete"
                    : "[..] Propagating changes..."}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full flex justify-between px-12 opacity-30 font-mono text-[10px] tracking-widest text-zinc-400">
          <div className="flex items-center gap-2">
            <Cpu size={12} /> V2.0.4_LATEST
          </div>
          <div className="flex items-center gap-2">
            <Clock size={12} /> {targetTime.toLocaleTimeString()}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const TechnicalCounter = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <div className="relative">
      <span className="text-5xl md:text-7xl font-light font-mono tabular-nums tracking-tighter text-white">
        {String(value).padStart(2, "0")}
      </span>
      <div className="absolute -left-2 top-0 bottom-0 w-px bg-indigo-500/20" />
    </div>
    <span className="mt-2 text-[9px] font-bold text-indigo-500/60 uppercase tracking-[0.3em] font-mono">
      {label}
    </span>
  </div>
);

export default MaintenanceOverlay;
