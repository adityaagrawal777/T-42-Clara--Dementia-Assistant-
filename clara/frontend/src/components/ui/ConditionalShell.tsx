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

  // Routes that should NOT show the sidebar/header shell
  const isAuthPage = pathname === "/signin" || pathname === "/" || pathname === "";

  if (isAuthPage) {
    // Auth pages: render children directly (they handle their own full-screen layout)
    return <>{children}</>;
  }

  // Chat / protected pages: show the full sanctuary shell
  return (
    <div className="flex w-full h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col relative overflow-hidden bg-clara-neutral-bg">
        <ChatHeader />
        <div className="flex-1 overflow-y-auto no-scrollbar pb-36">
          {children}
        </div>
      </main>
    </div>
  );
};
