"use client";

import React from "react";
import { useClaraStore } from "@/store/claraStore";

export const VoiceToggle: React.FC = () => {
  const { mode, setVoiceMode } = useClaraStore();

  const isVoiceEnabled = mode === "voice" || mode === "mixed";

  const toggleVoice = () => {
    setVoiceMode(isVoiceEnabled ? "chat" : "voice");
  };

  return (
    <button
      onClick={toggleVoice}
      aria-label={isVoiceEnabled ? "Disable Clara Voice" : "Enable Clara Voice"}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
        isVoiceEnabled
          ? "bg-[#6aab72]/10 text-[#6aab72] hover:bg-[#6aab72]/20"
          : "bg-[#e8dfd5]/50 text-[#b5a898] hover:bg-[#e8dfd5]"
      }`}
      title={isVoiceEnabled ? "Voice Enabled" : "Voice Disabled (Text Only)"}
    >
      {isVoiceEnabled ? (
        // Microphone enabled icon (solid)
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.09-.6-.39-1.14-1-1.14z" />
        </svg>
      ) : (
        // Microphone disabled (slash) icon
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02 3.28c-.91.73-2.07 1.22-3.32 1.36V20h2v2H10v-2h2v-4.36c-1.3-.15-2.5-.66-3.46-1.44l1.39-1.39c.69.57 1.57.94 2.53 1.05 1.13.13 2.23-.17 3.09-.76l1.43 1.46zM12 14c1.66 0 3-1.34 3-3V9.32l-5.69 5.69C9.72 13.68 10.79 14 12 14zM4.27 3L3 4.27l6 6V11c0 1.66 1.34 3 3 3 .23 0 .44-.03.65-.08l5.08 5.08L19.73 21 4.27 3zM15 11V5c0-1.66-1.34-3-3-3-.76 0-1.45.28-1.97.74l1.41 1.41c.17-.09.35-.15.56-.15 1.1 0 2 .9 2 2v2.17l1 1C15 11.51 15 11.26 15 11z" />
        </svg>
      )}
    </button>
  );
};
