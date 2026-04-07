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

export const useVoiceOrchestrator = () => {
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { isListening, isSpeaking, setListening, setSpeaking } = useClaraStore((state) => ({
    isListening: state.isListening,
    isSpeaking: state.isSpeaking,
    setListening: state.setListening,
    setSpeaking: state.setSpeaking,
  }));

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceAvailable(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onstart = () => setListening(true);
      recognitionRef.current.onend = () => {
        setListening(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        setTranscript(interimTranscript || finalTranscript);

        if (finalTranscript) {
          // In a real app, this would trigger sendMessage via the socket hook
          // Here we just set it, the component using this hook will handle the actual sending
        }

        // Reset timeout on every result
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          recognitionRef.current?.stop();
        }, SPEECH_IDLE_TIMEOUT);
      };
    }
  }, [setListening]);

  const startListening = useCallback(() => {
    if (!voiceAvailable || isSpeaking) return;
    try {
      recognitionRef.current?.start();
      setTranscript("");
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
