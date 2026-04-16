"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatHeader } from "@/components/chat/ChatHeader";

/**
 * Wraps the app shell (Sidebar + Header) around children only on
 * authenticated routes (i.e. anything that is NOT /signin).
 * Auth pages receive children directly with no shell chrome.
 */
export const ConditionalShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();

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
