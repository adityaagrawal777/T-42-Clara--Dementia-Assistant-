"use client";

import React from "react";
import { useClaraStore } from "@/store/claraStore";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, AlertTriangle, X, ShieldAlert } from "lucide-react";

export const EmergencyCard: React.FC = () => {
  const { emergency, dismissEmergency } = useClaraStore();

  const isCritical = emergency.severity === "critical";
  const emergencyNumber = process.env.NEXT_PUBLIC_EMERGENCY_NUMBER ?? "112";

  return (
    <AnimatePresence>
      {emergency.active && emergency.severity && (
        <>
          {/* Full-screen backdrop — sits above all chat UI including InputBar */}
          <motion.div
            key="emergency-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-md"
            onClick={dismissEmergency}
          />

          {/* Centered modal card */}
          <motion.div
            key="emergency-card"
            initial={{ opacity: 0, scale: 0.88, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20, filter: "blur(8px)" }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none"
          >
            <div
              className={`relative w-full max-w-sm pointer-events-auto overflow-hidden rounded-[2.5rem] border-2 shadow-2xl backdrop-blur-3xl ${
                isCritical
                  ? "bg-gradient-to-b from-red-950/90 to-clara-bg/95 border-red-500/40 shadow-red-900/40"
                  : "bg-gradient-to-b from-amber-950/90 to-clara-bg/95 border-amber-500/40 shadow-amber-900/30"
              }`}
            >
              {/* Ambient glow blob */}
              <div
                className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl opacity-25 pointer-events-none ${
                  isCritical ? "bg-red-500" : "bg-amber-400"
                }`}
              />

              <div className="relative z-10 py-10 px-8 flex flex-col items-center text-center">
                {/* Pulsing icon */}
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                  className={`w-20 h-20 rounded-[1.75rem] flex items-center justify-center shadow-2xl mb-6 ${
                    isCritical
                      ? "bg-red-500 text-white shadow-red-500/40"
                      : "bg-amber-400 text-amber-950 shadow-amber-400/40"
                  }`}
                >
                  {isCritical ? <ShieldAlert size={40} /> : <AlertTriangle size={40} />}
                </motion.div>

                <h2
                  className={`text-2xl font-black mb-3 tracking-tighter ${
                    isCritical ? "text-red-200" : "text-amber-200"
                  }`}
                >
                  {isCritical ? "Immediate Assistance" : "Care Alert Active"}
                </h2>

                <p className="text-slate-300 text-sm font-medium leading-relaxed max-w-[280px] mb-8">
                  {isCritical
                    ? "We've notified your care team immediately. Please stay calm and look for help nearby."
                    : "I noticed you might be feeling overwhelmed. I've sent a gentle nudge to your caregiver."}
                </p>

                {/* Action buttons */}
                <div className="w-full flex flex-col gap-3">
                  {isCritical && (
                    <a
                      href={`tel:${emergencyNumber}`}
                      className="w-full py-4 bg-red-500 hover:bg-red-400 text-white rounded-2xl flex items-center justify-center gap-3 font-black text-base shadow-xl shadow-red-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Phone fill="currentColor" size={20} />
                      Call Support ({emergencyNumber})
                    </a>
                  )}

                  <button
                    onClick={dismissEmergency}
                    className="w-full py-4 bg-white/[0.06] border border-white/[0.12] hover:bg-white/[0.1] text-white rounded-2xl font-black text-base transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {isCritical ? "I am safe now" : "Everything is okay"}
                  </button>
                </div>

                {/* Status indicator */}
                <div className="mt-7 flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08]">
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-2 h-2 rounded-full bg-emerald-400"
                  />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Team Notified
                  </span>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={dismissEmergency}
                className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.12] transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
