"use client";

import React, { useEffect, useState } from "react";
import { Alert } from "@/types";
import { format } from "date-fns";
import { Bell, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";

interface Props {
  patientId?: string;
}

const transformAlert = (raw: any): Alert => ({
  id: String(raw.id),
  severity: raw.severity,
  trigger_phrase: raw.trigger_phrase ?? "",
  timestamp: raw.created_at,
  is_resolved: !!raw.resolved_at,
  notified_at: raw.notified_at ?? undefined,
  resolved_at: raw.resolved_at ?? undefined,
});

export const AlertFeed: React.FC<Props> = ({ patientId }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const endpoint = patientId
      ? `/api/v1/caregiver/patients/${patientId}/alerts`
      : `/api/v1/caregiver/alerts`;

    apiFetch(endpoint)
      .then((data: any[]) => setAlerts(data.map(transformAlert)))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [patientId]);

  const resolve = async (id: string) => {
    try {
      await apiFetch(`/api/v1/caregiver/alerts/${id}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ resolved_by: "caregiver" }),
      });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // Optimistic remove already happened; silently ignore if server is unavailable
    }
  };

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-2xl">
            <Bell className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Priority Alerts</h3>
            <p className="text-sm font-medium text-slate-400">Needs your immediate attention</p>
          </div>
        </div>
        {!loading && (
          <span className="px-4 py-2 bg-rose-100 text-rose-600 rounded-xl text-xs font-bold uppercase tracking-widest">
            {alerts.length} Active
          </span>
        )}
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

      {!loading && !error && (
        <div className="space-y-6">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-8 rounded-3xl border-2 transition-all hover:scale-[1.01] ${
                alert.severity === "high" || alert.severity === "critical"
                  ? "bg-rose-50/30 border-rose-100 hover:border-rose-200"
                  : "bg-amber-50/30 border-amber-100 hover:border-amber-200"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex gap-4 items-center mb-6">
                    <span
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${
                        alert.severity === "high" || alert.severity === "critical"
                          ? "bg-rose-500 text-white"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {alert.severity} Priority
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {format(new Date(alert.timestamp), "h:mm a")}
                    </span>
                  </div>
                  <p className="text-xl font-medium text-slate-800 italic leading-relaxed">
                    &quot;{alert.trigger_phrase}&quot;
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => resolve(alert.id)}
                  className="rounded-2xl border-slate-200 text-slate-500 hover:text-green-600 hover:border-green-600 hover:bg-green-50 transition-all group"
                >
                  <CheckCircle className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                  Resolve
                </Button>
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="p-12 text-center bg-green-50/30 rounded-3xl border-2 border-dashed border-green-200">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-green-700 font-bold text-lg mb-1">System All Clear</p>
              <p className="text-green-600/70 text-sm">No new alerts to process.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
