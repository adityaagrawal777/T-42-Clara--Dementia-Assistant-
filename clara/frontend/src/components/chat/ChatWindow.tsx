"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { EmergencyCard } from "./EmergencyCard";
import { useClaraStore } from "@/store/claraStore";

function getGreeting(name: string): { greeting: string; subtitle: string } {
  const hour = new Date().getHours();
  let timeOfDay = "Good morning";
  if (hour >= 12 && hour < 17) timeOfDay = "Good afternoon";
  else if (hour >= 17) timeOfDay = "Good evening";

  const displayName = name ? `, ${name}.` : ".";

  const subtitles = [
    "The sun is shining beautifully today. Would you like to chat or share what's on your mind?",
    "It's a lovely day. I'm here whenever you'd like to talk or reminisce.",
    "I'm so glad you're here. What would you like to do today?",
    "Take your time. I'm right here with you, whenever you're ready.",
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
    <div className="relative flex flex-col w-full h-full">
      {/* Forest Decoration Backdrop */}
      <div className="forest-backdrop">
        <Image
          src="/assets/forest.png"
          alt="Nature decoration"
          fill
          className="object-cover rounded-full"
        />
      </div>

      <div className="flex flex-col px-10 py-10 gap-8 max-w-5xl mx-auto w-full z-10">

        {/* ── Hero Greeting ── */}
        <section className="sanctuary-hero-greeting">
          <h1 className="sanctuary-greeting-title">{greeting}</h1>
          <p className="sanctuary-greeting-subtitle">{subtitle}</p>
        </section>

        {/* ── Message Thread ── */}
        <div className="flex flex-col gap-5">
          {messages.map((msg) => (
            <div key={msg.id} className="message-enter">
              <MessageBubble message={msg} />
            </div>
          ))}

          {/* Typing Indicator */}
          {isStreaming && (messages.length === 0 || messages[messages.length - 1]?.role === "patient") && (
            <TypingIndicator />
          )}
        </div>

        {/* Emergency Alerts */}
        <EmergencyCard />

        <div ref={messagesEndRef} className="h-10" />
      </div>
    </div>
  );
};
