/**
 * Repetition Queries
 * Prepared statements for the repetition_tracking table.
 */

const { getDb } = require("../connection");

const stmts = {};

function prepare() {
    const db = getDb();

    stmts.insertFingerprint = db.prepare(`
        INSERT INTO repetition_tracking 
        (tracking_id, session_id, user_id, fingerprint, original_message, question_type, timestamp, response_given)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmts.getSessionFingerprints = db.prepare(`
        SELECT fingerprint, question_type FROM repetition_tracking
        WHERE session_id = ?
        ORDER BY timestamp ASC
    `);

    stmts.getUserFingerprints = db.prepare(`
        SELECT fingerprint, question_type, timestamp FROM repetition_tracking
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
    `);

    stmts.getQuestionTypeCount = db.prepare(`
        SELECT COUNT(*) as count FROM repetition_tracking
        WHERE session_id = ? AND question_type = ?
    `);
}

module.exports = {
    prepare,

    insertFingerprint({ trackingId, sessionId, userId, fingerprint, originalMessage, questionType, timestamp, responseGiven }) {
        return stmts.insertFingerprint.run(
            trackingId, sessionId, userId || null,
            fingerprint, originalMessage, questionType || null,
            timestamp, responseGiven || null
        );
    },

    /**
     * Get all fingerprints for a session (for repetition detection).
     */
    getSessionFingerprints(sessionId) {
        return stmts.getSessionFingerprints.all(sessionId);
    },

    /**
     * Get recent fingerprints across all sessions for a user.
     */
    getUserFingerprints(userId, limit = 100) {
        return stmts.getUserFingerprints.all(userId, limit);
    },

    /**
     * Count how many times a question type appeared in a session.
     */
    getQuestionTypeCount(sessionId, questionType) {
        return stmts.getQuestionTypeCount.get(sessionId, questionType).count;
    }
};
