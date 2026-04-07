"use client";

import React from "react";
import { PatientProfileEditor } from "@/components/caregiver/PatientProfileEditor";
import { SessionList } from "@/components/caregiver/SessionList";
import { MoodTimeline } from "@/components/caregiver/MoodTimeline";
import { Patient } from "@/types";

import { Heart, Calendar, MessageCircle } from "lucide-react";

const dummyPatient: Patient = {
  id: "p1",
  name: "Alice Thompson",
  preferred_name: "Alice",
  family_names: ["Bob", "Charlie"],
  topics_of_interest: ["Gardening", "Classical Music", "Baking"],
};

export default function PatientDetailPage() {
  return (
    <div className="space-y-16 pb-24">
      {/* Patient Header Section */}
      <div className="bg-white p-16 rounded-[48px] border border-slate-100 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-clara-calm-bg opacity-5 rounded-full blur-[120px] -mr-48 -mt-48 transition-all group-hover:scale-110" />
        
        <div className="flex flex-col md:flex-row gap-12 items-center md:items-start relative">
          <div className="w-32 h-32 rounded-[32px] bg-clara-calm-bg border-4 border-white shadow-2xl flex items-center justify-center text-4xl font-black text-clara-calm-text">
            AT
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight transition-all hover:text-clara-calm-text cursor-default">{dummyPatient.name}</h2>
            <div className="flex flex-wrap gap-4 mt-6 justify-center md:justify-start">
              <span className="px-6 py-2 bg-slate-50 border border-slate-100 rounded-full text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Joined Mar 2024
              </span>
              <span className="px-6 py-2 bg-green-50 border border-green-100 rounded-full text-green-600 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> 154 Messages
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-16 items-start">
        <div className="space-y-16">
          <PatientProfileEditor patient={dummyPatient} />
          <div className="bg-clara-happy-bg/30 p-12 rounded-[48px] border-2 border-clara-happy-border border-dashed text-center">
            <Heart className="w-12 h-12 text-clara-happy-text mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-clara-happy-text mb-2">Compassion First</h3>
            <p className="max-w-md mx-auto text-slate-600 font-medium">Clara is currently using Alice’s interest in <span className="font-bold underline decoration-clara-happy-border">Gardening</span> to build therapeutic rapport.</p>
          </div>
        </div>
        
        <div className="space-y-16">
          <MoodTimeline />
          <SessionList />
        </div>
      </div>
    </div>
  );
}
