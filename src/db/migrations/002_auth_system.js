/**
 * Migration 002 — Auth System
 * Adds email and password_hash to users table.
 */

const MIGRATION_ID = "002_auth_system";

function run(db) {
    // Check if already applied
    const existing = db.prepare("SELECT id FROM _migrations WHERE id = ?").get(MIGRATION_ID);
    if (existing) {
        return; // Already applied
    }

    const migrate = db.transaction(() => {
        // Add email column (must be unique)
        db.exec(`ALTER TABLE users ADD COLUMN email TEXT;`);
        db.exec(`CREATE UNIQUE INDEX idx_users_email ON users(email);`);

        // Add password_hash column
        db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT;`);

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
