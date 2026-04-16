"use client";

import React, { useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronUp, Loader2, MessageSquare, Mic } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { SessionMessageEntry } from "@/types";

// ── Message bubble ────────────────────────────────────────────────────────────

const TranscriptBubble: React.FC<{ message: SessionMessageEntry }> = ({ message }) => {
  const isClara = message.role === "clara";

  const moodColor: Record<string, string> = {
    calm: "bg-green-50 text-green-700 border-green-100",
    happy: "bg-yellow-50 text-yellow-700 border-yellow-100",
    confused: "bg-orange-50 text-orange-700 border-orange-100",
    distressed: "bg-rose-50 text-rose-700 border-rose-100",
  };

  return (
    <div className={`flex w-full mb-4 ${isClara ? "justify-start" : "justify-end"}`}>
      {isClara && (
        <div className="w-8 h-8 rounded-full bg-clara-calm-bg border border-clara-calm-border flex items-center justify-center text-sm shrink-0 mr-3 mt-0.5">
          🌿
        </div>
      )}

      <div className="max-w-[78%] flex flex-col gap-1">
        <div
          className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${
            isClara
              ? "bg-slate-50 text-slate-700 rounded-tl-sm border border-slate-100"
              : "bg-clara-calm-bg text-clara-calm-text rounded-tr-sm border border-clara-calm-border"
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Meta row */}
        <div
          className={`flex items-center gap-2 px-1 ${
            isClara ? "justify-start" : "justify-end"
          }`}
        >
          <span className="text-[11px] font-medium text-slate-400">
            {format(parseISO(message.created_at), "h:mm a")}
          </span>
          {message.input_mode === "voice" && (
            <span className="flex items-center gap-0.5 text-[11px] text-slate-400">
              <Mic className="w-3 h-3" /> voice
            </span>
          )}
          {message.mood && (
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${
                moodColor[message.mood] ?? "bg-slate-50 text-slate-500 border-slate-100"
              }`}
            >
              {message.mood}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  patientId: string;
  sessionId: string;
}

export const SessionTranscript: React.FC<Props> = ({ patientId, sessionId }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SessionMessageEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const loadTranscript = useCallback(async () => {
    if (fetched) return; // Already loaded; no re-fetch needed
    setLoading(true);
    setError(null);
    try {
      const data = (await apiFetch(
        `/api/v1/caregiver/patients/${patientId}/sessions/${sessionId}/messages`,
      )) as SessionMessageEntry[];
      setMessages(data);
      setFetched(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load transcript.");
    } finally {
      setLoading(false);
    }
  }, [fetched, patientId, sessionId]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadTranscript();
  };

  return (
    <div className="border-t border-slate-100">
      {/* Toggle row */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5" />
          View Transcript
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Transcript panel */}
      {open && (
        <div className="bg-slate-50/50 px-8 py-6 border-t border-slate-100">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          )}

          {!loading && error && (
            <p className="text-sm font-semibold text-rose-500 text-center py-4">{error}</p>
          )}

          {!loading && !error && messages.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4 italic">
              No messages recorded for this session.
            </p>
          )}

          {!loading && !error && messages.length > 0 && (
            <div className="flex flex-col">
              {messages.map((msg) => (
                <TranscriptBubble key={msg.id} message={msg} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
