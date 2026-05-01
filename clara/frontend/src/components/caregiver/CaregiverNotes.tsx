"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { StickyNote, Trash2, Loader2, Send } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { CaregiverNote } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

interface CaregiverNotesProps {
  patientId: string;
}

export const CaregiverNotes: React.FC<CaregiverNotesProps> = ({ patientId }) => {
  const [notes, setNotes] = useState<CaregiverNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/v1/caregiver/patients/${patientId}/notes`);
      setNotes(data as CaregiverNote[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load notes.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmitting(true);
    try {
      const created = await apiFetch(`/api/v1/caregiver/patients/${patientId}/notes`, {
        method: "POST",
        body: JSON.stringify({ content: newNote.trim() }),
      });
      setNotes((prev) => [created as CaregiverNote, ...prev]);
      setNewNote("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save note.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!window.confirm("Permanently delete this note? This action cannot be undone.")) {
      return;
    }
    
    setDeletingId(noteId);
    try {
      await apiFetch(`/api/v1/caregiver/patients/${patientId}/notes/${noteId}`, {
        method: "DELETE",
      });
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete note. You may only delete notes you authored.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="glass-dark p-6 lg:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col h-full">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px] pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
          <StickyNote size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-xl font-black text-white tracking-tight">Clinical Notes</h3>
          <p className="text-[10px] font-black text-emerald-400/80 uppercase tracking-widest mt-1">
            Private · Secure · Not visible to AI
          </p>
        </div>
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="mb-8 relative z-10">
        <div className="relative group">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a private observation or handover note..."
            className="w-full bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4 min-h-[100px] text-sm text-white placeholder-clara-text-muted focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.04] transition-all resize-none custom-scrollbar pb-14"
            disabled={submitting}
          />
          <div className="absolute bottom-3 right-3">
            <button
              type="submit"
              disabled={!newNote.trim() || submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] uppercase tracking-wide hover:bg-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Save Note
            </button>
          </div>
        </div>
      </form>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <p className="text-[10px] font-black text-clara-text-tertiary uppercase tracking-widest">Loading Notes...</p>
          </div>
        ) : error ? (
          <div className="text-center py-6 text-danger text-sm font-medium border border-danger/20 rounded-xl bg-danger/5">
            {error}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-10 border border-white/[0.04] rounded-2xl border-dashed">
            <StickyNote className="w-8 h-8 text-white/[0.1] mx-auto mb-3" />
            <p className="text-sm font-bold text-clara-text-tertiary">No clinical notes yet.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {notes.map((note) => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] group hover:border-white/[0.1] transition-all relative"
              >
                <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed mb-4">
                  {note.content}
                </p>
                <div className="flex items-center justify-between border-t border-white/[0.04] pt-3">
                  <span className="text-[10px] font-black text-clara-text-muted uppercase tracking-wider">
                    {format(parseISO(note.created_at), "MMM d, h:mm a")}
                  </span>
                  <button
                    onClick={() => handleDelete(note.id)}
                    disabled={deletingId === note.id}
                    title="Delete note (Must be author)"
                    className="w-7 h-7 rounded-lg bg-danger/10 border border-danger/20 text-danger flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-danger/20 disabled:opacity-50"
                  >
                    {deletingId === note.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
