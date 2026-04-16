"use client";

import React from "react";
import { useClaraStore } from "@/store/claraStore";
import { motion, AnimatePresence } from "framer-motion";

const MOOD_CONFIG: Record<string, { label: string; color: string; ring: string; dot: string; icon: string }> = {
  calm:       { label: "Calm",       color: "text-success",      ring: "border-success-muted",      dot: "bg-success",      icon: "🌿" },
  happy:      { label: "Happy",      color: "text-clara-primary-light", ring: "border-primary-muted",      dot: "bg-clara-primary", icon: "✨" },
  confused:   { label: "Confused",   color: "text-warning",      ring: "border-warning-muted",      dot: "bg-warning",      icon: "🤔" },
  distressed: { label: "Distressed", color: "text-danger",       ring: "border-danger-muted",       dot: "bg-danger",       icon: "⚠️" },
  neutral:    { label: "Neutral",    color: "text-clara-text-secondary", ring: "border-white/[0.08]", dot: "bg-clara-text-tertiary", icon: "😶" },
};

export const MoodIndicator: React.FC = () => {
  const currentMood = useClaraStore((state) => state.current.mood);
  const config = MOOD_CONFIG[currentMood] ?? MOOD_CONFIG.neutral;

  return (
    <div className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border-white/[0.06] bg-white/[0.02] transition-all duration-700`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentMood}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          className="text-xs"
        >
          {config.icon}
        </motion.span>
      </AnimatePresence>
      
      <div className="flex flex-col">
        <span className="text-[9px] font-black text-clara-text-tertiary uppercase tracking-[0.22em] leading-none mb-0.5">Mood</span>
        <div className="flex items-center gap-1.5">
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }} 
            transition={{ repeat: Infinity, duration: 3 }}
            className={`w-1.5 h-1.5 rounded-full ${config.dot} shadow-glow-sm`} 
          />
          <span className={`text-[11px] font-bold tracking-tight leading-none ${config.color}`}>
            {config.label}
          </span>
        </div>
      </div>
    </div>
  );
};
