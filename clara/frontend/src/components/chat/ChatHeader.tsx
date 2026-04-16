"use client";

import React from "react";
import { Share2, MoreHorizontal } from "lucide-react";
import { MoodIndicator } from "./MoodIndicator";
import { VoiceToggle } from "./VoiceToggle";
import { useClaraStore } from "@/store/claraStore";

export const ChatHeader: React.FC = () => {
  const patientName = useClaraStore((state) => state.patientName);

  const initials = patientName
    ? patientName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "??";

  return (
    <header className="flex items-center justify-between px-6 lg:px-10 py-4 bg-clara-bg/40 backdrop-blur-3xl border-b border-white/[0.05] sticky top-0 z-40 shrink-0 select-none">
      {/* Mobile brand / Mobile patient info */}
      <div className="md:hidden flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-clara-primary to-clara-accent flex items-center justify-center shadow-glow-sm">
           <span className="text-xl">🌿</span>
        </div>
        <div>
          <h1 className="text-lg font-black text-white leading-tight">Clara</h1>
          <p className="text-[10px] font-bold text-clara-text-tertiary uppercase tracking-widest">Companoon</p>
        </div>
      </div>

      <div className="hidden md:flex flex-col">
        <h2 className="text-sm font-black text-white italic opacity-80">&quot;Always here for you&quot;</h2>
      </div>

      <div className="flex items-center gap-3 lg:gap-6">
        {/* Mood + Voice controls wrapped in a sub-glass pill */}
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1 shadow-inner-glow">
          <MoodIndicator />
          <VoiceToggle />
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2 pl-4 border-l border-white/[0.08]">
          <button className="w-10 h-10 rounded-xl flex items-center justify-center text-clara-text-tertiary hover:bg-white/[0.06] hover:text-white transition-all">
            <Share2 size={18} strokeWidth={2.5} />
          </button>
          <button className="w-10 h-10 rounded-xl flex items-center justify-center text-clara-text-tertiary hover:bg-white/[0.06] hover:text-white transition-all">
            <MoreHorizontal size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* User Profile Hook */}
        <div className="flex items-center gap-3 pl-4 border-l border-white/[0.08]">
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-xs font-black text-white tracking-tight">{patientName || "Guest"}</span>
            <span className="text-[9px] font-bold text-clara-primary uppercase tracking-widest">Patient</span>
          </div>
          <div className="w-10 h-10 rounded-xl border border-white/[0.1] shadow-glow-sm bg-clara-surface-2 flex items-center justify-center ring-2 ring-white/[0.05]">
            <span className="text-xs font-bold text-clara-text-primary">{initials}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
