"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  MessageCircle,
  Loader2,
  AlertTriangle,
  Heart,
  Activity,
  Zap,
} from "lucide-react";
import { PatientProfileEditor } from "../../../../components/caregiver/PatientProfileEditor";
import { SessionList } from "../../../../components/caregiver/SessionList";
import { MoodTimeline } from "../../../../components/caregiver/MoodTimeline";
import { AlertFeed } from "../../../../components/caregiver/AlertFeed";
import { apiFetch } from "@/lib/api";
import type { Patient, SessionHistoryEntry } from "@/types";
import { motion } from "framer-motion";

// ── Helpers ───────────────────────────────────────────────────────────────────

function totalMessages(sessions: SessionHistoryEntry[]): number {
  return sessions.reduce((sum, s) => sum + s.message_count, 0);
}

function totalAlerts(sessions: SessionHistoryEntry[]): number {
  return sessions.reduce((sum, s) => sum + s.alert_count, 0);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const patientId = params.id;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [patientError, setPatientError] = useState<string | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchPatient = useCallback(async () => {
    setLoadingPatient(true);
    setPatientError(null);
    try {
      const data = (await apiFetch(`/api/v1/patients/${patientId}`)) as Patient;
      setPatient(data);
    } catch (err: unknown) {
      setPatientError(err instanceof Error ? err.message : "Failed to load patient.");
    } finally {
      setLoadingPatient(false);
    }
  }, [patientId]);

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const data = (await apiFetch(
        `/api/v1/caregiver/patients/${patientId}/sessions`,
      )) as SessionHistoryEntry[];
      setSessions(data);
    } catch {
      // Sessions failing is non-fatal — still show the rest of the page.
    } finally {
      setLoadingSessions(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPatient();
    fetchSessions();
  }, [fetchPatient, fetchSessions]);

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loadingPatient) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-clara-primary" />
        <p className="text-[10px] font-black text-clara-text-tertiary uppercase tracking-widest">Syincing Record...</p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────

  if (patientError || !patient) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center">
        <div className="w-20 h-20 bg-danger/10 border border-danger/20 rounded-[2.5rem] flex items-center justify-center text-danger shadow-glow-sm">
            <AlertTriangle className="w-10 h-10" />
        </div>
        <div>
            <h3 className="text-xl font-black text-white mb-2">Sync Interrupted</h3>
            <p className="font-medium text-clara-text-secondary text-sm">
            {patientError ?? "Patient record could not be retrieved from the cluster."}
            </p>
        </div>
      </div>
    );
  }

  // ── Derived display values ────────────────────────────────────────────────

  const displayName = patient.preferred_name ?? patient.name;
  const initials = patient.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const msgCount = loadingSessions ? null : totalMessages(sessions);
  const alertCount = loadingSessions ? null : totalAlerts(sessions);
  const activeTopic = patient.favourite_topics?.[0] ?? null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-12 pb-24">

      {/* ── Patient Profile Header ──────────────────────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-10 lg:p-14 rounded-[3.5rem] border-white/[0.05] shadow-2xl relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-clara-primary/10 opacity-60 rounded-full blur-[120px] -mr-48 -mt-48 transition-all group-hover:scale-110 pointer-events-none" />

        <div className="flex flex-col md:flex-row gap-12 items-center md:items-start relative z-10">
          {/* Avatar / Portrait Block */}
          <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-clara-surface-2 to-clara-surface-3 border border-white/[0.1] shadow-2xl flex items-center justify-center text-4xl font-black text-clara-primary group-hover:scale-105 transition-transform shrink-0">
            {initials}
          </div>

          {/* Core Bio */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-4xl md:text-5xl font-serif text-white tracking-tight leading-tight">
              {patient.name}
            </h2>
            {patient.preferred_name && patient.preferred_name !== patient.name && (
              <p className="text-lg text-clara-text-tertiary font-bold uppercase tracking-widest mt-2">
                &ldquo;{displayName}&rdquo;
              </p>
            )}

            {/* Metric Pills */}
            <div className="flex flex-wrap gap-3 mt-8 justify-center md:justify-start">
              <span className="px-5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-clara-text-tertiary font-black text-[10px] uppercase tracking-[0.15em] flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-clara-primary" />
                Joined {format(parseISO(patient.created_at), "MMM yyyy")}
              </span>

              <span className="px-5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-clara-text-secondary font-black text-[10px] uppercase tracking-[0.15em] flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 text-blue-400" />
                {msgCount === null ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  `${msgCount} Transcripts`
                )}
              </span>

              {alertCount !== null && alertCount > 0 && (
                <span className="px-5 py-2.5 bg-danger/10 border border-danger/30 rounded-2xl text-danger font-black text-[10px] uppercase tracking-[0.15em] flex items-center gap-2.5 shadow-glow-sm">
                  <Zap className="w-4 h-4" />
                  {alertCount} Intervention{alertCount !== 1 ? "s" : ""}
                </span>
              )}

              <span
                className={`px-5 py-2.5 rounded-2xl border font-black text-[10px] uppercase tracking-[0.15em] flex items-center gap-2.5 ${
                  patient.is_active
                    ? "bg-success/10 border-success/30 text-success"
                    : "bg-white/[0.01] border-white/[0.05] text-clara-text-muted"
                }`}
              >
                <Activity className="w-4 h-4" />
                {patient.is_active ? "Live Engagement" : "Standby Mode"}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Dashboard Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">

        {/* Clinical Sidebar — 4/12 width */}
        <div className="xl:col-span-5 space-y-10">
          <PatientProfileEditor
            patient={patient}
            patientId={patientId}
            onSaved={(updated) => setPatient(updated)}
          />

          {/* Perspective/Insight Card */}
          {activeTopic && (
            <div className="glass-card p-10 rounded-[2.5rem] border-clara-primary/10 bg-clara-primary/5 text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-clara-primary/10 blur-[60px] -z-10 group-hover:scale-125 transition-all duration-700" />
              <Heart className="w-10 h-10 text-clara-primary mx-auto mb-6" />
              <h3 className="text-xl font-black text-white mb-2 tracking-tight">
                Empathy Anchor
              </h3>
              <p className="max-w-md mx-auto text-clara-text-secondary font-medium text-sm leading-relaxed">
                Clara is currently using{" "}
                <span className="text-white font-black italic">
                  &ldquo;{activeTopic}&rdquo;
                </span>{" "}
                as a central pillar for therapeutic rapport with {displayName}.
              </p>
            </div>
          )}

          {/* Active Alerts List */}
          <AlertFeed patientId={patientId} />
        </div>

        {/* Analytical Focus — 7/12 width */}
        <div className="xl:col-span-7 space-y-10">
          <MoodTimeline patientId={patientId} />
          <SessionList patientId={patientId} />
        </div>
      </div>
    </div>
  );
}
