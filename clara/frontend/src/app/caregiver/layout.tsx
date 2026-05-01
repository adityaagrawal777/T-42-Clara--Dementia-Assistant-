"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { decodeJWT, clearJWT } from "@/lib/tokens";
import { Spinner } from "@/components/ui/Spinner";
import {
  LayoutDashboard, Users, Bell, LogOut, Heart,
  Search, HelpCircle, X, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import type { PatientListItem } from "@/types";

function getBreadcrumb(path: string): string {
  if (path === "/caregiver") return "Dashboard";
  if (path === "/caregiver/patients") return "Patients";
  if (path === "/caregiver/alerts") return "Alerts";
  const last = path.split("/").pop() ?? "";
  return /^[0-9a-f-]{36}$/i.test(last) ? "Record Profile" : last.charAt(0).toUpperCase() + last.slice(1);
}

export default function CaregiverLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [caregiverName, setCaregiverName] = useState("Caregiver");

  // ── Header search state ────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientListItem[]>([]);
  const [allPatients, setAllPatients] = useState<PatientListItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // ── Support panel state ────────────────────────────────────────────────────
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    if (pathname === "/caregiver/login") {
      setIsLoading(false);
      return;
    }
    const payload = decodeJWT();
    if (!payload || !["caregiver", "admin", "super_admin"].includes(payload.role)) {
      router.replace("/caregiver/login");
    } else {
      setIsAuthorized(true);
      setCaregiverName(payload.name || "Caregiver");
    }
    setIsLoading(false);
  }, [pathname, router]);

  // Load all patients once (used for header search)
  const loadPatients = useCallback(() => {
    apiFetch("/api/v1/patients/")
      .then((d: unknown) => setAllPatients(d as PatientListItem[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isAuthorized) loadPatients();
  }, [isAuthorized, loadPatients]);

  // Filter patients as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    setSearchResults(
      allPatients
        .filter((p) =>
          p.name.toLowerCase().includes(q) ||
          (p.preferred_name ?? "").toLowerCase().includes(q)
        )
        .slice(0, 6)
    );
  }, [searchQuery, allPatients]);

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ background: "#0f172a" }}>
        <Spinner />
      </div>
    );
  }

  if (pathname === "/caregiver/login") return <>{children}</>;
  if (!isAuthorized) return null;

  const navLinks = [
    { href: "/caregiver", label: "Dashboard", icon: LayoutDashboard },
    { href: "/caregiver/patients", label: "Patients", icon: Users },
    { href: "/caregiver/alerts", label: "Alerts", icon: Bell },
  ];

  const handleSearchNavigate = (patientId: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(`/caregiver/patients/${patientId}`);
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}
    >
      {/* Ambient overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(at 20% 10%, rgba(59,130,246,0.12) 0, transparent 50%), radial-gradient(at 80% 90%, rgba(99,102,241,0.10) 0, transparent 50%)",
        }}
      />

      {/* ── Sidebar ── */}
      <aside
        className="relative z-30 flex w-64 flex-col flex-shrink-0"
        style={{
          background: "rgba(255,255,255,0.03)",
          borderRight: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(107,158,140,0.15)", border: "1px solid rgba(107,158,140,0.25)" }}
          >
            <Heart size={18} className="text-emerald-400" fill="currentColor" />
          </div>
          <div>
            <p className="text-white font-black text-base leading-tight">Clara</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.4)" }}>
              Caregiver
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          <p className="px-3 mb-4 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.35)" }}>
            Management
          </p>
          {navLinks.map((link) => {
            const active = pathname === link.href || (link.href !== "/caregiver" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm"
                style={{
                  background: active ? "rgba(255,255,255,0.08)" : "transparent",
                  color: active ? "#ffffff" : "rgba(255,255,255,0.55)",
                  border: active ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
                }}
              >
                <link.icon size={17} style={{ color: active ? "#6ee7b7" : "rgba(255,255,255,0.4)" }} />
                {link.label}
                {active && (
                  <motion.div
                    layoutId="careNav"
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: "#6ee7b7" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="px-3 py-5 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <button
            onClick={() => setSupportOpen(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all font-semibold text-sm"
            style={{ color: "rgba(255,255,255,0.45)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <HelpCircle size={17} style={{ color: "rgba(255,255,255,0.35)" }} />
            Support
          </button>
          <button
            onClick={() => { clearJWT(); router.push("/caregiver/login"); }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all font-semibold text-sm"
            style={{ color: "#f87171" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(248,113,113,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-8 py-4"
          style={{
            background: "rgba(255,255,255,0.02)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
              Portal
            </span>
            <span style={{ color: "rgba(255,255,255,0.25)" }}>/</span>
            <span className="text-sm font-bold text-white">{getBreadcrumb(pathname)}</span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-5">
            {/* ── Patient Search ── */}
            <div className="relative hidden lg:block" ref={searchRef}>
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "rgba(255,255,255,0.35)" }}
              />
              <input
                type="text"
                placeholder="Find patient..."
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
                  if (e.key === "Enter" && searchResults.length > 0) {
                    handleSearchNavigate(searchResults[0].id);
                  }
                }}
                className="rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-white placeholder-white/30 focus:outline-none transition-all w-44 focus:w-60"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />

              {/* Search dropdown */}
              <AnimatePresence>
                {searchOpen && searchQuery.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute top-full mt-2 right-0 w-64 rounded-xl overflow-hidden z-50"
                    style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.12)" }}
                  >
                    {searchResults.length === 0 ? (
                      <p className="px-4 py-3 text-xs font-medium text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
                        No patients found
                      </p>
                    ) : (
                      searchResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleSearchNavigate(p.id)}
                          className="flex items-center gap-3 w-full px-4 py-3 text-left transition-all"
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
                            style={{ background: "rgba(107,158,140,0.15)", color: "#6ee7b7" }}
                          >
                            {p.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                            {p.is_active && (
                              <p className="text-[10px] font-bold" style={{ color: "#4ade80" }}>Live session</p>
                            )}
                          </div>
                          <ChevronRight size={13} style={{ color: "rgba(255,255,255,0.3)" }} />
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/caregiver")}>
              <div className="text-right">
                <p className="text-xs font-bold text-white leading-tight">{caregiverName}</p>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6ee7b7" }}>
                  Admin
                </p>
              </div>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white"
                style={{
                  background: "linear-gradient(135deg, rgba(107,158,140,0.4), rgba(99,102,241,0.3))",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {caregiverName.slice(0, 1).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto w-full px-8 py-10">
            {children}
          </div>
        </div>
      </main>

      {/* ── Support Panel ── */}
      <AnimatePresence>
        {supportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-6"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
            onClick={() => setSupportOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}
                  >
                    <HelpCircle size={17} style={{ color: "#818cf8" }} />
                  </div>
                  <h3 className="text-white font-bold text-base">Support & Quick Guide</h3>
                </div>
                <button
                  onClick={() => setSupportOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Help content */}
              <div className="p-6 space-y-4">
                {[
                  {
                    title: "Assigning Patients",
                    desc: "Go to Patients → click \"Assign Patient\" to link a patient from your organisation to your roster.",
                    color: "#6ee7b7",
                  },
                  {
                    title: "Live Session Detection",
                    desc: "The Record Profile page auto-refreshes every 15 seconds. A green \"Live Session\" badge appears when the patient is actively chatting.",
                    color: "#60a5fa",
                  },
                  {
                    title: "Mood Analytics",
                    desc: "The Emotional Trajectory chart updates as the patient chats with Clara. If no data appears, ensure the patient has had at least one conversation.",
                    color: "#a78bfa",
                  },
                  {
                    title: "Resolving Alerts",
                    desc: "Navigate to Alerts to see the Priority Queue. Click \"Acknowledge\" on any alert to mark it resolved.",
                    color: "#f87171",
                  },
                  {
                    title: "Clinical Notes",
                    desc: "On the patient Record Profile, add private caregiver notes. These are never visible to the patient or sent to the AI.",
                    color: "#fbbf24",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex gap-3 p-4 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="w-1 rounded-full flex-shrink-0 mt-1" style={{ background: item.color, minHeight: "16px" }} />
                    <div>
                      <p className="text-white font-bold text-sm">{item.title}</p>
                      <p className="text-xs font-medium mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-6 pb-6">
                <button
                  onClick={() => setSupportOpen(false)}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
