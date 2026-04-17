"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Users, ArrowRight, Loader2, ShieldPlus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { PatientListItem } from "@/types";
import { motion } from "framer-motion";

export default function PatientsListPage() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/v1/patients/")
      .then((data: unknown) => setPatients(data as PatientListItem[]))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10">
      {/* Page Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-14 rounded-[3rem] border-white/[0.05] shadow-2xl relative overflow-hidden text-center"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-clara-primary/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
        <div className="w-12 h-12 bg-clara-primary/10 border border-clara-primary/20 rounded-2xl flex items-center justify-center text-clara-primary mx-auto mb-8 shadow-glow-sm">
           <Users size={24} strokeWidth={2.5} />
        </div>
        <h1 className="text-4xl md:text-5xl font-serif text-white tracking-tight mb-4 relative">
          The Care Horizon
        </h1>
        <p className="max-w-xl mx-auto text-clara-text-tertiary font-black text-[10px] uppercase tracking-[0.25em] relative">
          Managing your active patient cohort
        </p>
        {!loading && !error && (
          <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-clara-text-secondary text-[11px] font-black uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-clara-primary animate-pulse" />
            {patients.length} Registered Companions
          </div>
        )}
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-clara-primary" />
          <p className="text-[10px] font-black text-clara-text-tertiary uppercase tracking-widest">Accessing Roster...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="glass-card bg-danger/5 border border-danger/20 rounded-[2rem] px-10 py-8 text-danger font-bold text-center">
          <p className="mb-2">System Error: Failed to synchronize patient list.</p>
          <p className="text-xs opacity-60 font-medium">Internal Response: {error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && patients.length === 0 && (
        <div className="glass-card rounded-[3rem] border-white/[0.05] py-32 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-white/[0.03] rounded-[2.5rem] flex items-center justify-center mb-6 text-clara-text-muted">
            <ShieldPlus size={40} />
          </div>
          <h4 className="text-xl font-black text-white mb-2">Cohort Empty</h4>
          <p className="text-clara-text-secondary max-w-xs px-10 mb-8 font-medium">New patient registrations will automatically populate this roster once the onboarding flow is completed.</p>
        </div>
      )}

      {/* Patient Grid */}
      {!loading && !error && patients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
          {patients.map((patient, idx) => (
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link href={`/caregiver/patients/${patient.id}`}>
                <div className="glass-card p-8 rounded-[2.5rem] border-white/[0.05] hover:border-clara-primary/30 transition-all hover:shadow-glow-sm hover:scale-[1.02] group cursor-pointer h-full flex flex-col">
                  <div className="flex justify-between items-start mb-8">
                    {/* Avatar Pill */}
                    <div className="w-14 h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl flex items-center justify-center text-lg font-black text-clara-text-tertiary group-hover:bg-clara-primary/10 group-hover:text-clara-primary transition-all shadow-inner-glow">
                      {patient.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                    </div>

                    {/* Status badge */}
                    <span
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${
                        patient.is_active
                          ? "bg-success/10 text-success border border-success/20 shadow-glow-sm"
                          : "bg-white/[0.03] text-clara-text-muted border border-white/[0.05]"
                      }`}
                    >
                      {patient.is_active && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}
                      {patient.is_active ? "Live" : "Standby"}
                    </span>
                  </div>

                  <div className="flex-1">
                    <h2 className="text-xl font-black text-white tracking-tight mb-1 group-hover:text-clara-primary-light transition-colors">
                      {patient.name}
                    </h2>

                    {patient.preferred_name && patient.preferred_name !== patient.name && (
                      <p className="text-xs text-clara-text-tertiary font-bold uppercase tracking-widest mt-1">
                        &ldquo;{patient.preferred_name}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-8 pt-6 border-t border-white/[0.05]">
                    <p className="text-[10px] font-black text-clara-text-tertiary uppercase tracking-widest">
                      Joined {format(parseISO(patient.created_at), "MMM yyyy")}
                    </p>
                    <div className="flex-1" />
                    <div className="w-8 h-8 rounded-full bg-white/[0.03] group-hover:bg-clara-primary group-hover:text-white flex items-center justify-center transition-all">
                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
