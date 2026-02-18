import React from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

const RouteTransition = ({ children }) => {
  const location = useLocation();

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 15, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for "Apple-like" smoothness
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

export default RouteTransition;
