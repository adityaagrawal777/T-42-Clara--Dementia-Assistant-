"use client";

import React from "react";
import { Session } from "@/types";
import { format } from "date-fns";
import { MessageSquare, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

const dummySessions: Session[] = [
  {
    id: "1",
    patient_id: "p1",
    start_time: new Date(Date.now() - 3600000).toISOString(),
    message_count: 12,
    alert_count: 1,
  },
  {
    id: "2",
    patient_id: "p1",
    start_time: new Date(Date.now() - 86400000).toISOString(),
    message_count: 45,
    alert_count: 0,
  },
];

export const SessionList: React.FC = () => {
  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm transition-all hover:shadow-md">
      <div className="flex justify-between items-center mb-10">
        <h3 className="text-xl font-bold text-slate-800 tracking-tight">Recent Sessions</h3>
        <Button variant="ghost" size="sm" className="text-clara-calm-text font-bold uppercase tracking-widest text-xs">View History</Button>
      </div>
      
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
            {dummySessions.map((session) => (
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
                  <Button variant="outline" size="sm" className="rounded-xl border-slate-100 text-slate-400 hover:text-slate-800 hover:border-slate-300">
                    Review
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
