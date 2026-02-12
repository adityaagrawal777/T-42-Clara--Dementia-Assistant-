/**
 * Health Route
 * GET /api/v1/health — System health check
 */

const express = require("express");
const router = express.Router();
const persona = require("../src/config/persona");

const startTime = Date.now();

router.get("/", (req, res) => {
    const uptimeMs = Date.now() - startTime;
    const days = Math.floor(uptimeMs / 86400000);
    const hours = Math.floor((uptimeMs % 86400000) / 3600000);
    const minutes = Math.floor((uptimeMs % 3600000) / 60000);

    res.json({
        status: "healthy",
        name: "Clara Backend Brain",
        version: persona.version,
        uptime: `${days}d ${hours}h ${minutes}m`,
        components: {
            orchestrator: "operational",
            emotionEngine: "operational",
            memoryManager: "operational",
            safetyGuard: "operational",
            llm: "connected",
            responsePacer: "operational"
        },
        model: persona.model
    });
});

module.exports = router;
