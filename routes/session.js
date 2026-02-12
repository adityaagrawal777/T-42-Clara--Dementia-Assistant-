/**
 * Session Route
 * POST   /api/v1/session          — Create/resume session
 * GET    /api/v1/session/:id      — Get session state
 * POST   /api/v1/session/:id/end  — End session gracefully
 */

const express = require("express");
const router = express.Router();
const memoryManager = require("../src/memoryManager");
const { getResponse } = require("../src/safeResponseBank");

// Create a new session
router.post("/", (req, res) => {
    try {
        const { userId, caregiverContext } = req.body;

        const sessionId = "sess_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);

        const session = memoryManager.createSession(sessionId, caregiverContext || {});

        // Generate a personalized greeting
        let greeting = getResponse("greeting");
        if (caregiverContext?.userName) {
            greeting = `Hello, ${caregiverContext.userName}, dear. 💛 I'm Clara, and I'm so glad you're here. How are you feeling today?`;
        }

        res.json({
            sessionId,
            greeting,
            createdAt: session.createdAt
        });
    } catch (error) {
        console.error("[SessionRoute] Create error:", error.message);
        res.status(500).json({ error: "Could not create session." });
    }
});

// Get session state
router.get("/:id", (req, res) => {
    try {
        const summary = memoryManager.getSessionSummary(req.params.id);

        if (!summary) {
            return res.status(404).json({ error: "Session not found." });
        }

        res.json(summary);
    } catch (error) {
        console.error("[SessionRoute] Get error:", error.message);
        res.status(500).json({ error: "Could not retrieve session." });
    }
});

// End session gracefully
router.post("/:id/end", (req, res) => {
    try {
        const { reason } = req.body;
        const sessionSummary = memoryManager.endSession(req.params.id);

        if (!sessionSummary) {
            return res.status(404).json({ error: "Session not found." });
        }

        const farewell = getResponse("farewell");

        res.json({
            farewell,
            sessionSummary
        });
    } catch (error) {
        console.error("[SessionRoute] End error:", error.message);
        res.status(500).json({ error: "Could not end session." });
    }
});

module.exports = router;
