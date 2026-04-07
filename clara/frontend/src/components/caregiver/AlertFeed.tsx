"use client";

import React, { useState } from "react";
import { Alert } from "@/types";
import { format } from "date-fns";
import { Bell, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

const dummyAlerts: Alert[] = [
  {
    id: "1",
    severity: "high",
    trigger_phrase: "I'm scared and don't know where I am.",
    timestamp: new Date().toISOString(),
    is_resolved: false,
  },
  {
    id: "2",
    severity: "medium",
    trigger_phrase: "Can someone help me find the bathroom?",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    is_resolved: false,
  },
];

export const AlertFeed: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>(dummyAlerts);

  const resolve = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id));
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
        <span className="px-4 py-2 bg-rose-100 text-rose-600 rounded-xl text-xs font-bold uppercase tracking-widest">{alerts.length} Active</span>
      </div>
      
      <div className="space-y-6">
        {alerts.map((alert) => (
          <div 
            key={alert.id} 
            className={`p-8 rounded-3xl border-2 transition-all hover:scale-[1.01] ${
              alert.severity === "high" 
                ? "bg-rose-50/30 border-rose-100 hover:border-rose-200" 
                : "bg-amber-50/30 border-amber-100 hover:border-amber-200"
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex gap-4 items-center mb-6">
                  <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${
                    alert.severity === "high" ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                  }`}>
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
    </div>
  );
};
