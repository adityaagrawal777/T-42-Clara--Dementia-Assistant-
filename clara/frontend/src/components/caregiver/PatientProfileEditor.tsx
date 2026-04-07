"use client";

import React, { useState } from "react";
import { Patient } from "@/types";
import { Button } from "@/components/ui/Button";
import { User, Heart, Tag, Save, Plus, X } from "lucide-react";

interface Props {
  patient: Patient;
}

export const PatientProfileEditor: React.FC<Props> = ({ patient: initialPatient }) => {
  const [patient, setPatient] = useState<Patient>(initialPatient);

  const handleSave = async () => {
    // Optimistic UI would be handled here, or just a simple save
    console.log("Saving patient profile", patient);
  };

  const addTopic = (topic: string) => {
    if (topic && !patient.topics_of_interest.includes(topic)) {
      setPatient({ ...patient, topics_of_interest: [...patient.topics_of_interest, topic] });
    }
  };

  const removeTopic = (topic: string) => {
    setPatient({
      ...patient,
      topics_of_interest: patient.topics_of_interest.filter((t) => t !== topic),
    });
  };

  return (
    <div className="bg-white p-12 rounded-[48px] border border-slate-100 shadow-xl max-w-4xl mx-auto w-full relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-clara-calm-bg opacity-10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
      
      <div className="flex justify-between items-center mb-16 relative">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-clara-calm-bg rounded-3xl border-2 border-clara-calm-border shadow-sm">
            <User className="w-8 h-8 text-clara-calm-text" />
          </div>
          <div>
            <h3 className="text-3xl font-bold text-slate-800 tracking-tight">Patient Profile</h3>
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mt-1">Refine Assistant Voice Context</p>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          className="rounded-2xl px-10 py-5 bg-clara-calm-bg text-clara-calm-text border-2 border-clara-calm-border hover:bg-white transition-all font-bold text-lg shadow-sm group"
        >
          <Save className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
          Update Profile
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-12 relative">
        <div className="space-y-10">
          <div className="bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <User className="w-4 h-4" /> Legal Name
            </label>
            <input
              type="text"
              value={patient.name}
              onChange={(e) => setPatient({ ...patient, name: e.target.value })}
              className="w-full bg-white px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-clara-calm-border outline-none transition-all text-lg font-medium text-slate-700 shadow-sm"
              placeholder="Full Name"
            />
          </div>

          <div className="bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Heart className="w-4 h-4" /> Preferred Name
            </label>
            <input
              type="text"
              value={patient.preferred_name}
              onChange={(e) => setPatient({ ...patient, preferred_name: e.target.value })}
              className="w-full bg-white px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-clara-calm-border outline-none transition-all text-lg font-medium text-slate-700 shadow-sm"
              placeholder="What Clara should call them..."
            />
          </div>
        </div>

        <div className="space-y-10">
          <div className="bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Tag className="w-4 h-4" /> Topics of Interest
            </label>
            <div className="flex flex-wrap gap-3 mb-6">
              {patient.topics_of_interest.map((topic) => (
                <span
                  key={topic}
                  className="inline-flex items-center gap-3 px-6 py-3 bg-clara-happy-bg text-clara-happy-text border-2 border-clara-happy-border rounded-2xl text-base font-bold shadow-sm transition-all hover:scale-105"
                >
                  {topic}
                  <button 
                    onClick={() => removeTopic(topic)} 
                    className="hover:scale-125 transition-transform"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Add interest (e.g. Gardening)"
                className="flex-1 bg-white px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-clara-calm-border outline-none transition-all text-base shadow-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addTopic((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
              />
              <Button variant="outline" className="rounded-2xl border-slate-200 text-slate-400 hover:text-clara-calm-text hover:border-clara-calm-border bg-white shadow-sm">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
