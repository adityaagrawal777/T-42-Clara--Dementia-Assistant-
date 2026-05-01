"use client";

import React from "react";
import { Smile } from "lucide-react";
import { motion } from "framer-motion";

export const TypingIndicator: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-end gap-3 w-full"
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mb-1 bg-clara-surface-2 text-clara-primary border border-clara-warm/[0.20] shadow-dark-sm">
        <Smile size={16} strokeWidth={2.4} />
      </div>

      {/* Bubble */}
      <div className="flex items-center gap-1.5 bg-white border border-clara-warm/[0.14] rounded-[1.25rem] rounded-bl-none px-5 py-4 shadow-dark-sm h-[48px]">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.4, 1, 0.4]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 1.2, 
              delay: i * 0.15,
              ease: "easeInOut"
            }}
            className="w-1.5 h-1.5 rounded-full bg-clara-primary shadow-glow-sm" 
          />
        ))}
      </div>
    </motion.div>
  );
};
