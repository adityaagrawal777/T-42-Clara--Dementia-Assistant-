"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Users, ArrowRight, Loader2, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { PatientListItem } from "@/types";

export default function PatientsListPage() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/v1/patients/")
      .then((data: unknown) => setPatients(data as PatientListItem[]))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10">
      {/* Page hero */}
      <div className="bg-white p-14 rounded-[48px] border border-slate-100 shadow-xl relative overflow-hidden text-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-clara-calm-bg opacity-10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <Users className="w-10 h-10 text-clara-calm-text mx-auto mb-6 relative" />
        <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-3 relative">
          Active Monitoring
        </h1>
        <p className="max-w-xl mx-auto text-slate-400 font-bold text-sm uppercase tracking-widest relative">
          Review and manage patient companions
        </p>
        {!loading && !error && (
          <p className="mt-4 text-sm font-semibold text-slate-500 relative">
            {patients.length} patient{patients.length !== 1 ? "s" : ""} enrolled
          </p>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl px-8 py-6 text-rose-600 font-semibold text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && patients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <UserPlus className="w-12 h-12 text-slate-200" />
          <p className="font-bold text-slate-500">No patients enrolled yet</p>
          <p className="text-sm text-slate-400 max-w-xs">
            Patients are registered through the Clara sign-up flow and will appear here once their
            accounts are created.
          </p>
        </div>
      )}

      {/* Patient grid */}
      {!loading && !error && patients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
          {patients.map((patient) => (
            <Link key={patient.id} href={`/caregiver/patients/${patient.id}`}>
              <div className="bg-white p-8 rounded-[32px] border-2 border-slate-50 hover:border-clara-calm-border transition-all hover:shadow-xl hover:scale-[1.02] group cursor-pointer">
                <div className="flex justify-between items-start mb-8">
                  {/* Avatar */}
                  <div className="w-16 h-16 bg-slate-100 rounded-[20px] flex items-center justify-center text-2xl font-black text-slate-300 group-hover:bg-clara-calm-bg group-hover:text-clara-calm-text transition-all shadow-inner select-none">
                    {patient.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>

                  {/* Status badge */}
                  <span
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
                      patient.is_active
                        ? "bg-green-50 text-green-600 border border-green-100"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {patient.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <h2 className="text-xl font-black text-slate-800 tracking-tight mb-1">
                  {patient.name}
                </h2>

                {patient.preferred_name && patient.preferred_name !== patient.name && (
                  <p className="text-sm text-slate-400 font-semibold mb-3">
                    &ldquo;{patient.preferred_name}&rdquo;
                  </p>
                )}

                <div className="flex items-center gap-3 mt-4">
                  <p className="text-xs font-semibold text-slate-400">
                    Joined {format(parseISO(patient.created_at), "MMM d, yyyy")}
                  </p>
                  <div className="flex-1 h-px bg-slate-100" />
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-clara-calm-text group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
