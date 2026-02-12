/**
 * SQLite Connection Manager
 * Manages a single better-sqlite3 connection instance.
 * Uses WAL (Write-Ahead Logging) mode for better concurrent read performance.
 * 
 * Design notes:
 * - Singleton pattern: one connection per process (Node.js is single-threaded anyway)
 * - WAL mode: allows concurrent reads while writing
 * - Foreign keys enabled for referential integrity
 * - Busy timeout set to prevent "database is locked" errors during write contention
 */

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_DIR = path.join(__dirname, "..", "..", "data");
const DB_PATH = path.join(DB_DIR, "clara.db");

let db = null;

/**
 * Initialize the database connection.
 * Creates the data/ directory and clara.db file if they don't exist.
 * Runs migrations on first setup.
 * @returns {Database} The better-sqlite3 database instance
 */
function initialize() {
    if (db) return db;

    // Ensure data directory exists
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
    }

    // Open (or create) the database
    db = new Database(DB_PATH);

    // Performance & safety pragmas
    db.pragma("journal_mode = WAL");           // Write-Ahead Logging for better concurrency
    db.pragma("foreign_keys = ON");            // Enforce foreign key constraints
    db.pragma("busy_timeout = 5000");          // Wait up to 5s if DB is locked
    db.pragma("synchronous = NORMAL");         // Good balance of safety & speed with WAL

    // Run migrations
    const runMigrations = require("./migrations/001_initial_schema");
    runMigrations(db);

    return db;
}

/**
 * Get the active database connection.
 * Throws if not initialized.
 * @returns {Database}
 */
function getDb() {
    if (!db) {
        throw new Error("Database not initialized. Call initialize() first.");
    }
    return db;
}

/**
 * Close the database connection gracefully.
 * Should be called on process exit / SIGTERM.
 */
function close() {
    if (db) {
        db.close();
        db = null;
    }
}

module.exports = { initialize, getDb, close, DB_PATH };
