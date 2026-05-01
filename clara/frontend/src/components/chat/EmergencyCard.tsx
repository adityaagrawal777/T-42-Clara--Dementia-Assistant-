"use client";

import React from "react";
import { useClaraStore } from "@/store/claraStore";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, X, Heart, ShieldAlert } from "lucide-react";

export const EmergencyCard: React.FC = () => {
  const { emergency, dismissEmergency } = useClaraStore();

  const isCritical = emergency.severity === "critical";
  const emergencyNumber = process.env.NEXT_PUBLIC_EMERGENCY_NUMBER ?? "112";

  return (
    <AnimatePresence>
      {emergency.active && emergency.severity && (
        <>
          {/* Backdrop — soft for non-critical, darker for critical */}
          <motion.div
            key="emergency-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[90] backdrop-blur-sm ${
              isCritical ? "bg-black/60" : "bg-black/20"
            }`}
            onClick={isCritical ? undefined : dismissEmergency}
          />

          {/* Centered modal card */}
          <motion.div
            key="emergency-card"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none"
          >
            {isCritical ? (
              /* ── CRITICAL: still urgent but cleaner ── */
              <div className="relative w-full max-w-sm pointer-events-auto overflow-hidden rounded-[2.5rem] border border-red-500/30 shadow-2xl shadow-red-900/30 bg-gradient-to-b from-red-950/90 to-[#0d0d0f]/95 backdrop-blur-3xl">
                {/* Ambient glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-28 rounded-full blur-3xl opacity-20 pointer-events-none bg-red-500" />

                <div className="relative z-10 py-10 px-8 flex flex-col items-center text-center">
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="w-20 h-20 rounded-[1.75rem] flex items-center justify-center shadow-2xl mb-6 bg-red-500 text-white shadow-red-500/40"
                  >
                    <ShieldAlert size={38} />
                  </motion.div>

                  <h2 className="text-2xl font-black mb-3 tracking-tight text-red-200">
                    We&apos;re Here With You
                  </h2>

                  <p className="text-slate-300 text-sm font-medium leading-relaxed max-w-[260px] mb-8">
                    Your care team has been notified and is on their way. You are safe. Take a slow, deep breath.
                  </p>

                  <div className="w-full flex flex-col gap-3">
                    <a
                      href={`tel:${emergencyNumber}`}
                      className="w-full py-4 bg-red-500 hover:bg-red-400 text-white rounded-2xl flex items-center justify-center gap-3 font-bold text-base shadow-xl shadow-red-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Phone fill="currentColor" size={18} />
                      Call Support ({emergencyNumber})
                    </a>
                    <button
                      onClick={dismissEmergency}
                      className="w-full py-4 bg-white/[0.06] border border-white/[0.12] hover:bg-white/[0.1] text-white rounded-2xl font-semibold text-base transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      I am safe now
                    </button>
                  </div>

                  <div className="mt-7 flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08]">
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-2 h-2 rounded-full bg-emerald-400"
                    />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                      Care team notified
                    </span>
                  </div>
                </div>

                <button
                  onClick={dismissEmergency}
                  className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.12] transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              /* ── NON-CRITICAL: warm, soft, calming for dementia patients ── */
              <div className="relative w-full max-w-xs pointer-events-auto overflow-hidden rounded-[2.5rem] shadow-2xl shadow-rose-200/10"
                style={{
                  background: "linear-gradient(160deg, #fff8f5 0%, #fef3f0 50%, #fdf6ee 100%)",
                  border: "1.5px solid rgba(251, 191, 170, 0.5)",
                }}
              >
                {/* Soft top pastel glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full blur-3xl opacity-40 pointer-events-none"
                  style={{ background: "radial-gradient(circle, #fca5a5 0%, #fdba74 100%)" }}
                />

                <div className="relative z-10 pt-10 pb-8 px-8 flex flex-col items-center text-center">

                  {/* Gentle breathing heart icon */}
                  <motion.div
                    animate={{ scale: [1, 1.07, 1] }}
                    transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-5 shadow-lg"
                    style={{
                      background: "linear-gradient(135deg, #fb7185 0%, #f97316 100%)",
                      boxShadow: "0 8px 32px rgba(251, 113, 133, 0.3)",
                    }}
                  >
                    <Heart size={28} fill="white" color="white" />
                  </motion.div>

                  {/* Warm, friendly heading */}
                  <h2 className="text-xl font-bold mb-2 tracking-tight"
                    style={{ color: "#92400e" }}
                  >
                    Clara is thinking of you 🌸
                  </h2>

                  {/* Soft, reassuring message */}
                  <p className="text-sm leading-relaxed mb-6 max-w-[230px]"
                    style={{ color: "#9a6348", fontWeight: 500 }}
                  >
                    You&apos;re doing wonderfully. Someone who cares about you has been quietly let know — just in case. You are not alone. 💛
                  </p>

                  {/* Single soft dismiss button */}
                  <button
                    onClick={dismissEmergency}
                    className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(135deg, #fb7185 0%, #f97316 100%)",
                      color: "white",
                      boxShadow: "0 4px 20px rgba(251, 113, 133, 0.25)",
                    }}
                  >
                    Thank you, I&apos;m okay 🌼
                  </button>

                  {/* Tiny, unobtrusive status */}
                  <div className="mt-5 flex items-center gap-1.5">
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 3 }}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "#86efac" }}
                    />
                    <span className="text-[10px] font-medium tracking-wide"
                      style={{ color: "#b8a49a" }}
                    >
                      Your caregiver has been gently notified
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
