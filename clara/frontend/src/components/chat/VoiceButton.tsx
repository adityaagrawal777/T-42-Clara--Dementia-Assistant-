"use client";

import React from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useVoiceOrchestrator } from "@/hooks/useVoiceOrchestrator";
import { cn } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";

export const VoiceButton: React.FC = () => {
  const { voiceAvailable, isListening, startListening, stopListening } = useVoiceOrchestrator();

  if (!voiceAvailable) {
    return (
      <Button
        disabled
        variant="ghost"
        className="relative group p-4 border-2 border-slate-200"
        title="Voice not supported in this browser"
      >
        <MicOff className="w-8 h-8 text-slate-300" />
        <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded hidden group-hover:block whitespace-nowrap">
          Voice not supported in this browser
        </span>
      </Button>
    );
  }

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <motion.div
      className="relative"
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.06 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {/* Animated listening aura */}
      <AnimatePresence>
        {isListening && (
          <>
            <motion.span
              key="aura-outer"
              className="absolute inset-0 rounded-2xl bg-red-400/20"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.7, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.span
              key="aura-inner"
              className="absolute inset-0 rounded-2xl bg-red-400/25"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.35, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
            />
          </>
        )}
      </AnimatePresence>

      <Button
        onClick={handleClick}
        variant={isListening ? "danger" : "ghost"}
        className={cn(
          "w-[52px] h-[52px] rounded-2xl flex items-center justify-center p-0 shadow-md bg-white border border-slate-200/80 hover:bg-slate-50 transition-colors duration-200 relative shrink-0 z-10",
          isListening && "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
        )}
      >
        <motion.div
          animate={isListening ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={isListening ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : {}}
        >
          <Mic
            className={cn(
              "w-5 h-5",
              isListening ? "text-red-500" : "text-slate-500"
            )}
          />
        </motion.div>
      </Button>
    </motion.div>
  );
};
