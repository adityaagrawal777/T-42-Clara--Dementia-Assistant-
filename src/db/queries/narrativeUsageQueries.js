/**
 * Narrative Usage Queries
 * Prepared statements for the narrative_usage table.
 */

const { getDb } = require("../connection");

const stmts = {};

function prepare() {
    const db = getDb();

    stmts.insertUsage = db.prepare(`
        INSERT INTO narrative_usage 
        (usage_id, narrative_id, session_id, user_id, mode, category, emotion_at_usage, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmts.getSessionNarratives = db.prepare(`
        SELECT narrative_id FROM narrative_usage
        WHERE session_id = ?
        ORDER BY timestamp ASC
    `);

    stmts.getUserNarratives = db.prepare(`
        SELECT narrative_id, category, timestamp FROM narrative_usage
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
    `);
}

module.exports = {
    prepare,

    insertUsage({ usageId, narrativeId, sessionId, userId, mode, category, emotionAtUsage, timestamp }) {
        return stmts.insertUsage.run(
            usageId, narrativeId, sessionId, userId || null,
            mode, category, emotionAtUsage, timestamp
        );
    },

    /**
     * Get all narrative IDs used in a session (for exclusion in selection).
     */
    getSessionNarratives(sessionId) {
        return stmts.getSessionNarratives.all(sessionId).map(r => r.narrative_id);
    },

    /**
     * Get recent narrative usage for a user across sessions.
     */
    getUserNarratives(userId, limit = 50) {
        return stmts.getUserNarratives.all(userId, limit);
    }
};
