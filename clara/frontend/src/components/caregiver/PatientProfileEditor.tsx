"use client";

import React, { useState, useRef } from "react";
import { User, Heart, Tag, Save, Plus, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Patient } from "@/types";

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
    <div className="bg-white p-12 rounded-[48px] border border-slate-100 shadow-xl max-w-4xl mx-auto w-full relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-clara-calm-bg opacity-10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center mb-12 relative">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-clara-calm-bg rounded-3xl border-2 border-clara-calm-border shadow-sm">
            <User className="w-8 h-8 text-clara-calm-text" />
          </div>
          <div>
            <h3 className="text-3xl font-bold text-slate-800 tracking-tight">Patient Profile</h3>
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mt-1">
              Clara&apos;s therapeutic context
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className="flex items-center gap-3 rounded-2xl px-8 py-4 bg-clara-calm-bg text-clara-calm-text border-2 border-clara-calm-border hover:bg-white transition-all font-bold text-base shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : saveStatus === "success" ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : saveStatus === "error" ? (
            <AlertCircle className="w-5 h-5 text-rose-500" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isSaving ? "Saving…" : saveStatus === "success" ? "Saved" : "Update Profile"}
        </button>
      </div>

      {/* Inline error banner */}
      {saveStatus === "error" && saveError && (
        <div className="mb-8 px-6 py-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm font-semibold text-rose-600">
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative">
        {/* Left column — name fields */}
        <div className="space-y-8">
          <div className="bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              <User className="w-4 h-4" /> Legal Name
            </label>
            <input
              type="text"
              value={patient.name}
              onChange={(e) => setPatient((p) => ({ ...p, name: e.target.value }))}
              className="w-full bg-white px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-clara-calm-border outline-none transition-all text-lg font-medium text-slate-700 shadow-sm"
              placeholder="Full Name"
            />
          </div>

          <div className="bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              <Heart className="w-4 h-4" /> Preferred Name
            </label>
            <input
              type="text"
              value={patient.preferred_name ?? ""}
              onChange={(e) =>
                setPatient((p) => ({ ...p, preferred_name: e.target.value || null }))
              }
              className="w-full bg-white px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-clara-calm-border outline-none transition-all text-lg font-medium text-slate-700 shadow-sm"
              placeholder="What Clara should call them…"
            />
          </div>
        </div>

        {/* Right column — topics */}
        <div>
          <div className="bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
              <Tag className="w-4 h-4" /> Topics of Interest
            </label>

            <div className="flex flex-wrap gap-3 mb-6 min-h-[48px]">
              {(patient.favourite_topics ?? []).map((topic) => (
                <span
                  key={topic}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-clara-happy-bg text-clara-happy-text border-2 border-clara-happy-border rounded-2xl text-sm font-bold shadow-sm transition-all hover:scale-105"
                >
                  {topic}
                  <button
                    type="button"
                    onClick={() => removeTopic(topic)}
                    aria-label={`Remove ${topic}`}
                    className="hover:scale-125 transition-transform"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {(patient.favourite_topics ?? []).length === 0 && (
                <p className="text-sm text-slate-400 italic">No topics added yet</p>
              )}
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={newTopic}
                placeholder="Add interest (e.g. Gardening)"
                className="flex-1 bg-white px-5 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-clara-calm-border outline-none transition-all text-sm shadow-sm"
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
                className="w-12 h-12 flex items-center justify-center rounded-2xl border-2 border-slate-200 bg-white text-slate-400 hover:text-clara-calm-text hover:border-clara-calm-border transition-all shadow-sm"
                aria-label="Add topic"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
