/**
 * Message Queries
 * Prepared statements for the chat_messages table.
 */

const { getDb } = require("../connection");

const stmts = {};

function prepare() {
    const db = getDb();

    stmts.insertMessage = db.prepare(`
        INSERT INTO chat_messages 
        (message_id, session_id, user_id, role, content, timestamp, sequence_number, intent, narrative_id, processing_time_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmts.getConversationWindow = db.prepare(`
        SELECT role, content FROM chat_messages
        WHERE session_id = ?
        ORDER BY sequence_number DESC
        LIMIT ?
    `);

    stmts.getMessageCount = db.prepare(`
        SELECT COUNT(*) as count FROM chat_messages WHERE session_id = ?
    `);

    stmts.getNextSequenceNumber = db.prepare(`
        SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq 
        FROM chat_messages WHERE session_id = ?
    `);

    stmts.getUserMessages = db.prepare(`
        SELECT content FROM chat_messages
        WHERE session_id = ? AND role = 'user'
        ORDER BY sequence_number ASC
    `);
}

module.exports = {
    prepare,

    insertMessage({ messageId, sessionId, userId, role, content, timestamp, sequenceNumber, intent, narrativeId, processingTimeMs }) {
        return stmts.insertMessage.run(
            messageId, sessionId, userId || null, role, content, timestamp,
            sequenceNumber, intent || null, narrativeId || null, processingTimeMs || null
        );
    },

    /**
     * Get the last N messages for a session, returned in chronological order.
     */
    getConversationWindow(sessionId, limit = 12) {
        // Query gets them in DESC order, reverse for chronological
        const rows = stmts.getConversationWindow.all(sessionId, limit);
        return rows.reverse();
    },

    getMessageCount(sessionId) {
        return stmts.getMessageCount.get(sessionId).count;
    },

    getNextSequenceNumber(sessionId) {
        return stmts.getNextSequenceNumber.get(sessionId).next_seq;
    },

    getUserMessages(sessionId) {
        return stmts.getUserMessages.all(sessionId);
    }
};
