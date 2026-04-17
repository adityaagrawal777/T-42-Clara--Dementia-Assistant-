import { create } from "zustand";
import { Message, MoodState, SessionStatus, Alert, InputMode, EmergencyState } from "@/types";

interface SessionSlice {
  sessionId: string | null;
  patientId: string | null;
  patientName: string | null;
  status: SessionStatus;
  setSession: (config: { sessionId: string; patientId: string; patientName: string }) => void;
  setStatus: (status: SessionStatus) => void;
  clearSession: () => void;
}

interface MessagesSlice {
  items: Message[];
  lastMessageDone: string | null;
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  setLastMessageDone: (id: string | null) => void;
  clearMessages: () => void;
}

interface MoodSlice {
  current: MoodState;
  history: MoodState[];
  setMood: (mood: MoodState) => void;
}

interface VoiceSlice {
  isListening: boolean;
  isSpeaking: boolean;
  mode: "chat" | "voice" | "mixed";
  setListening: (listening: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  setVoiceMode: (mode: "chat" | "voice" | "mixed") => void;
}

interface ConnectionSlice {
  isConnected: boolean;
  lastPing: number | null;
  reconnectAttempts: number;
  setConnected: (connected: boolean) => void;
  setLastPing: (timestamp: number) => void;
  setReconnectAttempts: (attempts: number) => void;
}

interface AlertsSlice {
  alerts: Alert[];
  addAlert: (alert: Alert) => void;
  clearAlerts: () => void;
}

// Holds the sendMessage fn registered by useClaraSocket so any component can call it
interface SocketSlice {
  sendMessage: ((content: string, inputMode: InputMode) => void) | null;
  setSendMessage: (fn: (content: string, inputMode: InputMode) => void) => void;
  isStreaming: boolean;
  setStreaming: (streaming: boolean) => void;
}

interface EmergencySlice {
  emergency: EmergencyState;
  triggerEmergency: (severity: "critical" | "high" | "medium", categories: string[]) => void;
  dismissEmergency: () => void;
}

export type ActivePanel = "profile" | "settings" | "about" | null;

interface UiSlice {
  prefillMessage: string | null;
  setPrefillMessage: (msg: string | null) => void;
  activePanel: ActivePanel;
  setActivePanel: (panel: ActivePanel) => void;
}

interface ClaraState
  extends SessionSlice,
    MessagesSlice,
    MoodSlice,
    VoiceSlice,
    ConnectionSlice,
    AlertsSlice,
    SocketSlice,
    EmergencySlice,
    UiSlice {}

export const useClaraStore = create<ClaraState>()((set) => ({
  // Session
  sessionId: null,
  patientId: null,
  patientName: null,
  status: "idle",
  setSession: (config: { sessionId: string; patientId: string; patientName: string }) =>
    set({
      ...config,
      // Always start a new login with a completely blank slate
      items: [],
      lastMessageDone: null,
      isStreaming: false,
      isConnected: false,
      reconnectAttempts: 0,
      alerts: [],
      emergency: { active: false, severity: null, categories: [], timestamp: null },
    }),
  setStatus: (status: SessionStatus) => set({ status }),
  clearSession: () =>
    set({
      sessionId: null,
      patientId: null,
      patientName: null,
      status: "idle",
      items: [],
      lastMessageDone: null,
      isStreaming: false,
      isConnected: false,
      reconnectAttempts: 0,
      alerts: [],
      emergency: { active: false, severity: null, categories: [], timestamp: null },
    }),

  // Messages
  items: [],
  lastMessageDone: null,
  addMessage: (message: Message) => set((state) => ({ items: [...state.items, message] })),
  updateLastMessage: (content: string) =>
    set((state) => {
      const last = state.items[state.items.length - 1];
      if (!last || last.role !== "clara") return state;
      return {
        items: [...state.items.slice(0, -1), { ...last, content: last.content + content }],
      };
    }),
  setLastMessageDone: (id: string | null) => set({ lastMessageDone: id }),
  clearMessages: () => set({ items: [], lastMessageDone: null }),

  // Mood
  current: { mood: "neutral", confidence: 1.0, timestamp: new Date().toISOString() },
  history: [],
  setMood: (mood: MoodState) =>
    set((state) => ({
      current: mood,
      history: [...state.history, mood].slice(-100),
    })),

  // Voice
  isListening: false,
  isSpeaking: false,
  mode: "chat",
  setListening: (isListening: boolean) => set({ isListening }),
  setSpeaking: (isSpeaking: boolean) => set({ isSpeaking }),
  setVoiceMode: (mode: "chat" | "voice" | "mixed") => set({ mode }),

  // Connection
  isConnected: false,
  lastPing: null,
  reconnectAttempts: 0,
  setConnected: (isConnected: boolean) => set({ isConnected }),
  setLastPing: (lastPing: number) => set({ lastPing }),
  setReconnectAttempts: (reconnectAttempts: number) => set({ reconnectAttempts }),

  // Alerts
  alerts: [],
  addAlert: (alert: Alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),
  clearAlerts: () => set({ alerts: [] }),

  // Socket sender (set by useClaraSocket on mount)
  sendMessage: null,
  setSendMessage: (fn) => set({ sendMessage: fn }),
  isStreaming: false,
  setStreaming: (isStreaming) => set({ isStreaming }),

  // UI State
  prefillMessage: null,
  setPrefillMessage: (msg) => set({ prefillMessage: msg }),
  activePanel: null,
  setActivePanel: (panel) => set({ activePanel: panel }),

  // Emergency State
  emergency: {
    active: false,
    severity: null,
    categories: [],
    timestamp: null,
  },
  triggerEmergency: (severity, categories) =>
    set({
      emergency: {
        active: true,
        severity,
        categories,
        timestamp: new Date().toISOString(),
      },
    }),
  dismissEmergency: () =>
    set({
      emergency: { active: false, severity: null, categories: [], timestamp: null },
    }),
}));
