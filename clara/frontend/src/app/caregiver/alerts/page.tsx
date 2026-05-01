"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AlertFeed } from "../../../components/caregiver/AlertFeed";
import { Bell, ShieldCheck, Wifi, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

export default function AlertsPage() {
  const [alertCount, setAlertCount] = useState<number | null>(null);

  const fetchCount = useCallback(() => {
    apiFetch("/api/v1/caregiver/alerts")
      .then((data: unknown) => setAlertCount((data as unknown[]).length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 20_000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <h2 className="text-4xl font-bold text-white tracking-tight">Safety Command Center</h2>
          {alertCount !== null && alertCount > 0 && (
            <span
              className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider text-white animate-pulse"
              style={{ background: "#ef4444" }}
            >
              {alertCount} Active
            </span>
          )}
        </div>
        <p className="text-base font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
          Real-time distress detection and incident resolution queue.
        </p>
      </div>

      {/* Status bar */}
      <div
        className="flex flex-wrap items-center gap-6 px-6 py-4 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-2.5">
          <Wifi size={14} className="text-emerald-400" />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.6)" }}>
            Sentiment API
          </span>
          <span className="text-xs font-black text-emerald-400">Online</span>
        </div>
        <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.1)" }} />
        <div className="flex items-center gap-2.5">
          <Activity size={14} className="text-blue-400" />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.6)" }}>
            Clara Engine
          </span>
          <span className="text-xs font-black text-blue-400">v4.2 Active</span>
        </div>
        <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.1)" }} />
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>
            Auto-polling every 20s
          </span>
        </div>
      </div>

      {/* Alert Feed */}
      <AlertFeed />

      {/* Footer trust badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-4 p-6 rounded-2xl"
        style={{
          background: "rgba(74,222,128,0.05)",
          border: "1px solid rgba(74,222,128,0.15)",
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.2)" }}
        >
          <ShieldCheck size={20} style={{ color: "#4ade80" }} />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Active Surveillance Engaged</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
            Clara monitors all active sessions for high-distress markers, phonetic anomalies, and crisis keywords in real-time.
          </p>
        </div>
        <Bell size={16} className="ml-auto flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
      </motion.div>
    </div>
  );
}
