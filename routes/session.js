/**
 * Session Route
 * POST   /api/v1/session          — Create/resume session
 * GET    /api/v1/session/:id      — Get session state
 * POST   /api/v1/session/:id/end  — End session gracefully
 */

const express = require("express");
const router = express.Router();
const memoryManager = require("../src/memoryManager");
const sessionQueries = require("../src/db/queries/sessionQueries");
const messageQueries = require("../src/db/queries/messageQueries");
const authManager = require("../src/auth");
const { getResponse } = require("../src/safeResponseBank");

// Create a new session (requires login)
router.post("/", authManager.authenticateRequest.bind(authManager), (req, res) => {
    try {
        let userId = req.body.userId; // Explicit from body (admin/caregiver tool)
        const { caregiverContext } = req.body;

        // Try to get userId from token if not explicitly provided
        const token = req.cookies.clara_token;
        if (token && !userId) {
            const decoded = authManager.verifyToken(token);
            if (decoded) {
                userId = decoded.userId;
            }
        }

        const sessionId = "sess_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
        const session = memoryManager.createSession(sessionId, caregiverContext || {}, userId);

        let greeting = getResponse("greeting");
        if (caregiverContext?.userName) {
            greeting = `Hello, ${caregiverContext.userName}, dear. 💛 I'm Clara, and I'm so glad you're here. How are you feeling today?`;
        } else if (userId) {
            // If we have a user but no context, we could potentially load it from DB
            // For now, use a warm generic greeting
            greeting = `Hello, dear. 💛 I'm so glad to see you again. I'm Clara, and I'm right here with you.`;
        }

        res.json({
            sessionId,
            greeting,
            createdAt: session.createdAt,
            userId: userId || null
        });
    } catch (error) {
        console.error("[SessionRoute] Create error:", error.message);
        res.status(500).json({ error: "Could not create session." });
    }
});

// List user sessions (authenticated)
router.get("/", authManager.authenticateRequest.bind(authManager), (req, res) => {
    try {
        const userId = req.user.userId;
        const sessions = sessionQueries.getSessionsByUser(userId);
        res.json(sessions);
    } catch (error) {
        console.error("[SessionRoute] List error:", error.message);
        res.status(500).json({ error: "Could not retrieve sessions." });
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

// Get all messages for a session (authenticated check)
router.get("/:id/messages", authManager.authenticateRequest.bind(authManager), (req, res) => {
    try {
        const sessionId = req.params.id;
        // Verify session belongs to user
        const session = sessionQueries.getSession(sessionId);
        if (!session || session.user_id !== req.user.userId) {
            return res.status(403).json({ error: "Unauthorized access to session history." });
        }

        const messages = messageQueries.getConversationWindow(sessionId, 200); // Get up to 200 messages
        res.json(messages);
    } catch (error) {
        console.error("[SessionRoute] Messages error:", error.message);
        res.status(500).json({ error: "Could not retrieve session messages." });
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
