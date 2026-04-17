"use client";

import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    setLoading(true);
    setError(null);

    const endpoint = patientId
      ? `/api/v1/caregiver/patients/${patientId}/alerts`
      : `/api/v1/caregiver/alerts`;

    apiFetch(endpoint)
      .then((data: any) => setAlerts(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [patientId]);

  const resolve = async (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    try {
      await apiFetch(`/api/v1/caregiver/alerts/${alertId}/resolve`, {
        method: "PATCH",
      });
    } catch {
      // Re-fetch or handle error silently as per previous logic
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-[2.5rem] border-white/[0.05] p-20 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-clara-primary" />
          <p className="text-xs font-black text-clara-text-tertiary uppercase tracking-[0.2em]">Syncing Feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-[2.5rem] border-white/[0.05] shadow-2xl overflow-hidden h-full flex flex-col">
      <div className="p-8 flex items-center justify-between border-b border-white/[0.05] sticky top-0 bg-clara-surface/10 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-danger-muted border border-danger/20 rounded-2xl flex items-center justify-center text-danger">
            <Bell size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">Priority Queue</h3>
            <p className="text-[10px] font-bold text-clara-text-tertiary uppercase tracking-widest mt-1">Pending Resolution</p>
          </div>
        </div>
        {!error && alerts.length > 0 && (
          <div className="px-4 py-2 bg-danger text-white rounded-xl text-[10px] font-black uppercase tracking-[0.1em] shadow-glow-sm">
            {alerts.length} Incident{alerts.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {error ? (
          <div className="p-12 text-center bg-danger-muted/20 rounded-[2rem] border-2 border-dashed border-danger/30">
            <p className="text-danger font-bold text-sm tracking-tight">{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {alerts.map((alert, idx) => {
                const isCritical = alert.severity === "high" || alert.severity === "critical";
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: 20 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`relative p-6 rounded-[2rem] border border-white/[0.08] group overflow-hidden transition-all hover:bg-white/[0.02] ${
                      isCritical ? "bg-danger-muted/10" : "bg-white/[0.01]"
                    }`}
                  >
                    {/* Urgency Line Indicator */}
                    <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${isCritical ? "bg-danger" : "bg-warning"}`}></div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 pl-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-3 items-center mb-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] ${
                              isCritical ? "bg-danger text-white shadow-glow-sm" : "bg-warning text-black"
                            }`}>
                            {alert.severity} Condition
                          </span>
                          <div className="flex items-center gap-1.5 text-clara-text-tertiary">
                            <Clock size={12} strokeWidth={2.5} />
                            <span className="text-[10px] font-black uppercase tracking-wider">
                              {format(parseISO(alert.created_at), "h:mm a · MMM d")}
                            </span>
                          </div>
                          {alert.mood_at_trigger && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-clara-text-secondary">
                              <Activity size={10} />
                              <span className="text-[10px] font-bold capitalize">Mood: {alert.mood_at_trigger}</span>
                            </div>
                          )}
                        </div>

                        {alert.trigger_phrase && (
                          <h4 className="text-base font-bold text-slate-100 leading-snug group-hover:text-white transition-colors">
                            &ldquo;{alert.trigger_phrase}&rdquo;
                          </h4>
                        )}

                        <div className="flex items-center gap-4 mt-3 opacity-60">
                           <div className="flex items-center gap-1.5">
                              <ShieldAlert size={12} />
                              <span className="text-[10px] font-bold text-clara-text-tertiary uppercase tracking-widest">{alert.rule_name || "Unknown Rule"}</span>
                           </div>
                           <Link href={`/caregiver/patients/${alert.patient_id}`} className="flex items-center gap-1.5 hover:text-clara-primary transition-colors">
                              <Users size={12} />
                              <span className="text-[10px] font-bold text-clara-text-tertiary uppercase tracking-widest">Patient File</span>
                           </Link>
                        </div>
                      </div>

                      <button
                        onClick={() => resolve(alert.id)}
                        className="shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/[0.04] hover:bg-success hover:text-white border border-white/[0.08] hover:border-success text-clara-text-secondary transition-all font-black text-xs uppercase tracking-widest group/btn shadow-inner-glow"
                      >
                        <CheckCircle size={16} className="group-hover/btn:scale-110 transition-transform" />
                        Acknowledge
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Empty State */}
            {alerts.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-16 text-center border-2 border-dashed border-white/[0.05] rounded-[2.5rem] bg-white/[0.01]"
              >
                <div className="w-20 h-20 bg-success/10 rounded-[2rem] flex items-center justify-center text-success mx-auto mb-6 shadow-glow-sm">
                  <CheckCircle size={40} />
                </div>
                <h4 className="text-xl font-black text-white mb-2 tracking-tight">Queue Clear</h4>
                <p className="text-clara-text-secondary font-medium max-w-xs mx-auto text-sm">No unresolved priority alerts detected across the active cohort.</p>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
