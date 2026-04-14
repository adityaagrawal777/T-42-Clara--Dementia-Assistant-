"use client";

import React, { useEffect, useState } from "react";
import { Session } from "@/types";
import { format } from "date-fns";
import { MessageSquare, AlertTriangle, Loader2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";

interface Props {
  patientId?: string;
}

export const SessionList: React.FC<Props> = ({ patientId }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    apiFetch(`/api/v1/caregiver/patients/${patientId}/sessions`)
      .then((data: any[]) => setSessions(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (!patientId) {
    return (
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Recent Sessions</h3>
        </div>
        <div className="p-12 text-center bg-slate-50/30 rounded-3xl border-2 border-dashed border-slate-200">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-semibold">Select a patient to view sessions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm transition-all hover:shadow-md">
      <div className="flex justify-between items-center mb-10">
        <h3 className="text-xl font-bold text-slate-800 tracking-tight">Recent Sessions</h3>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      )}

      {!loading && error && (
        <div className="p-8 text-center bg-rose-50/30 rounded-3xl border-2 border-dashed border-rose-200">
          <p className="text-rose-600 font-semibold text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <div className="p-12 text-center bg-slate-50/30 rounded-3xl border-2 border-dashed border-slate-200">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-semibold">No sessions recorded yet</p>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && (
        <div className="overflow-hidden border border-slate-50 rounded-2xl">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Date / Time</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Interactions</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Alerts</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-slate-50/10 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{format(new Date(session.start_time), "MMM d, yyyy")}</span>
                      <span className="text-xs font-semibold text-slate-400">{format(new Date(session.start_time), "h:mm a")}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-clara-calm-bg text-clara-calm-text rounded-xl font-bold text-sm w-fit mx-auto border border-clara-calm-border">
                      <MessageSquare className="w-4 h-4" />
                      {session.message_count}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-sm w-fit mx-auto border ${
                      session.alert_count > 0
                        ? "bg-rose-50 text-rose-500 border-rose-100"
                        : "bg-slate-50 text-slate-400 border-slate-100"
                    }`}>
                      <AlertTriangle className={`w-4 h-4 ${session.alert_count > 0 ? "animate-pulse" : ""}`} />
                      {session.alert_count}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/caregiver/patients/${session.patient_id}`)}
                      className="rounded-xl border-slate-100 text-slate-400 hover:text-slate-800 hover:border-slate-300"
                    >
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
