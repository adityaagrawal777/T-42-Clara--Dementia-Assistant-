"use client";

import React from "react";
import { useClaraStore } from "@/store/claraStore";
import { Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const VoiceToggle: React.FC = () => {
  const { mode, setVoiceMode } = useClaraStore();

  const isVoiceEnabled = mode === "voice" || mode === "mixed";

  const toggleVoice = () => {
    setVoiceMode(isVoiceEnabled ? "chat" : "voice");
  };

  return (
    <button
      onClick={toggleVoice}
      aria-label={isVoiceEnabled ? "Disable Clara Voice" : "Enable Clara Voice"}
      className={`relative group flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl transition-all duration-300 ${
        isVoiceEnabled
          ? "bg-clara-primary/10 text-clara-primary border border-clara-primary/25 shadow-inner-glow"
          : "bg-clara-surface-2 text-clara-text-tertiary border border-clara-warm/[0.16]"
      }`}
      title={isVoiceEnabled ? "Voice Enabled" : "Voice Disabled (Text Only)"}
    >
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={isVoiceEnabled ? "on" : "off"}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            {isVoiceEnabled ? <Volume2 size={16} strokeWidth={2.5} /> : <VolumeX size={16} strokeWidth={2.5} />}
          </motion.div>
        </AnimatePresence>
        
        {isVoiceEnabled && (
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 rounded-full bg-clara-primary-light blur-sm -z-10"
          />
        )}
      </div>

      <div className="flex flex-col items-start">
        <span className="text-[9px] font-black opacity-60 uppercase tracking-[0.22em] leading-none mb-0.5">Voice</span>
        <span className="text-[11px] font-bold tracking-tight leading-none">
          {isVoiceEnabled ? "On" : "Muted"}
        </span>
      </div>
    </button>
  );
};
