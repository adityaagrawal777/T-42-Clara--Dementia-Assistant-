"use client";

import React from "react";
import { useClaraStore } from "@/store/claraStore";

const MOOD_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  calm:       { label: "Calm",       color: "bg-[#e8f0e8] text-[#4a7a50] border-[#b8d8bc]", dot: "#6aab72" },
  happy:      { label: "Happy",      color: "bg-[#fff4e6] text-[#b87333] border-[#f5d5a0]", dot: "#d4954a" },
  confused:   { label: "Confused",   color: "bg-[#f5f0ff] text-[#7a5cad] border-[#d5c0f5]", dot: "#9e7fd0" },
  distressed: { label: "Distressed", color: "bg-[#fff0f0] text-[#bc4a4a] border-[#f5c0c0]", dot: "#d46a6a" },
  neutral:    { label: "Neutral",    color: "bg-[#f5f0eb] text-[#7a6e65] border-[#e0d5ca]", dot: "#a8988a" },
};

export const MoodIndicator: React.FC = () => {
  const currentMood = useClaraStore((state) => state.current.mood);
  const config = MOOD_CONFIG[currentMood] ?? MOOD_CONFIG.neutral;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all duration-500 ease-out ${config.color}`}>
      <span
        className="w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-500"
        style={{ backgroundColor: config.dot }}
      />
      {config.label}
    </div>
  );
};
