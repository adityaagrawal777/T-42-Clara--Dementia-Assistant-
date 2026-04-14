"use client";

import React from "react";
import Link from "next/link";
import { MessageSquare, History, Sparkles, LogOut } from "lucide-react";
import Image from "next/image";
import { useClaraStore } from "@/store/claraStore";
import { useRouter } from "next/navigation";
import { clearJWT } from "@/lib/tokens";

export const Sidebar: React.FC = () => {
  const patientName = useClaraStore((state) => state.patientName);
  const clearSession  = useClaraStore((state) => state.clearSession);
  const router = useRouter();

  const handleSignOut = () => {
    clearJWT();
    clearSession();
    router.replace("/signin");
  };

  return (
    <aside className="w-[280px] hidden md:flex flex-col h-full bg-clara-beige-100 border-r border-clara-beige-200 shrink-0 shadow-sm relative z-20">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-8 border-b border-clara-beige-200">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm border border-clara-beige-200">
          <span className="text-xl">🌿</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-clara-green-900 tracking-tight">Clara</h1>
          <p className="text-xs font-medium text-clara-neutral-muted uppercase tracking-widest mt-0.5">Companion</p>
        </div>
      </div>

      <div className="px-6 pt-8 pb-3">
        <span className="block text-xs font-bold text-clara-green-900 uppercase tracking-widest">Your Sanctuary</span>
        <span className="block text-xs text-clara-neutral-muted mt-1">Safe & Calm</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 mt-2 overflow-y-auto">
        <Link href="/chat" className="flex items-center gap-3 px-4 py-3 w-full rounded-2xl bg-clara-green-800 text-white shadow-lg shadow-clara-green-800/20 transition-all hover:bg-clara-green-900 hover:shadow-xl hover:-translate-y-0.5">
          <MessageSquare size={18} />
          <span className="font-semibold text-sm">Today&apos;s Chat</span>
        </Link>

        <button className="flex items-center gap-3 px-4 py-3 w-full rounded-2xl text-clara-neutral-muted transition-all hover:bg-white hover:text-clara-green-900 hover:shadow-sm group">
          <History size={18} className="group-hover:text-clara-green-800 transition-colors" />
          <span className="font-semibold text-sm">Past Conversations</span>
        </button>

        <button className="flex items-center gap-3 px-4 py-3 w-full rounded-2xl text-clara-neutral-muted transition-all hover:bg-white hover:text-clara-green-900 hover:shadow-sm group">
          <Sparkles size={18} className="group-hover:text-clara-green-800 transition-colors" />
          <span className="font-semibold text-sm">Saved Memories</span>
        </button>
      </nav>

      {/* Decorative Art Container */}
      <div className="px-6 py-6 mt-auto">
        <div className="relative w-full aspect-square rounded-3xl overflow-hidden shadow-inner border border-black/5 bg-white mix-blend-multiply">
          <Image
            src="/assets/flower.png"
            alt="Nature ornament"
            fill
            className="object-cover opacity-80"
          />
        </div>
      </div>

      {/* User Footer */}
      <div className="flex items-center justify-between px-6 py-5 border-t border-clara-beige-200 bg-white/40">
        {patientName && (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-2 h-2 rounded-full bg-clara-green-700 ring-4 ring-clara-green-100 shadow-sm shrink-0" />
            <span className="text-sm font-bold text-clara-green-900 truncate">{patientName}</span>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-clara-neutral-muted hover:bg-red-50 hover:text-red-500 transition-colors"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={16} strokeWidth={2.5} />
        </button>
      </div>
    </aside>
  );
};
