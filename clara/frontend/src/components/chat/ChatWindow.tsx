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
      <div className="absolute top-0 right-0 w-[420px] h-[420px] opacity-20 translate-x-[15%] -translate-y-[15%] pointer-events-none select-none blur-[2px] saturate-[1.2] rounded-full overflow-hidden mix-blend-multiply flex-shrink-0">
        <Image
          src="/assets/forest.png"
          alt="Nature decoration"
          fill
          className="object-cover"
        />
      </div>

      <div className="flex flex-col px-6 lg:px-10 py-10 lg:py-16 gap-10 lg:gap-14 max-w-4xl mx-auto w-full z-10 relative">

        {/* Hero Greeting */}
        <section className="max-w-[640px] animate-in ease-out animate-duration-[500ms]">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-clara-green-900 leading-[1.05] tracking-tight">
            {greeting}
          </h1>
          <p className="text-lg text-clara-green-900/70 mt-5 leading-relaxed max-w-[500px]">
            {subtitle}
          </p>
        </section>

        {/* Message Thread */}
        <div className="flex flex-col gap-6 w-full">
          {messages.map((msg) => (
            <div key={msg.id} className="animate-in ease-out animate-duration-[350ms]">
              <MessageBubble message={msg} />
            </div>
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

        {/* Emergency Alerts */}
        <EmergencyCard />

        <div ref={messagesEndRef} className="h-10" />
      </div>
    </div>
  );
};
