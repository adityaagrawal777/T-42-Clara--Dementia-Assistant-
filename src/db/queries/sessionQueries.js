/**
 * Session Queries
 * Prepared statements for the sessions table.
 */

const { getDb } = require("../connection");

const stmts = {};

function prepare() {
    const db = getDb();

    stmts.insertSession = db.prepare(`
        INSERT INTO sessions (session_id, user_id, created_at, last_activity_at, status, message_count)
        VALUES (?, ?, ?, ?, 'active', 0)
    `);

    stmts.getSession = db.prepare(`
        SELECT * FROM sessions WHERE session_id = ?
    `);

    stmts.updateActivity = db.prepare(`
        UPDATE sessions SET last_activity_at = ?, message_count = message_count + ?
        WHERE session_id = ?
    `);

    stmts.closeSession = db.prepare(`
        UPDATE sessions SET status = 'closed', dominant_emotion = ?, session_summary = ?
        WHERE session_id = ?
    `);

    stmts.getSessionsByUser = db.prepare(`
        SELECT s.*, 
        (SELECT content FROM chat_messages m WHERE m.session_id = s.session_id AND m.role = 'user' ORDER BY sequence_number ASC LIMIT 1) as preview
        FROM sessions s 
        WHERE s.user_id = ? 
        ORDER BY s.created_at DESC 
        LIMIT ?
    `);
}

module.exports = {
    prepare,

    insertSession(sessionId, userId, now) {
        return stmts.insertSession.run(sessionId, userId, now, now);
    },

    getSession(sessionId) {
        return stmts.getSession.get(sessionId) || null;
    },

    updateActivity(sessionId, now, messageIncrement) {
        return stmts.updateActivity.run(now, messageIncrement, sessionId);
    },

    closeSession(sessionId, dominantEmotion, summary) {
        return stmts.closeSession.run(dominantEmotion, JSON.stringify(summary), sessionId);
    },

    getSessionsByUser(userId, limit = 10) {
        return stmts.getSessionsByUser.all(userId, limit);
    }
};
