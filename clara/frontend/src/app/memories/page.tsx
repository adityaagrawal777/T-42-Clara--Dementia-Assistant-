"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Search,
  ArrowLeft,
  MessageSquare,
  RefreshCw,
  Tag,
  Calendar,
  Loader2,
  BookOpen,
  Heart,
  X,
  Zap,
  Star,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { decodeJWT } from "@/lib/tokens";
import { useClaraStore } from "@/store/claraStore";
import type { Patient, LifeMemory } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ── Design tokens ─────────────────────────────────────────────────────────────

const MEMORY_PALETTES = [
  { bg: "from-violet-950/70 to-purple-950/50", border: "border-violet-500/25", accent: "text-violet-300", glow: "bg-violet-400" },
  { bg: "from-rose-950/70 to-pink-950/50",    border: "border-rose-500/25",   accent: "text-rose-300",   glow: "bg-rose-400" },
  { bg: "from-sky-950/70 to-blue-950/50",     border: "border-sky-500/25",    accent: "text-sky-300",    glow: "bg-sky-400" },
  { bg: "from-emerald-950/70 to-teal-950/50", border: "border-emerald-500/25",accent: "text-emerald-300",glow: "bg-emerald-400" },
  { bg: "from-amber-950/70 to-yellow-950/50", border: "border-amber-500/25",  accent: "text-amber-300",  glow: "bg-amber-400" },
  { bg: "from-fuchsia-950/70 to-purple-950/50",border:"border-fuchsia-500/25",accent: "text-fuchsia-300",glow: "bg-fuchsia-400" },
];

const TOPIC_PALETTES = [
  { bg: "from-indigo-950/60 to-violet-950/40", border: "border-indigo-500/20", accent: "text-indigo-300", icon: "bg-indigo-500/15 border-indigo-500/25 text-indigo-300" },
  { bg: "from-teal-950/60 to-emerald-950/40",  border: "border-teal-500/20",   accent: "text-teal-300",   icon: "bg-teal-500/15 border-teal-500/25 text-teal-300" },
  { bg: "from-pink-950/60 to-rose-950/40",     border: "border-pink-500/20",   accent: "text-pink-300",   icon: "bg-pink-500/15 border-pink-500/25 text-pink-300" },
  { bg: "from-orange-950/60 to-amber-950/40",  border: "border-orange-500/20", accent: "text-orange-300", icon: "bg-orange-500/15 border-orange-500/25 text-orange-300" },
  { bg: "from-cyan-950/60 to-sky-950/40",      border: "border-cyan-500/20",   accent: "text-cyan-300",   icon: "bg-cyan-500/15 border-cyan-500/25 text-cyan-300" },
  { bg: "from-lime-950/60 to-green-950/40",    border: "border-lime-500/20",   accent: "text-lime-300",   icon: "bg-lime-500/15 border-lime-500/25 text-lime-300" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractFields(mem: LifeMemory) {
  return {
    title:       (mem.title as string)       || "A Memory",
    description: (mem.description as string) || (mem.content as string) || "",
    date:        (mem.date as string)        || null,
    tags:        Array.isArray(mem.tags) ? (mem.tags as string[]) : [],
    emoji:       (mem.emoji as string)       || "✨",
  };
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch { return iso; }
}

// ── Interest / Topic Card ─────────────────────────────────────────────────────

const TopicCard: React.FC<{
  topic: string;
  index: number;
  onTalkToClara: (topic: string) => void;
}> = ({ topic, index, onTalkToClara }) => {
  const p = TOPIC_PALETTES[index % TOPIC_PALETTES.length];

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className={`relative flex flex-col rounded-2xl border ${p.border} bg-gradient-to-br ${p.bg}
                  overflow-hidden group hover:scale-[1.02] transition-transform duration-300 cursor-default`}
    >
      <div className="p-5 flex flex-col gap-3">
        {/* Topic icon */}
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${p.icon} shrink-0`}>
          <Star size={17} strokeWidth={2.5} />
        </div>

        {/* Topic name */}
        <div>
          <p className="font-black text-white text-sm leading-tight tracking-tight">{topic}</p>
          <p className={`text-[10px] font-bold mt-0.5 uppercase tracking-wider ${p.accent} opacity-70`}>
            Your interest
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => onTalkToClara(topic)}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border ${p.border}
                      bg-white/[0.03] hover:bg-white/[0.08] transition-all font-bold text-[11px] ${p.accent} hover:text-white`}
        >
          <MessageSquare size={12} strokeWidth={2.5} className="shrink-0" />
          Talk to Clara about this
        </button>
      </div>
    </motion.article>
  );
};

