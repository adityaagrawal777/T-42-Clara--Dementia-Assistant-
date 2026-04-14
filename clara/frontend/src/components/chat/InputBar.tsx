"use client";

import React, { useState, useRef, useEffect } from "react";
import { useClaraStore } from "@/store/claraStore";
import { useVoiceOrchestrator } from "@/hooks/useVoiceOrchestrator";
import { SuggestedReplies } from "./SuggestedReplies";
import { Mic, MicOff, SendHorizontal } from "lucide-react";
import { motion } from "framer-motion";

export const InputBar: React.FC = () => {
  const [content, setContent] = useState("");
  const sendMessage = useClaraStore((state) => state.sendMessage);
  const status      = useClaraStore((state) => state.status);
  const isStreaming = useClaraStore((state) => state.isStreaming);
  const isListening = useClaraStore((state) => state.isListening);
  const mode        = useClaraStore((state) => state.mode);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { voiceAvailable, startListening, stopListening, transcript } = useVoiceOrchestrator();

  // When a final transcript arrives, populate the textarea
  useEffect(() => {
    if (transcript) setContent(transcript);
  }, [transcript]);

  const canSend = content.trim() && status === "active" && !isStreaming;

  const handleSend = () => {
    if (canSend && sendMessage) {
      // Send with the current mode (voice if voice/mixed mode is enabled)
      const inputMode = (mode === "voice" || mode === "mixed") ? "voice" : "chat";
      sendMessage(content.trim(), inputMode);
      setContent("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  return (
    <div className="fixed bottom-0 left-0 md:left-[280px] right-0 p-4 lg:p-8 z-50 pointer-events-none">
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-4 pointer-events-auto">

        {/* Suggested Replies */}
        <SuggestedReplies />

        {/* Input pill */}
        <div className="flex items-center gap-2 lg:gap-3 bg-white/95 backdrop-blur-xl rounded-[2rem] p-2 pr-2 border-2 border-clara-beige-200 shadow-xl shadow-clara-green-900/5 transition-all focus-within:border-clara-green-600 focus-within:shadow-2xl focus-within:shadow-clara-green-900/10 focus-within:-translate-y-1">

          {/* Microphone Button */}
          <button
            onClick={() => (isListening ? stopListening() : startListening())}
            disabled={!voiceAvailable || isStreaming}
            className={`w-12 h-12 rounded-full border-0 flex items-center justify-center shrink-0 cursor-pointer shadow-md transition-transform hover:scale-105 hover:shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none ${
              isListening
                ? "bg-red-500 text-white shadow-red-500/30 hover:bg-red-600"
                : "bg-clara-green-800 text-white shadow-clara-green-800/30 hover:bg-clara-green-900"
            }`}
            aria-label={isListening ? "Stop listening" : "Voice input"}
            title={isListening ? "Stop listening" : "Speak to Clara"}
          >
            {isListening ? <MicOff size={22} strokeWidth={2.4} /> : <Mic size={22} strokeWidth={2.4} />}
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none bg-transparent font-sans text-base text-clara-green-900 min-h-[48px] max-h-[120px] leading-relaxed py-3 px-2 font-medium border-0 focus:outline-none focus:ring-0 placeholder-clara-neutral-muted"
            placeholder="Type a message or just say hello..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            disabled={isStreaming}
          />

          {/* Send Button */}
          <motion.button
            onClick={handleSend}
            disabled={!canSend}
            whileHover={canSend ? { scale: 1.05 } : {}}
            whileTap={canSend ? { scale: 0.95 } : {}}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
              canSend 
                ? "bg-clara-green-100 text-clara-green-800 hover:bg-clara-green-200" 
                : "bg-clara-beige-100 text-clara-neutral-muted/50 cursor-not-allowed"
            }`}
            aria-label="Send message"
          >
            <SendHorizontal size={18} strokeWidth={2.5} />
          </motion.button>

          {/* Listening indicator (far right) */}
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-clara-beige-200 h-8 shrink-0 select-none mr-2">
            <div className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
              isListening ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)] animate-pulse" : "bg-clara-beige-200"
            }`} />
            <span className="text-[10px] font-bold tracking-[0.2em] text-clara-neutral-muted/60 uppercase whitespace-nowrap">
              {isListening ? "LISTENING" : "READY"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
