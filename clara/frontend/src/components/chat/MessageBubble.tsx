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
      className={`flex items-end gap-3 ${isClara ? "justify-start" : "justify-end"}`}
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
    >
      {/* Clara Avatar */}
      {isClara && (
        <div className="sanctuary-bubble-avatar sanctuary-bubble-avatar--clara">
          <Smile size={16} strokeWidth={2.2} />
        </div>
      )}

      {/* Bubble */}
      <div className={`sanctuary-bubble ${isClara ? "sanctuary-bubble--clara" : "sanctuary-bubble--user"}`}>
        <p className="sanctuary-bubble-text">{message.content}</p>
      </div>

      {/* User Avatar */}
      {!isClara && (
        <div className="sanctuary-bubble-avatar sanctuary-bubble-avatar--user">
          <User size={16} strokeWidth={2.2} />
        </div>
      )}
    </motion.div>
  );
};
