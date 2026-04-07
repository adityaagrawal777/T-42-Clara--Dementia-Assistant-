"use client";

import React from "react";
import { useClaraStore } from "@/store/claraStore";
import { motion, AnimatePresence } from "framer-motion";

const SUGGESTIONS = [
  "Tell me a story",
  "How are you feeling?",
  "Remind me of something nice",
  "Play calm music",
  "Share a memory",
];

export const SuggestedReplies: React.FC = () => {
  const sendMessage = useClaraStore((state) => state.sendMessage);
  const status      = useClaraStore((state) => state.status);
  const isStreaming = useClaraStore((state) => state.isStreaming);
  const messages    = useClaraStore((state) => state.items);

  // Only show suggestions when there are very few messages (start of convo)
  const showSuggestions = !isStreaming && messages.length <= 2;
  const canSend = status === "active" && !isStreaming;

  const handleSuggestionClick = (text: string) => {
    if (canSend && sendMessage) sendMessage(text, "chat");
  };

  return (
    <AnimatePresence>
      {showSuggestions && (
        <motion.div
          className="flex flex-wrap gap-2 overflow-x-auto no-scrollbar"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25 }}
        >
          {SUGGESTIONS.map((suggestion, index) => (
            <motion.button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={!canSend}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.07 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="sanctuary-suggestion-pill"
            >
              {suggestion}
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
