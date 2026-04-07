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
    <header className="sanctuary-header">
      {/* Mobile brand */}
      <div className="md:hidden">
        <h1 className="text-xl font-bold text-clara-green-900 tracking-tight">Clara</h1>
      </div>

      <div className="flex-1" />

      <div className="sanctuary-header-actions">
        {/* Mood + Voice */}
        <div className="sanctuary-header-controls">
          <MoodIndicator />
          <VoiceToggle />
        </div>

        {/* Settings */}
        <button
          className="sanctuary-icon-btn"
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={20} strokeWidth={2} />
        </button>

        {/* User Avatar + Name */}
        <div className="sanctuary-user-chip">
          <div className="sanctuary-avatar" title={patientName ?? "User"}>
            <Image
              src={avatarUrl}
              alt={`${patientName ?? "User"} avatar`}
              fill
              className="object-cover"
            />
            <span className="sanctuary-avatar-fallback">{initial}</span>
          </div>
          {patientName && (
            <span className="sanctuary-user-name">{patientName}</span>
          )}
        </div>
      </div>
    </header>
  );
};
