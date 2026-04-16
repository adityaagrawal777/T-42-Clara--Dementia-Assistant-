import { useState, useCallback, useEffect, useRef } from "react";
import { useClaraStore } from "@/store/claraStore";
import { getMoodVoiceParams, SPEECH_IDLE_TIMEOUT } from "@/lib/constants";
import { Mood } from "@/types";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

/**
 * Picks the best female English voice available in the browser.
 * Priority: explicitly-labelled "female" → known female voice names → any English voice.
 */
const pickFemaleVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  if (!voices.length) return null;
  const femaleKeywords = /female|aria|samantha|zira|susan|cortana|victoria|karen|moira|serena|tessa|eva|jenny|helena|emma|amy/i;

  return (
    voices.find((v) => /female/i.test(v.name) && v.lang.startsWith("en")) ||
    voices.find((v) => femaleKeywords.test(v.name) && v.lang.startsWith("en")) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    null
  );
};

export const useVoiceOrchestrator = () => {
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const femaleVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  // Accumulates confirmed final segments so they are never overwritten by a
  // subsequent interim result from the same utterance.
  const finalTranscriptRef = useRef("");

  const { isListening, isSpeaking, setListening, setSpeaking } = useClaraStore((state) => ({
    isListening: state.isListening,
    isSpeaking: state.isSpeaking,
    setListening: state.setListening,
    setSpeaking: state.setSpeaking,
  }));

  useEffect(() => {
    // SSR guard — Web Speech APIs are browser-only
    if (typeof window === "undefined") return;

    // Pre-load female voice — voices may not be available synchronously on first render
    if (window.speechSynthesis) {
      const loadVoices = () => {
        femaleVoiceRef.current = pickFemaleVoice(window.speechSynthesis.getVoices());
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceAvailable(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onstart = () => {
        finalTranscriptRef.current = "";
        setListening(true);
      };
      recognitionRef.current.onend = () => {
        setListening(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            // Append confirmed text so it can never be overwritten by a later
            // interim result from the same utterance.
            finalTranscriptRef.current += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        setTranscript(finalTranscriptRef.current + interimTranscript);

        // Reset idle timeout on every result
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          recognitionRef.current?.stop();
        }, SPEECH_IDLE_TIMEOUT);
      };
    }

    return () => {
      // Clean up the voices listener to prevent memory leaks after unmount
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [setListening]);

  const startListening = useCallback(() => {
    if (!voiceAvailable || isSpeaking) return;
    try {
      finalTranscriptRef.current = "";
      setTranscript("");
      recognitionRef.current?.start();
    } catch (e) {
      console.error("SpeechRecognition error:", e);
    }
  }, [voiceAvailable, isSpeaking]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const speak = useCallback(
    (text: string, mood: Mood) => {
      if (!window.speechSynthesis || isListening) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const params = getMoodVoiceParams(mood);

      utterance.rate = params.rate;
      utterance.pitch = params.pitch;
      utterance.volume = params.volume;

      // Use the pre-selected female voice if available
      if (femaleVoiceRef.current) {
        utterance.voice = femaleVoiceRef.current;
      }

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [isListening, setSpeaking]
  );

  return {
    voiceAvailable,
    transcript,
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    speak,
  };
};
