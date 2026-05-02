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
  { bg: "from-violet-50 to-purple-50",   border: "border-violet-200/70",  accent: "text-violet-600",  glow: "bg-violet-300", text: "text-violet-900",  sub: "text-violet-500",  btn: "bg-violet-100 hover:bg-violet-200 text-violet-700 border-violet-200" },
  { bg: "from-rose-50 to-pink-50",       border: "border-rose-200/70",    accent: "text-rose-600",    glow: "bg-rose-300",   text: "text-rose-900",    sub: "text-rose-500",    btn: "bg-rose-100 hover:bg-rose-200 text-rose-700 border-rose-200" },
  { bg: "from-sky-50 to-blue-50",        border: "border-sky-200/70",     accent: "text-sky-600",     glow: "bg-sky-300",    text: "text-sky-900",     sub: "text-sky-500",     btn: "bg-sky-100 hover:bg-sky-200 text-sky-700 border-sky-200" },
  { bg: "from-emerald-50 to-teal-50",    border: "border-emerald-200/70", accent: "text-emerald-600", glow: "bg-emerald-300",text: "text-emerald-900", sub: "text-emerald-500", btn: "bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-200" },
  { bg: "from-amber-50 to-yellow-50",    border: "border-amber-200/70",   accent: "text-amber-600",   glow: "bg-amber-300",  text: "text-amber-900",   sub: "text-amber-500",   btn: "bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-200" },
  { bg: "from-fuchsia-50 to-purple-50",  border: "border-fuchsia-200/70", accent: "text-fuchsia-600", glow: "bg-fuchsia-300",text: "text-fuchsia-900", sub: "text-fuchsia-500", btn: "bg-fuchsia-100 hover:bg-fuchsia-200 text-fuchsia-700 border-fuchsia-200" },
];

const TOPIC_PALETTES = [
  { bg: "from-indigo-50 to-violet-50", border: "border-indigo-200/70", accent: "text-indigo-600", icon: "bg-indigo-100 border-indigo-200 text-indigo-600", btn: "bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border-indigo-200" },
  { bg: "from-teal-50 to-emerald-50",  border: "border-teal-200/70",   accent: "text-teal-600",   icon: "bg-teal-100 border-teal-200 text-teal-600",       btn: "bg-teal-100 hover:bg-teal-200 text-teal-700 border-teal-200" },
  { bg: "from-pink-50 to-rose-50",     border: "border-pink-200/70",   accent: "text-pink-600",   icon: "bg-pink-100 border-pink-200 text-pink-600",       btn: "bg-pink-100 hover:bg-pink-200 text-pink-700 border-pink-200" },
  { bg: "from-orange-50 to-amber-50",  border: "border-orange-200/70", accent: "text-orange-600", icon: "bg-orange-100 border-orange-200 text-orange-600", btn: "bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-200" },
  { bg: "from-cyan-50 to-sky-50",      border: "border-cyan-200/70",   accent: "text-cyan-600",   icon: "bg-cyan-100 border-cyan-200 text-cyan-600",       btn: "bg-cyan-100 hover:bg-cyan-200 text-cyan-700 border-cyan-200" },
  { bg: "from-lime-50 to-green-50",    border: "border-lime-200/70",   accent: "text-lime-700",   icon: "bg-lime-100 border-lime-200 text-lime-700",       btn: "bg-lime-100 hover:bg-lime-200 text-lime-700 border-lime-200" },
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
                  overflow-hidden group hover:scale-[1.02] transition-transform duration-300 cursor-default shadow-sm`}
    >
      <div className="p-5 flex flex-col gap-3">
        {/* Topic icon */}
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${p.icon} shrink-0`}>
          <Star size={17} strokeWidth={2.5} />
        </div>

        {/* Topic name */}
        <div>
          <p className="font-black text-clara-text-primary text-sm leading-tight tracking-tight">{topic}</p>
          <p className={`text-[10px] font-bold mt-0.5 uppercase tracking-wider ${p.accent} opacity-80`}>
            Your interest
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => onTalkToClara(topic)}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border
                      transition-all font-bold text-[11px] ${p.btn}`}
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
                  overflow-hidden group hover:scale-[1.015] transition-transform duration-300 shadow-sm`}
    >
      {/* Ambient glow */}
      <div className={`absolute top-0 left-0 w-32 h-32 rounded-full ${p.glow} opacity-[0.12] blur-3xl pointer-events-none`} />

      <div className="relative z-10 p-6 flex flex-col h-full">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-white/70 border border-white/80 flex items-center justify-center text-2xl shrink-0 shadow-sm">
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-black text-base leading-tight tracking-tight line-clamp-2 ${p.text}`}>{title}</h3>
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
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/60
                            border border-white/80 text-[10px] font-bold ${p.accent} uppercase tracking-wider`}
              >
                <Tag size={9} />
                {tag}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={() => onTalkToClara(memory)}
          className={`w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl border
                      transition-all font-black text-xs ${p.btn}`}
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
    <div className="w-8 h-8 rounded-xl bg-clara-primary/10 border border-clara-primary/20 flex items-center justify-center text-clara-primary">
      {icon}
    </div>
    <h2 className="text-base font-black text-clara-text-primary tracking-tight">{title}</h2>
    <span className="px-2.5 py-0.5 rounded-full bg-clara-surface-2 border border-clara-warm/[0.18] text-[10px] font-black text-clara-text-muted uppercase tracking-wider">
      {count}
    </span>
    {badge && (
      <span className="px-2.5 py-0.5 rounded-full bg-clara-primary/10 border border-clara-primary/20 text-[10px] font-black text-clara-primary uppercase tracking-wider flex items-center gap-1">
        <Zap size={9} />
        {badge}
      </span>
    )}
  </div>
);

