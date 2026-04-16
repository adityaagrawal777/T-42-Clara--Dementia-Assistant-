"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { decodeJWT, clearJWT } from "@/lib/tokens";
import { Spinner } from "@/components/ui/Spinner";
import { LayoutDashboard, Users, Bell, LogOut, Heart, Search, Settings, HelpCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

function getBreadcrumb(path: string): string {
  if (path === "/caregiver") return "Insights";
  if (path === "/caregiver/patients") return "Patient Roster";
  if (path === "/caregiver/alerts") return "System Alerts";
  const last = path.split("/").pop() ?? "";
  return /^[0-9a-f-]{36}$/i.test(last) ? "Record Profile" : last.charAt(0).toUpperCase() + last.slice(1);
}

export default function CaregiverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [caregiverName, setCaregiverName] = useState<string>("Admin");

  useEffect(() => {
    const payload = decodeJWT();
    if (!payload || !["caregiver", "admin", "super_admin"].includes(payload.role)) {
      router.replace("/signin");
    } else {
      setIsAuthorized(true);
      setCaregiverName(payload.name || "Caregiver");
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-clara-bg">
        <Spinner />
      </div>
    );
  }

  if (!isAuthorized) return null;

  const navLinks = [
    { href: "/caregiver", label: "Dashboard", icon: LayoutDashboard },
    { href: "/caregiver/patients", label: "Patients", icon: Users },
    { href: "/caregiver/alerts", label: "Alerts", icon: Bell },
  ];

  return (
    <div className="flex h-screen bg-clara-bg overflow-hidden text-clara-text-primary">
      {/* Dynamic Background Mesh */}
      <div className="absolute inset-0 z-0 mesh-gradient opacity-30 pointer-events-none"></div>

      {/* Sidebar */}
      <aside className="w-72 bg-clara-surface/40 backdrop-blur-3xl border-r border-white/[0.05] flex flex-col relative z-30">
        <div className="p-10 mb-8 border-b border-white/[0.05] flex items-center gap-4">
          <div className="w-10 h-10 bg-clara-primary/10 flex items-center justify-center rounded-2xl border border-clara-primary/20 shadow-glow-sm">
            <Heart size={20} className="text-clara-primary" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Clara</h1>
            <p className="text-[10px] font-bold text-clara-text-tertiary uppercase tracking-[0.2em] -mt-1">Caregiver</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <p className="px-4 mb-4 text-[10px] font-black text-clara-text-muted uppercase tracking-[0.2em]">Management</p>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 font-bold text-sm ${
                pathname === link.href
                  ? "bg-white/[0.06] text-white shadow-inner-glow border border-white/[0.08]"
                  : "text-clara-text-secondary hover:bg-white/[0.03] hover:text-white"
              }`}
            >
              <link.icon size={18} className={`${pathname === link.href ? "text-clara-primary" : "text-clara-text-tertiary"}`} />
              {link.label}
              {pathname === link.href && (
                <motion.div layoutId="careNav" className="ml-auto w-1.5 h-1.5 rounded-full bg-clara-primary shadow-glow-sm" />
              )}
            </Link>
          ))}
        </nav>

        <div className="p-6 mt-auto space-y-4">
          <button className="flex items-center gap-4 px-6 py-4 rounded-2xl text-clara-text-tertiary hover:bg-white/[0.03] hover:text-white w-full transition-all font-bold text-sm">
            <HelpCircle size={18} />
            Support
          </button>
          <button
            onClick={() => { clearJWT(); router.push("/signin"); }}
            className="flex items-center gap-4 px-6 py-4 rounded-2xl text-danger hover:bg-danger-muted border border-transparent hover:border-danger/10 w-full transition-all font-bold text-sm"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-auto flex flex-col relative z-10">
        <header className="sticky top-0 bg-clara-bg/40 backdrop-blur-3xl px-10 py-6 border-b border-white/[0.05] z-30 flex justify-between items-center shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-clara-text-muted uppercase tracking-widest">Portal /</span>
            <span className="text-sm font-black text-white tracking-tight">
              {getBreadcrumb(pathname)}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group hidden lg:block">
              <input 
                type="text" 
                placeholder="Find patient..." 
                className="bg-white/[0.03] border border-white/[0.08] rounded-xl py-2 pl-10 pr-4 text-xs font-bold text-white placeholder:text-clara-text-muted transition-all focus:w-64 focus:border-clara-primary/40"
              />
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-clara-text-muted" />
            </div>

            <div className="flex items-center gap-3 cursor-pointer group hover:bg-white/[0.03] px-3 py-1.5 rounded-2xl transition-all">
              <div className="flex flex-col items-end">
                <span className="text-xs font-black text-white">{caregiverName}</span>
                <span className="text-[9px] font-bold text-clara-primary uppercase tracking-widest leading-none">Admin</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-clara-surface-2 to-clara-surface-3 border border-white/[0.1] shadow-glow-sm overflow-hidden flex items-center justify-center font-black text-xs">
                {caregiverName.slice(0, 1).toUpperCase()}
              </div>
            </div>
          </div>
        </header>
        
        <div className="flex-1 p-10 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
