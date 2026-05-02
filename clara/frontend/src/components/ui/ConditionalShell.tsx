"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { getPatientIdentity, isJWTValid } from "@/lib/tokens";
import { useClaraStore } from "@/store/claraStore";

/**
 * Wraps the app shell (Sidebar + Header) around children only on
 * authenticated routes (i.e. anything that is NOT /signin).
 * Auth pages receive children directly with no shell chrome.
 *
 * Also bootstraps the Zustand session state from localStorage on every
 * page load so that patientName survives hard refreshes.
 */
export const ConditionalShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const setSession = useClaraStore((s) => s.setSession);
  const patientName = useClaraStore((s) => s.patientName);

  // Re-hydrate session identity from localStorage after a hard refresh.
  // Only runs if: JWT is still valid AND the store doesn't already have the name.
  useEffect(() => {
    if (patientName) return; // Already hydrated — nothing to do
    if (!isJWTValid()) return; // No valid session — don't try to hydrate

    const { name, patientId, sessionId } = getPatientIdentity();
    if (name && patientId && sessionId) {
      setSession({ sessionId, patientId, patientName: name });
    }
  }, [patientName, setSession]);

  // Routes that should NOT show the patient sidebar/header shell.
  const isAuthPage =
    pathname === "/signin" ||
    pathname === "/" ||
    pathname === "" ||
    pathname.startsWith("/caregiver");

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex w-full h-screen overflow-hidden bg-clara-bg text-clara-text-primary">
      <Sidebar />
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background Mesh for the whole chat area */}
        <div className="absolute inset-0 z-0 mesh-gradient opacity-30 pointer-events-none"></div>
        
        <ChatHeader />
        <div className="flex-1 overflow-y-auto no-scrollbar pb-36 relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
};
