"use client";

import React, { useState, useRef, useEffect } from "react";
import { useClaraStore } from "@/store/claraStore";
import { useVoiceOrchestrator } from "@/hooks/useVoiceOrchestrator";
import { SuggestedReplies } from "./SuggestedReplies";
import { Mic, MicOff, SendHorizontal, Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const InputBar: React.FC = () => {
  const [content, setContent] = useState("");
  const sendMessage = useClaraStore((state) => state.sendMessage);
  const status      = useClaraStore((state) => state.status);
  const isStreaming = useClaraStore((state) => state.isStreaming);
  const isListening = useClaraStore((state) => state.isListening);
  const mode        = useClaraStore((state) => state.mode);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { voiceAvailable, startListening, stopListening, transcript } = useVoiceOrchestrator();

  useEffect(() => {
    if (transcript) setContent(transcript);
  }, [transcript]);

  const canSend = content.trim() && status === "active" && !isStreaming;

  const handleSend = () => {
    if (canSend && sendMessage) {
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [content]);

  return (
    <div className="fixed bottom-0 left-0 md:left-72 right-0 p-6 lg:p-10 z-50 pointer-events-none">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 pointer-events-auto">

        {/* Suggested Replies */}
        <SuggestedReplies />

        {/* Input Bar Structure */}
        <div className="relative group">
          {/* External Shadow/Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-clara-primary/20 to-clara-accent/20 rounded-[2.5rem] blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative flex flex-col glass-card rounded-[2rem] border-white/[0.1] shadow-2xl p-2 transition-all duration-300 focus-within:border-white/[0.15] focus-within:bg-white/[0.05]">
            
            <div className="flex items-end gap-2 pr-2">
              {/* Accessory Button */}
              <button className="w-10 h-10 rounded-full flex items-center justify-center text-clara-text-muted hover:text-white hover:bg-white/[0.05] transition-all ml-1 mb-1 shrink-0">
                <Paperclip size={20} />
              </button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                className="flex-1 resize-none bg-transparent font-sans text-base text-slate-100 min-h-[48px] max-h-[150px] leading-relaxed py-3 px-3 font-medium border-0 focus:outline-none focus:ring-0 placeholder-clara-text-muted"
                placeholder="Message Clara..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                disabled={isStreaming}
              />

              {/* Voice/Send Group */}
              <div className="flex items-center gap-2 mb-1 shrink-0">
                {/* Voice Button */}
                <button
                  onClick={() => (isListening ? stopListening() : startListening())}
                  disabled={!voiceAvailable || isStreaming}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isListening
                      ? "bg-danger text-white shadow-glow-sm animate-pulse"
                      : "text-clara-text-secondary hover:text-white hover:bg-white/[0.05]"
                  }`}
                  aria-label={isListening ? "Stop listening" : "Voice input"}
                >
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                {/* Send Button */}
                <motion.button
                  onClick={handleSend}
                  disabled={!canSend}
                  whileHover={canSend ? { scale: 1.05 } : {}}
                  whileTap={canSend ? { scale: 0.95 } : {}}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${
                    canSend 
                      ? "bg-clara-primary text-white shadow-glow-sm" 
                      : "bg-white/[0.03] text-clara-text-muted cursor-not-allowed"
                  }`}
                >
                  <SendHorizontal size={18} strokeWidth={2.5} />
                </motion.button>
              </div>
            </div>

            {/* Bottom Status bar interior */}
            <AnimatePresence>
              {isListening && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 24, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 overflow-hidden"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse"></span>
                    <span className="text-[10px] font-black text-danger uppercase tracking-[0.2em]">Listening for your voice...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Attribution / Safe Info */}
        <p className="text-center text-[10px] font-bold text-clara-text-muted uppercase tracking-widest pointer-events-none">
          Clara can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
};
