"use client";

import React, { useEffect, useState } from "react";
import { format, parseISO, intervalToDuration } from "date-fns";
import {
  MessageSquare,
  AlertTriangle,
  Loader2,
  CalendarDays,
  Clock,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { SessionTranscript } from "./SessionTranscript";
import type { SessionHistoryEntry } from "@/types";

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

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  patientId?: string;
}

export const SessionList: React.FC<Props> = ({ patientId }) => {
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    apiFetch(`/api/v1/caregiver/patients/${patientId}/sessions`)
      .then((data: unknown) => setSessions(data as SessionHistoryEntry[]))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [patientId]);

  // ── No patient ────────────────────────────────────────────────────────────

  if (!patientId) {
    return (
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-8">
          Recent Sessions
        </h3>
        <div className="p-12 text-center bg-slate-50/30 rounded-3xl border-2 border-dashed border-slate-200">
          <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold text-sm">
            Select a patient to view sessions
          </p>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-center h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-6">
          Recent Sessions
        </h3>
        <div className="p-8 text-center bg-rose-50/40 rounded-3xl border-2 border-dashed border-rose-200">
          <p className="text-rose-600 font-semibold text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────

  if (sessions.length === 0) {
    return (
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-6">
          Recent Sessions
        </h3>
        <div className="p-12 text-center bg-slate-50/30 rounded-3xl border-2 border-dashed border-slate-200">
          <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold text-sm">No sessions recorded yet</p>
        </div>
      </div>
    );
  }

  // ── Table ─────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm transition-all hover:shadow-md overflow-hidden">
      {/* Table header */}
      <div className="px-8 pt-8 pb-4 flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800 tracking-tight">Recent Sessions</h3>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-y border-slate-100">
            <tr>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                Date / Time
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                Duration
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
                Messages
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
                Alerts
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                Mood
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <React.Fragment key={session.id}>
                <tr className="border-t border-slate-50 hover:bg-slate-50/30 transition-colors">
                  {/* Date/Time */}
                  <td className="px-8 py-5">
                    <span className="font-bold text-slate-800 text-sm block">
                      {format(parseISO(session.started_at), "MMM d, yyyy")}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {format(parseISO(session.started_at), "h:mm a")}
                    </span>
                  </td>

                  {/* Duration */}
                  <td className="px-6 py-5">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {sessionDuration(session)}
                    </span>
                  </td>

                  {/* Message count */}
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-clara-calm-bg text-clara-calm-text rounded-xl font-bold text-sm w-fit mx-auto border border-clara-calm-border">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {session.message_count}
                    </div>
                  </td>

                  {/* Alert count */}
                  <td className="px-6 py-5">
                    <div
                      className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl font-bold text-sm w-fit mx-auto border ${
                        session.alert_count > 0
                          ? "bg-rose-50 text-rose-500 border-rose-100"
                          : "bg-slate-50 text-slate-400 border-slate-100"
                      }`}
                    >
                      <AlertTriangle
                        className={`w-3.5 h-3.5 ${session.alert_count > 0 ? "animate-pulse" : ""}`}
                      />
                      {session.alert_count}
                    </div>
                  </td>

                  {/* Mood summary */}
                  <td className="px-6 py-5">
                    {session.mood_summary ? (
                      <span className="text-sm font-semibold text-slate-600 capitalize">
                        {session.mood_summary}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-300 italic">—</span>
                    )}
                  </td>
                </tr>

                {/* Inline transcript expander */}
                <tr className="border-t-0">
                  <td colSpan={5} className="p-0">
                    <SessionTranscript
                      patientId={session.patient_id}
                      sessionId={session.id}
                    />
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
