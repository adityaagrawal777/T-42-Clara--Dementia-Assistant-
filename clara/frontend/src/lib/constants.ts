import { Mood } from "@/types";

export interface VoiceParams {
  rate: number;
  pitch: number;
  volume: number;
}

export const getMoodVoiceParams = (mood: Mood): VoiceParams => {
  switch (mood) {
    case "distressed":
      return { rate: 0.75, pitch: 0.9, volume: 0.9 };
    case "confused":
      return { rate: 0.82, pitch: 0.95, volume: 0.9 };
    case "happy":
      return { rate: 1.1, pitch: 1.08, volume: 1.0 };
    case "calm":
    default:
      return { rate: 1.0, pitch: 1.0, volume: 1.0 };
  }
};

export const RECONNECT_MAX_ATTEMPTS = 5;
export const RECONNECT_INITIAL_DELAY = 1000;
export const SPEECH_IDLE_TIMEOUT = 8000;
