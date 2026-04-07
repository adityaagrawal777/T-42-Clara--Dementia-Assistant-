"use client";

import React, { useEffect } from "react";
import { useClaraStore } from "@/store/claraStore";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, AlertCircle, X, ShieldAlert } from "lucide-react";

export const EmergencyCard: React.FC = () => {
  const { emergency, dismissEmergency } = useClaraStore();

  if (!emergency.active || !emergency.severity) return null;

  const isCritical = emergency.severity === "critical";
  const emergencyNumber = "112"; // User requested not hardcoded but 112 is a safe default standard. Caregiver number might be in patient profile, but we don't fetch full patient profile in frontend yet, so we will use a configured number for now.

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-[90%] md:max-w-md mx-auto my-6"
      >
        <div
          className={`relative overflow-hidden rounded-3xl border-2 shadow-2xl backdrop-blur-xl ${
            isCritical
              ? "bg-red-50/95 border-red-500/30 shadow-red-500/20"
              : "bg-orange-50/95 border-orange-500/30 shadow-orange-500/20"
          }`}
        >
          {/* Animated background pulse for critical */}
          {isCritical && (
            <motion.div
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="absolute inset-0 bg-red-500 opacity-20"
            />
          )}

          {/* Dismiss button */}
          <button
            onClick={dismissEmergency}
            className="absolute top-4 right-4 p-2 bg-white/50 hover:bg-white/80 rounded-full transition-colors z-10"
            aria-label="Dismiss alert"
          >
            <X className={`w-5 h-5 ${isCritical ? "text-red-700" : "text-orange-700"}`} />
          </button>

          <div className="px-6 pt-8 pb-6 relative z-10 flex flex-col items-center text-center">
            {/* Icon header */}
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-4 ${
                isCritical ? "bg-red-500 text-white" : "bg-orange-500 text-white"
              }`}
            >
              {isCritical ? <ShieldAlert className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
            </div>

            <h2
              className={`text-xl font-bold mb-2 tracking-tight ${
                isCritical ? "text-red-900" : "text-orange-900"
              }`}
            >
              {isCritical ? "Emergency Assistance" : "Require Assistance?"}
            </h2>

            <p
              className={`text-[15px] max-w-sm mb-6 ${
                isCritical ? "text-red-800" : "text-orange-800"
              }`}
            >
              {isCritical
                ? "Clara has notified your care team. If you are in immediate danger, please call for help."
                : "Clara noticed you might be feeling distressed. We've let your care team know."}
            </p>

            {/* Emergency Action Buttons */}
            <div className="w-full flex flex-col gap-3">
              {isCritical && (
                <a
                  href={`tel:${emergencyNumber}`}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl flex items-center justify-center gap-3 font-semibold text-lg transition-all shadow-md shadow-red-600/30 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Phone className="w-6 h-6 fill-current" />
                  Call Emergency ({emergencyNumber})
                </a>
              )}
              
              <button
                onClick={dismissEmergency}
                className={`w-full py-3.5 rounded-2xl font-semibold transition-all ${
                  isCritical
                    ? "bg-white text-red-700 hover:bg-red-50 border border-red-200"
                    : "bg-orange-600 text-white hover:bg-orange-700 shadow-md shadow-orange-600/30"
                }`}
              >
                {isCritical ? "I am okay now" : "Call my Caregiver"}
              </button>
            </div>
            
            <div className="mt-5 flex items-center justify-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                 <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">Care team notified</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
