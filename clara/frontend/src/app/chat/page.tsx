"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { InputBar } from "@/components/chat/InputBar";
import { EmergencyCard } from "@/components/chat/EmergencyCard";
import { useClaraStore } from "@/store/claraStore";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useVoiceOrchestrator } from "@/hooks/useVoiceOrchestrator";
import { useClaraSocket } from "@/hooks/useClaraSocket";
import { motion, AnimatePresence } from "framer-motion";

// Idle timeout: warn at 20 min, end session at 30 min
const IDLE_WARN_MS = 20 * 60 * 1000;
const IDLE_END_MS = 30 * 60 * 1000;
const IDLE_CHECK_MS = 30_000;

export default function ChatPage() {
  const router = useRouter();
  const { sessionId, lastMessageDone, setLastMessageDone, items, mode } = useClaraStore();
  const { speak } = useVoiceOrchestrator();
  useClaraSocket();

  const [idleWarning, setIdleWarning] = useState(false);
  const lastActivityRef = useRef(Date.now());

  // Reset idle timer on any new message or user interaction
  const resetIdle = () => {
    lastActivityRef.current = Date.now();
    setIdleWarning(false);
  };

  useEffect(() => {
    if (items.length > 0) resetIdle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Idle detection loop
  useEffect(() => {
    if (!sessionId) return;
    const timer = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= IDLE_END_MS) {
        // Session expired — send patient back to sign-in
        router.replace("/signin");
      } else if (idleMs >= IDLE_WARN_MS) {
        setIdleWarning(true);
      }
    }, IDLE_CHECK_MS);
    return () => clearInterval(timer);
  }, [sessionId, router]);

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
    <div className="w-full h-full relative" onMouseMove={resetIdle} onKeyDown={resetIdle}>
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

      {/* ── Idle warning overlay ── */}
      <AnimatePresence>
        {idleWarning && (
          <>
            <motion.div
              key="idle-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm"
              onClick={resetIdle}
            />
            <motion.div
              key="idle-card"
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="fixed inset-0 z-[85] flex items-center justify-center p-6 pointer-events-none"
            >
              <div
                className="w-full max-w-xs pointer-events-auto overflow-hidden rounded-[2.5rem] shadow-2xl text-center"
                style={{
                  background: "linear-gradient(160deg, #fff8f5 0%, #fef3f0 50%, #fdf6ee 100%)",
                  border: "1.5px solid rgba(251,191,170,0.5)",
                }}
              >
                <div className="py-10 px-8 flex flex-col items-center gap-4">
                  <div className="text-4xl">🌿</div>
                  <h2 className="text-xl font-bold" style={{ color: "#92400e" }}>
                    Still there?
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: "#9a6348", fontWeight: 500 }}>
                    Clara is still here with you. Tap anywhere to continue your conversation.
                  </p>
                  <button
                    onClick={resetIdle}
                    className="mt-2 w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
                    style={{
                      background: "linear-gradient(135deg, #6b9e8c 0%, #4a8a76 100%)",
                      boxShadow: "0 4px 20px rgba(107,158,140,0.25)",
                    }}
                  >
                    Yes, I&apos;m here 🌸
                  </button>
                  <p className="text-[10px] font-medium" style={{ color: "#c8a99a" }}>
                    Session ends automatically after 30 minutes of quiet.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
