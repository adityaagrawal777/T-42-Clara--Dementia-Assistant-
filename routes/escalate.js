/**
 * Escalation Route
 * POST /api/v1/escalate — Triggered when Clara detects a user may need human help.
 * In production, this would notify caregivers via email/SMS/dashboard.
 */

const express = require("express");
const router = express.Router();
const logger = require("../src/logger");

router.post("/", (req, res) => {
    try {
        const { sessionId, reason, severity, context } = req.body;

        if (!sessionId || !reason) {
            return res.status(400).json({ error: "sessionId and reason are required." });
        }

        const escalationId = "esc_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);

        // Log the escalation event
        logger.escalation({
            escalationId,
            sessionId,
            reason,
            severity: severity || "medium",
            context: context || "No context provided",
            timestamp: new Date().toISOString()
        });

        // In production: send notification to caregiver
        // - Email via SendGrid/SES
        // - SMS via Twilio
        // - Push to care team dashboard
        // - WebSocket alert to connected caregivers

        console.warn(`\n  🚨 ESCALATION [${severity || "medium"}] — ${reason}`);
        console.warn(`     Session: ${sessionId}`);
        console.warn(`     ID: ${escalationId}\n`);

        res.json({
            escalationId,
            acknowledged: true,
            notifiedParties: ["care_team_dashboard"],
            message: "Escalation logged. In production, caregivers would be notified."
        });
    } catch (error) {
        console.error("[EscalationRoute] Error:", error.message);
        res.status(500).json({ error: "Escalation logging failed." });
    }
});

module.exports = router;
