// ── Primitives ────────────────────────────────────────────────────────────────

export type Role = "patient" | "clara";
export type InputMode = "chat" | "voice";
export type Mood = "calm" | "happy" | "confused" | "distressed" | "neutral";
export type SessionStatus = "idle" | "connecting" | "active" | "ended" | "error";

// ── Live chat ─────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  role: Role;
  content: string;
  mood: Mood;
  inputMode: InputMode;
  timestamp: string;
}

export interface MoodState {
  mood: Mood;
  confidence: number;
  timestamp: string;
}

export interface EmergencyState {
  active: boolean;
  severity: "critical" | "high" | "medium" | null;
  categories: string[];
  timestamp: string | null;
}

// ── Life Memory — individual memory entry inside Patient.life_memories ─────────

export interface LifeMemory {
  title?: string;
  description?: string;
  date?: string;
  tags?: string[];
  emoji?: string;
  category?: string;
  [key: string]: unknown;
}

// ── Patient — mirrors backend PatientResponse exactly ─────────────────────────

export interface Patient {
  id: string;
  name: string;
  preferred_name: string | null;
  is_active: boolean;
  language: string;
  date_of_birth: string | null;
  hometown: string | null;
  occupation_history: string | null;
  family_names: Record<string, string> | null;
  favourite_topics: string[] | null;
  life_memories: Array<Record<string, unknown>> | null;
  created_at: string;
  updated_at: string;
}

/** Lightweight row used in list views where the full profile is not needed. */
export interface PatientListItem {
  id: string;
  name: string;
  preferred_name: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Sessions — mirrors backend SessionResponse exactly ────────────────────────

/** Full session record as returned by SessionResponse. */
export interface SessionHistoryEntry {
  id: string;
  patient_id: string;
  mode: string;
  mood_summary: string | null;
  message_count: number;
  alert_count: number;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface PaginatedSessionsResponse {
  sessions: SessionHistoryEntry[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

// ── Messages — mirrors backend MessageResponse exactly ────────────────────────

export interface SessionMessageEntry {
  id: string;
  session_id: string;
  role: "patient" | "clara";
  content: string;
  mood: string | null;
  mood_score: number | null;
  input_mode: string;
  tts_params: Record<string, unknown> | null;
  created_at: string;
}

// ── Alerts ────────────────────────────────────────────────────────────────────

/**
 * Live session alert — generated client-side by the WebSocket handler and
 * stored in the Zustand AlertsSlice for in-session UI notifications.
 * Intentionally minimal: only the fields the patient-facing UI needs.
 */
export interface Alert {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  trigger_phrase: string;
  timestamp: string; // client ISO string
}

/**
 * Caregiver alert record — mirrors the backend AlertResponse schema exactly.
 * Used by the caregiver dashboard (AlertFeed, patient detail page).
 */
export interface CaregiverAlertEntry {
  id: string;
  session_id: string;
  patient_id: string;
  patient_name: string | null;
  severity: "low" | "medium" | "high" | "critical";
  trigger_phrase: string | null;
  rule_name: string | null;
  message_content: string | null;
  mood_at_trigger: string | null;
  notified_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

// ── Caregiver analytics — mirrors backend CaregiverAnalyticsResponse ──────────

export interface CaregiverAnalytics {
  total_patients: number;
  active_sessions: number;
  unresolved_alerts: number;
  /** Percentage 0–100 or null when there is insufficient mood data. */
  stability_index: number | null;
}

// ── Mood timeline — mirrors the mood-timeline endpoint response ───────────────

export interface MoodTimelineDay {
  date: string; // "YYYY-MM-DD"
  moods: Array<{ mood: string; count: number }>;
}

// ── Caregiver Notes ─────────────────────────────────────────────────────────────

export interface CaregiverNote {
  id: string;
  patient_id: string;
  caregiver_id: string;
  organization_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

