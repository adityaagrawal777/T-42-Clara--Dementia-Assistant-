"use client";

import React from "react";
import { Smile } from "lucide-react";
import { motion } from "framer-motion";

export const TypingIndicator: React.FC = () => {
  return (
    <motion.div
      className="sanctuary-typing-bubble"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Clara Avatar */}
      <div className="sanctuary-bubble-avatar sanctuary-bubble-avatar--clara">
        <Smile size={16} strokeWidth={2.2} />
      </div>

      {/* Typing Dots */}
      <div className="sanctuary-typing-dots">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="sanctuary-typing-dot"
            animate={{
              y: [0, -5, 0],
              opacity: [0.35, 1, 0.35],
            }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.18,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};
