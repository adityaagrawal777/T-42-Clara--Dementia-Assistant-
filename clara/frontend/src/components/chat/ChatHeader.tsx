"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Share2,
  MoreHorizontal,
  X,
  Settings,
  Info,
  LogOut,
  Check,
  Sparkles,
  Heart,
  Globe,
  Moon,
  Type,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { MoodIndicator } from "./MoodIndicator";
import { VoiceToggle } from "./VoiceToggle";
import { useClaraStore } from "@/store/claraStore";
import { clearJWT } from "@/lib/tokens";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// ── Share Toast ───────────────────────────────────────────────────────────────

const ShareToast: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => (
  <motion.div
    initial={{ opacity: 0, y: -12, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -8, scale: 0.95 }}
    className="absolute top-full right-0 mt-3 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-clara-surface-2 border border-white/[0.1] shadow-dark-lg min-w-[220px]"
  >
    <div className="w-8 h-8 rounded-xl bg-clara-success/10 border border-clara-success/20 flex items-center justify-center text-clara-success shrink-0">
      <Check size={16} strokeWidth={2.5} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-black text-white">Copied to clipboard</p>
      <p className="text-[10px] text-clara-text-muted font-medium mt-0.5">Session summary shared</p>
    </div>
    <button onClick={onDismiss} className="text-clara-text-muted hover:text-white transition-colors">
      <X size={14} />
    </button>
  </motion.div>
);

// ── More Dropdown ─────────────────────────────────────────────────────────────

interface MoreDropdownProps {
  onSettings: () => void;
  onAbout: () => void;
  onClose: () => void;
}

