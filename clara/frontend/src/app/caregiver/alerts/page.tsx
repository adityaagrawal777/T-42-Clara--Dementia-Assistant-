"use client";

import React from "react";
import { AlertFeed } from "@/components/caregiver/AlertFeed";
import { Bell, ShieldCheck } from "lucide-react";

export default function AlertsPage() {
  return (
    <div className="space-y-12">
      <div className="bg-slate-900 p-16 rounded-[48px] border-8 border-slate-800 shadow-2xl relative overflow-hidden text-center text-white">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-rose-500/10 blur-[150px] -mt-48 transition-all hover:scale-110" />
        <Bell className="w-12 h-12 text-rose-500 mx-auto mb-8 relative" />
        <h1 className="text-4xl font-black tracking-tight mb-4 relative">Safety Command Center</h1>
        <p className="max-w-xl mx-auto text-slate-400 font-bold text-sm uppercase tracking-[0.2em] relative">Real-time phrase and sentiment monitoring</p>
      </div>

      <div className="max-w-5xl mx-auto w-full">
        <AlertFeed />
      </div>

      <div className="max-w-xl mx-auto p-8 bg-green-50/20 border-2 border-green-100 rounded-3xl text-center">
        <ShieldCheck className="w-8 h-8 text-green-500 mx-auto mb-4" />
        <p className="text-green-800 font-bold mb-1">Clara’s Active Monitoring</p>
        <p className="text-green-600/70 text-xs font-semibold px-8 leading-relaxed">System is continuously scanning for high-distress markers, confusion, and emergency help requests.</p>
      </div>
    </div>
  );
}
