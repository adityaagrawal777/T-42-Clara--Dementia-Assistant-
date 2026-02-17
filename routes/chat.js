/**
 * Chat Route
 * POST /api/v1/chat — Primary chat endpoint
 */

const express = require("express");
const router = express.Router();
const orchestrator = require("../src/orchestrator");
const authManager = require("../src/auth");

router.post("/", authManager.authenticateRequest.bind(authManager), async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message || typeof message !== "string") {
            return res.status(400).json({ error: "Message is required and must be a string." });
        }

        if (!sessionId || typeof sessionId !== "string") {
            return res.status(400).json({ error: "sessionId is required." });
        }

        // Sanitize: strip HTML tags, limit length
        const sanitized = message.replace(/<[^>]*>/g, "").trim().slice(0, 500);

        if (sanitized.length === 0) {
            return res.status(400).json({ error: "Message cannot be empty." });
        }

        // Process through the full Clara pipeline
        const result = await orchestrator.processMessage(sessionId, sanitized, req.user.userId);

        res.json(result);
    } catch (error) {
        console.error("[ChatRoute] Unexpected error:", error.message);

        // Even on catastrophic failure, Clara never shows an error
        res.json({
            sessionId: req.body?.sessionId || "unknown",
            reply: "I am right here with you. Everything is okay. 💛",
            emotion: { detected: "neutral", confidence: 0, distressScore: 0, trajectory: "stable" },
            pacing: {
                initialDelayMs: 1800,
                chunks: [{ text: "I am right here with you. Everything is okay. 💛", preDelayMs: 0 }]
            },
            escalation: { triggered: false },
            meta: { responseId: "fallback", processingTimeMs: 0 }
        });
    }
});

module.exports = router;
