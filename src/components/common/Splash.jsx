import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Splash = ({ onComplete }) => {
  // Check if it's the first time loading in this browser tab
  const [isFirstLoad] = useState(() => !sessionStorage.getItem("splashShown"));
  const [isVisible, setIsVisible] = useState(isFirstLoad);

  useEffect(() => {
    // If it's NOT the first load, skip everything instantly
    if (!isFirstLoad) {
      onComplete();
      return;
    }

    // Play premium animation for 2.8 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem("splashShown", "true"); // Save to session

      // Wait for exit animation (0.8s) before telling App.js we are done
      setTimeout(onComplete, 800);
    }, 2800);

    return () => clearTimeout(timer);
  }, [isFirstLoad, onComplete]);

  // Prevent flashing an empty screen if we are skipping
  if (!isFirstLoad) return null;

  // Letter animation variants for "ENTERPRISE"
  const textContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.6 },
    },
  };

  const textLetter = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200 } },
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }} // Subtle zoom-in as it fades out
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#09090B] overflow-hidden"
        >
          {/* 1. Background Ambient Glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"
          />

          <div className="relative flex flex-col items-center z-10">
            {/* 2. Logo Assembly Animation */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: 1,
                type: "spring",
                stiffness: 100,
                damping: 20,
              }}
              className="relative w-28 h-28 mb-12 flex items-center justify-center"
            >
              {/* Outer Dashed Ring (Spins) */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-[2px] border-dashed border-indigo-500/20 rounded-full"
              />

              {/* Inner Glowing Diamond */}
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 45 }}
                transition={{ duration: 1, delay: 0.2, type: "spring" }}
                className="absolute w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-700 rounded-xl flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.5)]"
              >
                {/* The Letter 'E' */}
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="text-4xl font-black text-white transform -rotate-45"
                >
                  E
                </motion.span>
              </motion.div>
            </motion.div>

            {/* 3. Text Stagger Animation ("ENTERPRISE") */}
            <motion.div
              variants={textContainer}
              initial="hidden"
              animate="show"
              className="flex overflow-hidden mb-8"
            >
              {"ENTERPRISE".split("").map((letter, index) => (
                <motion.span
                  key={index}
                  variants={textLetter}
                  className="text-2xl md:text-3xl font-black text-white tracking-[0.4em] font-sans drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                >
                  {letter}
                </motion.span>
              ))}
            </motion.div>

            {/* 4. Modern Loading Progress Bar */}
            <div className="w-56 h-[3px] bg-indigo-900/40 rounded-full overflow-hidden relative shadow-inner">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.2, ease: "easeInOut", delay: 0.2 }}
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-violet-400 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)]"
              />
            </div>

            {/* 5. Subtitle Fade-in */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.6, y: 0 }}
              transition={{ delay: 1.5, duration: 0.5 }}
              className="mt-6 text-[10px] font-bold text-indigo-100 uppercase tracking-[0.3em]"
            >
              Initializing System Modules
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Splash;
