"use client";

import React from "react";
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
import { format } from "date-fns";
import { useClaraStore } from "@/store/claraStore";

const moodLevels = {
  distressed: 0,
  confused: 1,
  calm: 2,
  happy: 3,
  neutral: 2,
};

const levelToMood = ["distressed", "confused", "calm", "happy"];

export const MoodTimeline: React.FC = () => {
  const history = useClaraStore((state) => state.history);

  const data = history.map((h) => ({
    time: format(new Date(h.timestamp), "HH:mm"),
    level: moodLevels[h.mood] ?? 2,
    mood: h.mood,
  }));

  // Dummy data if empty
  const chartData = data.length > 0 ? data : [
    { time: "09:00", level: 2, mood: "calm" },
    { time: "10:00", level: 3, mood: "happy" },
    { time: "11:00", level: 1, mood: "confused" },
    { time: "12:00", level: 0, mood: "distressed" },
    { time: "13:00", level: 2, mood: "calm" },
  ];

  return (
    <div className="h-[400px] w-full bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm transition-all hover:shadow-md">
      <div className="flex justify-between items-center mb-10">
        <h3 className="text-xl font-bold text-slate-800 tracking-tight">Emotional Trajectory</h3>
        <div className="flex gap-4 text-xs font-semibold text-slate-400 p-1 bg-slate-50 rounded-lg">
          <span className="px-3 py-1 bg-white rounded-md shadow-sm text-slate-700">Daily</span>
          <span className="px-3 py-1">Weekly</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "#94A3B8", fontSize: 12 }} 
            dy={15}
          />
          <YAxis
            domain={[0, 3]}
            ticks={[0, 1, 2, 3]}
            tickFormatter={(value) => levelToMood[value]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748B", fontSize: 12, fontWeight: 600 }}
            dx={-15}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const mood = payload[0].payload.mood;
                return (
                  <div className="bg-white p-4 shadow-xl rounded-2xl border border-slate-100 min-w-[120px]">
                    <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">{payload[0].payload.time}</p>
                    <p className="text-lg font-bold text-slate-800 capitalize">{mood}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="level"
            stroke="#6366F1"
            strokeWidth={4}
            dot={<Dot r={6} strokeWidth={2} stroke="#fff" />}
            activeDot={{ r: 8, strokeWidth: 0, fill: "#4F46E5" }}
            animationDuration={2000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
