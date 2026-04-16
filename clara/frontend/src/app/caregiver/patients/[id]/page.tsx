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
  Globe,
} from "lucide-react";
import { PatientProfileEditor } from "@/components/caregiver/PatientProfileEditor";
import { SessionList } from "@/components/caregiver/SessionList";
import { MoodTimeline } from "@/components/caregiver/MoodTimeline";
import { AlertFeed } from "@/components/caregiver/AlertFeed";
import { apiFetch } from "@/lib/api";
import type { Patient, SessionHistoryEntry } from "@/types";

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
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-slate-300" />
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────

  if (patientError || !patient) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <AlertTriangle className="w-10 h-10 text-rose-400" />
        <p className="font-bold text-slate-700 text-lg">
          {patientError ?? "Patient not found."}
        </p>
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
    <div className="space-y-14 pb-24">

      {/* ── Patient header ──────────────────────────────────────────────── */}
      <div className="bg-white p-14 rounded-[48px] border border-slate-100 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-clara-calm-bg opacity-5 rounded-full blur-[120px] -mr-48 -mt-48 transition-all group-hover:scale-110 pointer-events-none" />

        <div className="flex flex-col md:flex-row gap-10 items-center md:items-start relative">
          {/* Avatar */}
          <div className="w-28 h-28 rounded-[32px] bg-clara-calm-bg border-4 border-white shadow-2xl flex items-center justify-center text-3xl font-black text-clara-calm-text select-none shrink-0">
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">
              {patient.name}
            </h2>
            {patient.preferred_name && patient.preferred_name !== patient.name && (
              <p className="text-base text-slate-500 font-semibold mt-1">
                Preferred: &ldquo;{displayName}&rdquo;
              </p>
            )}

            {/* Meta badges */}
            <div className="flex flex-wrap gap-3 mt-6 justify-center md:justify-start">
              <span className="px-5 py-2 bg-slate-50 border border-slate-100 rounded-full text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Joined {format(parseISO(patient.created_at), "MMM yyyy")}
              </span>

              <span className="px-5 py-2 bg-green-50 border border-green-100 rounded-full text-green-600 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5" />
                {msgCount === null ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  `${msgCount} Messages`
                )}
              </span>

              {alertCount !== null && alertCount > 0 && (
                <span className="px-5 py-2 bg-rose-50 border border-rose-100 rounded-full text-rose-600 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {alertCount} Alert{alertCount !== 1 ? "s" : ""}
                </span>
              )}

              <span
                className={`px-5 py-2 rounded-full border font-bold text-xs uppercase tracking-widest flex items-center gap-2 ${
                  patient.is_active
                    ? "bg-green-50 border-green-100 text-green-600"
                    : "bg-slate-100 border-slate-200 text-slate-400"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                {patient.is_active ? "Active" : "Inactive"} &middot; {patient.language.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-14 items-start">

        {/* Left column */}
        <div className="space-y-14">
          <PatientProfileEditor
            patient={patient}
            patientId={patientId}
            onSaved={(updated) => setPatient(updated)}
          />

          {/* Therapeutic rapport note */}
          {activeTopic && (
            <div className="bg-clara-happy-bg/40 p-10 rounded-[48px] border-2 border-clara-happy-border border-dashed text-center">
              <Heart className="w-10 h-10 text-clara-happy-text mx-auto mb-5" />
              <h3 className="text-xl font-bold text-clara-happy-text mb-2">
                Compassion First
              </h3>
              <p className="max-w-md mx-auto text-slate-600 font-medium text-sm leading-relaxed">
                Clara is currently using{" "}
                <span className="font-bold underline decoration-clara-happy-border">
                  {activeTopic}
                </span>{" "}
                to build therapeutic rapport with {displayName}.
              </p>
            </div>
          )}

          {/* Unresolved alerts for this patient */}
          <AlertFeed patientId={patientId} />
        </div>

        {/* Right column */}
        <div className="space-y-14">
          <MoodTimeline patientId={patientId} />
          <SessionList patientId={patientId} />
        </div>
      </div>
    </div>
  );
}
