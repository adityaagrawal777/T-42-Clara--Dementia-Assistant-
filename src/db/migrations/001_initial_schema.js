/**
 * Migration 001 — Initial Schema
 * Creates all tables defined in USER_MEMORY_STORAGE.md Section 2.
 * 
 * Tables: users, sessions, chat_messages, detected_emotions,
 *         repetition_tracking, narrative_usage
 * 
 * This migration is idempotent — it checks a _migrations meta-table
 * and skips if already applied.
 */

const MIGRATION_ID = "001_initial_schema";

function run(db) {
    // Create migrations tracking table
    db.exec(`
        CREATE TABLE IF NOT EXISTS _migrations (
            id TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        );
    `);

    // Check if already applied
    const existing = db.prepare("SELECT id FROM _migrations WHERE id = ?").get(MIGRATION_ID);
    if (existing) {
        return; // Already applied
    }

    // Run all table creation in a single transaction
    const migrate = db.transaction(() => {
        // --- Table: users ---
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                user_id         TEXT PRIMARY KEY,
                display_name    TEXT,
                created_at      TEXT NOT NULL,
                last_active_at  TEXT NOT NULL,
                caregiver_context TEXT DEFAULT '{}',
                status          TEXT NOT NULL DEFAULT 'active'
            );
        `);

        // --- Table: sessions ---
        db.exec(`
            CREATE TABLE IF NOT EXISTS sessions (
                session_id          TEXT PRIMARY KEY,
                user_id             TEXT,
                created_at          TEXT NOT NULL,
                last_activity_at    TEXT NOT NULL,
                status              TEXT NOT NULL DEFAULT 'active',
                message_count       INTEGER NOT NULL DEFAULT 0,
                dominant_emotion    TEXT,
                escalation_triggered INTEGER NOT NULL DEFAULT 0,
                session_summary     TEXT,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            );
        `);

        // --- Table: chat_messages ---
        db.exec(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                message_id          TEXT PRIMARY KEY,
                session_id          TEXT NOT NULL,
                user_id             TEXT,
                role                TEXT NOT NULL,
                content             TEXT NOT NULL,
                timestamp           TEXT NOT NULL,
                sequence_number     INTEGER NOT NULL,
                intent              TEXT,
                narrative_id        TEXT,
                processing_time_ms  INTEGER,
                FOREIGN KEY (session_id) REFERENCES sessions(session_id),
                FOREIGN KEY (user_id)    REFERENCES users(user_id)
            );
        `);

        // Indexes for chat_messages
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_messages_session_seq 
                ON chat_messages(session_id, sequence_number);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_messages_user_time 
                ON chat_messages(user_id, timestamp);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_messages_role 
                ON chat_messages(session_id, role);
        `);

        // --- Table: detected_emotions ---
        db.exec(`
            CREATE TABLE IF NOT EXISTS detected_emotions (
                emotion_id      TEXT PRIMARY KEY,
                message_id      TEXT NOT NULL,
                session_id      TEXT NOT NULL,
                user_id         TEXT,
                emotion         TEXT NOT NULL,
                confidence      REAL NOT NULL,
                distress_score  REAL NOT NULL,
                trajectory      TEXT NOT NULL,
                timestamp       TEXT NOT NULL,
                FOREIGN KEY (message_id)  REFERENCES chat_messages(message_id),
                FOREIGN KEY (session_id)  REFERENCES sessions(session_id),
                FOREIGN KEY (user_id)     REFERENCES users(user_id)
            );
        `);

        // Indexes for detected_emotions
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_emotions_session_time 
                ON detected_emotions(session_id, timestamp);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_emotions_user_time 
                ON detected_emotions(user_id, timestamp);
        `);

        // --- Table: repetition_tracking ---
        db.exec(`
            CREATE TABLE IF NOT EXISTS repetition_tracking (
                tracking_id     TEXT PRIMARY KEY,
                session_id      TEXT NOT NULL,
                user_id         TEXT,
                fingerprint     TEXT NOT NULL,
                original_message TEXT NOT NULL,
                question_type   TEXT,
                timestamp       TEXT NOT NULL,
                response_given  TEXT,
                FOREIGN KEY (session_id) REFERENCES sessions(session_id),
                FOREIGN KEY (user_id)    REFERENCES users(user_id)
            );
        `);

        // Indexes for repetition_tracking
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_repetition_session 
                ON repetition_tracking(session_id, timestamp);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_repetition_user 
                ON repetition_tracking(user_id, fingerprint);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_repetition_type 
                ON repetition_tracking(session_id, question_type);
        `);

        // --- Table: narrative_usage ---
        db.exec(`
            CREATE TABLE IF NOT EXISTS narrative_usage (
                usage_id            TEXT PRIMARY KEY,
                narrative_id        TEXT NOT NULL,
                session_id          TEXT NOT NULL,
                user_id             TEXT,
                mode                TEXT NOT NULL,
                category            TEXT NOT NULL,
                emotion_at_usage    TEXT NOT NULL,
                timestamp           TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(session_id),
                FOREIGN KEY (user_id)    REFERENCES users(user_id)
            );
        `);

        // Indexes for narrative_usage
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_narrative_session 
                ON narrative_usage(session_id);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_narrative_user 
                ON narrative_usage(user_id, narrative_id);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_narrative_category 
                ON narrative_usage(user_id, category, timestamp);
        `);

        // Record migration as applied
        db.prepare("INSERT INTO _migrations (id, applied_at) VALUES (?, ?)").run(
            MIGRATION_ID,
            new Date().toISOString()
        );
    });

    migrate();
    console.log(`  ✅ Migration ${MIGRATION_ID} applied successfully.`);
}

module.exports = run;
