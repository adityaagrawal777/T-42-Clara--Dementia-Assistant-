"use client";

import React from "react";
import { MoodTimeline } from "@/components/caregiver/MoodTimeline";
import { SessionList } from "@/components/caregiver/SessionList";
import { AlertFeed } from "@/components/caregiver/AlertFeed";
import { AlertTriangle, Clock, TrendingUp, Users } from "lucide-react";

export default function CaregiverDashboard() {
  const stats = [
    { label: "Active Sessions", value: "3", icon: Clock, color: "bg-blue-50 text-blue-600" },
    { label: "Stability Index", value: "84%", icon: TrendingUp, color: "bg-green-50 text-green-600" },
    { label: "Total Patients", value: "12", icon: Users, color: "bg-purple-50 text-purple-600" },
    { label: "Unresolved Alerts", value: "2", icon: AlertTriangle, color: "bg-rose-50 text-rose-600" },
  ];

  return (
    <div className="space-y-12 pb-20">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] group">
            <div className="flex items-center gap-6">
              <div className={`p-5 rounded-2xl group-hover:scale-110 transition-transform ${stat.color}`}>
                <stat.icon className="w-8 h-8" />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</span>
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-12">
          <MoodTimeline />
          <SessionList />
        </div>

        {/* Sidebar Alerts */}
        <div className="lg:col-span-1 space-y-12">
          <AlertFeed />
        </div>
      </div>
    </div>
  );
}
