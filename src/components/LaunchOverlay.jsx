import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Sparkles, Clock, ArrowRight, Lock } from "lucide-react";
import confetti from "canvas-confetti";

const LaunchOverlay = () => {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isLaunched, setIsLaunched] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Target Time: Adjust this to your desired launch time
  const getTargetTime = () => {
    const target = new Date();
    target.setHours(21, 5, 0, 0); // 20 = 8 PM, 30 = minutes (8:30 PM)
    return target;
  };

  useEffect(() => {
    // 🛑 ULTIMATE SCROLL & INTERACTION LOCK
    if (isVisible) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.height = "100%";
    } else {
      document.body.style.overflow = "unset";
      document.body.style.position = "unset";
      document.body.style.width = "auto";
      document.body.style.height = "auto";
    }

    return () => {
      document.body.style.overflow = "unset";
      document.body.style.position = "unset";
      document.body.style.width = "auto";
      document.body.style.height = "auto";
    };
  }, [isVisible]);

  useEffect(() => {
    const targetTime = getTargetTime();

    const interval = setInterval(() => {
      const now = new Date();
      const difference = targetTime - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        if (!isLaunched) {
          setIsLaunched(true);
          fireConfetti();
        }
      } else {
        setTimeLeft({
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLaunched]);

  // Premium 4-Corner Confetti
  const fireConfetti = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 40 * (timeLeft / duration);
      const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#10b981", "#fbbf24"];

      confetti({
        particleCount,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 1 },
        colors,
        zIndex: 9999999,
      });
      confetti({
        particleCount,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 1 },
        colors,
        zIndex: 9999999,
      });
      confetti({
        particleCount,
        angle: 315,
        spread: 55,
        startVelocity: 25,
        origin: { x: 0, y: 0 },
        colors,
        zIndex: 9999999,
      });
      confetti({
        particleCount,
        angle: 225,
        spread: 55,
        startVelocity: 25,
        origin: { x: 1, y: 0 },
        colors,
        zIndex: 9999999,
      });
    }, 250);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        // 🛑 IMPENETRABLE WRAPPER: Max z-index, fixed 100%, traps pointer events
        className="fixed top-0 left-0 w-screen h-[100dvh] z-[9999999] bg-[#020202] flex items-center justify-center overflow-hidden pointer-events-auto touch-none select-none"
      >
        {/* Deep Space Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#020202] to-[#020202] pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-fuchsia-600/5 blur-[120px] rounded-full pointer-events-none" />

        {/* Minimalist Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_80%,transparent_100%)] pointer-events-none" />

        <motion.div
          initial={{ scale: 0.95, y: 10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{
            type: "spring",
            damping: 30,
            stiffness: 200,
            delay: 0.2,
          }}
          className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center text-center"
        >
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#111] border border-[#222] mb-10 shadow-2xl">
            {isLaunched ? (
              <Sparkles size={14} className="text-emerald-400" />
            ) : (
              <Lock size={14} className="text-rose-400" />
            )}
            <span className="text-zinc-300 text-[11px] font-bold uppercase tracking-[0.2em] font-mono">
              {isLaunched ? "System Online" : "System Locked"}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter mb-6 leading-[1.1]">
            {isLaunched ? (
              <>
                Welcome to <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400">
                  Enterprise OS
                </span>
              </>
            ) : (
              "WE ARE LIVE ON"
            )}
          </h1>

          <p className="text-zinc-500 text-base md:text-xl font-medium mb-16 max-w-2xl leading-relaxed">
            {isLaunched
              ? "All core modules have been successfully initialized. The architecture is stable and ready for operational load."
              : "Access is strictly restricted. We are compiling the final architecture. Stand by for automated launch."}
          </p>

          {/* TIMER BLOCKS - No hover effects allowed here */}
          {!isLaunched ? (
            <div className="flex items-center justify-center gap-4 md:gap-8 mb-12 w-full">
              <TimeBlock value={timeLeft.hours} label="Hours" />
              <span className="text-4xl md:text-6xl font-black text-zinc-800 pb-8">
                :
              </span>
              <TimeBlock value={timeLeft.minutes} label="Minutes" />
              <span className="text-4xl md:text-6xl font-black text-zinc-800 pb-8">
                :
              </span>
              <TimeBlock value={timeLeft.seconds} label="Seconds" />
            </div>
          ) : (
            /* ENTER BUTTON */
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.5, type: "spring", damping: 20 }}
              onClick={() => setIsVisible(false)}
              className="group px-10 py-5 bg-white text-black rounded-2xl font-black text-lg transition-all flex items-center gap-3 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)]"
            >
              <Rocket className="text-indigo-600 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
              Initialize Dashboard
              <ArrowRight className="text-indigo-600 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          )}

          {/* Footer Target Time */}
          <div className="mt-8 flex items-center justify-center gap-2 text-zinc-600 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em]">
            <Clock size={12} />
            <span>Target Protocol: 8:50 PM IST</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Sleek, Minimalist Timer Box
const TimeBlock = ({ value, label }) => (
  <div className="flex flex-col items-center gap-4">
    <div className="w-24 h-28 md:w-36 md:h-40 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] flex items-center justify-center relative overflow-hidden shadow-2xl">
      {/* High-end glass reflection */}
      <div className="absolute top-0 inset-x-0 h-1/2 bg-white/[0.02] border-b border-white/[0.01]" />
      <span className="text-6xl md:text-8xl font-black text-white font-mono z-10 tracking-tighter drop-shadow-lg">
        {String(value).padStart(2, "0")}
      </span>
    </div>
    <span className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] font-mono">
      {label}
    </span>
  </div>
);

export default LaunchOverlay;
