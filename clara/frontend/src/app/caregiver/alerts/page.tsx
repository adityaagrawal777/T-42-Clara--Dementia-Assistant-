"use client";

import React from "react";
import { AlertFeed } from "../../../components/caregiver/AlertFeed";
import { Bell, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function AlertsPage() {
  return (
    <div className="space-y-10">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-12 lg:p-16 rounded-[3rem] border-white/[0.05] shadow-2xl relative overflow-hidden text-center"
      >
        {/* Dynamic Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-danger/5 blur-[120px] -z-10" />
        
        <div className="relative z-10">
          <div className="w-16 h-16 bg-danger/10 border border-danger/20 rounded-2xl flex items-center justify-center text-danger mx-auto mb-8 shadow-glow-sm">
            <Bell size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-white tracking-tight mb-4">Safety Command Center</h1>
          <p className="text-clara-text-tertiary font-black text-[10px] uppercase tracking-[0.3em] max-w-lg mx-auto">
            Live Stream Engagement & Sentiment Analysis
          </p>
        </div>
      </motion.div>

      {/* Main Feed */}
      <div className="max-w-6xl mx-auto w-full min-h-[600px]">
        <AlertFeed />
      </div>

      {/* Trust Badge / Footer Note */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="max-w-2xl mx-auto p-10 glass-card rounded-[2.5rem] border-success/10 bg-success/5 text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-success/5 blur-[60px] -z-10" />
        <ShieldCheck className="w-10 h-10 text-success mx-auto mb-4" />
        <h4 className="text-lg font-black text-white mb-2">Active Surveillance Active</h4>
        <p className="text-clara-text-secondary text-sm font-medium px-8 leading-relaxed">
          Clara is currently monitoring all active clusters for high-distress markers, phonetic anomalies, and crisis keywords.
        </p>
        <div className="mt-6 flex justify-center gap-6">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sentiment API: Online</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logic Engine: v4.2</span>
            </div>
        </div>
      </motion.div>
    </div>
  );
}
