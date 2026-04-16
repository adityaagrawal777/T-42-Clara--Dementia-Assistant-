"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Loader2, TrendingUp, Activity } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { MoodTimelineDay } from "@/types";
import { motion } from "framer-motion";

// ── Constants ─────────────────────────────────────────────────────────────────

const MOOD_LEVELS: Record<string, number> = {
  distressed: 0,
  confused: 1,
  neutral: 2,
  calm: 3,
  happy: 4,
};

const LEVEL_LABELS = ["Distressed", "Confused", "Neutral", "Calm", "Happy"];

const TABS: Array<{ label: string; days: number }> = [
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
];

interface ChartPoint {
  label: string;
  level: number;
  mood: string;
  date: string;
}

function toDominantMood(day: MoodTimelineDay): ChartPoint {
  const dominant = day.moods.reduce((best, cur) =>
    cur.count > best.count ? cur : best,
  );
  return {
    label: format(parseISO(day.date), "MMM d"),
    level: MOOD_LEVELS[dominant.mood] ?? 2,
    mood: dominant.mood,
    date: day.date,
  };
}

interface Props {
  patientId?: string;
}

export const MoodTimeline: React.FC<Props> = ({ patientId }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(
    async (days: number) => {
      if (!patientId) return;
      setLoading(true);
      setError(null);
      try {
        const raw = (await apiFetch(
          `/api/v1/caregiver/patients/${patientId}/mood-timeline`,
          { params: { days: String(days) } },
        )) as MoodTimelineDay[];
        setChartData(raw.map(toDominantMood));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load mood data.");
      } finally {
        setLoading(false);
      }
    },
    [patientId],
  );

  useEffect(() => {
    fetchTimeline(TABS[activeTab].days);
  }, [fetchTimeline, activeTab]);

  if (!patientId) {
    return (
      <div className="glass-card p-12 rounded-[2.5rem] border-white/[0.05] flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 rounded-[1.5rem] bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-clara-text-muted mb-6">
           <Activity size={32} />
        </div>
        <p className="text-sm font-bold text-clara-text-secondary max-w-xs">
          Select a patient from the roster to analyze their emotional trajectory.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass-card p-12 rounded-[2.5rem] border-white/[0.05] flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-clara-primary" />
      </div>
    );
  }

  return (
    <div className="glass-card p-8 lg:p-10 rounded-[2.5rem] border-white/[0.05] shadow-2xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight">Emotional Trajectory</h3>
          <p className="text-[10px] font-black text-clara-text-tertiary uppercase tracking-widest mt-1">Timeline Analytics</p>
        </div>

        <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.08] rounded-xl">
          {TABS.map((tab, i) => (
            <button
              key={tab.days}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === i
                  ? "bg-clara-primary text-white shadow-glow-sm"
                  : "text-clara-text-tertiary hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[320px] w-full">
        {error ? (
          <div className="flex items-center justify-center h-full text-danger font-bold text-sm italic">{error}</div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-clara-text-muted font-bold text-sm italic">No entries for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748B", fontSize: 10, fontWeight: 800 }}
                dy={16}
              />
              <YAxis
                domain={[0, 4]}
                ticks={[0, 1, 2, 3, 4]}
                tickFormatter={(v: number) => LEVEL_LABELS[v] ?? ""}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94A3B8", fontSize: 10, fontWeight: 700 }}
                width={80}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const { mood, label } = payload[0].payload as ChartPoint;
                  return (
                    <div className="bg-clara-surface border border-white/[0.1] px-5 py-4 shadow-2xl rounded-2xl backdrop-blur-3xl">
                      <p className="text-[10px] font-black text-clara-text-tertiary uppercase tracking-widest mb-1.5">
                        {label}
                      </p>
                      <p className="text-base font-black text-white capitalize tracking-tight">{mood}</p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="level"
                stroke="#8b5cf6"
                strokeWidth={4}
                dot={<Dot r={5} strokeWidth={2} stroke="#050507" fill="#8b5cf6" />}
                activeDot={{ r: 8, strokeWidth: 0, fill: "#a78bfa" }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
