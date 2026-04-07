"use client";

import React from "react";
import { useClaraStore } from "@/store/claraStore";
import { AlertCircle, X } from "lucide-react";
import { clsx } from "clsx";

export const AlertNotification = () => {
    const { alerts, clearAlerts } = useClaraStore();
    
    // Only show if there are active alerts
    if (alerts.length === 0) return null;

    const latest = alerts[0];

    return (
        <div className="fixed top-6 right-6 z-[9999] w-full max-w-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={clsx(
                "relative flex items-start gap-4 p-5 rounded-2xl shadow-2xl border backdrop-blur-md",
                latest.severity === "high" || latest.severity === "critical" ? "bg-red-50/90 border-red-200" : "bg-orange-50/90 border-orange-200"
            )}>
                <div className={clsx(
                    "p-2 rounded-xl shrink-0",
                    latest.severity === "high" || latest.severity === "critical" ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
                )}>
                    <AlertCircle className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className={clsx(
                        "text-sm font-semibold mb-1",
                        latest.severity === "high" || latest.severity === "critical" ? "text-red-900" : "text-orange-900"
                    )}>
                        Clinical Alert
                    </h3>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {latest.trigger_phrase}
                    </p>
                    <p className="mt-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Detected at {new Date(latest.timestamp).toLocaleTimeString()}
                    </p>
                </div>


                <button 
                    onClick={clearAlerts}
                    className="p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
                >
                    <X className="w-4 h-4 text-slate-400" />
                </button>
            </div>
        </div>
    );
};