// ── Empty section hint ────────────────────────────────────────────────────────

const EmptySectionHint: React.FC<{ message: string; cta?: React.ReactNode }> = ({ message, cta }) => (
  <div className="flex flex-col items-center text-center py-10 px-6 rounded-3xl border border-dashed border-clara-warm/[0.25] bg-clara-surface-2/40">
    <p className="text-clara-text-secondary text-sm font-medium leading-relaxed max-w-xs">{message}</p>
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
    <div className="w-24 h-24 rounded-[2rem] glass-card flex items-center justify-center mb-6 text-clara-primary">
      {hasSearch ? <Search size={36} /> : <BookOpen size={36} />}
    </div>
    <h3 className="text-xl font-black text-clara-text-primary tracking-tight mb-2">
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
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-clara-primary/10 border border-clara-primary/30 text-clara-primary font-black text-sm hover:bg-clara-primary/20 transition-all"
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
            className="w-10 h-10 glass-card rounded-2xl flex items-center justify-center text-clara-text-tertiary hover:text-clara-text-primary transition-all shrink-0"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-clara-text-primary tracking-tighter flex items-center gap-3">
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
          className="w-10 h-10 glass-card rounded-2xl flex items-center justify-center text-clara-text-tertiary hover:text-clara-text-primary transition-all disabled:opacity-40"
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Stats row ── */}
      {!loading && !error && (
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl glass-card">
            <Sparkles size={14} className="text-clara-primary" />
            <span className="text-sm font-black text-clara-text-primary">{memoryCount}</span>
            <span className="text-[11px] font-bold text-clara-text-muted uppercase tracking-wider">Life Memories</span>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl glass-card">
            <Heart size={14} className="text-clara-primary" />
            <span className="text-sm font-black text-clara-text-primary">{topicCount}</span>
            <span className="text-[11px] font-bold text-clara-text-muted uppercase tracking-wider">Interests</span>
          </div>
          {topicCount === 0 && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-clara-primary/[0.07] border border-clara-primary/20">
              <Zap size={13} className="text-clara-primary" />
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
            className="w-full bg-clara-surface-2/60 border border-clara-warm/[0.2] rounded-2xl py-3 pl-11 pr-10 text-sm font-medium
                       text-clara-text-primary placeholder:text-clara-text-muted
                       focus:bg-white focus:border-clara-primary/40 focus:shadow-glow-sm transition-all"
          />
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-clara-text-muted" />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-clara-text-muted hover:text-clara-text-primary transition-colors"
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
            <div className="h-5 w-40 rounded-xl bg-clara-warm/[0.12] animate-pulse mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-36 rounded-2xl bg-clara-surface-2 animate-pulse" />)}
            </div>
          </div>
          <div>
            <div className="h-5 w-40 rounded-xl bg-clara-warm/[0.12] animate-pulse mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-56 rounded-3xl bg-clara-surface-2 animate-pulse" />)}
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
          <p className="text-clara-text-primary font-black mb-1">Could not load your garden</p>
          <p className="text-clara-text-muted text-sm mb-4">{error}</p>
          <button onClick={fetchProfile}
            className="px-4 py-2 rounded-xl bg-clara-primary/10 border border-clara-primary/30 text-clara-primary font-black text-sm hover:bg-clara-primary/20 transition-all">
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
              <div className="h-5 w-40 rounded-xl bg-clara-warm/[0.12] animate-pulse mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-36 rounded-2xl bg-clara-surface-2 animate-pulse" />
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
