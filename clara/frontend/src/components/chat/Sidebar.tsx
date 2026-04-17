"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  MessageSquare,
  History,
  Sparkles,
  LogOut,
  Heart,
  Settings,
  Search,
  X,
} from "lucide-react";
import { useClaraStore } from "@/store/claraStore";
import { useRouter, usePathname } from "next/navigation";
import { clearJWT } from "@/lib/tokens";
import { motion, AnimatePresence } from "framer-motion";

export const Sidebar: React.FC = () => {
  const patientName = useClaraStore((s) => s.patientName);
  const clearSession = useClaraStore((s) => s.clearSession);
  const setActivePanel = useClaraStore((s) => s.setActivePanel);
  const router = useRouter();
  const pathname = usePathname();

  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const handleSignOut = () => {
    clearJWT();
    clearSession();
    router.replace("/signin");
  };

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      router.push(`/memories?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const navItems = [
    { href: "/chat", icon: MessageSquare, label: "Current Chat", badge: null },
    { href: "/sessions", icon: History, label: "History", badge: null },
    { href: "/memories", icon: Sparkles, label: "Memories", badge: null },
  ];

  return (
    <aside className="w-72 hidden md:flex flex-col h-full bg-clara-surface/40 backdrop-blur-2xl border-r border-white/[0.05] shrink-0 relative z-20">
      {/* Brand Header */}
      <div className="px-7 py-9">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-clara-primary to-clara-accent flex items-center justify-center shadow-glow-sm">
            <span className="text-xl">🌿</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Clara</h1>
            <p className="text-[10px] font-bold text-clara-text-muted uppercase tracking-[0.2em] -mt-1">Companion</p>
          </div>
        </div>

        {/* Search bar — navigates to /memories with query on Enter */}
        <div className="relative group">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchSubmit}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-9 text-xs font-medium text-clara-text-primary placeholder:text-clara-text-muted focus:bg-white/[0.05] focus:border-clara-primary/40 focus:shadow-glow-sm transition-all"
          />
          <Search
            size={13}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-clara-text-muted group-focus-within:text-clara-primary transition-colors"
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => { setSearchQuery(""); searchRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-clara-text-muted hover:text-white transition-colors"
              >
                <X size={12} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {searchQuery && (
          <p className="text-[9px] text-clara-text-muted font-medium mt-1.5 px-1">
            Press Enter to search memories
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        <p className="px-4 mb-4 text-[10px] font-black text-clara-text-muted uppercase tracking-[0.2em]">Sanctuary</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                isActive
                  ? "bg-white/[0.06] text-white shadow-inner-glow border border-white/[0.08]"
                  : "text-clara-text-secondary hover:bg-white/[0.03] hover:text-white"
              }`}
            >
              <item.icon
                size={17}
                className={`${
                  isActive ? "text-clara-primary" : "text-clara-text-tertiary group-hover:text-clara-text-secondary"
                } transition-colors shrink-0`}
              />
              <span className="font-bold text-sm tracking-tight flex-1">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="w-1.5 h-1.5 rounded-full bg-clara-primary shadow-glow-sm"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-5 border-t border-white/[0.05] bg-white/[0.01]">
        <div className="glass-card p-3.5 rounded-2xl flex items-center justify-between mb-3 border-white/[0.05]">
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            <div className="w-9 h-9 rounded-xl bg-clara-surface-3 flex items-center justify-center text-clara-primary border border-white/[0.05] shrink-0">
              <Heart size={18} fill="currentColor" className="opacity-80" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate">{patientName || "Guest"}</p>
              <p className="text-[9px] font-bold text-clara-text-muted uppercase tracking-wider">Active Patient</p>
            </div>
          </div>
          <button
            onClick={() => setActivePanel("settings")}
            title="Open settings"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-clara-text-muted hover:text-white hover:bg-white/[0.06] transition-all shrink-0"
          >
            <Settings size={14} />
          </button>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-clara-text-muted hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all font-bold text-sm"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
