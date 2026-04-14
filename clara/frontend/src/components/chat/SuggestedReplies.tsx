"use client";

import React from "react";
import { useClaraStore } from "@/store/claraStore";
import { MessageSquarePlus } from "lucide-react";

export const SuggestedReplies: React.FC = () => {
  const isStreaming = useClaraStore((state) => state.isStreaming);
  const status = useClaraStore((state) => state.status);
  const sendMessage = useClaraStore((state) => state.sendMessage);
  const items = useClaraStore((state) => state.items);

  // Example dynamic suggestions based on state or context
  // In a full implementation, the backend would stream these.
  const suggestions = [
    "I'd love to chat",
    "Tell me a story",
    "Let's play a game",
  ];

  const handleSuggest = (text: string) => {
    if (sendMessage && status === "active" && !isStreaming) {
      sendMessage(text, "chat");
    }
  };

  // Only show if not waiting and at the start or after Clara speaks
  const isReady = status === "active" && !isStreaming;
  const lastMessage = items[items.length - 1];
  const shouldShow = isReady && (!lastMessage || lastMessage.role === "clara");

  if (!shouldShow) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-2 px-2 animate-in slide-in-from-bottom-2 fade-in duration-300">
      <MessageSquarePlus size={16} className="text-clara-green-800/60 mr-1 shrink-0 hidden lg:block" />
      {suggestions.map((text, i) => (
        <button
          key={i}
          onClick={() => handleSuggest(text)}
          disabled={!isReady}
          className="px-4 py-2 rounded-full bg-white/90 border border-clara-beige-200 text-clara-green-900 font-sans text-sm font-semibold whitespace-nowrap cursor-pointer shadow-sm hover:bg-clara-beige-100 hover:border-clara-green-700 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {text}
        </button>
      ))}
    </div>
  );
};
