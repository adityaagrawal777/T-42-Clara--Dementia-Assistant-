"use client";

import React from "react";
import { Smile } from "lucide-react";

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-end gap-3 w-full animate-in slide-in-from-bottom-2 fade-in duration-300">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-1 bg-clara-beige-200 text-clara-green-800 border border-clara-beige-200/50 shadow-sm">
        <Smile size={16} strokeWidth={2.4} />
      </div>

      {/* Bubble */}
      <div className="flex items-center gap-1.5 bg-clara-beige-100 border border-clara-beige-200 rounded-[1.5rem] rounded-bl-[0.25rem] px-5 py-4 shadow-sm h-[48px]">
        <div className="w-2 h-2 rounded-full bg-clara-neutral-muted/60 animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 rounded-full bg-clara-neutral-muted/60 animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 rounded-full bg-clara-neutral-muted/60 animate-bounce" />
      </div>
    </div>
  );
};
