/**
 * Clara Logger
 * Structured logging for interactions, escalations, and system events.
 * Logs to console and optionally to file for audit trails.
 */

const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "..", "logs");

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

class Logger {
    constructor() {
        this.logFile = path.join(LOG_DIR, `clara_${this._dateStamp()}.log`);
    }

    /**
     * Log a chat interaction (after response delivery)
     */
    interaction(data) {
        const entry = {
            type: "INTERACTION",
            timestamp: new Date().toISOString(),
            sessionId: data.sessionId,
            userMessage: data.userMessage?.slice(0, 200),
            emotion: data.emotion,
            distressScore: data.distressScore,
            trajectory: data.trajectory,
            isRepeat: data.isRepeat,
            reply: data.reply?.slice(0, 200),
            processingTimeMs: data.processingTimeMs,
            safetyStatus: data.safetyStatus
        };

        this._write(entry);
    }

    /**
     * Log an escalation event
     */
    escalation(data) {
        const entry = {
            type: "ESCALATION",
            timestamp: new Date().toISOString(),
            ...data
        };

        this._write(entry);
        this._writeToFile(entry); // Always persist escalations
    }

    /**
     * Log a system event (startup, errors, etc.)
     */
    system(message, level = "INFO") {
        const entry = {
            type: "SYSTEM",
            level,
            timestamp: new Date().toISOString(),
            message
        };

        this._write(entry);
    }

    /**
     * Log a safety guard event
     */
    safety(data) {
        const entry = {
            type: "SAFETY",
            timestamp: new Date().toISOString(),
            ...data
        };

        this._write(entry);
        if (data.status === "ESCALATE" || data.status === "REDIRECT") {
            this._writeToFile(entry);
        }
    }

    // --- Private ---

    _write(entry) {
        const prefix = this._prefixFor(entry.type);
        const summary = this._summarize(entry);
        console.log(`${prefix} ${summary}`);
    }

    _writeToFile(entry) {
        try {
            const line = JSON.stringify(entry) + "\n";
            fs.appendFileSync(this.logFile, line, "utf-8");
        } catch (err) {
            // Logging should never crash the app
            console.error("[Logger] File write failed:", err.message);
        }
    }

    _prefixFor(type) {
        const prefixes = {
            INTERACTION: "[💬 Chat]",
            ESCALATION: "[🚨 ESCALATION]",
            SYSTEM: "[⚙️ System]",
            SAFETY: "[🛡️ Safety]"
        };
        return prefixes[type] || "[Log]";
    }

    _summarize(entry) {
        switch (entry.type) {
            case "INTERACTION":
                return `${entry.sessionId} | ${entry.emotion} (distress: ${entry.distressScore}) | ${entry.processingTimeMs}ms`;
            case "ESCALATION":
                return `${entry.severity?.toUpperCase()} — ${entry.reason} | Session: ${entry.sessionId}`;
            case "SYSTEM":
                return `${entry.level} — ${entry.message}`;
            case "SAFETY":
                return `${entry.status} — ${entry.category || "OK"} | ${entry.sessionId || ""}`;
            default:
                return JSON.stringify(entry);
        }
    }

    _dateStamp() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
}

module.exports = new Logger();
