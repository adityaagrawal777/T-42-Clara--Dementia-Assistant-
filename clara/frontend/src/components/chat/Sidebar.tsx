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
    <aside className="sanctuary-sidebar w-[260px] hidden md:flex">
      <div className="flex flex-col h-full w-full">

        {/* ── Brand Header ── */}
        <div className="sanctuary-sidebar-brand">
          <span className="sanctuary-sidebar-logo">🌿</span>
          <div>
            <h1 className="sanctuary-sidebar-title">Clara</h1>
          </div>
        </div>

        {/* ── Sanctuary label ── */}
        <div className="sanctuary-sidebar-section-label">
          <span className="sanctuary-sidebar-section-heading">Your Sanctuary</span>
          <span className="sanctuary-sidebar-section-sub">Safe &amp; Calm</span>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-4 space-y-1 mt-2">
          <Link href="/chat" className="nav-item nav-item-active">
            <MessageSquare size={18} />
            <span className="font-semibold">Today&apos;s Chat</span>
          </Link>

          <button className="nav-item w-full">
            <History size={18} />
            <span className="font-medium">Past Conversations</span>
          </button>

          <button className="nav-item w-full">
            <Sparkles size={18} />
            <span className="font-medium">Saved Memories</span>
          </button>
        </nav>

        {/* ── Bottom Decorative Art ── */}
        <div className="sanctuary-sidebar-art">
          <div className="sanctuary-sidebar-art-frame">
            <Image
              src="/assets/flower.png"
              alt="Nature ornament"
              fill
              className="object-cover opacity-90"
            />
          </div>
        </div>

        {/* ── User + Sign-out ── */}
        <div className="sanctuary-sidebar-footer">
          {patientName && (
            <div className="sanctuary-sidebar-user">
              <div className="sanctuary-sidebar-user-dot" />
              <span className="sanctuary-sidebar-user-name">{patientName}</span>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="sanctuary-signout-btn"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
