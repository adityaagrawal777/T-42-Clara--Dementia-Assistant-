"use client";

import React, { useEffect, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Bell, CheckCircle, Loader2, ShieldAlert, Clock, Activity, Users } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { CaregiverAlertEntry } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  patientId?: string;
}

export const AlertFeed: React.FC<Props> = ({ patientId }) => {
  const [alerts, setAlerts] = useState<CaregiverAlertEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const endpoint = patientId
      ? `/api/v1/caregiver/patients/${patientId}/alerts`
      : `/api/v1/caregiver/alerts`;

    apiFetch(endpoint)
      .then((data: unknown) => setAlerts(data as CaregiverAlertEntry[]))
      .catch((err: Error) => { if (!silent) setError(err.message); })
      .finally(() => { if (!silent) setLoading(false); });
  }, [patientId]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => fetchAlerts(true), 20_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const resolve = async (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    try {
      await apiFetch(`/api/v1/caregiver/alerts/${alertId}/resolve`, { method: "PATCH" });
    } catch { /* silent */ }
  };

  if (loading) {
    return (
      <div
        className="rounded-2xl p-16 flex items-center justify-center min-h-[360px]"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-9 h-9 animate-spin" style={{ color: "#6ee7b7" }} />
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.4)" }}>
            Syncing Feed...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden h-full flex flex-col"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Header */}
      <div
        className="px-6 py-5 flex items-center justify-between sticky top-0 z-20"
        style={{
          background: "rgba(15,23,42,0.8)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.25)" }}
          >
            <Bell size={18} style={{ color: "#f87171" }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Priority Queue</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
              Pending Resolution
            </p>
          </div>
        </div>
        {!error && alerts.length > 0 && (
          <span
            className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] text-white"
            style={{ background: "#ef4444" }}
          >
            {alerts.length} Incident{alerts.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
        {error && (
          <div
            className="p-10 text-center rounded-xl border-2 border-dashed"
            style={{ borderColor: "rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.05)" }}
          >
            <p className="text-sm font-bold" style={{ color: "#f87171" }}>{error}</p>
          </div>
        )}

        {!error && (
          <AnimatePresence initial={false}>
            {alerts.map((alert, idx) => {
              const isCritical = alert.severity === "high" || alert.severity === "critical";
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, scale: 0.97, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, x: 16 }}
                  transition={{ delay: idx * 0.04 }}
                  className="relative rounded-xl overflow-hidden"
                  style={{
                    background: isCritical ? "rgba(248,113,113,0.06)" : "rgba(251,191,36,0.05)",
                    border: `1px solid ${isCritical ? "rgba(248,113,113,0.18)" : "rgba(251,191,36,0.18)"}`,
                  }}
                >
                  {/* Severity stripe */}
                  <div
                    className="absolute top-0 bottom-0 left-0 w-1"
                    style={{ background: isCritical ? "#ef4444" : "#f59e0b" }}
                  />

                  <div className="p-5 pl-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 pl-2">
                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 items-center mb-3">
                        <span
                          className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] text-white"
                          style={{ background: isCritical ? "#ef4444" : "#f59e0b" }}
                        >
                          {alert.severity} Condition
                        </span>
                        <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                          <Clock size={11} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {format(parseISO(alert.created_at), "h:mm a · MMM d")}
                          </span>
                        </div>
                        {alert.mood_at_trigger && (
                          <div
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.09)",
                              color: "rgba(255,255,255,0.55)",
                            }}
                          >
                            <Activity size={10} />
                            <span className="text-[10px] font-bold capitalize">Mood: {alert.mood_at_trigger}</span>
                          </div>
                        )}
                      </div>

                      {/* Trigger phrase */}
                      {alert.trigger_phrase && (
                        <p className="text-sm font-semibold text-white leading-snug mb-3">
                          &ldquo;{alert.trigger_phrase}&rdquo;
                        </p>
                      )}

                      {/* Meta row */}
                      <div className="flex items-center gap-4" style={{ color: "rgba(255,255,255,0.35)" }}>
                        <div className="flex items-center gap-1.5">
                          <ShieldAlert size={11} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">
                            {alert.rule_name || "Unknown Rule"}
                          </span>
                        </div>
                        <Link
                          href={`/caregiver/patients/${alert.patient_id}`}
                          className="flex items-center gap-1.5 transition-colors"
                          style={{ color: "rgba(255,255,255,0.35)" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#6ee7b7"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.35)"; }}
                        >
                          <Users size={11} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Patient File</span>
                        </Link>
                      </div>
                    </div>

                    {/* Acknowledge button */}
                    <button
                      onClick={() => resolve(alert.id)}
                      className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all text-xs font-bold uppercase tracking-widest"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.6)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#16a34a";
                        e.currentTarget.style.borderColor = "#16a34a";
                        e.currentTarget.style.color = "#fff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                        e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                      }}
                    >
                      <CheckCircle size={14} />
                      Acknowledge
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* Empty state */}
        {!error && alerts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-14 text-center rounded-xl border-2 border-dashed"
            style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.01)" }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.2)" }}
            >
              <CheckCircle size={32} style={{ color: "#4ade80" }} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Queue Clear</h4>
            <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
              No unresolved priority alerts detected across the active cohort.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
