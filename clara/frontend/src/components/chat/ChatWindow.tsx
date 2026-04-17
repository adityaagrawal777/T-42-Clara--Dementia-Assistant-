"use client";

import React, { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { useClaraStore } from "@/store/claraStore";
import { motion, AnimatePresence } from "framer-motion";

function getGreeting(name: string): { greeting: string; subtitle: string } {
  const hour = new Date().getHours();
  let timeOfDay = "Good morning";
  if (hour >= 12 && hour < 17) timeOfDay = "Good afternoon";
  else if (hour >= 17) timeOfDay = "Good evening";

  const displayName = name ? `, ${name}.` : ".";

  const subtitles = [
    "Ready to chat or share what's on your mind?",
    "I'm here for you, whenever you'd like to talk.",
    "What would you like to explore today?",
    "Take a deep breath. I'm right here with you.",
  ];
  const subtitle = subtitles[hour % subtitles.length];

  return { greeting: `${timeOfDay}${displayName}`, subtitle };
}

export const ChatWindow: React.FC = () => {
  const messages = useClaraStore((state) => state.items);
  const isStreaming = useClaraStore((state) => state.isStreaming);
  const patientName = useClaraStore((state) => state.patientName);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const { greeting, subtitle } = getGreeting(patientName ?? "");

  return (
    <div className="relative flex flex-col w-full h-full min-h-[calc(100vh-80px)]">
      <div className="flex flex-col px-6 lg:px-10 py-12 lg:py-20 gap-12 max-w-4xl mx-auto w-full z-10 relative">

        {/* Dynamic Hero Section (Only shown when no messages) */}
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.section 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center py-10"
            >
              <div className="w-24 h-24 glass-card rounded-[2.5rem] flex items-center justify-center mb-8 shadow-glow-lg border-white/[0.12] scale-110">
                <span className="text-5xl animate-float">🌿</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-serif mb-6 tracking-tight text-white leading-tight">
                {greeting}
              </h1>
              <p className="text-lg text-clara-text-secondary font-medium max-w-[500px] leading-relaxed">
                {subtitle}
              </p>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Message Thread */}
        <div className="flex flex-col gap-6 w-full">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Typing Indicator */}
          {isStreaming && (
            messages.length === 0 || 
            messages[messages.length - 1].role === "patient" ||
            (messages[messages.length - 1].role === "clara" && !messages[messages.length - 1].content)
          ) && (
            <TypingIndicator />
          )}
        </div>

        <div ref={messagesEndRef} className="h-20" />
      </div>
    </div>
  );
};
