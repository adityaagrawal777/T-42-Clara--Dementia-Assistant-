"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  Calendar, MessageCircle, Loader2, AlertTriangle, Heart,
  Activity, Zap, MapPin, Briefcase, Users, BookOpen,
  Star, Clock, Brain, ChevronRight,
} from "lucide-react";
import { PatientProfileEditor } from "../../../../components/caregiver/PatientProfileEditor";
import { SessionList } from "../../../../components/caregiver/SessionList";
import { MoodTimeline } from "../../../../components/caregiver/MoodTimeline";
import { AlertFeed } from "../../../../components/caregiver/AlertFeed";
import { CaregiverNotes } from "../../../../components/caregiver/CaregiverNotes";
import { apiFetch } from "@/lib/api";
import type { Patient, SessionHistoryEntry, LifeMemory } from "@/types";
import { motion } from "framer-motion";

function totalMessages(sessions: SessionHistoryEntry[]): number {
  return sessions.reduce((sum, s) => sum + s.message_count, 0);
}
function totalAlerts(sessions: SessionHistoryEntry[]): number {
  return sessions.reduce((sum, s) => sum + s.alert_count, 0);
}

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ icon: React.ElementType; label: string }> = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="w-8 h-8 rounded-xl bg-clara-primary/10 border border-clara-primary/20 flex items-center justify-center text-clara-primary">
      <Icon size={15} strokeWidth={2.5} />
    </div>
    <h3 className="text-[11px] font-black text-clara-text-tertiary uppercase tracking-[0.25em]">{label}</h3>
  </div>
);

const InfoRow: React.FC<{ label: string; value: string | null | undefined }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-black text-clara-text-muted uppercase tracking-widest">{label}</span>
      <span className="text-white font-semibold text-sm leading-relaxed">{value}</span>
    </div>
  );
};

