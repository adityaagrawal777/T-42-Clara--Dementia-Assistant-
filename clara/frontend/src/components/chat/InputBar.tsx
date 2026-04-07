"use client";

import React, { useState, useRef, useEffect } from "react";
import { useClaraStore } from "@/store/claraStore";
import { SuggestedReplies } from "./SuggestedReplies";
import { Mic, SendHorizontal } from "lucide-react";
import { motion } from "framer-motion";

export const InputBar: React.FC = () => {
  const [content, setContent] = useState("");
  const sendMessage = useClaraStore((state) => state.sendMessage);
  const status      = useClaraStore((state) => state.status);
  const isStreaming = useClaraStore((state) => state.isStreaming);
  const isListening = useClaraStore((state) => state.isListening);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = content.trim() && status === "active" && !isStreaming;

  const handleSend = () => {
    if (canSend && sendMessage) {
      sendMessage(content.trim(), "chat");
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
    <div className="fixed bottom-0 left-0 md:left-[260px] right-0 p-6 z-50 pointer-events-none">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-4 pointer-events-auto">

        {/* ── Suggested Replies ── */}
        <SuggestedReplies />

        {/* ── Input pill ── */}
        <div className="sanctuary-input-bar">

          {/* Microphone Button */}
          <button
            className="sanctuary-mic-btn"
            aria-label="Voice input"
            title="Speak to Clara"
          >
            <Mic size={20} strokeWidth={2.2} />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            className="sanctuary-textarea"
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
            whileHover={canSend ? { scale: 1.08 } : {}}
            whileTap={canSend ? { scale: 0.92 } : {}}
            className={`sanctuary-send-btn ${canSend ? "sanctuary-send-btn--active" : "sanctuary-send-btn--disabled"}`}
            aria-label="Send message"
          >
            <SendHorizontal size={18} strokeWidth={2.4} />
          </motion.button>

          {/* Listening indicator (far right) */}
          <div className="sanctuary-listening-badge">
            <div className={`sanctuary-listening-dot ${isListening ? "sanctuary-listening-dot--active" : ""}`} />
            <span className="sanctuary-listening-label">
              {isListening ? "LISTENING" : "READY"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
