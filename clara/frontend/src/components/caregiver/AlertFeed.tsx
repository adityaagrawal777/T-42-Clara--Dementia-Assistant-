"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { format, parseISO } from "date-fns";
import {
  Bell, CheckCircle, Loader2, ShieldAlert, Clock, Activity,
  Users, User, ChevronDown, ChevronUp, PhoneCall, StopCircle, AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { CaregiverAlertEntry } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  patientId?: string;
}

// ── Escalation guide per severity ─────────────────────────────────────────────
const ESCALATION_GUIDE: Record<string, { steps: string[]; callout?: string }> = {
  critical: {
    callout: "This is a critical emergency. Act immediately.",
    steps: [
      "Call the patient right now — do not wait.",
      "If no answer within 2 minutes, contact emergency services.",
      "Notify the patient's emergency contact.",
      "Document your response in clinical notes.",
    ],
  },
  high: {
    callout: "Urgent attention required within 15 minutes.",
    steps: [
      "Attempt to reach the patient by phone.",
      "Check on the patient in person if you are nearby.",
      "Review the conversation context shown below.",
      "Document your assessment in clinical notes.",
    ],
  },
  medium: {
    callout: "Monitor and follow up within 2 hours.",
    steps: [
      "Review the patient's recent mood trend on their profile.",
      "Schedule a check-in call or visit today.",
      "Watch for further escalation in the next session.",
    ],
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export const AlertFeed: React.FC<Props> = ({ patientId }) => {
  const [alerts, setAlerts] = useState<CaregiverAlertEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [endingSession, setEndingSession] = useState<string | null>(null);

  // Track known alert IDs to detect genuinely new ones for browser notifications
  const knownAlertIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  const fireNotification = useCallback((alert: CaregiverAlertEntry) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const name = alert.patient_name || "Unknown Patient";
    const severity = alert.severity.toUpperCase();
    const body = alert.trigger_phrase
      ? `"${alert.trigger_phrase.slice(0, 80)}"`
      : "Patient needs your attention.";

    try {
      const n = new Notification(`${severity} Alert — ${name}`, {
        body,
        icon: "/favicon.ico",
        tag: alert.id,
        requireInteraction: alert.severity === "critical" || alert.severity === "high",
      });
      // Auto-close medium/low after 8s
      if (alert.severity === "medium" || alert.severity === "low") {
        setTimeout(() => n.close(), 8000);
      }
    } catch {
      // Notification API blocked by browser policy — silently skip
    }
  }, []);

  const fetchAlerts = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const endpoint = patientId
      ? `/api/v1/caregiver/patients/${patientId}/alerts`
      : `/api/v1/caregiver/alerts`;

    apiFetch(endpoint)
      .then((data: unknown) => {
        const incoming = data as CaregiverAlertEntry[];

        // Detect new alerts and fire browser notifications (skip first load)
        if (!isFirstLoad.current) {
          incoming
            .filter((a) => !knownAlertIds.current.has(a.id))
            .forEach(fireNotification);
        }

        // Update known IDs tracking
        knownAlertIds.current = new Set(incoming.map((a) => a.id));
        isFirstLoad.current = false;

        setAlerts(incoming);
      })
      .catch((err: Error) => { if (!silent) setError(err.message); })
      .finally(() => { if (!silent) setLoading(false); });
  }, [patientId, fireNotification]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => fetchAlerts(true), 20_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const resolve = async (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    setExpandedGuide(null);
    try {
      await apiFetch(`/api/v1/caregiver/alerts/${alertId}/resolve`, { method: "PATCH" });
    } catch { /* silent */ }
  };

  const endSession = async (alert: CaregiverAlertEntry) => {
    setEndingSession(alert.patient_id);
    try {
      await apiFetch(`/api/v1/caregiver/patients/${alert.patient_id}/end-session`, { method: "POST" });
    } catch { /* silent */ } finally {
      setEndingSession(null);
    }
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
              const isGuideOpen = expandedGuide === alert.id;
              const guide = ESCALATION_GUIDE[alert.severity] ?? ESCALATION_GUIDE.medium;

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

                  <div className="p-5 pl-5 flex flex-col gap-4">
                    {/* Top row: patient info + action buttons */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0 pl-2">

                        {/* Patient name */}
                        {alert.patient_name && (
                          <div className="flex items-center gap-2 mb-3">
                            <div
                              className="flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0"
                              style={{ background: isCritical ? "rgba(248,113,113,0.20)" : "rgba(251,191,36,0.20)" }}
                            >
                              <User size={12} style={{ color: isCritical ? "#f87171" : "#f59e0b" }} />
                            </div>
                            <span className="text-sm font-bold text-white">{alert.patient_name}</span>
                            <span
                              className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.12em]"
                              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}
                            >
                              Patient
                            </span>
                          </div>
                        )}

                        {/* Badges row */}
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

                      {/* Action buttons */}
                      <div className="shrink-0 flex flex-col gap-2 min-w-[148px]">
                        {/* Acknowledge */}
                        <button
                          onClick={() => resolve(alert.id)}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-xs font-bold uppercase tracking-widest"
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
                          <CheckCircle size={13} />
                          Acknowledge
                        </button>

                        {/* End Session — shown only for critical/high */}
                        {isCritical && (
                          <button
                            onClick={() => endSession(alert)}
                            disabled={endingSession === alert.patient_id}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-xs font-bold uppercase tracking-widest"
                            style={{
                              background: "rgba(248,113,113,0.08)",
                              border: "1px solid rgba(248,113,113,0.25)",
                              color: "#f87171",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#ef4444";
                              e.currentTarget.style.borderColor = "#ef4444";
                              e.currentTarget.style.color = "#fff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(248,113,113,0.08)";
                              e.currentTarget.style.borderColor = "rgba(248,113,113,0.25)";
                              e.currentTarget.style.color = "#f87171";
                            }}
                          >
                            {endingSession === alert.patient_id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <StopCircle size={13} />
                            }
                            End Session
                          </button>
                        )}

                        {/* Call patient */}
                        <Link
                          href={`/caregiver/patients/${alert.patient_id}`}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-xs font-bold uppercase tracking-widest"
                          style={{
                            background: "rgba(96,165,250,0.08)",
                            border: "1px solid rgba(96,165,250,0.2)",
                            color: "#60a5fa",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLAnchorElement).style.background = "#2563eb";
                            (e.currentTarget as HTMLAnchorElement).style.borderColor = "#2563eb";
                            (e.currentTarget as HTMLAnchorElement).style.color = "#fff";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLAnchorElement).style.background = "rgba(96,165,250,0.08)";
                            (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(96,165,250,0.2)";
                            (e.currentTarget as HTMLAnchorElement).style.color = "#60a5fa";
                          }}
                        >
                          <PhoneCall size={13} />
                          View &amp; Call
                        </Link>
                      </div>
                    </div>

                    {/* Escalation Guide — collapsible */}
                    <div
                      className="pl-2 border-t"
                      style={{ borderColor: "rgba(255,255,255,0.07)" }}
                    >
                      <button
                        onClick={() => setExpandedGuide(isGuideOpen ? null : alert.id)}
                        className="w-full flex items-center justify-between pt-3 pb-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle
                            size={12}
                            style={{ color: isCritical ? "#fca5a5" : "#fcd34d" }}
                          />
                          <span
                            className="text-[10px] font-black uppercase tracking-[0.14em]"
                            style={{ color: isCritical ? "#fca5a5" : "#fcd34d" }}
                          >
                            What to do next
                          </span>
                        </div>
                        {isGuideOpen
                          ? <ChevronUp size={13} style={{ color: "rgba(255,255,255,0.4)" }} />
                          : <ChevronDown size={13} style={{ color: "rgba(255,255,255,0.4)" }} />
                        }
                      </button>

                      <AnimatePresence>
                        {isGuideOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pb-3 space-y-2">
                              {guide.callout && (
                                <p
                                  className="text-xs font-bold mb-2"
                                  style={{ color: isCritical ? "#fca5a5" : "#fcd34d" }}
                                >
                                  {guide.callout}
                                </p>
                              )}
                              {guide.steps.map((step, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                  <span
                                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5"
                                    style={{
                                      background: isCritical ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)",
                                      color: isCritical ? "#f87171" : "#f59e0b",
                                    }}
                                  >
                                    {i + 1}
                                  </span>
                                  <span
                                    className="text-xs leading-snug"
                                    style={{ color: "rgba(255,255,255,0.65)" }}
                                  >
                                    {step}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

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
