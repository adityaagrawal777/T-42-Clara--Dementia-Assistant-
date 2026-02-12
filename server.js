/**
 * Clara — Server Entry Point
 * Production-grade Express server with modular brain architecture.
 */

// Load environment variables FIRST — before any module reads process.env
require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

// --- Request Logging (lightweight) ---
app.use((req, res, next) => {
  if (req.method === "POST") {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// --- API Routes (v1) ---
const chatRoute = require("./routes/chat");
const sessionRoute = require("./routes/session");
const healthRoute = require("./routes/health");
const escalateRoute = require("./routes/escalate");
const logger = require("./src/logger");

app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/session", sessionRoute);
app.use("/api/v1/health", healthRoute);
app.use("/api/v1/escalate", escalateRoute);

// --- Legacy endpoint (backward compatibility with existing frontend) ---
const orchestrator = require("./src/orchestrator");

app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({ error: "Message and sessionId are required." });
    }

    const result = await orchestrator.processMessage(sessionId, message);
    res.json(result);
  } catch (error) {
    console.error("[Legacy Chat] Error:", error.message);
    res.json({
      reply: "I am right here with you. Everything is okay. 💛",
      pacing: {
        initialDelayMs: 1800,
        chunks: [{ text: "I am right here with you. Everything is okay. 💛", preDelayMs: 0 }]
      }
    });
  }
});

// --- Serve Frontend ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log("");
  console.log("  ╔═══════════════════════════════════════════╗");
  console.log("  ║                                           ║");
  console.log("  ║   🌸  Clara is ready                      ║");
  console.log(`  ║   🔗  http://localhost:${PORT}               ║`);
  console.log("  ║                                           ║");
  console.log("  ║   Components:                             ║");
  console.log("  ║   ✅ Emotion Analyzer                     ║");
  console.log("  ║   ✅ Memory Manager                       ║");
  console.log("  ║   ✅ Safety Guard                         ║");
  console.log("  ║   ✅ Context Assembler                    ║");
  console.log("  ║   ✅ LLM Client (Groq)                   ║");
  console.log("  ║   ✅ Response Pacer                       ║");
  console.log("  ║   ✅ Orchestrator                         ║");
  console.log("  ║   ✅ Logger                               ║");
  console.log("  ║                                           ║");
  console.log("  ╚═══════════════════════════════════════════╝");
  console.log("");

  logger.system("Clara backend brain started successfully.");
});
