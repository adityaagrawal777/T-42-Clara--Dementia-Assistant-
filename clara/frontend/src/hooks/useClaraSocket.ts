import { useEffect, useRef, useCallback } from "react";
import { useClaraStore } from "@/store/claraStore";
import { getJWT } from "@/lib/tokens";
import { RECONNECT_MAX_ATTEMPTS, RECONNECT_INITIAL_DELAY } from "@/lib/constants";
import { Message, Mood, InputMode } from "@/types";

export const useClaraSocket = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    sessionId,
    addMessage,
    updateLastMessage,
    setMood,
    setConnected,
    setStatus,
    setLastMessageDone,
    reconnectAttempts,
    setReconnectAttempts,
    setSendMessage,
    setStreaming,
    triggerEmergency,
  } = useClaraStore();

  const connect = useCallback(() => {
    if (!sessionId || socketRef.current?.readyState === WebSocket.OPEN) return;

    const token = getJWT();
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"}/api/v1/chat/${sessionId}?token=${token}`;
    
    setStatus("connecting");
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      setStatus("active");
      setReconnectAttempts(0);
      console.log("[Clara] WebSocket connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "token":
          // Frontend fallback bracket stripping
          const displayToken = data.content.replace(/\[.*?\]/g, "");
          if (displayToken) {
            updateLastMessage(displayToken);
          }
          break;
        case "mood":
          setMood({
            mood: data.mood as Mood,
            confidence: data.confidence,
            timestamp: new Date().toISOString(),
          });
          break;
        case "done":
          setStreaming(false);
          setLastMessageDone(new Date().getTime().toString());
          if (data.distress_detected) {
            const severity = data.distress_severity || "high";
            const categories = data.distress_categories || [];
            
            // Trigger the large emergency card
            triggerEmergency(severity, categories);
            
            // Also keep the discreet top-right alert for logging purposes
            useClaraStore.getState().addAlert({
              id: crypto.randomUUID(),
              severity: severity,
              trigger_phrase: `Clinical distress detected: ${categories.join(", ") || "General distress"}`,
              timestamp: new Date().toISOString(),
              is_resolved: false,
            });
          }
          break;
        case "error":
          console.error("[Clara] Server error:", data.content);
          setStreaming(false);
          break;
        case "ping":
          socket.send(JSON.stringify({ type: "pong" }));
          break;
      }
    };

    socket.onclose = (event) => {
      setConnected(false);
      setStreaming(false);
      console.log("[Clara] WebSocket closed:", event.reason);
      
      if (reconnectAttempts < RECONNECT_MAX_ATTEMPTS && !event.wasClean) {
        const delay = RECONNECT_INITIAL_DELAY * Math.pow(2, reconnectAttempts);
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts(reconnectAttempts + 1);
          connect();
        }, delay);
      } else if (reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
        setStatus("error");
      }
    };

    socket.onerror = (error) => {
      console.error("[Clara] WebSocket error:", error);
    };
  }, [sessionId, reconnectAttempts, setConnected, setStatus, setReconnectAttempts, updateLastMessage, setMood, setStreaming, setLastMessageDone, triggerEmergency]);

  const sendMessage = useCallback((content: string, inputMode: InputMode) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      // 1. Add the patient's message instantly
      const patientMsg: Message = {
        id: crypto.randomUUID(),
        role: "patient",
        content,
        mood: "neutral",
        inputMode,
        timestamp: new Date().toISOString(),
      };
      addMessage(patientMsg);

      // 2. Add a FRESH blank placeholder for Clara's response
      const claraPlaceholder: Message = {
        id: crypto.randomUUID(),
        role: "clara",
        content: "",
        mood: "neutral",
        inputMode: "chat",
        timestamp: new Date().toISOString(),
      };
      addMessage(claraPlaceholder);

      // 3. Set streaming flag so UI shows the typing indicator on the placeholder
      setStreaming(true);

      // 4. Send the message to the server
      socketRef.current.send(JSON.stringify({ type: "message", content, input_mode: inputMode }));
    } else {
      console.warn("[Clara] WebSocket not open. Reconnecting...");
      connect();
    }
  }, [addMessage, connect, setStreaming]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      socketRef.current?.close();
    };
  }, [connect]);

  useEffect(() => {
    setSendMessage(sendMessage);
  }, [sendMessage, setSendMessage]);

  return { sendMessage };
};