// ── Life Memory Card ──────────────────────────────────────────────────────────

const MemoryCard: React.FC<{
  memory: LifeMemory;
  index: number;
  onTalkToClara: (memory: LifeMemory) => void;
}> = ({ memory, index, onTalkToClara }) => {
  const { title, description, date, tags, emoji } = extractFields(memory);
  const p = MEMORY_PALETTES[index % MEMORY_PALETTES.length];

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className={`relative flex flex-col rounded-3xl border ${p.border} bg-gradient-to-br ${p.bg}
                  backdrop-blur-sm overflow-hidden group hover:scale-[1.015] transition-transform duration-300`}
    >
      {/* Ambient glow */}
      <div className={`absolute top-0 left-0 w-32 h-32 rounded-full ${p.glow} opacity-[0.04] blur-3xl pointer-events-none`} />

      <div className="relative z-10 p-6 flex flex-col h-full">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-2xl shrink-0">
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-white text-base leading-tight tracking-tight line-clamp-2">{title}</h3>
            {date && (
              <div className={`flex items-center gap-1.5 mt-1.5 ${p.accent}`}>
                <Calendar size={11} strokeWidth={2.5} />
                <span className="text-[10px] font-bold tracking-wide">{formatDate(date)}</span>
              </div>
            )}
          </div>
        </div>

        {description && (
          <p className="text-clara-text-secondary text-sm leading-relaxed flex-1 mb-4 line-clamp-4">
            {description}
          </p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.05]
                            border border-white/[0.08] text-[10px] font-bold ${p.accent} uppercase tracking-wider`}
              >
                <Tag size={9} />
                {tag}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={() => onTalkToClara(memory)}
          className={`w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl border ${p.border}
                      bg-white/[0.04] hover:bg-white/[0.09] transition-all font-black text-xs ${p.accent} hover:text-white`}
        >
          <MessageSquare size={14} strokeWidth={2.5} className="shrink-0" />
          Talk to Clara about this
        </button>
      </div>
    </motion.article>
  );
};

// ── Section header ────────────────────────────────────────────────────────────

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  count: number;
  badge?: string;
}> = ({ icon, title, count, badge }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="w-8 h-8 rounded-xl bg-clara-primary/10 border border-clara-primary/20 flex items-center justify-center text-clara-primary-light">
      {icon}
    </div>
    <h2 className="text-base font-black text-white tracking-tight">{title}</h2>
    <span className="px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] font-black text-clara-text-muted uppercase tracking-wider">
      {count}
    </span>
    {badge && (
      <span className="px-2.5 py-0.5 rounded-full bg-clara-primary/10 border border-clara-primary/20 text-[10px] font-black text-clara-primary-light uppercase tracking-wider flex items-center gap-1">
        <Zap size={9} />
        {badge}
      </span>
    )}
  </div>
);

// ── Empty section hint ────────────────────────────────────────────────────────

const EmptySectionHint: React.FC<{ message: string; cta?: React.ReactNode }> = ({ message, cta }) => (
  <div className="flex flex-col items-center text-center py-10 px-6 rounded-3xl border border-dashed border-white/[0.07] bg-white/[0.01]">
    <p className="text-clara-text-muted text-sm font-medium leading-relaxed max-w-xs">{message}</p>
    {cta && <div className="mt-4">{cta}</div>}
  </div>
);

// ── Full empty state (nothing at all) ─────────────────────────────────────────

const TotalEmptyState: React.FC<{ hasSearch: boolean }> = ({ hasSearch }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center text-center py-24 px-8"
  >
    <div className="w-24 h-24 rounded-[2rem] bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mb-6 text-clara-primary">
      {hasSearch ? <Search size={36} /> : <BookOpen size={36} />}
    </div>
    <h3 className="text-xl font-black text-white tracking-tight mb-2">
      {hasSearch ? "No results found" : "Your garden is waiting"}
    </h3>
    <p className="text-clara-text-secondary text-sm max-w-sm leading-relaxed">
      {hasSearch
        ? "Try a different search term."
        : "Start chatting with Clara — every interest you share will bloom here. Your caregiver can also add life memories."}
    </p>
    {!hasSearch && (
      <Link
        href="/chat"
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-clara-primary/10 border border-clara-primary/30 text-clara-primary-light font-black text-sm hover:bg-clara-primary/20 transition-all"
      >
        <MessageSquare size={15} />
        Chat with Clara
      </Link>
    )}
  </motion.div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

function MemoriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  const setPrefillMessage = useClaraStore((s) => s.setPrefillMessage);

  useEffect(() => {
    if (!decodeJWT()) router.replace("/signin");
  }, [router]);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/v1/auth/patient/me");
      setPatient(data as Patient);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // "Talk to Clara about this memory" — pre-fills the chat input
  const handleTalkAboutMemory = useCallback(
    (memory: LifeMemory) => {
      const { title, description } = extractFields(memory);
      const prompt = description
        ? `I'd love to talk about "${title}". ${description}`
        : `I'd love to talk about "${title}".`;
      setPrefillMessage(prompt);
      router.push("/chat");
    },
    [setPrefillMessage, router],
  );

  // "Talk to Clara about this interest"
  const handleTalkAboutTopic = useCallback(
    (topic: string) => {
      setPrefillMessage(`I'd love to talk about ${topic}.`);
      router.push("/chat");
    },
    [setPrefillMessage, router],
  );

  const q = searchQuery.trim().toLowerCase();

  const filteredMemories = useMemo<LifeMemory[]>(() => {
    const raw = (patient?.life_memories ?? []) as LifeMemory[];
    if (!q) return raw;
    return raw.filter((m) => {
      const { title, description, tags } = extractFields(m);
      return (
        title.toLowerCase().includes(q) ||
        description.toLowerCase().includes(q) ||
        tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [patient, q]);

  const filteredTopics = useMemo<string[]>(() => {
    const raw = patient?.favourite_topics ?? [];
    if (!q) return raw;
    return raw.filter((t) => t.toLowerCase().includes(q));
  }, [patient, q]);

  const totalCount = filteredMemories.length + filteredTopics.length;
  const memoryCount  = patient?.life_memories?.length  ?? 0;
  const topicCount   = patient?.favourite_topics?.length ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/chat"
            className="w-10 h-10 glass-card rounded-2xl flex items-center justify-center text-clara-text-tertiary hover:text-white transition-all shrink-0"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
              <Sparkles size={26} className="text-clara-primary" />
              Memory Garden
            </h1>
            <p className="text-clara-text-secondary font-medium mt-1 text-sm">
              The stories and interests that make you, you.
            </p>
          </div>
        </div>

        <button
          onClick={fetchProfile}
          disabled={loading}
          title="Refresh"
          className="w-10 h-10 glass-card rounded-2xl flex items-center justify-center text-clara-text-tertiary hover:text-white transition-all disabled:opacity-40"
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Stats row ── */}
      {!loading && !error && (
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
            <Sparkles size={14} className="text-clara-primary-light" />
            <span className="text-sm font-black text-white">{memoryCount}</span>
            <span className="text-[11px] font-bold text-clara-text-muted uppercase tracking-wider">Life Memories</span>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
            <Heart size={14} className="text-clara-primary-light" />
            <span className="text-sm font-black text-white">{topicCount}</span>
            <span className="text-[11px] font-bold text-clara-text-muted uppercase tracking-wider">Interests</span>
          </div>
          {topicCount === 0 && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-clara-primary/[0.05] border border-clara-primary/20">
              <Zap size={13} className="text-clara-primary-light" />
              <span className="text-[11px] font-medium text-clara-text-secondary">
                Tell Clara about your interests — they&apos;ll appear here!
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Search bar ── */}
      {!loading && !error && (memoryCount > 0 || topicCount > 0) && (
        <div className="relative mb-8">
          <input
            type="text"
            placeholder="Search memories and interests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3 pl-11 pr-10 text-sm font-medium
                       text-clara-text-primary placeholder:text-clara-text-muted
                       focus:bg-white/[0.05] focus:border-clara-primary/40 focus:shadow-glow-sm transition-all"
          />
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-clara-text-muted" />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-clara-text-muted hover:text-white transition-colors"
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>
          {q && (
            <p className="text-[11px] text-clara-text-muted font-medium mt-2 px-1">
              {totalCount} result{totalCount !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
            </p>
          )}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="space-y-10">
          <div>
            <div className="h-5 w-40 rounded-xl bg-white/[0.05] animate-pulse mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-36 rounded-2xl bg-white/[0.03] animate-pulse" />)}
            </div>
          </div>
          <div>
            <div className="h-5 w-40 rounded-xl bg-white/[0.05] animate-pulse mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-56 rounded-3xl bg-white/[0.03] animate-pulse" />)}
            </div>
          </div>
        </div>
      )}

      {/* ── Error state ── */}
      {!loading && error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center text-center py-16">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-400">
            <X size={28} />
          </div>
          <p className="text-white font-black mb-1">Could not load your garden</p>
          <p className="text-clara-text-muted text-sm mb-4">{error}</p>
          <button onClick={fetchProfile}
            className="px-4 py-2 rounded-xl bg-clara-primary/10 border border-clara-primary/30 text-clara-primary-light font-black text-sm hover:bg-clara-primary/20 transition-all">
            Try again
          </button>
        </motion.div>
      )}

      {/* ── Main content ── */}
      {!loading && !error && (
        <div className="space-y-12">

          {/* ══ YOUR INTERESTS section ══ */}
          <section>
            <SectionHeader
              icon={<Heart size={15} strokeWidth={2.5} />}
              title="Your Interests"
              count={filteredTopics.length}
              badge={topicCount > 0 ? "From conversations" : undefined}
            />

            {filteredTopics.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <AnimatePresence mode="popLayout">
                  {filteredTopics.map((topic, i) => (
                    <TopicCard
                      key={topic}
                      topic={topic}
                      index={i}
                      onTalkToClara={handleTalkAboutTopic}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <EmptySectionHint
                message={
                  q
                    ? `No interests match "${searchQuery}".`
                    : "Tell Clara about the things you enjoy — music, sports, food, hobbies — and they will appear here automatically."
                }
                cta={
                  !q ? (
                    <Link href="/chat"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-clara-primary/10 border border-clara-primary/30 text-clara-primary-light font-black text-xs hover:bg-clara-primary/20 transition-all">
                      <MessageSquare size={13} />
                      Tell Clara your interests
                    </Link>
                  ) : undefined
                }
              />
            )}
          </section>

          {/* ══ LIFE MEMORIES section ══ */}
          <section>
            <SectionHeader
              icon={<Sparkles size={15} strokeWidth={2.5} />}
              title="Life Memories"
              count={filteredMemories.length}
            />

            {filteredMemories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredMemories.map((memory, i) => (
                    <MemoryCard
                      key={`${i}-${extractFields(memory).title}`}
                      memory={memory}
                      index={i}
                      onTalkToClara={handleTalkAboutMemory}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <EmptySectionHint
                message={
                  q
                    ? `No memories match "${searchQuery}".`
                    : "Your caregiver can add meaningful life memories — special events, places, people — so Clara can bring them up in conversation."
                }
              />
            )}
          </section>

          {/* Total empty (nothing in either section, no search) */}
          {filteredTopics.length === 0 && filteredMemories.length === 0 && q && (
            <TotalEmptyState hasSearch />
          )}
        </div>
      )}

      {/* Refresh overlay while already showing content */}
      <AnimatePresence>
        {loading && (topicCount > 0 || memoryCount > 0) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-center justify-center bg-clara-bg/60 backdrop-blur-sm">
            <Loader2 size={32} className="text-clara-primary animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Suspense boundary required for useSearchParams in Next.js App Router
export default function MemoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
          {[1, 2].map((s) => (
            <div key={s}>
              <div className="h-5 w-40 rounded-xl bg-white/[0.05] animate-pulse mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-36 rounded-2xl bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      }
    >
      <MemoriesContent />
    </Suspense>
  );
}