const MemoryCard: React.FC<{ memory: LifeMemory; index: number }> = ({ memory, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.06 }}
    className="glass-dark p-5 rounded-2xl transition-all group"
  >
    <div className="flex items-start gap-3">
      {memory.emoji && (
        <span className="text-2xl shrink-0 mt-0.5">{memory.emoji}</span>
      )}
      <div className="flex-1 min-w-0">
        {memory.title && (
          <p className="text-white font-black text-sm mb-1 truncate">{memory.title}</p>
        )}
        {memory.description && (
          <p className="text-clara-text-secondary text-xs font-medium leading-relaxed line-clamp-3">
            {memory.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {memory.date && (
            <span className="flex items-center gap-1 text-[10px] font-black text-clara-text-muted uppercase tracking-wide">
              <Clock size={10} />
              {memory.date}
            </span>
          )}
          {(memory.tags as string[] | undefined)?.map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-full bg-clara-primary/10 text-clara-primary text-[10px] font-black uppercase tracking-wide border border-clara-primary/20">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  </motion.div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const patientId = params.id;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [patientError, setPatientError] = useState<string | null>(null);

  // ── Live status state — polled every 15 s ──────────────────────────────────
  const [liveStatus, setLiveStatus] = useState<{
    is_session_active: boolean;
    total_messages: number;
    active_session_messages: number;
    unresolved_alerts: number;
    latest_mood: string | null;
    session_count: number;
    session_started_at: string | null;
  } | null>(null);
  const [isLive, setIsLive] = useState(false);

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
      const data = (await apiFetch(`/api/v1/caregiver/patients/${patientId}/sessions`)) as SessionHistoryEntry[];
      setSessions(data);
    } catch {
      // non-fatal
    } finally {
      setLoadingSessions(false);
    }
  }, [patientId]);

  /** Poll the live-status endpoint — always queries fresh from source tables */
  const pollLiveStatus = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/v1/caregiver/patients/${patientId}/live-status`);
      setLiveStatus(data as typeof liveStatus);
      setIsLive((data as { is_session_active: boolean }).is_session_active);
    } catch {
      // non-fatal — keep showing last known values
    }
  }, [patientId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPatient();
    fetchSessions();
    pollLiveStatus(); // immediate first fetch

    // Poll every 15 seconds — pause when tab is not visible
    let interval: ReturnType<typeof setInterval> | null = setInterval(pollLiveStatus, 15_000);

    const handleVisibility = () => {
      if (document.hidden) {
        if (interval) { clearInterval(interval); interval = null; }
      } else {
        pollLiveStatus(); // catch up immediately when tab becomes visible again
        interval = setInterval(pollLiveStatus, 15_000);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchPatient, fetchSessions, pollLiveStatus]);


  if (loadingPatient) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-clara-primary" />
        <p className="text-[10px] font-black text-clara-text-tertiary uppercase tracking-widest">Syncing Record...</p>
      </div>
    );
  }

  if (patientError || !patient) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center">
        <div className="w-20 h-20 bg-danger/10 border border-danger/20 rounded-[2.5rem] flex items-center justify-center text-danger">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white mb-2">Sync Interrupted</h3>
          <p className="font-medium text-clara-text-secondary text-sm">
            {patientError ?? "Patient record could not be retrieved."}
          </p>
        </div>
      </div>
    );
  }

  const displayName = patient.preferred_name ?? patient.name;
  const initials = patient.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  // Prefer live-status counts (fresh from DB) over stale session-derived sums
  const msgCount = liveStatus?.total_messages ?? (loadingSessions ? null : totalMessages(sessions));
  const alertCount = liveStatus?.unresolved_alerts ?? (loadingSessions ? null : totalAlerts(sessions));
  const memories = (patient.life_memories ?? []) as LifeMemory[];
  const familyEntries = Object.entries(patient.family_names ?? {});


  return (
    <div className="space-y-8 pb-24">

      {/* ── Hero Header ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-dark p-8 lg:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-clara-primary/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-clara-accent/5 rounded-full blur-[80px] -ml-30 -mb-30 pointer-events-none" />

        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
          {/* Avatar */}
          <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-clara-primary/20 to-clara-accent/20 border border-clara-primary/30 shadow-glow-md flex items-center justify-center text-4xl font-black text-clara-primary shrink-0">
            {initials}
          </div>

          {/* Name + Status */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
              <h2 className="text-4xl md:text-5xl font-serif text-white tracking-tight leading-tight">
                {patient.name}
              </h2>
              {/* Session status badge — uses live polling */}
              {isLive ? (
                <span className="self-center md:self-auto px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Session
                </span>
              ) : (
                <span className={`self-center md:self-auto px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${
                  patient.is_active
                    ? "bg-success/10 border-success/30 text-success"
                    : "bg-white/[0.03] border-white/[0.08] text-clara-text-muted"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${patient.is_active ? "bg-success" : "bg-clara-text-muted"}`} />
                  {patient.is_active ? "Active" : "Standby"}
                </span>
              )}
            </div>

            {patient.preferred_name && patient.preferred_name !== patient.name && (
              <p className="text-base text-clara-text-tertiary font-bold mb-4">
                Known as &ldquo;<span className="text-clara-primary-light">{displayName}</span>&rdquo;
              </p>
            )}

            {/* Stat Pills */}
            <div className="flex flex-wrap gap-2.5 justify-center md:justify-start mt-4">
              <span className="px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-clara-text-tertiary font-black text-[10px] uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-clara-primary" />
                Joined {format(parseISO(patient.created_at), "MMM d, yyyy")}
              </span>
              {/* Message count pill — uses liveStatus for real-time accuracy */}
              <span className="px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-clara-text-secondary font-black text-[10px] uppercase tracking-wide flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
                {msgCount === null ? <Loader2 className="w-3 h-3 animate-spin" /> : `${msgCount} Messages`}
                {isLive && liveStatus && liveStatus.active_session_messages > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[9px] font-black tracking-wider">
                    +{liveStatus.active_session_messages} live
                  </span>
                )}
              </span>
              {/* Latest mood pill — only shown when we have live data */}
              {liveStatus?.latest_mood && (
                <span className="px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-clara-text-secondary font-black text-[10px] uppercase tracking-wide flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-violet-400" />
                  Mood: {liveStatus.latest_mood}
                </span>
              )}
              {alertCount !== null && alertCount > 0 && (
                <span className="px-4 py-2 bg-danger/10 border border-danger/30 rounded-xl text-danger font-black text-[10px] uppercase tracking-wide flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" />
                  {alertCount} Alert{alertCount !== 1 ? "s" : ""}
                </span>
              )}
              {patient.hometown && (
                <span className="px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-clara-text-tertiary font-black text-[10px] uppercase tracking-wide flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  {patient.hometown}
                </span>
              )}
              {patient.date_of_birth && (
                <span className="px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-clara-text-tertiary font-black text-[10px] uppercase tracking-wide flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 text-pink-400" />
                  Born {format(parseISO(patient.date_of_birth), "MMM d, yyyy")}
                </span>
              )}
              {patient.language && patient.language !== "en" && (
                <span className="px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-clara-text-tertiary font-black text-[10px] uppercase tracking-wide flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-violet-400" />
                  {patient.language.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Personal Bio ──────────────────────────────────────────────────────── */}
      {(patient.occupation_history || patient.hometown || patient.date_of_birth || familyEntries.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {/* Personal Details */}
          {(patient.occupation_history || patient.hometown || patient.date_of_birth) && (
            <div className="glass-dark p-6 rounded-2xl md:col-span-1">
              <SectionLabel icon={Briefcase} label="Personal Details" />
              <div className="space-y-4">
                <InfoRow label="Date of Birth" value={patient.date_of_birth ? format(parseISO(patient.date_of_birth), "MMMM d, yyyy") : null} />
                <InfoRow label="Hometown" value={patient.hometown} />
                <InfoRow label="Occupation History" value={patient.occupation_history} />
              </div>
            </div>
          )}

          {/* Family Connections */}
          {familyEntries.length > 0 && (
            <div className="glass-dark p-6 rounded-2xl">
              <SectionLabel icon={Users} label="Family Connections" />
              <div className="space-y-3">
                {familyEntries.map(([relation, name]) => (
                  <div key={relation} className="flex items-center justify-between gap-4 py-2 border-b border-white/[0.04] last:border-0">
                    <span className="text-[10px] font-black text-clara-text-muted uppercase tracking-widest">{relation}</span>
                    <span className="text-white font-semibold text-sm text-right">{String(name)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Favourite Topics */}
          {(patient.favourite_topics ?? []).length > 0 && (
            <div className="glass-dark p-6 rounded-2xl">
              <SectionLabel icon={Star} label="Favourite Topics" />
              <div className="flex flex-wrap gap-2">
                {(patient.favourite_topics ?? []).map((topic) => (
                  <span key={topic} className="px-3 py-1.5 rounded-xl bg-clara-primary/10 text-clara-primary border border-clara-primary/20 text-[11px] font-black uppercase tracking-wide">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Life Memories ─────────────────────────────────────────────────────── */}
      {memories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="glass-dark p-6 lg:p-8 rounded-[2.5rem]"
        >
          <SectionLabel icon={BookOpen} label={`Life Memories · ${memories.length}`} />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {memories.map((mem, i) => (
              <MemoryCard key={i} memory={mem} index={i} />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Empathy Anchor ────────────────────────────────────────────────────── */}
      {patient.favourite_topics?.[0] && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="glass-dark p-8 rounded-[2.5rem] border border-clara-primary/10 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-clara-primary/5 blur-[60px] pointer-events-none" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-clara-primary/10 border border-clara-primary/20 flex items-center justify-center shrink-0">
              <Heart className="w-7 h-7 text-clara-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black text-clara-primary uppercase tracking-widest mb-1">Empathy Anchor</p>
              <p className="text-white font-medium text-sm leading-relaxed">
                Clara is using{" "}
                <span className="text-clara-primary-light font-black italic">&ldquo;{patient.favourite_topics[0]}&rdquo;</span>{" "}
                as a central pillar for therapeutic rapport with {displayName}.
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-clara-primary/40 ml-auto shrink-0" />
          </div>
        </motion.div>
      )}

      {/* ── Main Grid: Editor · Analytics ────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

        {/* Left: Profile Editor + Alerts + Notes */}
        <div className="xl:col-span-5 space-y-8">
          <PatientProfileEditor
            patient={patient}
            patientId={patientId}
            onSaved={(updated) => setPatient(updated)}
          />
          <CaregiverNotes patientId={patientId} />
          <AlertFeed patientId={patientId} />
        </div>

        {/* Right: Mood + Sessions */}
        <div className="xl:col-span-7 space-y-8">
          <MoodTimeline patientId={patientId} isLive={isLive} />

          {/* Session Summary Stats — always shown once liveStatus arrives */}
          {liveStatus && (
            <motion.div
              key={`${liveStatus.total_messages}-${liveStatus.session_count}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-4"
            >
              {[
                { label: "Sessions", value: liveStatus.session_count, icon: Activity, color: "text-clara-primary" },
                { label: "Messages", value: liveStatus.total_messages, icon: MessageCircle, color: "text-blue-400" },
                { label: "Alerts", value: liveStatus.unresolved_alerts, icon: Zap, color: liveStatus.unresolved_alerts > 0 ? "text-danger" : "text-amber-400" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="glass-dark p-5 rounded-2xl text-center relative overflow-hidden">
                  {/* Live pulse ring on the Messages card when session is active */}
                  {isLive && label === "Messages" && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                  <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="text-[10px] font-black text-clara-text-muted uppercase tracking-widest mt-1">{label}</p>
                </div>
              ))}
            </motion.div>
          )}

          <SessionList patientId={patientId} />
        </div>
      </div>
    </div>
  );
}
