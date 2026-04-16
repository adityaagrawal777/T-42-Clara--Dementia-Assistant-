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
      className={`flex items-end gap-3 ${isClara ? "justify-start" : "justify-end"} w-full group/msg`}
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
    >
      {/* Clara Avatar */}
      {isClara && (
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mb-1 bg-white/[0.04] text-clara-primary border border-white/[0.1] shadow-dark-sm group-hover/msg:border-clara-primary/30 transition-colors">
          <Smile size={16} strokeWidth={2.5} />
        </div>
      )}

      {/* Bubble Container */}
      <div className={`flex flex-col ${isClara ? "items-start" : "items-end"} max-w-[80%] md:max-w-[70%]`}>
        <div 
          className={`px-5 py-3.5 text-[15px] md:text-base leading-relaxed tracking-tight font-medium relative transition-all duration-300 ${
            isClara 
              ? "bg-white/[0.04] text-slate-100 rounded-[1.25rem] rounded-bl-none border border-white/[0.08] shadow-dark-sm group-hover/msg:bg-white/[0.07]" 
              : "bg-gradient-to-br from-clara-primary to-clara-primary-light text-white rounded-[1.25rem] rounded-br-none shadow-glow-sm"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        
        {/* Timestamp / Meta info */}
        <span className="text-[10px] font-bold text-clara-text-muted mt-1.5 uppercase tracking-widest px-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* User Avatar */}
      {!isClara && (
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mb-1 bg-clara-primary/10 text-clara-primary-light border border-clara-primary/20 shadow-dark-sm">
          <User size={16} strokeWidth={2.5} />
        </div>
      )}
    </motion.div>
  );
};
