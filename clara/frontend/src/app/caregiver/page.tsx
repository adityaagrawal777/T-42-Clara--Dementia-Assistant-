"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Clock, TrendingUp, Users, ArrowRight, Loader2, Zap, Activity } from "lucide-react";
import { AlertFeed } from "@/components/caregiver/AlertFeed";
import { apiFetch } from "@/lib/api";
import type { CaregiverAnalytics, PatientListItem } from "@/types";
import { motion } from "framer-motion";

// ── KPI card ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  className: string;
  loading: boolean;
  index: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon: Icon, className, loading, index }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className="glass-card p-6 p-lg-8 rounded-[2rem] border-white/[0.05] shadow-2xl relative overflow-hidden group hover:bg-white/[0.05] transition-all"
  >
    <div className={`absolute top-0 right-0 w-24 h-24 blur-[60px] opacity-10 rounded-full bg-current ${className.split(' ').find(c => c.startsWith('text-'))}`}></div>
    
    <div className="flex flex-col gap-5 relative z-10">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border border-white/[0.08] bg-white/[0.02] shadow-inner-glow transition-transform group-hover:scale-110 ${className}`}>
        <Icon size={26} strokeWidth={2} />
      </div>
      
      <div className="flex flex-col">
        <span className="text-[11px] font-black text-clara-text-tertiary uppercase tracking-[0.25em] mb-3 opacity-60">
          {label}
        </span>
        {loading ? (
          <div className="h-10 w-24 bg-white/[0.05] animate-pulse rounded-lg" />
        ) : (
          <span className="text-4xl font-serif text-white tracking-tight">{value}</span>
        )}
        {sub && !loading && (
          <span className="text-[11px] font-medium text-clara-text-muted mt-2 tracking-tight opacity-80">{sub}</span>
        )}
      </div>
    </div>
  </motion.div>
);

// ── Patient roster panel ──────────────────────────────────────────────────────

const PatientRoster: React.FC<{
  patients: PatientListItem[];
  loading: boolean;
  error: string | null;
}> = ({ patients, loading, error }) => (
  <div className="glass-card rounded-[2.5rem] border-white/[0.05] shadow-2xl overflow-hidden h-full flex flex-col">
    <div className="p-8 flex items-center justify-between border-b border-white/[0.05]">
      <div>
        <h3 className="text-xl font-black text-white tracking-tight">Active Roster</h3>
        <p className="text-[10px] font-bold text-clara-text-tertiary uppercase tracking-widest mt-1">Patient Management</p>
      </div>
      <Link
        href="/caregiver/patients"
        className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-clara-text-secondary hover:text-white hover:bg-white/[0.06] transition-all"
      >
        <ArrowRight size={18} />
      </Link>
    </div>

    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
      {loading ? (
        <div className="flex flex-col gap-4 p-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white/[0.02] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-10 text-center">
          <p className="text-danger text-sm font-bold">{error}</p>
        </div>
      ) : patients.length === 0 ? (
        <div className="p-10 text-center">
          <Users className="w-10 h-10 text-clara-text-muted mx-auto mb-3 opacity-20" />
          <p className="text-sm font-bold text-clara-text-muted italic">No patients registered</p>
        </div>
      ) : (
        <div className="space-y-2">
          {patients.map((p, idx) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link
                href={`/caregiver/patients/${p.id}`}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.04] border border-transparent hover:border-white/[0.08] transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-clara-surface-2 to-clara-surface-3 border border-white/[0.1] flex items-center justify-center text-xs font-black text-clara-primary group-hover:scale-105 transition-transform">
                  {p.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white truncate group-hover:text-clara-primary-light transition-colors">{p.name}</p>
                  <p className="text-[10px] font-bold text-clara-text-tertiary uppercase tracking-wider mt-0.5">
                    {p.is_active ? "In Session" : "Idle State"}
                  </p>
                </div>

                <div className={`w-2 h-2 rounded-full ${p.is_active ? "bg-success shadow-glow-sm animate-pulse" : "bg-clara-text-muted"}`}></div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CaregiverDashboard() {
  const [analytics, setAnalytics] = useState<CaregiverAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/v1/caregiver/analytics")
      .then((data: any) => setAnalytics(data))
      .catch((err: Error) => setAnalyticsError(err.message))
      .finally(() => setAnalyticsLoading(false));

    apiFetch("/api/v1/patients/")
      .then((data: any) => setPatients(data))
      .catch((err: Error) => setPatientsError(err.message))
      .finally(() => setPatientsLoading(false));
  }, []);

  const stats = [
    {
      label: "Total Cohort",
      value: analytics ? String(analytics.total_patients) : "0",
      icon: Users,
      className: "bg-clara-primary/10 text-clara-primary border-clara-primary/20",
    },
    {
      label: "Live Monitor",
      value: analytics ? String(analytics.active_sessions) : "0",
      icon: Activity,
      className: "bg-blue-500/10 text-blue-400 border-blue-400/20",
      sub: "Active connections",
    },
    {
      label: "System Health",
      value: analytics?.stability_index ? `${analytics.stability_index}%` : "100%",
      sub: "Mood stability index",
      icon: TrendingUp,
      className: "bg-success/10 text-success border-success/20",
    },
    {
      label: "Crisis Queue",
      value: analytics ? String(analytics.unresolved_alerts) : "0",
      icon: Zap,
      className: analytics?.unresolved_alerts && analytics.unresolved_alerts > 0 
        ? "bg-danger text-white border-danger/40 shadow-danger/30" 
        : "bg-white/[0.03] text-clara-text-muted border-white/[0.08]",
      sub: "Unresolved incidents"
    },
  ];

  return (
    <div className="space-y-10">
      {/* Header Info */}
      <div className="flex flex-col gap-2 mb-12">
        <h2 className="text-4xl md:text-5xl font-serif text-white tracking-tight">System Intelligence</h2>
        <p className="text-clara-text-secondary text-lg font-medium">Real-time overview of your patient cluster and clinical alerts.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <StatCard
            key={stat.label}
            loading={analyticsLoading}
            index={i}
            {...stat}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Alerts feed — 8/12 width */}
        <div className="lg:col-span-8 flex flex-col">
          <AlertFeed />
        </div>

        {/* Patient roster — 4/12 width */}
        <div className="lg:col-span-4 flex flex-col">
          <PatientRoster
            patients={patients}
            loading={patientsLoading}
            error={patientsError}
          />
        </div>
      </div>
    </div>
  );
}
