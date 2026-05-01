"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TrendingUp, Users, ArrowRight, Zap, Activity } from "lucide-react";
import { AlertFeed } from "@/components/caregiver/AlertFeed";
import { apiFetch } from "@/lib/api";
import type { CaregiverAnalytics, PatientListItem } from "@/types";
import { motion } from "framer-motion";

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;       // hex or hsl colour for the icon tint
  loading: boolean;
  index: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon: Icon, accent, loading, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08 }}
    className="relative overflow-hidden rounded-2xl p-6 flex flex-col gap-4 group transition-all"
    style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
    }}
  >
    {/* Ambient glow */}
    <div
      className="absolute top-0 right-0 w-28 h-28 rounded-full blur-[50px] opacity-20 pointer-events-none"
      style={{ background: accent }}
    />

    {/* Icon */}
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
      style={{
        background: `${accent}20`,
        border: `1px solid ${accent}40`,
      }}
    >
      <Icon size={22} strokeWidth={2} style={{ color: accent }} />
    </div>

    {/* Metric */}
    <div className="flex flex-col">
      <span
        className="text-[10px] font-black uppercase tracking-[0.25em] mb-2"
        style={{ color: "rgba(255,255,255,0.45)" }}
      >
        {label}
      </span>
      {loading ? (
        <div className="h-9 w-20 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.07)" }} />
      ) : (
        <span className="text-4xl font-bold text-white tracking-tight">{value}</span>
      )}
      {sub && !loading && (
        <span className="text-xs font-medium mt-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          {sub}
        </span>
      )}
    </div>
  </motion.div>
);

// ── Patient Roster Panel ───────────────────────────────────────────────────────

const PatientRoster: React.FC<{
  patients: PatientListItem[];
  loading: boolean;
  error: string | null;
}> = ({ patients, loading, error }) => (
  <div
    className="rounded-2xl overflow-hidden h-full flex flex-col"
    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
  >
    {/* Header */}
    <div
      className="px-6 py-5 flex items-center justify-between"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div>
        <h3 className="text-base font-bold text-white tracking-tight">Active Roster</h3>
        <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
          Patient Management
        </p>
      </div>
      <Link
        href="/caregiver/patients"
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <ArrowRight size={16} style={{ color: "rgba(255,255,255,0.6)" }} />
      </Link>
    </div>

    {/* Content */}
    <div className="flex-1 overflow-y-auto p-4 space-y-1">
      {loading && (
        <div className="flex flex-col gap-3 p-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl animate-pulse"
              style={{ background: "rgba(255,255,255,0.04)" }}
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="p-8 text-center">
          <p className="text-sm font-bold" style={{ color: "#f87171" }}>{error}</p>
        </div>
      )}

      {!loading && !error && patients.length === 0 && (
        <div className="p-10 text-center">
          <Users className="w-9 h-9 mx-auto mb-3 opacity-20" style={{ color: "rgba(255,255,255,0.5)" }} />
          <p className="text-sm font-medium italic" style={{ color: "rgba(255,255,255,0.3)" }}>
            No patients assigned yet
          </p>
        </div>
      )}

      {!loading && !error && patients.map((p, idx) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.04 }}
        >
          <Link
            href={`/caregiver/patients/${p.id}`}
            className="flex items-center gap-3 p-3 rounded-xl transition-all group"
            style={{ border: "1px solid transparent" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "transparent";
            }}
          >
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{
                background: "rgba(107,158,140,0.15)",
                border: "1px solid rgba(107,158,140,0.25)",
                color: "#6ee7b7",
              }}
            >
              {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{p.name}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                {p.is_active ? "In Session" : "Idle"}
              </p>
            </div>

            {/* Status dot */}
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: p.is_active ? "#4ade80" : "rgba(255,255,255,0.2)",
                boxShadow: p.is_active ? "0 0 6px #4ade80" : "none",
              }}
            />
          </Link>
        </motion.div>
      ))}
    </div>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CaregiverDashboard() {
  const [analytics, setAnalytics] = useState<CaregiverAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(() => {
    apiFetch("/api/v1/caregiver/analytics")
      .then((data: unknown) => setAnalytics(data as CaregiverAnalytics))
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
  }, []);

  const fetchPatients = useCallback(() => {
    apiFetch("/api/v1/patients/")
      .then((data: unknown) => setPatients(data as PatientListItem[]))
      .catch((err: Error) => setPatientsError(err.message))
      .finally(() => setPatientsLoading(false));
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchPatients();

    // Analytics: poll every 30 s — catches mood shifts and new alerts quickly
    // Patients: poll every 60 s — assignment changes are infrequent
    let analyticsInterval: ReturnType<typeof setInterval> | null = setInterval(fetchAnalytics, 30_000);
    let patientsInterval: ReturnType<typeof setInterval> | null = setInterval(fetchPatients, 60_000);

    const handleVisibility = () => {
      if (document.hidden) {
        if (analyticsInterval) { clearInterval(analyticsInterval); analyticsInterval = null; }
        if (patientsInterval) { clearInterval(patientsInterval); patientsInterval = null; }
      } else {
        fetchAnalytics();
        fetchPatients();
        analyticsInterval = setInterval(fetchAnalytics, 30_000);
        patientsInterval = setInterval(fetchPatients, 60_000);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (analyticsInterval) clearInterval(analyticsInterval);
      if (patientsInterval) clearInterval(patientsInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchAnalytics, fetchPatients]);


  const hasAlerts = (analytics?.unresolved_alerts ?? 0) > 0;

  const stats: StatCardProps[] = [
    {
      label: "Total Cohort",
      value: analytics ? String(analytics.total_patients) : "—",
      icon: Users,
      accent: "#6ee7b7",
      loading: analyticsLoading,
      index: 0,
    },
    {
      label: "Live Monitor",
      value: analytics ? String(analytics.active_sessions) : "—",
      sub: "Active connections",
      icon: Activity,
      accent: "#60a5fa",
      loading: analyticsLoading,
      index: 1,
    },
    {
      label: "System Health",
      value: analytics?.stability_index ? `${analytics.stability_index}%` : "—",
      sub: "Mood stability index",
      icon: TrendingUp,
      accent: "#4ade80",
      loading: analyticsLoading,
      index: 2,
    },
    {
      label: "Crisis Queue",
      value: analytics ? String(analytics.unresolved_alerts) : "—",
      sub: "Unresolved incidents",
      icon: Zap,
      accent: hasAlerts ? "#f87171" : "rgba(255,255,255,0.3)",
      loading: analyticsLoading,
      index: 3,
    },
  ];

  return (
    <div className="space-y-10">
      {/* Hero header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-bold text-white tracking-tight">
          System Intelligence
        </h2>
        <p className="text-base font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
          Real-time overview of your patient cluster and clinical alerts.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-stretch">
        <div className="lg:col-span-8 flex flex-col">
          <AlertFeed />
        </div>
        <div className="lg:col-span-4 flex flex-col">
          <PatientRoster patients={patients} loading={patientsLoading} error={patientsError} />
        </div>
      </div>
    </div>
  );
}
