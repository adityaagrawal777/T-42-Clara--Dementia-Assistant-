"use client";

import React, { useState, useRef } from "react";
import { User, Save, Plus, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Patient } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  patient: Patient;
  /** Required to build the PATCH URL. */
  patientId: string;
  /** Called after a successful save so the parent can refresh its data. */
  onSaved?: (updated: Patient) => void;
}

export const PatientProfileEditor: React.FC<Props> = ({
  patient: initialPatient,
  patientId,
  onSaved,
}) => {
  const [patient, setPatient] = useState<Patient>(initialPatient);
  const [newTopic, setNewTopic] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Tracks the last successfully saved snapshot so we can detect unsaved changes.
  const savedRef = useRef<Patient>(initialPatient);

  const isDirty =
    patient.name !== savedRef.current.name ||
    patient.preferred_name !== savedRef.current.preferred_name ||
    JSON.stringify(patient.favourite_topics) !==
      JSON.stringify(savedRef.current.favourite_topics);

  // ── Mutation helpers ──────────────────────────────────────────────────────

  const addTopic = (raw: string) => {
    const topic = raw.trim();
    if (!topic) return;
    const current = patient.favourite_topics ?? [];
    if (current.includes(topic)) return;
    setPatient((p) => ({ ...p, favourite_topics: [...current, topic] }));
    setNewTopic("");
  };

  const removeTopic = (topic: string) => {
    setPatient((p) => ({
      ...p,
      favourite_topics: (p.favourite_topics ?? []).filter((t) => t !== topic),
    }));
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    setSaveError(null);

    try {
      const updated = (await apiFetch(`/api/v1/patients/${patientId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: patient.name,
          preferred_name: patient.preferred_name,
          favourite_topics: patient.favourite_topics,
        }),
      })) as Patient;

      setPatient(updated);
      savedRef.current = updated;
      setSaveStatus("success");
      onSaved?.(updated);
      // Auto-clear success indicator after 3 s
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err: unknown) {
      setSaveStatus("error");
      setSaveError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="glass-card p-10 lg:p-12 rounded-[3rem] border-white/[0.05] shadow-2xl w-full relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-clara-primary/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 relative">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl flex items-center justify-center text-clara-primary shadow-inner-glow">
            <User size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-3xl font-black text-white tracking-tight leading-tight">Identity Vault</h3>
            <p className="text-[10px] font-black text-clara-text-tertiary uppercase tracking-[0.25em] mt-1.5 leading-none">
              Compassionate Context Engine
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className={`flex items-center justify-center gap-3 rounded-2xl px-8 py-4 transition-all font-black text-sm uppercase tracking-[0.1em] shadow-lg ${
            isDirty 
              ? "bg-clara-primary text-white shadow-glow-sm hover:scale-[1.02]" 
              : "bg-white/[0.03] text-clara-text-muted cursor-not-allowed border border-white/[0.05]"
          }`}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saveStatus === "success" ? (
            <CheckCircle className="w-4 h-4" />
          ) : saveStatus === "error" ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? "Syncing..." : saveStatus === "success" ? "Committed" : "Update Profile"}
        </button>
      </div>

      {/* Inline error banner */}
      <AnimatePresence>
        {saveStatus === "error" && saveError && (
            <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-8 px-6 py-4 bg-danger/10 border border-danger/20 rounded-2xl text-xs font-bold text-danger uppercase tracking-wider"
            >
                Protocol Error: {saveError}
            </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative">
        {/* Left column — name fields */}
        <div className="space-y-8">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black text-clara-text-tertiary uppercase tracking-[0.2em] px-2 opacity-60">
               Full Name
            </label>
            <input
              type="text"
              value={patient.name}
              onChange={(e) => setPatient((p) => ({ ...p, name: e.target.value }))}
              className="w-full bg-white/[0.03] px-6 py-5 rounded-[1.5rem] border border-white/[0.08] focus:border-clara-primary/40 focus:bg-white/[0.06] outline-none transition-all text-base font-bold text-white shadow-inner-glow"
              placeholder="Full Legal Name"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black text-clara-text-tertiary uppercase tracking-[0.2em] px-2 opacity-60">
               Preferred Moniker
            </label>
            <input
              type="text"
              value={patient.preferred_name ?? ""}
              onChange={(e) =>
                setPatient((p) => ({ ...p, preferred_name: e.target.value || null }))
              }
              className="w-full bg-white/[0.03] px-6 py-5 rounded-[1.5rem] border border-white/[0.08] focus:border-clara-primary/40 focus:bg-white/[0.06] outline-none transition-all text-base font-bold text-white shadow-inner-glow"
              placeholder="Clara's familiar name for them..."
            />
          </div>
        </div>

        {/* Right column — topics */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-[10px] font-black text-clara-text-tertiary uppercase tracking-[0.2em] px-2 opacity-60">
             Therapeutic Anchor Topics
          </label>
          <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/[0.08] min-h-[220px] flex flex-col justify-between">
            
            <div className="flex flex-wrap gap-2.5 mb-6">
              <AnimatePresence>
                {(patient.favourite_topics ?? []).map((topic) => (
                    <motion.span
                    layout
                    key={topic}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="inline-flex items-center gap-2.5 px-4 py-2 bg-clara-primary/10 text-clara-primary-light border border-clara-primary/20 rounded-xl text-xs font-black uppercase tracking-tight shadow-sm hover:bg-clara-primary/15 transition-all"
                    >
                    {topic}
                    <button
                        type="button"
                        onClick={() => removeTopic(topic)}
                        className="p-1 hover:bg-white/[0.1] rounded-full transition-colors"
                    >
                        <X size={10} strokeWidth={3} />
                    </button>
                    </motion.span>
                ))}
              </AnimatePresence>
              {(patient.favourite_topics ?? []).length === 0 && (
                <p className="text-[10px] text-clara-text-muted font-bold italic uppercase tracking-widest p-4 border border-dashed border-white/[0.05] rounded-xl w-full text-center">No anchors established</p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTopic}
                placeholder="New anchor (e.g. Classical Music)"
                className="flex-1 bg-white/[0.03] px-5 py-3.5 rounded-xl border border-white/[0.08] focus:border-clara-primary/20 outline-none transition-all text-xs font-bold text-white"
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTopic(newTopic);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => addTopic(newTopic)}
                className={`w-12 h-12 flex items-center justify-center rounded-xl border transition-all ${
                    newTopic.trim() 
                    ? "bg-clara-primary border-clara-primary text-white shadow-glow-sm" 
                    : "bg-white/[0.03] border-white/[0.08] text-clara-text-muted"
                }`}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
