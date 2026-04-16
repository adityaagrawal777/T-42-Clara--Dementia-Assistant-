"use client";

import React from "react";
import { useClaraStore } from "@/store/claraStore";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, AlertTriangle, X, ShieldAlert, Heart } from "lucide-react";

export const EmergencyCard: React.FC = () => {
  const { emergency, dismissEmergency } = useClaraStore();

  if (!emergency.active || !emergency.severity) return null;

  const isCritical = emergency.severity === "critical";
  const emergencyNumber = process.env.NEXT_PUBLIC_EMERGENCY_NUMBER ?? "112";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
        className="w-full max-w-[90%] md:max-w-md mx-auto my-10"
      >
        <div
          className={`relative overflow-hidden rounded-[2.5rem] border-2 shadow-2xl backdrop-blur-3xl p-1 ${
            isCritical
              ? "bg-danger-muted border-danger/30 shadow-danger/20"
              : "bg-warning-muted border-warning/30 shadow-warning/20"
          }`}
        >
          {/* Animated Background Mesh for Emergency */}
          <div className={`absolute inset-0 opacity-20 ${isCritical ? "bg-danger" : "bg-warning"} blur-[80px] -z-10`}></div>
          
          <div className="relative z-10 glass-card rounded-[2.3rem] border-0 bg-transparent py-10 px-8 flex flex-col items-center text-center">
            
            {/* Header Icon */}
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl mb-6 ${
                isCritical ? "bg-danger text-white shadow-danger/40" : "bg-warning text-black shadow-warning/40"
              }`}
            >
              {isCritical ? <ShieldAlert size={40} /> : <AlertTriangle size={40} />}
            </motion.div>

            <h2 className={`text-2xl font-black mb-3 tracking-tighter ${isCritical ? "text-white" : "text-warning"}`}>
              {isCritical ? "Immediate Assistance" : "Care Alert Active"}
            </h2>

            <p className="text-slate-200 text-sm font-medium leading-relaxed max-w-[280px] mb-8">
              {isCritical
                 ? "We've notified your care team immediately. Please stay calm and look for help nearby."
                 : "I noticed you might be feeling overwhelmed. I've sent a gentle nudge to your caregiver."}
            </p>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-3">
              {isCritical && (
                <a
                  href={`tel:${emergencyNumber}`}
                  className="w-full py-4 bg-danger hover:bg-danger/80 text-white rounded-2xl flex items-center justify-center gap-3 font-black text-lg shadow-xl shadow-danger/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Phone fill="currentColor" size={24} />
                  Call Support ({emergencyNumber})
                </a>
              )}
              
              <button
                onClick={dismissEmergency}
                className="w-full py-4 glass-card border-white/[0.1] text-white hover:bg-white/[0.05] rounded-2xl font-black transition-all"
              >
                {isCritical ? "I am safe now" : "Everything is okay"}
              </button>
            </div>
            
            <div className="mt-8 flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08]">
                 <motion.div 
                   animate={{ opacity: [0.4, 1, 0.4] }}
                   transition={{ repeat: Infinity, duration: 2 }}
                   className="w-2 h-2 rounded-full bg-success" 
                 />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Notified</span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={dismissEmergency}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/[0.05] text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
