/**
 * User Queries
 * Prepared statements for the users table.
 */

const { getDb } = require("../connection");

const stmts = {};

function prepare() {
    const db = getDb();

    stmts.insertUser = db.prepare(`
        INSERT OR IGNORE INTO users (user_id, display_name, created_at, last_active_at, caregiver_context, status)
        VALUES (?, ?, ?, ?, ?, 'active')
    `);

    stmts.getUser = db.prepare(`
        SELECT * FROM users WHERE user_id = ?
    `);

    stmts.updateLastActive = db.prepare(`
        UPDATE users SET last_active_at = ? WHERE user_id = ?
    `);

    stmts.updateCaregiverContext = db.prepare(`
        UPDATE users SET caregiver_context = ? WHERE user_id = ?
    `);
}

module.exports = {
    prepare,

    insertUser(userId, displayName, now, caregiverContext = {}) {
        return stmts.insertUser.run(
            userId,
            displayName || null,
            now,
            now,
            JSON.stringify(caregiverContext)
        );
    },

    getUser(userId) {
        return stmts.getUser.get(userId) || null;
    },

    updateLastActive(userId, now) {
        return stmts.updateLastActive.run(now, userId);
    },

    updateCaregiverContext(userId, context) {
        return stmts.updateCaregiverContext.run(JSON.stringify(context), userId);
    }
};
