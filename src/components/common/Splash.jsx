import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Splash = ({ onComplete }) => {
  // Check if it's the first time loading in this browser tab
  const [isFirstLoad] = useState(() => !sessionStorage.getItem("splashShown"));
  const [isVisible, setIsVisible] = useState(isFirstLoad);
  const [loadingText, setLoadingText] = useState("Initializing Core Modules...");

  useEffect(() => {
    // If it's NOT the first load, skip everything instantly
    if (!isFirstLoad) {
      onComplete();
      return;
    }

    // Sequence for text changes
    const textTimer1 = setTimeout(() => setLoadingText("Establishing Secure Handshake..."), 1200);
    const textTimer2 = setTimeout(() => setLoadingText("Syncing Unified Intel..."), 2400);

    // Play premium animation for 3.5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem("splashShown", "true"); // Save to session

      // Wait for exit animation (0.8s) before telling App.js we are done
      setTimeout(onComplete, 800);
    }, 3500);

    return () => {
      clearTimeout(timer);
      clearTimeout(textTimer1);
      clearTimeout(textTimer2);
    };
  }, [isFirstLoad, onComplete]);

  // Prevent flashing an empty screen if we are skipping
  if (!isFirstLoad) return null;

  // Letter animation variants for "ENTERPRISE"
  const textContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 1.2 },
    },
  };

  const textLetter = {
    hidden: { opacity: 0, y: 40, filter: "blur(10px)", scale: 0.8 },
    show: { 
      opacity: 1, 
      y: 0, 
      filter: "blur(0px)", 
      scale: 1,
      transition: { type: "spring", stiffness: 150, damping: 12 } 
    },
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }} // Cinematic zoom-out blur
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#09090B] overflow-hidden"
        >
          {/* 1. Background Ambient Glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 3, ease: "easeOut" }}
            className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[120vw] md:w-[800px] max-w-[800px] h-[120vw] md:h-[800px] max-h-[800px] bg-indigo-500/5 blur-[100px] md:blur-[150px] rounded-full pointer-events-none mix-blend-screen animate-pulse"
          />
           <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 3, ease: "easeOut", delay: 0.5 }}
            className="absolute top-1/2 right-0 md:right-1/4 -translate-y-1/2 w-[100vw] md:w-[600px] max-w-[600px] h-[100vw] md:h-[600px] max-h-[600px] bg-blue-500/5 blur-[80px] md:blur-[120px] rounded-full pointer-events-none mix-blend-screen"
          />

          <div className="relative flex flex-col items-center z-10 w-full px-6">
            {/* 2. Logo Assembly Animation */}
            <div className="relative w-32 h-32 mb-10 flex items-center justify-center">
              
              {/* Outer Glass Ring */}
              <motion.div
                initial={{ scale: 0, opacity: 0, rotate: -90 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ duration: 1.5, type: "spring", bounce: 0.4 }}
                className="absolute inset-0 border-[1px] border-zinc-700/50 rounded-[2rem] bg-zinc-900/20 backdrop-blur-xl shadow-[0_0_50px_rgba(99,102,241,0.1)]"
              />

              {/* Inner Glowing Core */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 1, type: "spring" }}
                className="absolute w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.4)] overflow-hidden"
              >
                 {/* Shine Effect */}
                 <motion.div 
                    initial={{ x: "-100%", opacity: 0 }}
                    animate={{ x: "200%", opacity: 0.5 }}
                    transition={{ delay: 1, duration: 2, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 }}
                    className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white to-transparent skew-x-[-20deg]"
                 />

                {/* The Letter 'E' */}
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8, duration: 0.6, type: "spring" }}
                  className="text-4xl md:text-5xl font-black text-white tracking-tighter"
                >
                  E
                </motion.span>
              </motion.div>
              
              {/* Orbital Dots */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute w-36 h-36 rounded-full"
              >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-400 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)] opacity-50" />
              </motion.div>
            </div>

            {/* 3. Text Stagger Animation + Badge */}
            <div className="flex items-center justify-center gap-3 mb-12">
                <motion.div
                variants={textContainer}
                initial="hidden"
                animate="show"
                className="flex items-center overflow-hidden"
                >
                {"ENTERPRISE".split("").map((letter, index) => (
                    <motion.span
                    key={index}
                    variants={textLetter}
                    className="text-2xl sm:text-3xl md:text-4xl font-black text-zinc-100 tracking-[0.1em] sm:tracking-[0.2em] md:tracking-[0.3em] font-sans drop-shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                    >
                    {letter}
                    </motion.span>
                ))}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ delay: 2.2, type: "spring", stiffness: 200, damping: 15 }}
                  className="bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)] flex items-center justify-center"
                >
                    <span className="text-xs md:text-sm font-bold text-indigo-400 font-mono tracking-widest uppercase">
                        OS
                    </span>
                </motion.div>
            </div>

            {/* 4. Futuristic Loading Track */}
            <div className="w-full max-w-xs h-[2px] bg-zinc-800/60 rounded-full relative overflow-hidden">
               {/* Progress Fill */}
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.8, ease: "circInOut", delay: 0.5 }}
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-600 via-indigo-400 to-blue-400 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.8)]"
              />
              {/* Glowing Active Head */}
              <motion.div
                initial={{ left: "0%" }}
                animate={{ left: "100%" }}
                transition={{ duration: 2.8, ease: "circInOut", delay: 0.5 }}
                className="absolute top-1/2 -translate-y-1/2 w-4 h-[2px] bg-white blur-[1px] shadow-[0_0_10px_rgba(255,255,255,1)]"
              />
            </div>

            {/* 5. Subtitle Status Feed */}
            <div className="h-6 mt-6 flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={loadingText}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 0.6, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] font-mono"
                    >
                        {loadingText}
                    </motion.p>
                </AnimatePresence>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Splash;
