"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { decodeJWT } from "@/lib/tokens";
import { Spinner } from "@/components/ui/Spinner";
import { LayoutDashboard, Users, Bell, LogOut, Heart } from "lucide-react";
import Link from "next/link";

export default function CaregiverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [caregiverName, setCaregiverName] = useState<string>("Caregiver");

  useEffect(() => {
    const payload = decodeJWT();
    
    // Strict Guard: Must have token and must have caregiver/admin role
    if (!payload || !["caregiver", "admin", "super_admin"].includes(payload.role)) {
      console.warn("[Clara] Unauthorized access attempt to caregiver dashboard");
      router.replace("/signin");
    } else {
      setIsAuthorized(true);
      // In a real payload, we might have the name or email
      setCaregiverName(payload.email || "Caregiver");
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-30">
        <div className="p-8 border-b border-slate-100 mb-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-clara-calm-bg flex items-center justify-center rounded-2xl border-2 border-clara-calm-border">
            <Heart className="w-6 h-6 text-clara-calm-text" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Caregiver Central</h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-200 font-medium ${
                pathname === link.href
                  ? "bg-clara-calm-bg text-clara-calm-text border border-clara-calm-border shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-100">
          <button
            onClick={() => {
              localStorage.removeItem("clara_jwt_token");
              router.push("/signin");
            }}
            className="flex items-center gap-4 px-6 py-4 rounded-2xl text-rose-500 hover:bg-rose-50 w-full transition-all font-medium"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto flex flex-col relative">
        <header className="sticky top-0 bg-white/80 backdrop-blur-md px-10 py-6 border-b border-slate-100 z-10 flex justify-between items-center shadow-sm">
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium text-slate-400">Pages /</span>
            <span className="text-sm font-bold text-slate-800 capitalize">
              {pathname === "/caregiver" ? "Dashboard Overview" : pathname.split("/").pop()}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden" />
            <span className="font-semibold text-slate-700">{caregiverName}</span>
          </div>
        </header>
        
        <div className="flex-1 p-10 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
