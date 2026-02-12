/**
 * Emotion Queries
 * Prepared statements for the detected_emotions table.
 */

const { getDb } = require("../connection");

const stmts = {};

function prepare() {
    const db = getDb();

    stmts.insertEmotion = db.prepare(`
        INSERT INTO detected_emotions 
        (emotion_id, message_id, session_id, user_id, emotion, confidence, distress_score, trajectory, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmts.getSessionEmotions = db.prepare(`
        SELECT emotion, confidence, distress_score as distressScore, trajectory, timestamp
        FROM detected_emotions
        WHERE session_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
    `);

    stmts.getUserEmotions = db.prepare(`
        SELECT emotion, confidence, distress_score as distressScore, trajectory, timestamp
        FROM detected_emotions
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
    `);
}

module.exports = {
    prepare,

    insertEmotion({ emotionId, messageId, sessionId, userId, emotion, confidence, distressScore, trajectory, timestamp }) {
        return stmts.insertEmotion.run(
            emotionId, messageId, sessionId, userId || null,
            emotion, confidence, distressScore, trajectory, timestamp
        );
    },

    /**
     * Get recent emotion history for a session.
     * Returns in reverse-chronological order (most recent first).
     */
    getSessionEmotions(sessionId, limit = 10) {
        return stmts.getSessionEmotions.all(sessionId, limit);
    },

    /**
     * Get cross-session emotion history for a user.
     */
    getUserEmotions(userId, limit = 50) {
        return stmts.getUserEmotions.all(userId, limit);
    }
};
