/**
 * Clara — Server Entry Point
 * Production-grade Express server with modular brain architecture.
 * Now with SQLite-backed persistent memory.
 */

// Load environment variables FIRST — before any module reads process.env
require("dotenv").config();

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");

// --- Initialize SQLite Database (MUST happen before routes/components load) ---
const db = require("./src/db/connection");
const memoryManager = require("./src/memoryManager");
db.initialize();
memoryManager.prepareStatements();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
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
const authRoute = require("./routes/auth");
const logger = require("./src/logger");

app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/session", sessionRoute);
app.use("/api/v1/health", healthRoute);
app.use("/api/v1/escalate", escalateRoute);
app.use("/api/v1/auth", authRoute);

// --- Serve Frontend ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Graceful Shutdown ---
function gracefulShutdown(signal) {
  console.log(`\n  [Clara] Received ${signal}. Closing database and shutting down...`);
  db.close();
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

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
  console.log("  ║   ✅ Memory Manager (SQLite)              ║");
  console.log("  ║   ✅ Safety Guard                         ║");
  console.log("  ║   ✅ Context Assembler                    ║");
  console.log("  ║   ✅ LLM Client (Groq)                   ║");
  console.log("  ║   ✅ Response Pacer                       ║");
  console.log("  ║   ✅ Orchestrator                         ║");
  console.log("  ║   ✅ Logger                               ║");
  console.log("  ║   ✅ SQLite Database                      ║");
  console.log("  ║                                           ║");
  console.log("  ╚═══════════════════════════════════════════╝");
  console.log("");

  logger.system("Clara backend brain started successfully.");
});
