"use client";

import React from "react";
import { useClaraStore } from "@/store/claraStore";
import { X, ShieldAlert, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const AlertNotification = () => {
    const { alerts, clearAlerts } = useClaraStore();
    
    if (alerts.length === 0) return null;

    const latest = alerts[0];
    const isHigh = latest.severity === "high" || latest.severity === "critical";

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, x: 20, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                className="fixed top-6 right-6 z-[9999] w-full max-w-[360px]"
            >
                <div className={`relative flex items-start gap-4 p-5 rounded-[2rem] shadow-2xl border backdrop-blur-3xl overflow-hidden glass-card ${
                    isHigh ? "border-danger/20" : "border-warning/20"
                }`}>
                    {/* Interior gradient glow */}
                    <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[60px] opacity-20 pointer-events-none ${
                        isHigh ? "bg-danger" : "bg-warning"
                    }`}></div>

                    <div className={`p-3 rounded-2xl shrink-0 shadow-lg ${
                        isHigh ? "bg-danger text-white shadow-danger/20" : "bg-warning text-black shadow-warning/20"
                    }`}>
                        {isHigh ? <ShieldAlert size={20} strokeWidth={2.5} /> : <Info size={20} strokeWidth={2.5} />}
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                        <h3 className={`text-sm font-black mb-1 uppercase tracking-tight ${
                            isHigh ? "text-danger" : "text-warning"
                        }`}>
                            System Notice
                        </h3>
                        <p className="text-xs text-slate-100 leading-relaxed font-bold tracking-tight">
                            {latest.trigger_phrase}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse"></span>
                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                                Logged {new Date(latest.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>

                    <button 
                        onClick={clearAlerts}
                        className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/[0.05] text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
