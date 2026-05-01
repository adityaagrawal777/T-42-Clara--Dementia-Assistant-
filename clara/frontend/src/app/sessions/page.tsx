"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, intervalToDuration, parseISO } from "date-fns";
import {
  Clock,
  MessageSquare,
  ChevronDown,
  Mic,
  RefreshCw,
  Calendar,
  Zap,
  Loader2
} from "lucide-react";
import { decodeJWT } from "@/lib/tokens";
import { apiFetch } from "@/lib/api";
import type { SessionHistoryEntry, SessionMessageEntry } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalises a potentially tz-naive ISO string from the server.
 * The API returns timestamps as UTC but without the trailing 'Z'.
 * Appending 'Z' when absent ensures parseISO treats them as UTC,
 * which date-fns then converts to the browser's local timezone.
 */
function toLocalDate(iso: string): Date {
  const normalised = iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`;
  return parseISO(normalised);
}

function formatSessionDate(iso: string): string {
  return format(toLocalDate(iso), "EEEE, MMMM d, yyyy");
}

function formatSessionTime(iso: string): string {
  return format(toLocalDate(iso), "h:mm a");
}

function formatSessionDuration(start: string, end: string | null): string {
  if (!end) return "Live Session";
  const duration = intervalToDuration({ start: toLocalDate(start), end: toLocalDate(end) });
  const parts: string[] = [];
  if (duration.hours) parts.push(`${duration.hours}h`);
  if (duration.minutes) parts.push(`${duration.minutes}m`);
  if (!parts.length) parts.push("< 1m");
  return parts.join(" ");
}

function moodLabel(summary: string | null): { label: string; color: string; dot: string } {
  if (!summary) return { label: "Not recorded", color: "text-clara-text-muted", dot: "bg-slate-600" };
  const map: Record<string, { color: string; dot: string }> = {
    calm: { color: "text-success", dot: "bg-success" },
    happy: { color: "text-clara-primary-light", dot: "bg-clara-primary" },
    confused: { color: "text-warning", dot: "bg-warning" },
    distressed: { color: "text-danger", dot: "bg-danger" },
    normal: { color: "text-success", dot: "bg-success" },
  };
  const config = map[summary.toLowerCase()] ?? { color: "text-clara-text-tertiary", dot: "bg-slate-500" };
  return {
    label: summary.charAt(0).toUpperCase() + summary.slice(1),
    ...config
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: SessionMessageEntry;
}

const HistoryMessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isClara = message.role === "clara";
  return (
    <div className={`flex w-full mb-4 ${isClara ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-[14px] leading-relaxed relative ${
          isClara
            ? "bg-white text-clara-text-primary rounded-bl-none border border-clara-warm/[0.18] shadow-dark-sm"
            : "bg-gradient-to-br from-clara-primary to-clara-primary-light text-white rounded-br-none shadow-dark-md"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <div className={`flex items-center gap-2 mt-2 opacity-60 text-[10px] font-bold uppercase tracking-wider ${isClara ? "text-clara-text-muted" : "text-white"}`}>
           <span>{formatSessionTime(message.created_at)}</span>
           {message.input_mode === "voice" && <Mic size={10} />}
        </div>
      </div>
    </div>
  );
};

const SessionCard: React.FC<{ session: SessionHistoryEntry }> = ({ session }) => {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<SessionMessageEntry[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const handleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (messages.length > 0) return;

    setLoadingMessages(true);
    try {
      const data = await apiFetch(`/api/v1/sessions/${session.id}/messages`);
      setMessages(data as SessionMessageEntry[]);
    } catch {
      // Silence error as per previous logic
    } finally {
      setLoadingMessages(false);
    }
  };

  const mood = moodLabel(session.mood_summary);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-3xl shadow-dark-md overflow-hidden mb-3 hover:bg-clara-surface-2 transition-colors"
    >
      <button
        onClick={handleExpand}
        className="w-full flex items-center justify-between p-6 text-left group"
      >
        <div className="flex items-center gap-6">
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-clara-surface-2 border border-clara-warm/[0.18] flex flex-col items-center justify-center">
            <span className="text-xs font-black text-clara-text-primary leading-none mb-0.5">{format(toLocalDate(session.started_at), "d")}</span>
            <span className="text-[8px] font-black text-clara-text-tertiary uppercase tracking-widest">{format(toLocalDate(session.started_at), "MMM")}</span>
          </div>

          <div className="flex flex-col">
            <h4 className="text-sm font-black text-clara-text-primary group-hover:text-clara-primary transition-all mb-1 tracking-tight">
              {formatSessionDate(session.started_at)}
            </h4>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-black uppercase tracking-widest text-clara-text-tertiary">
              <span className="flex items-center gap-1.5"><Clock size={12} /> {formatSessionTime(session.started_at)} · {formatSessionDuration(session.started_at, session.ended_at)}</span>
              <span className="flex items-center gap-1.5"><MessageSquare size={12} /> {session.message_count} Transcripts</span>
              {session.alert_count > 0 && <span className="flex items-center gap-1.5 text-clara-danger animate-pulse"><Zap size={10} /> {session.alert_count} Alerts</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {session.mood_summary && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-clara-surface-2 border border-clara-warm/[0.18]">
              <div className={`w-1.5 h-1.5 rounded-full ${mood.dot}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${mood.color}`}>{mood.label}</span>
            </div>
          )}
          <div className={`text-clara-text-tertiary transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}>
             <ChevronDown size={20} />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-clara-warm/[0.12] bg-clara-surface-2/50"
          >
            <div className="p-8 max-w-2xl mx-auto">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-10">
                   <Loader2 className="animate-spin text-clara-primary" size={24} />
                </div>
              ) : (
                <div className="flex flex-col">
                  {messages.map((msg) => (
                    <HistoryMessageBubble key={msg.id} message={msg} />
                  ))}
                  {messages.length === 0 && (
                     <div className="text-center py-10 italic text-xs text-clara-text-muted">No messages in this session.</div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const payload = decodeJWT();
    if (!payload) router.replace("/signin");
  }, [router]);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/v1/sessions/history", { params: { limit: "50", offset: "0" } });
      setSessions(data.sessions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black text-clara-text-primary tracking-tighter">Your Sanctuary Wall</h1>
          <p className="text-clara-text-secondary font-medium mt-1">
             Revisit your records of peace and companionship.
          </p>
        </div>
        <button
          onClick={fetchSessions}
          disabled={loading}
          className="w-12 h-12 glass-card rounded-2xl flex items-center justify-center text-clara-text-tertiary hover:text-clara-text-primary transition-all disabled:opacity-40"
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading && sessions.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 glass-card rounded-3xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => <SessionCard key={s.id} session={s} />)}
          {sessions.length === 0 && !error && (
            <div className="glass-card rounded-[2.5rem] py-32 flex flex-col items-center text-center">
               <div className="w-20 h-20 bg-clara-surface-2 rounded-[2.5rem] flex items-center justify-center mb-6 text-clara-primary">
                  <Calendar size={40} />
               </div>
               <h4 className="text-xl font-black text-clara-text-primary mb-2">The wall is empty</h4>
               <p className="text-clara-text-secondary max-w-xs px-10">Your journey of companionship is just beginning. Your chat history will appear here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
