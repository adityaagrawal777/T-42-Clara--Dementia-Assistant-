"use client";

import React from "react";
import { Settings } from "lucide-react";
import Image from "next/image";
import { MoodIndicator } from "./MoodIndicator";
import { VoiceToggle } from "./VoiceToggle";
import { useClaraStore } from "@/store/claraStore";

export const ChatHeader: React.FC = () => {
  const patientName = useClaraStore((state) => state.patientName);

  // Build a deterministic avatar seed from the patient name for visual uniqueness
  const avatarSeed = encodeURIComponent(patientName ?? "Clara");
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  // Get first letter for fallback initials
  const initial = patientName ? patientName.charAt(0).toUpperCase() : "?";

  return (
    <header className="flex items-center justify-between px-6 lg:px-10 py-4 bg-clara-neutral-bg/60 backdrop-blur-xl border-b border-clara-beige-200 sticky top-0 z-40 shrink-0">
      {/* Mobile brand */}
      <div className="md:hidden flex items-center gap-2">
        <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full border border-clara-beige-200">
           <span className="text-sm">🌿</span>
        </div>
        <h1 className="text-lg font-bold text-clara-green-900 tracking-tight">Clara</h1>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-4 lg:gap-6">
        {/* Mood + Voice */}
        <div className="flex items-center gap-3 pr-4 lg:pr-6 border-r border-clara-beige-200">
          <MoodIndicator />
          <VoiceToggle />
        </div>

        {/* Settings */}
        <button
          className="w-10 h-10 rounded-full flex items-center justify-center text-clara-neutral-muted hover:bg-white hover:text-clara-green-900 transition-all hover:shadow-sm"
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={20} strokeWidth={2.2} />
        </button>

        {/* User Avatar + Name */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm bg-clara-green-100 group-hover:scale-105 transition-transform shrink-0">
            <Image
              src={avatarUrl}
              alt={`${patientName ?? "User"} avatar`}
              fill
              className="object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center font-bold text-clara-green-800 -z-10">{initial}</span>
          </div>
          {patientName && (
            <span className="hidden lg:block text-sm font-bold text-clara-green-900 whitespace-nowrap group-hover:text-clara-green-700 transition-colors">
              {patientName}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
