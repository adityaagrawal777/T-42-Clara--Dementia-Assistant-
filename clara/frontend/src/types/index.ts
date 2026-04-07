export type Role = "patient" | "clara";
export type InputMode = "chat" | "voice";
export type Mood = "calm" | "happy" | "confused" | "distressed" | "neutral";
export type SessionStatus = "idle" | "connecting" | "active" | "ended" | "error";

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

export interface Patient {
  id: string;
  name: string;
  preferred_name: string;
  family_names: string[];
  topics_of_interest: string[];
}

export interface Alert {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  trigger_phrase: string;
  timestamp: string;
  is_resolved: boolean;
  notified_at?: string;
  resolved_at?: string;
}


export interface Session {
  id: string;
  patient_id: string;
  start_time: string;
  end_time?: string;
  message_count: number;
  alert_count: number;
}

export interface EmergencyState {
  active: boolean;
  severity: "critical" | "high" | "medium" | null;
  categories: string[];
  timestamp: string | null;
}
