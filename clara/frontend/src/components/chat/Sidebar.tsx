"use client";

import React from "react";
import Link from "next/link";
import { MessageSquare, History, Sparkles, LogOut, Heart, Search, Settings } from "lucide-react";
import { useClaraStore } from "@/store/claraStore";
import { useRouter, usePathname } from "next/navigation";
import { clearJWT } from "@/lib/tokens";
import { motion } from "framer-motion";

export const Sidebar: React.FC = () => {
  const patientName = useClaraStore((state) => state.patientName);
  const clearSession  = useClaraStore((state) => state.clearSession);
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = () => {
    clearJWT();
    clearSession();
    router.replace("/signin");
  };

  const navItems = [
    { href: "/chat", icon: MessageSquare, label: "Current Chat" },
    { href: "/sessions", icon: History, label: "History" },
    { href: "#", icon: Sparkles, label: "Memories", disabled: true },
  ];

  return (
    <aside className="w-72 hidden md:flex flex-col h-full bg-clara-surface/40 backdrop-blur-2xl border-r border-white/[0.05] shrink-0 relative z-20">
      {/* Brand Header */}
      <div className="px-8 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-clara-primary to-clara-accent flex items-center justify-center shadow-glow-sm">
            <span className="text-xl">🌿</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Clara</h1>
            <p className="text-[10px] font-bold text-clara-text-tertiary uppercase tracking-[0.2em] -mt-1">Companion</p>
          </div>
        </div>

        {/* Action Search/Quick Filter bar (Mock) */}
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Search memories..." 
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-2 pl-10 pr-4 text-xs font-medium text-clara-text-primary placeholder:text-clara-text-muted focus:bg-white/[0.06] focus:border-clara-primary/40 transition-all"
          />
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-clara-text-muted group-focus-within:text-clara-primary transition-colors" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        <p className="px-4 mb-4 text-[10px] font-black text-clara-text-muted uppercase tracking-[0.2em]">Sanctuary</p>
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
              pathname === item.href
                ? "bg-white/[0.06] text-white shadow-inner-glow border border-white/[0.08]"
                : "text-clara-text-secondary hover:bg-white/[0.03] hover:text-white"
            } ${item.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <item.icon size={18} className={`${pathname === item.href ? "text-clara-primary" : "text-clara-text-tertiary group-hover:text-clara-text-secondary"} transition-colors`} />
            <span className="font-bold text-sm tracking-tight">{item.label}</span>
            {pathname === item.href && (
              <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-1.5 rounded-full bg-clara-primary shadow-glow-sm" />
            )}
          </Link>
        ))}
      </nav>

      {/* Quick Actions Footer */}
      <div className="px-6 py-6 border-t border-white/[0.05] bg-white/[0.01]">
        <div className="glass-card p-4 rounded-2xl flex items-center justify-between mb-4 border-white/[0.05]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-clara-surface-3 flex items-center justify-center text-clara-primary border border-white/[0.05]">
              <Heart size={20} fill="currentColor" className="opacity-80" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate">{patientName || "Guest"}</p>
              <p className="text-[10px] font-bold text-clara-text-tertiary uppercase tracking-wider">Active Patient</p>
            </div>
          </div>
          <button className="text-clara-text-muted hover:text-white transition-colors">
            <Settings size={16} />
          </button>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-clara-text-muted hover:bg-danger-muted hover:text-danger border border-transparent hover:border-danger/20 transition-all font-bold text-sm"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
