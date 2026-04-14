"use client";

import React from "react";
import { Message } from "@/types";
import { Smile, User } from "lucide-react";
import { motion } from "framer-motion";

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isClara = message.role === "clara";

  if (isClara && !message.content) return null;

  return (
    <motion.div
      className={`flex items-end gap-3 ${isClara ? "justify-start" : "justify-end"} w-full`}
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
    >
      {/* Clara Avatar */}
      {isClara && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-1 bg-clara-beige-200 text-clara-green-800 border border-clara-beige-200/50 shadow-sm">
          <Smile size={16} strokeWidth={2.4} />
        </div>
      )}

      {/* Bubble */}
      <div 
        className={`max-w-[75%] md:max-w-[65%] px-5 py-4 text-[15px] md:text-base leading-relaxed font-medium relative ${
          isClara 
            ? "bg-white text-clara-green-900 rounded-[1.5rem] rounded-bl-[0.25rem] border border-clara-beige-200 shadow-sm" 
            : "bg-clara-green-800 text-white rounded-[1.5rem] rounded-br-[0.25rem] shadow-md shadow-clara-green-800/20"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>

      {/* User Avatar */}
      {!isClara && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-1 bg-clara-green-100 text-clara-green-800 border border-clara-green-100/50 shadow-sm">
          <User size={16} strokeWidth={2.4} />
        </div>
      )}
    </motion.div>
  );
};