const MoreDropdown: React.FC<MoreDropdownProps> = ({ onSettings, onAbout, onClose }) => {
  const items = [
    { icon: Settings, label: "Preferences", sublabel: "Adjust your experience", action: onSettings },
    { icon: BookOpen, label: "Memories", sublabel: "Visit your scrapbook", action: () => { onClose(); window.location.href = "/memories"; } },
    { icon: Info, label: "About Clara", sublabel: "Version & information", action: onAbout },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      className="absolute top-full right-0 mt-3 z-50 w-64 rounded-2xl bg-clara-surface-2 border border-white/[0.08] shadow-dark-lg overflow-hidden"
    >
      <div className="p-2 space-y-0.5">
        {items.map(({ icon: Icon, label, sublabel, action }) => (
          <button
            key={label}
            onClick={() => { action(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.05] transition-all group text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-clara-text-tertiary group-hover:text-clara-primary-light group-hover:border-clara-primary/20 transition-all">
              <Icon size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white leading-none mb-0.5">{label}</p>
              <p className="text-[10px] text-clara-text-muted font-medium">{sublabel}</p>
            </div>
            <ChevronRight size={13} className="text-clara-text-muted group-hover:text-clara-text-secondary transition-colors" />
          </button>
        ))}
      </div>
    </motion.div>
  );
};

// ── About Panel ───────────────────────────────────────────────────────────────

const AboutPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <SlidePanel onClose={onClose} title="About Clara">
    <div className="flex flex-col items-center text-center py-6 px-4">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-clara-primary to-clara-accent flex items-center justify-center shadow-glow-lg mb-5">
        <span className="text-4xl">🌿</span>
      </div>
      <h3 className="text-xl font-black text-white tracking-tight">Clara Companion</h3>
      <p className="text-[10px] font-bold text-clara-text-muted uppercase tracking-[0.2em] mt-1 mb-4">Your AI Companion</p>
      <p className="text-sm text-clara-text-secondary leading-relaxed max-w-xs">
        Clara is designed to provide warm, compassionate companionship through meaningful conversation, gentle reminiscence, and emotional support.
      </p>
    </div>
    <div className="px-4 space-y-2 mt-2">
      {[
        { icon: Heart, label: "Compassionate", desc: "Always caring, never judgmental" },
        { icon: Sparkles, label: "Memory-Aware", desc: "Remembers what matters to you" },
        { icon: Globe, label: "Multilingual", desc: "Speaks your language" },
      ].map(({ icon: Icon, label, desc }) => (
        <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <Icon size={16} className="text-clara-primary-light shrink-0" />
          <div>
            <p className="text-xs font-black text-white">{label}</p>
            <p className="text-[10px] text-clara-text-muted font-medium">{desc}</p>
          </div>
        </div>
      ))}
    </div>
    <div className="px-4 mt-6">
      <p className="text-center text-[10px] text-clara-text-muted font-medium">
        Clara can make mistakes. Verify important information.
      </p>
    </div>
  </SlidePanel>
);

// ── Settings Panel ─────────────────────────────────────────────────────────────

const FONT_SIZES = [
  { id: "normal", label: "Normal", size: "16px" },
  { id: "large", label: "Large", size: "18px" },
  { id: "xl", label: "Extra Large", size: "21px" },
] as const;

type FontSizeId = (typeof FONT_SIZES)[number]["id"];

const SettingsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [fontSize, setFontSize] = useState<FontSizeId>(() => {
    if (typeof window === "undefined") return "normal";
    return (localStorage.getItem("clara_font_size") as FontSizeId) || "normal";
  });

  const applyFontSize = (id: FontSizeId) => {
    const size = FONT_SIZES.find((f) => f.id === id)?.size ?? "16px";
    document.documentElement.style.setProperty("--clara-font-size", size);
    localStorage.setItem("clara_font_size", id);
    setFontSize(id);
  };

  return (
    <SlidePanel onClose={onClose} title="Preferences">
      <div className="px-4 py-2 space-y-6">
        {/* Text Size */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Type size={14} className="text-clara-primary-light" />
            <p className="text-xs font-black text-white uppercase tracking-wider">Text Size</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {FONT_SIZES.map((f) => (
              <button
                key={f.id}
                onClick={() => applyFontSize(f.id)}
                className={`py-3 rounded-xl border text-center transition-all font-bold text-xs ${
                  fontSize === f.id
                    ? "bg-clara-primary/10 border-clara-primary/40 text-clara-primary-light shadow-glow-sm"
                    : "bg-white/[0.03] border-white/[0.07] text-clara-text-secondary hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <span style={{ fontSize: f.size === "16px" ? "14px" : f.size === "18px" ? "16px" : "18px" }}>Aa</span>
                <p className="text-[9px] font-black uppercase tracking-wider mt-1 opacity-70">{f.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Appearance note */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <Moon size={15} className="text-clara-text-tertiary shrink-0" />
          <div>
            <p className="text-xs font-black text-white">Dark Mode</p>
            <p className="text-[10px] text-clara-text-muted font-medium">Clara uses dark mode for comfort</p>
          </div>
          <div className="ml-auto w-8 h-4 rounded-full bg-clara-primary/30 border border-clara-primary/40 flex items-center justify-end pr-0.5">
            <div className="w-3 h-3 rounded-full bg-clara-primary-light shadow-glow-sm" />
          </div>
        </div>
      </div>
    </SlidePanel>
  );
};

// ── Profile Panel ──────────────────────────────────────────────────────────────

const ProfilePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const patientName = useClaraStore((s) => s.patientName);
  const mood = useClaraStore((s) => s.current);
  const items = useClaraStore((s) => s.items);
  const clearSession = useClaraStore((s) => s.clearSession);
  const router = useRouter();

  const initials = patientName
    ? patientName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "??";

  const moodColors: Record<string, string> = {
    calm: "text-clara-success",
    happy: "text-clara-primary-light",
    confused: "text-clara-warning",
    distressed: "text-clara-danger",
    neutral: "text-clara-text-secondary",
  };

  const handleSignOut = () => {
    clearJWT();
    clearSession();
    router.replace("/signin");
  };

  return (
    <SlidePanel onClose={onClose} title="Your Profile">
      <div className="px-4 py-2">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center text-center py-4 mb-4">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-clara-surface-2 to-clara-surface-3 border border-white/[0.1] flex items-center justify-center shadow-dark-lg ring-2 ring-clara-primary/20">
              <span className="text-2xl font-black text-white">{initials}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-clara-success border-2 border-clara-bg flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          </div>
          <h3 className="text-lg font-black text-white tracking-tight">{patientName || "Guest"}</h3>
          <p className="text-[10px] font-bold text-clara-primary uppercase tracking-[0.2em] mt-0.5">Active Patient</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex flex-col items-center py-3 px-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-xl font-black text-white leading-none">{items.length}</span>
            <span className="text-[9px] font-black text-clara-text-muted uppercase tracking-wider mt-1">Messages</span>
          </div>
          <div className="flex flex-col items-center py-3 px-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className={`text-sm font-black leading-none capitalize ${moodColors[mood.mood] ?? "text-clara-text-secondary"}`}>
              {mood.mood}
            </span>
            <span className="text-[9px] font-black text-clara-text-muted uppercase tracking-wider mt-1">Mood</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-1 mb-4">
          <button
            onClick={() => { onClose(); router.push("/memories"); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.05] transition-all group text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-clara-primary/10 border border-clara-primary/20 flex items-center justify-center text-clara-primary-light">
              <Sparkles size={15} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-white">My Memories</p>
              <p className="text-[10px] text-clara-text-muted font-medium">View your scrapbook</p>
            </div>
            <ChevronRight size={13} className="text-clara-text-muted group-hover:text-clara-text-secondary transition-colors" />
          </button>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-transparent hover:bg-red-500/10 hover:border-red-500/20 text-clara-text-muted hover:text-red-400 transition-all font-bold text-sm"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </SlidePanel>
  );
};

// ── Shared Slide Panel Wrapper ─────────────────────────────────────────────────

const SlidePanel: React.FC<{ children: React.ReactNode; title: string; onClose: () => void }> = ({
  children,
  title,
  onClose,
}) => (
  <>
    {/* Backdrop */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
    />
    {/* Panel */}
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="fixed top-0 right-0 h-full w-80 z-50 bg-clara-surface/95 backdrop-blur-2xl border-l border-white/[0.07] shadow-dark-lg flex flex-col"
    >
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/[0.06]">
        <h2 className="text-sm font-black text-white tracking-tight">{title}</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-clara-text-muted hover:text-white hover:bg-white/[0.08] transition-all"
        >
          <X size={15} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar py-4">{children}</div>
    </motion.div>
  </>
);

// ── Main Header ───────────────────────────────────────────────────────────────

export const ChatHeader: React.FC = () => {
  const patientName = useClaraStore((s) => s.patientName);
  const items = useClaraStore((s) => s.items);
  const activePanel = useClaraStore((s) => s.activePanel);
  const setActivePanel = useClaraStore((s) => s.setActivePanel);

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const initials = patientName
    ? patientName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "??";

  // Close more menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleShare = useCallback(async () => {
    const summary = items.length > 0
      ? `I had a wonderful conversation with Clara today — ${items.length} messages exchanged. Clara always listens. 🌿`
      : `Just started a conversation with Clara, my compassionate AI companion. 🌿`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "Clara Companion", text: summary });
      } else {
        await navigator.clipboard.writeText(summary);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 3500);
      }
    } catch {
      // User cancelled share or clipboard failed silently
    }
  }, [items.length]);

  return (
    <>
      <header className="flex items-center justify-between px-6 lg:px-10 py-4 bg-clara-bg/60 backdrop-blur-3xl border-b border-white/[0.05] sticky top-0 z-40 shrink-0 select-none">
        {/* Mobile brand */}
        <div className="md:hidden flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-clara-primary to-clara-accent flex items-center justify-center shadow-glow-sm">
            <span className="text-lg">🌿</span>
          </div>
          <div>
            <h1 className="text-base font-black text-white leading-tight">Clara</h1>
            <p className="text-[9px] font-bold text-clara-text-muted uppercase tracking-[0.2em] -mt-0.5">Companion</p>
          </div>
        </div>

        {/* Desktop tagline */}
        <div className="hidden md:flex flex-col">
          <h2 className="text-sm font-black text-white italic opacity-70">&quot;Always here for you&quot;</h2>
        </div>

        <div className="flex items-center gap-3 lg:gap-5">
          {/* Mood + Voice pill */}
          <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1 shadow-inner-glow">
            <MoodIndicator />
            <VoiceToggle />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 pl-4 border-l border-white/[0.08]">
            {/* Share */}
            <div className="relative">
              <button
                onClick={handleShare}
                title="Share session"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-clara-text-tertiary hover:bg-white/[0.06] hover:text-white transition-all"
              >
                <Share2 size={16} strokeWidth={2.5} />
              </button>
              <AnimatePresence>
                {shareToast && <ShareToast onDismiss={() => setShareToast(false)} />}
              </AnimatePresence>
            </div>

            {/* More menu */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setShowMoreMenu((v) => !v)}
                title="More options"
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  showMoreMenu
                    ? "bg-white/[0.08] text-white"
                    : "text-clara-text-tertiary hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <MoreHorizontal size={16} strokeWidth={2.5} />
              </button>
              <AnimatePresence>
                {showMoreMenu && (
                  <MoreDropdown
                    onSettings={() => setActivePanel("settings")}
                    onAbout={() => setActivePanel("about")}
                    onClose={() => setShowMoreMenu(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Profile button */}
          <button
            onClick={() => setActivePanel("profile")}
            title="View profile"
            className="flex items-center gap-3 pl-4 border-l border-white/[0.08] group"
          >
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-xs font-black text-white tracking-tight group-hover:text-clara-primary-light transition-colors">
                {patientName || "Guest"}
              </span>
              <span className="text-[9px] font-bold text-clara-primary uppercase tracking-widest">Patient</span>
            </div>
            <div className="w-9 h-9 rounded-xl border border-white/[0.12] shadow-glow-sm bg-clara-surface-2 flex items-center justify-center ring-2 ring-clara-primary/10 group-hover:ring-clara-primary/30 group-hover:border-white/[0.2] transition-all">
              <span className="text-xs font-black text-clara-text-primary">{initials}</span>
            </div>
          </button>
        </div>
      </header>

      {/* Panels — driven by Zustand activePanel so any component can open them */}
      <AnimatePresence>
        {activePanel === "profile" && <ProfilePanel onClose={() => setActivePanel(null)} />}
        {activePanel === "settings" && <SettingsPanel onClose={() => setActivePanel(null)} />}
        {activePanel === "about" && <AboutPanel onClose={() => setActivePanel(null)} />}
      </AnimatePresence>
    </>
  );
};
