"use client";

import React, { useEffect, useState } from "react";
import { format, parseISO, intervalToDuration } from "date-fns";
import {
  MessageSquare,
  AlertTriangle,
  Loader2,
  CalendarDays,
  Clock,
  ChevronDown,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { SessionTranscript } from "./SessionTranscript";
import type { SessionHistoryEntry } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sessionDuration(entry: SessionHistoryEntry): string {
  if (!entry.ended_at) return "Ongoing";
  const d = intervalToDuration({
    start: parseISO(entry.started_at),
    end: parseISO(entry.ended_at),
  });
  const parts: string[] = [];
  if (d.hours) parts.push(`${d.hours}h`);
  if (d.minutes) parts.push(`${d.minutes}m`);
  return parts.length ? parts.join(" ") : "< 1 min";
}

function moodLevel(mood: string | null): { color: string; dot: string } {
    if (!mood) return { color: "text-clara-text-muted", dot: "bg-slate-700" };
    const map: Record<string, { color: string; dot: string }> = {
      calm: { color: "text-success", dot: "bg-success" },
      happy: { color: "text-clara-primary-light", dot: "bg-clara-primary" },
      confused: { color: "text-warning", dot: "bg-warning" },
      distressed: { color: "text-danger", dot: "bg-danger" },
    };
    return map[mood.toLowerCase()] ?? { color: "text-clara-text-tertiary", dot: "bg-slate-500" };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  patientId?: string;
}

export const SessionList: React.FC<Props> = ({ patientId }) => {
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    apiFetch(`/api/v1/caregiver/patients/${patientId}/sessions`)
      .then((data: unknown) => setSessions(data as SessionHistoryEntry[]))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (!patientId) return null;

  if (loading) {
    return (
      <div className="glass-dark rounded-[2.5rem] flex flex-col items-center justify-center h-[300px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-clara-primary" />
        <p className="text-[10px] font-black text-clara-text-tertiary uppercase tracking-widest">Reconstructing History...</p>
      </div>
    );
  }

  return (
    <div className="glass-dark rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
      <div className="p-8 pb-4 flex items-center justify-between border-b border-white/[0.05]">
        <div>
          <h3 className="text-xl font-black text-white tracking-tight">Record Timeline</h3>
          <p className="text-[10px] font-bold text-clara-text-tertiary uppercase tracking-widest mt-1">Chat & Voice History</p>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[10px] font-black text-clara-text-muted uppercase tracking-widest">
           {sessions.length} Entry{sessions.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="divide-y divide-white/[0.03]">
        {sessions.length === 0 && !error && (
            <div className="p-20 text-center">
                <CalendarDays className="w-12 h-12 text-white/[0.05] mx-auto mb-4" />
                <p className="text-xs font-bold text-clara-text-muted uppercase tracking-widest italic opacity-40">No historical data found</p>
            </div>
        )}

        {error && (
            <div className="p-10 text-center bg-danger/5 border-danger/10">
                <p className="text-xs font-bold text-danger uppercase tracking-widest">{error}</p>
            </div>
        )}

        {sessions.map((session, idx) => {
          const isExpanded = expandedId === session.id;
          const mood = moodLevel(session.mood_summary);
          
          return (
            <motion.div 
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex flex-col group overflow-hidden"
            >
              <button 
                onClick={() => setExpandedId(isExpanded ? null : session.id)}
                className={`flex items-center gap-6 p-6 transition-all text-left hover:bg-white/[0.02] ${isExpanded ? "bg-white/[0.03]" : ""}`}
              >
                {/* Date Plate */}
                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col items-center justify-center shrink-0">
                  <span className="text-xs font-black text-white leading-none">{format(parseISO(session.started_at), "d")}</span>
                  <span className="text-[8px] font-black text-clara-text-tertiary uppercase tracking-widest mt-0.5">{format(parseISO(session.started_at), "MMM")}</span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-black text-white tracking-tight uppercase tracking-[0.05em]">
                        {format(parseISO(session.started_at), "h:mm a")}
                    </span>
                    <span className="text-white/20 px-1">·</span>
                    <span className="text-[11px] font-medium text-clara-text-tertiary flex items-center gap-1.5 uppercase tracking-widest">
                        <Clock size={10} /> {sessionDuration(session)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                     <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-clara-primary/5 text-clara-primary-light text-[9px] font-black uppercase tracking-widest border border-clara-primary/10">
                        <MessageSquare size={10} /> {session.message_count}
                     </div>
                     {session.alert_count > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-danger/10 text-danger text-[9px] font-black uppercase tracking-widest border border-danger/20 animate-pulse">
                            <AlertTriangle size={10} /> {session.alert_count}
                        </div>
                     )}
                  </div>
                </div>

                {/* Mood Tag */}
                <div className="hidden md:flex flex-col items-end gap-1.5">
                    {session.mood_summary ? (
                        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] px-3 py-1 rounded-xl">
                            <div className={`w-1.5 h-1.5 rounded-full ${mood.dot} shadow-glow-sm`} />
                            <span className={`text-[9px] font-black uppercase tracking-widest ${mood.color}`}>{session.mood_summary}</span>
                        </div>
                    ) : (
                        <span className="text-[9px] font-bold text-clara-text-muted italic px-3">Flat baseline</span>
                    )}
                </div>

                {/* Arrow */}
                <div className={`text-clara-text-tertiary transition-transform duration-300 ml-4 ${isExpanded ? "rotate-180" : ""}`}>
                  <ChevronDown size={18} />
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/[0.05] bg-clara-surface/10"
                  >
                    <div className="p-8">
                       <SessionTranscript
                        patientId={session.patient_id}
                        sessionId={session.id}
                       />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
