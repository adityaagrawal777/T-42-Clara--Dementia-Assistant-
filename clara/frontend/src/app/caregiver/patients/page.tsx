"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Users, ArrowRight, Loader2, ShieldPlus, UserPlus,
  X, UserCheck, UserMinus, Search,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { PatientListItem } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

export default function PatientsListPage() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rosterSearch, setRosterSearch] = useState("");

  // Assign modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [allPatients, setAllPatients] = useState<PatientListItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const assignedIds = new Set(patients.map((p) => p.id));

  const fetchAssigned = useCallback(() => {
    setLoading(true);
    apiFetch("/api/v1/patients/")
      .then((data: unknown) => setPatients(data as PatientListItem[]))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAssigned();
    const interval = setInterval(fetchAssigned, 30_000);
    return () => clearInterval(interval);
  }, [fetchAssigned]);

  const openModal = () => {
    setModalOpen(true);
    setModalLoading(true);
    apiFetch("/api/v1/caregiver/org-patients")
      .then((data: unknown) => setAllPatients(data as PatientListItem[]))
      .catch(() => setAllPatients([]))
      .finally(() => setModalLoading(false));
  };

  const handleAssign = async (patientId: string) => {
    setActionLoading(patientId);
    try {
      await apiFetch(`/api/v1/caregiver/patients/${patientId}/assign`, { method: "POST" });
      fetchAssigned();
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnassign = async (patientId: string) => {
    setActionLoading(patientId);
    try {
      await apiFetch(`/api/v1/caregiver/patients/${patientId}/assign`, { method: "DELETE" });
      fetchAssigned();
    } finally {
      setActionLoading(null);
    }
  };

  // Roster search filter
  const filteredRoster = patients.filter((p) =>
    p.name.toLowerCase().includes(rosterSearch.toLowerCase())
  );

  // Modal search filter
  const filteredModal = allPatients.filter((p) =>
    p.name.toLowerCase().includes(modalSearch.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-4xl font-bold text-white tracking-tight">Patient Roster</h2>
            <p className="text-base font-medium mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
              Manage your assigned patient cohort.
            </p>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm text-white transition-all"
            style={{ background: "rgba(107,158,140,0.2)", border: "1px solid rgba(107,158,140,0.35)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(107,158,140,0.3)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(107,158,140,0.2)")}
          >
            <UserPlus size={16} style={{ color: "#6ee7b7" }} />
            Assign Patient
          </button>
        </div>
      </div>

      {/* Roster search bar */}
      {patients.length > 0 && (
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.35)" }} />
          <input
            type="text"
            placeholder="Search assigned patients..."
            value={rosterSearch}
            onChange={(e) => setRosterSearch(e.target.value)}
            className="w-full py-2.5 pl-10 pr-4 rounded-xl text-sm font-semibold text-white placeholder-white/30 focus:outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#6ee7b7" }} />
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
            Accessing Roster...
          </p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div
          className="px-6 py-5 rounded-2xl text-sm font-bold text-center"
          style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171" }}
        >
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && patients.length === 0 && (
        <div
          className="py-24 flex flex-col items-center text-center rounded-2xl"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <ShieldPlus size={28} style={{ color: "rgba(255,255,255,0.3)" }} />
          </div>
          <h4 className="text-lg font-bold text-white mb-2">No Assigned Patients</h4>
          <p className="text-sm font-medium mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
            Use the &ldquo;Assign Patient&rdquo; button to add patients to your care list.
          </p>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: "rgba(107,158,140,0.2)", border: "1px solid rgba(107,158,140,0.3)" }}
          >
            <UserPlus size={16} />
            Assign Patient
          </button>
        </div>
      )}

      {/* Patient Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <AnimatePresence>
            {filteredRoster.map((patient, idx) => (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: idx * 0.04 }}
                className="relative group"
              >
                {/* Unassign hover button */}
                <button
                  onClick={() => handleUnassign(patient.id)}
                  disabled={actionLoading === patient.id}
                  title="Unassign patient"
                  className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }}
                >
                  {actionLoading === patient.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <UserMinus size={13} />}
                </button>

                <Link href={`/caregiver/patients/${patient.id}`}>
                  <div
                    className="p-6 rounded-2xl flex flex-col gap-5 transition-all cursor-pointer h-full"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.05)";
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(107,158,140,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
                    }}
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black"
                        style={{
                          background: "rgba(107,158,140,0.12)",
                          border: "1px solid rgba(107,158,140,0.22)",
                          color: "#6ee7b7",
                        }}
                      >
                        {patient.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <span
                        className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"
                        style={{
                          background: patient.is_active ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.04)",
                          border: patient.is_active ? "1px solid rgba(74,222,128,0.25)" : "1px solid rgba(255,255,255,0.08)",
                          color: patient.is_active ? "#4ade80" : "rgba(255,255,255,0.35)",
                        }}
                      >
                        {patient.is_active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                        {patient.is_active ? "Live" : "Standby"}
                      </span>
                    </div>

                    {/* Name */}
                    <div>
                      <h3 className="text-base font-bold text-white leading-tight">{patient.name}</h3>
                      {patient.preferred_name && patient.preferred_name !== patient.name && (
                        <p className="text-xs font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                          &ldquo;{patient.preferred_name}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
                        Joined {format(parseISO(patient.created_at), "MMM yyyy")}
                      </span>
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(107,158,140,0.1)", color: "#6ee7b7" }}
                      >
                        <ArrowRight size={13} />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* No search results */}
          {filteredRoster.length === 0 && patients.length > 0 && rosterSearch && (
            <div className="col-span-full text-center py-12" style={{ color: "rgba(255,255,255,0.35)" }}>
              <p className="text-sm font-medium">No patients match &ldquo;{rosterSearch}&rdquo;</p>
            </div>
          )}
        </div>
      )}

      {/* ── Assign Patient Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl overflow-hidden"
              style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(107,158,140,0.15)", border: "1px solid rgba(107,158,140,0.25)" }}
                  >
                    <UserCheck size={17} style={{ color: "#6ee7b7" }} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base">Manage Patient Assignments</h3>
                    <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                      All patients in your organisation
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Modal search */}
              <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.35)" }} />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    autoFocus
                    className="w-full py-2.5 pl-9 pr-4 rounded-xl text-sm font-semibold text-white placeholder-white/30 focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
                  />
                </div>
              </div>

              {/* Patient list */}
              <div className="overflow-y-auto max-h-80 p-4 space-y-2">
                {modalLoading && (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#6ee7b7" }} />
                  </div>
                )}
                {!modalLoading && filteredModal.length === 0 && (
                  <p className="text-center text-sm py-8" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {modalSearch ? `No patients match "${modalSearch}"` : "No patients in your organisation"}
                  </p>
                )}
                {!modalLoading && filteredModal.map((p) => {
                  const isAssigned = assignedIds.has(p.id);
                  const isActing = actionLoading === p.id;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-3 rounded-xl transition-all"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                        style={{
                          background: "rgba(107,158,140,0.12)",
                          border: "1px solid rgba(107,158,140,0.2)",
                          color: "#6ee7b7",
                        }}
                      >
                        {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{p.name}</p>
                        {p.preferred_name && p.preferred_name !== p.name && (
                          <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                            &ldquo;{p.preferred_name}&rdquo;
                          </p>
                        )}
                      </div>
                      {isAssigned ? (
                        <button
                          onClick={() => handleUnassign(p.id)}
                          disabled={isActing}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-50"
                          style={{
                            background: "rgba(248,113,113,0.1)",
                            border: "1px solid rgba(248,113,113,0.2)",
                            color: "#f87171",
                          }}
                        >
                          {isActing ? <Loader2 size={12} className="animate-spin" /> : <UserMinus size={12} />}
                          Unassign
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAssign(p.id)}
                          disabled={isActing}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-50"
                          style={{
                            background: "rgba(107,158,140,0.12)",
                            border: "1px solid rgba(107,158,140,0.22)",
                            color: "#6ee7b7",
                          }}
                        >
                          {isActing ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                          Assign
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="px-6 py-4 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Changes take effect immediately
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
