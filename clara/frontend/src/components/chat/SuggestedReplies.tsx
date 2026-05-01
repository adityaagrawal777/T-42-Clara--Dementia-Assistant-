"use client";

import React from "react";
import { useClaraStore } from "@/store/claraStore";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export const SuggestedReplies: React.FC = () => {
  const isStreaming = useClaraStore((state) => state.isStreaming);
  const status = useClaraStore((state) => state.status);
  const sendMessage = useClaraStore((state) => state.sendMessage);
  const items = useClaraStore((state) => state.items);

  const suggestions = [
    "I'd love to chat",
    "Tell me a story",
    "Help me remember",
  ];

  const handleSuggest = (text: string) => {
    if (sendMessage && status === "active" && !isStreaming) {
      sendMessage(text, "chat");
    }
  };

  const isReady = status === "active" && !isStreaming;
  const lastMessage = items[items.length - 1];

  // Suggestions are a conversation-starter affordance only.
  // Show them exclusively after Clara's first (and only) greeting message —
  // i.e. exactly 1 item in the thread, and it is from Clara.
  // Once the patient replies, they are hidden for the entire session.
  const isOpeningGreeting =
    items.length === 1 && lastMessage?.role === "clara";

  const shouldShow = isReady && isOpeningGreeting;

  if (!shouldShow) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-2 px-2">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-clara-primary/10 border border-clara-primary/20 text-clara-primary-light mr-1">
        <Sparkles size={14} strokeWidth={2.5} />
        <span className="text-[10px] font-black uppercase tracking-[0.1em]">Suggested</span>
      </div>
      
      {suggestions.map((text, i) => (
        <motion.button
          key={i}
          initial={{ opacity: 0, scale: 0.9, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          onClick={() => handleSuggest(text)}
          disabled={!isReady}
          className="px-4 py-2 rounded-xl bg-white border border-clara-warm/[0.14] text-clara-text-secondary font-bold text-xs whitespace-nowrap cursor-pointer shadow-dark-sm hover:bg-clara-surface-2 hover:border-clara-primary/40 hover:text-clara-text-primary hover:shadow-glow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {text}
        </motion.button>
      ))}
    </div>
  );
};
