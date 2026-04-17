"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { InputBar } from "@/components/chat/InputBar";
import { EmergencyCard } from "@/components/chat/EmergencyCard";
import { useClaraStore } from "@/store/claraStore";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useVoiceOrchestrator } from "@/hooks/useVoiceOrchestrator";
import { useClaraSocket } from "@/hooks/useClaraSocket";

export default function ChatPage() {
  const router = useRouter();
  const { sessionId, lastMessageDone, setLastMessageDone, items, mode } = useClaraStore();
  const { speak } = useVoiceOrchestrator();
  useClaraSocket();

  // Guard: if no session, redirect back to sign-in
  useEffect(() => {
    if (!sessionId) {
      router.replace("/signin");
    }
  }, [sessionId, router]);

  // Trigger TTS when Clara's message is complete
  useEffect(() => {
    if (lastMessageDone) {
      const lastMessage = items[items.length - 1];
      if (lastMessage && lastMessage.role === "clara" && lastMessage.content) {
        if (mode === "voice" || mode === "mixed") {
          speak(lastMessage.content, lastMessage.mood);
        }
      }
      setLastMessageDone(null);
    }
  }, [lastMessageDone, items, speak, setLastMessageDone, mode]);

  return (
    <div className="w-full h-full relative">
      {/* ── Chat messages ── */}
      <section className="w-full">
        <ErrorBoundary>
          <ChatWindow />
        </ErrorBoundary>
      </section>

      {/* ── Floating Input bar ── */}
      <InputBar />

      {/* ── Emergency overlay — fixed z-[100], covers everything including InputBar ── */}
      <EmergencyCard />
    </div>
  );
}
