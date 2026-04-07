"use client";

import React from "react";
import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";

const dummyPatients = [
  { id: "p1", name: "Alice Thompson", sessionStatus: "Active", lastSeen: "2 mins ago" },
  { id: "p2", name: "Charlie Davis", sessionStatus: "Idle", lastSeen: "1 hour ago" },
];

export default function PatientsListPage() {
  return (
    <div className="space-y-12">
      <div className="bg-white p-16 rounded-[48px] border border-slate-100 shadow-xl relative overflow-hidden text-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-clara-calm-bg opacity-10 rounded-full blur-3xl -mr-32 -mt-32" />
        <Users className="w-12 h-12 text-clara-calm-text mx-auto mb-8 relative" />
        <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-4 relative">Active Monitoring</h1>
        <p className="max-w-xl mx-auto text-slate-400 font-bold text-sm uppercase tracking-widest relative">Review and manage patient companions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full">
        {dummyPatients.map((patient) => (
          <Link key={patient.id} href={`/caregiver/patients/${patient.id}`}>
            <div className="bg-white p-8 rounded-[32px] border-2 border-slate-50 hover:border-clara-calm-border transition-all hover:shadow-xl hover:scale-[1.02] bg-gradient-to-tr hover:from-slate-50 group">
              <div className="flex justify-between items-start mb-10">
                <div className="w-20 h-20 bg-slate-100 rounded-[24px] flex items-center justify-center text-3xl font-black text-slate-300 group-hover:bg-clara-calm-bg group-hover:text-clara-calm-text transition-all shadow-inner">
                  {patient.name.split(" ").map(n => n[0]).join("")}
                </div>
                <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
                  patient.sessionStatus === "Active" ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                }`}>
                  {patient.sessionStatus}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">{patient.name}</h2>
              <div className="flex items-center gap-4">
                <p className="text-sm font-semibold text-slate-400">Last seen {patient.lastSeen}</p>
                <div className="flex-1 h-[2px] bg-slate-50" />
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-clara-calm-text transform group-hover:translate-x-2 transition-all" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
