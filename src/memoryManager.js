/**
 * Memory Manager (v2 — SQLite-backed)
 * Manages persistent session memory, repetition detection, and entity extraction.
 * 
 * PUBLIC INTERFACE (unchanged from v1):
 *   createSession(sessionId, caregiverContext) → session object
 *   getSession(sessionId)                     → session object or null
 *   query(sessionId, message)                 → memory context object
 *   update(sessionId, userMessage, claraReply, emotionResult) → void
 *   getSessionSummary(sessionId)              → summary object or null
 *   endSession(sessionId)                     → close summary or null
 * 
 * STORAGE BACKEND: SQLite via better-sqlite3
 * All data is persisted to data/clara.db. An in-memory cache per active
 * session ensures zero-latency reads during a session. The cache is
 * populated from SQLite on session resume and updated synchronously on
 * each exchange. SQLite writes are performed synchronously in a single
 * transaction after each exchange (design doc Section 3.2).
 * 
 * MIGRATION FROM v1:
 * The old Map()-based store has been replaced. The Orchestrator, Context
 * Assembler, and all other consumers call the same methods — they are
 * completely unaware of the storage backend change.
 */

const { v4: uuidv4 } = require("uuid");
const { getDb } = require("./db/connection");
const sessionQueries = require("./db/queries/sessionQueries");
const userQueries = require("./db/queries/userQueries");
const messageQueries = require("./db/queries/messageQueries");
const emotionQueries = require("./db/queries/emotionQueries");
const repetitionQueries = require("./db/queries/repetitionQueries");
const narrativeUsageQueries = require("./db/queries/narrativeUsageQueries");
const knowledgeExtractor = require("./knowledgeExtractor");

class MemoryManager {
    constructor() {
        // In-memory cache for active sessions (populated from SQLite on resume)
        this.sessionCache = new Map();
        this._prepared = false;
    }

    /**
     * Prepare all query statements.
     * Must be called after DB is initialized (connection.initialize()).
     */
    prepareStatements() {
        if (this._prepared) return;
        sessionQueries.prepare();
        userQueries.prepare();
        messageQueries.prepare();
        emotionQueries.prepare();
        repetitionQueries.prepare();
        narrativeUsageQueries.prepare();
        this._prepared = true;
    }

    /**
     * Initialize a new session (or resume an existing one).
     * Creates a DB record + populates in-memory cache.
     */
    createSession(sessionId, caregiverContext = {}, userId = null) {
        this._ensurePrepared();
        const now = new Date().toISOString();

        // Check if session already exists in DB (server restart recovery)
        const existing = sessionQueries.getSession(sessionId);
        if (existing) {
            return this._loadSessionToCache(sessionId);
        }

        // If userId is provided, ensure the user record exists
        if (userId) {
            userQueries.insertUser(userId, caregiverContext.userName, now, caregiverContext);
        }

        // Create new session in DB
        sessionQueries.insertSession(sessionId, userId, now);

        // Build the in-memory session object (same shape as v1)
        const session = {
            id: sessionId,
            userId: userId || null,
            createdAt: now,
            lastActivityAt: now,
            messages: [],
            emotionHistory: [],
            entities: new Set(),
            anchors: [],
            questionHashes: [],
            caregiverContext: {
                userName: caregiverContext.userName || (userId ? userQueries.getUser(userId)?.display_name : null),
                knownTopics: caregiverContext.knownTopics || [],
                avoidTopics: caregiverContext.avoidTopics || []
            },
            messageCount: 0,
            status: "active"
        };

        this.sessionCache.set(sessionId, session);
        return session;
    }

    /**
     * Get a session (from cache or DB).
     * Returns null if session doesn't exist.
     */
    getSession(sessionId) {
        this._ensurePrepared();

        // Check cache first
        if (this.sessionCache.has(sessionId)) {
            return this.sessionCache.get(sessionId);
        }

        // Check DB
        const dbSession = sessionQueries.getSession(sessionId);
        if (!dbSession) return null;

        // Load into cache from DB
        return this._loadSessionToCache(sessionId);
    }

    /**
     * Query memory for context relevant to the current message.
     * Returns the same shape as v1 — Orchestrator/ContextAssembler are unaffected.
     */
    query(sessionId, message) {
        this._ensurePrepared();

        const session = this.getSession(sessionId);

        if (!session) {
            return {
                isRepeat: false,
                repeatCount: 0,
                mentionedEntities: [],
                emotionHistory: [],
                anchors: [],
                conversationWindow: [],
                caregiverContext: {}
            };
        }

        // Check for repetition (uses cached fingerprints)
        const repeatInfo = this._detectRepetition(session, message);

        // Get conversation window (last 12 messages from cache)
        const conversationWindow = session.messages.slice(-12).map(m => ({
            role: m.role,
            content: m.content
        }));

        return {
            isRepeat: repeatInfo.isRepeat,
            repeatCount: repeatInfo.count,
            mentionedEntities: Array.from(session.entities),
            emotionHistory: session.emotionHistory.slice(-10),
            anchors: session.anchors.slice(-5),
            conversationWindow,
            caregiverContext: session.caregiverContext
        };
    }

    /**
     * Update session after a completed exchange.
     * Updates the in-memory cache AND persists to SQLite in a single transaction.
     */
    update(sessionId, userMessage, claraReply, emotionResult, intentResult = null, storyContext = null) {
        this._ensurePrepared();

        const session = this.sessionCache.get(sessionId);
        if (!session) return;

        const now = new Date().toISOString();
        const userMsgId = uuidv4();
        const claraMsgId = uuidv4();
        const userId = session.userId;

        // --- Update in-memory cache (instant) ---

        session.messages.push({
            role: "user",
            content: userMessage,
            timestamp: now,
            emotion: emotionResult.emotion
        });

        session.messages.push({
            role: "assistant",
            content: claraReply,
            timestamp: now
        });

        session.emotionHistory.push({
            emotion: emotionResult.emotion,
            confidence: emotionResult.confidence,
            distressScore: emotionResult.distressScore,
            trajectory: emotionResult.trajectory,
            timestamp: now
        });

        const entities = this._extractEntities(userMessage);
        entities.forEach(e => session.entities.add(e));

        const fingerprint = this._fingerprint(userMessage);
        session.questionHashes.push(fingerprint);

        if (emotionResult.emotion === "calm" || emotionResult.emotion === "neutral") {
            entities.forEach(e => {
                if (!session.anchors.includes(e)) {
                    session.anchors.push(e);
                }
            });
        }

        session.messageCount += 2;
        session.lastActivityAt = now;

        // --- Persist to SQLite (single transaction) ---
        try {
            const db = getDb();
            const nextSeq = messageQueries.getNextSequenceNumber(sessionId);

            const persistTransaction = db.transaction(() => {
                // Insert user message
                messageQueries.insertMessage({
                    messageId: userMsgId,
                    sessionId,
                    userId,
                    role: "user",
                    content: userMessage,
                    timestamp: now,
                    sequenceNumber: nextSeq,
                    intent: null,
                    narrativeId: null,
                    processingTimeMs: null
                });

                // Insert Clara response
                messageQueries.insertMessage({
                    messageId: claraMsgId,
                    sessionId,
                    userId,
                    role: "assistant",
                    content: claraReply,
                    timestamp: now,
                    sequenceNumber: nextSeq + 1,
                    intent: intentResult ? intentResult.intent : null,
                    narrativeId: (storyContext && storyContext.theme) ? storyContext.theme.id : null,
                    processingTimeMs: null // TODO: pass processing time
                });

                // Insert emotion record (linked to user message)
                emotionQueries.insertEmotion({
                    emotionId: uuidv4(),
                    messageId: userMsgId,
                    sessionId,
                    userId,
                    emotion: emotionResult.emotion,
                    confidence: emotionResult.confidence,
                    distressScore: emotionResult.distressScore,
                    trajectory: emotionResult.trajectory,
                    timestamp: now
                });

                // Insert repetition fingerprint
                const questionType = this._classifyQuestionType(userMessage);
                repetitionQueries.insertFingerprint({
                    trackingId: uuidv4(),
                    sessionId,
                    userId,
                    fingerprint,
                    originalMessage: userMessage,
                    questionType,
                    timestamp: now,
                    responseGiven: null
                });

                // Insert narrative usage (if a story theme was used)
                if (storyContext && storyContext.theme) {
                    narrativeUsageQueries.insertUsage({
                        usageId: uuidv4(),
                        narrativeId: storyContext.theme.id,
                        sessionId,
                        userId,
                        mode: storyContext.storyLengthMode === "extended" ? "extended" : "standard",
                        category: "calming_story",
                        emotionAtUsage: emotionResult.emotion,
                        timestamp: now
                    });
                }

                // Update activity across tables
                sessionQueries.updateActivity(sessionId, now, 2);
                if (userId) {
                    userQueries.updateLastActive(userId, now);
                }
            });

            persistTransaction();

            // --- Background Knowledge Extraction (non-blocking) ---
            if (userId) {
                this._asyncKnowledgeUpdate(sessionId, userMessage, claraReply);
            }
        } catch (err) {
            // Log but don't crash — the in-memory cache is already updated.
            // The interaction was already delivered to the user.
            console.error(`[MemoryManager] SQLite persist failed: ${err.message}`);
        }
    }

    /**
     * Get session summary (for /session/:id endpoint).
     */
    getSessionSummary(sessionId) {
        this._ensurePrepared();

        const session = this.getSession(sessionId);
        if (!session) return null;

        const dominantEmotion = this._getDominantEmotion(session.emotionHistory);

        return {
            sessionId: session.id,
            status: session.status,
            emotionHistory: session.emotionHistory.slice(-20),
            messageCount: session.messageCount,
            dominantEmotion,
            createdAt: session.createdAt,
            lastActivityAt: session.lastActivityAt
        };
    }

    /**
     * End a session. Updates DB status and returns close summary.
     */
    endSession(sessionId) {
        this._ensurePrepared();

        const session = this.getSession(sessionId);
        if (!session) return null;

        session.status = "closed";
        const dominantEmotion = this._getDominantEmotion(session.emotionHistory);
        const duration = this._calculateDuration(session.createdAt, new Date().toISOString());

        const summary = {
            duration,
            messageCount: session.messageCount,
            dominantEmotion,
            escalationTriggered: false
        };

        // Persist session close to DB
        try {
            sessionQueries.closeSession(sessionId, dominantEmotion, summary);
        } catch (err) {
            console.error(`[MemoryManager] Failed to close session in DB: ${err.message}`);
        }

        // Remove from cache (session is done)
        this.sessionCache.delete(sessionId);

        return summary;
    }

    // ===============================================================
    // Private Methods
    // ===============================================================

    async _asyncKnowledgeUpdate(sessionId, userMessage, claraReply) {
        const session = this.getSession(sessionId);
        if (!session || !session.userId) return;

        try {
            const discovered = await knowledgeExtractor.extract(userMessage, claraReply);

            if (discovered && Object.keys(discovered).length > 0) {
                const updatedContext = knowledgeExtractor.merge(session.caregiverContext, discovered);

                // Update in-memory
                session.caregiverContext = updatedContext;

                // Update DB
                userQueries.updateCaregiverContext(session.userId, updatedContext);

                console.log(`[MemoryManager] Knowledge updated for user ${session.userId}:`, discovered);
            }
        } catch (err) {
            console.error(`[MemoryManager] Knowledge extraction background task failed: ${err.message}`);
        }
    }

    /**
     * Ensure prepared statements are ready.
     * Called at the top of every public method.
     */
    _ensurePrepared() {
        if (!this._prepared) {
            this.prepareStatements();
        }
    }

    /**
     * Load a session from SQLite into the in-memory cache.
     * Reconstructs the same session shape that v1 produced.
     */
    _loadSessionToCache(sessionId) {
        const dbSession = sessionQueries.getSession(sessionId);
        if (!dbSession) return null;

        // Load conversation history from DB
        const messages = messageQueries.getConversationWindow(sessionId, 1000); // Load all messages

        // Load emotion history from DB
        const dbEmotions = emotionQueries.getSessionEmotions(sessionId, 1000);
        // Reverse to chronological order (query returns DESC)
        const emotionHistory = dbEmotions.reverse();

        // Load fingerprints from DB
        const dbFingerprints = repetitionQueries.getSessionFingerprints(sessionId);
        const questionHashes = dbFingerprints.map(r => r.fingerprint);

        // Reconstruct entities and anchors from message history
        const entities = new Set();
        const anchors = [];
        for (let i = 0; i < messages.length; i++) {
            if (messages[i].role === "user") {
                const extracted = this._extractEntities(messages[i].content);
                extracted.forEach(e => entities.add(e));
            }
        }

        // Reconstruct anchors from messages when emotion was calm/neutral
        for (let i = 0; i < emotionHistory.length; i++) {
            if (emotionHistory[i].emotion === "calm" || emotionHistory[i].emotion === "neutral") {
                // Find the corresponding user message at this position
                const userMsgs = messages.filter(m => m.role === "user");
                if (i < userMsgs.length) {
                    const extracted = this._extractEntities(userMsgs[i].content);
                    extracted.forEach(e => {
                        if (!anchors.includes(e)) {
                            anchors.push(e);
                        }
                    });
                }
            }
        }

        // Parse caregiver context (stored as JSON in DB, or default)
        let caregiverContext = { userName: null, knownTopics: [], avoidTopics: [] };
        if (dbSession.user_id) {
            const user = userQueries.getUser(dbSession.user_id);
            if (user) {
                if (user.caregiver_context) {
                    try {
                        caregiverContext = typeof user.caregiver_context === "string"
                            ? JSON.parse(user.caregiver_context)
                            : user.caregiver_context;
                    } catch (err) {
                        // Fallback to empty context on parse error
                    }
                }
                // --- AUTH FIX: Fallback to display_name if userName is missing in context ---
                if (!caregiverContext.userName && user.display_name) {
                    caregiverContext.userName = user.display_name;
                }
            }
        }

        const session = {
            id: dbSession.session_id,
            userId: dbSession.user_id,
            createdAt: dbSession.created_at,
            lastActivityAt: dbSession.last_activity_at,
            messages: messages.map(m => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp || dbSession.last_activity_at
            })),
            emotionHistory,
            entities,
            anchors,
            questionHashes,
            caregiverContext,
            messageCount: dbSession.message_count,
            status: dbSession.status
        };

        this.sessionCache.set(sessionId, session);
        return session;
    }

    _detectRepetition(session, message) {
        const fingerprint = this._fingerprint(message);
        const matches = session.questionHashes.filter(h => this._similarity(h, fingerprint) > 0.6);

        // Also check question type classification (for short messages with empty fingerprints)
        if (matches.length === 0 && fingerprint === "") {
            const currentType = this._classifyQuestionType(message);
            if (currentType !== "general") {
                // Check session fingerprints by type from DB
                try {
                    const typeCount = repetitionQueries.getQuestionTypeCount(session.id, currentType);
                    if (typeCount > 0) {
                        return { isRepeat: true, count: typeCount };
                    }
                } catch (err) {
                    // Fallback: no repetition detected
                }
            }
        }

        return {
            isRepeat: matches.length > 0,
            count: matches.length
        };
    }

    _fingerprint(text) {
        const stopwords = new Set([
            "i", "me", "my", "the", "a", "an", "is", "am", "are", "was", "were",
            "do", "does", "did", "have", "has", "had", "be", "been", "being",
            "to", "of", "in", "for", "on", "with", "at", "by", "it", "this",
            "that", "and", "or", "but", "not", "so", "if", "can", "will", "just",
            "what", "how", "why", "when", "where", "who", "which", "there", "here",
            "very", "really", "please", "would", "could", "should", "don't", "know"
        ]);

        const words = text.toLowerCase()
            .replace(/[^a-z\s]/g, "")
            .split(/\s+/)
            .filter(w => w.length > 1 && !stopwords.has(w))
            .sort();

        return words.join(" ");
    }

    _similarity(a, b) {
        if (!a || !b) return 0;
        const setA = new Set(a.split(" "));
        const setB = new Set(b.split(" "));
        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);
        return union.size === 0 ? 0 : intersection.size / union.size;
    }

    _extractEntities(text) {
        const entities = [];
        const words = text.split(/\s+/);

        for (let i = 1; i < words.length; i++) {
            const clean = words[i].replace(/[^a-zA-Z]/g, "");
            if (clean.length > 1 && clean[0] === clean[0].toUpperCase() && clean[0] !== clean[0].toLowerCase()) {
                entities.push(clean);
            }
        }

        return entities;
    }

    /**
     * Classify a message into a question type category.
     * Used for two-tier repetition detection (design doc Section 4.2).
     */
    _classifyQuestionType(message) {
        const lower = message.toLowerCase();

        const patterns = {
            location: ["where am i", "what is this place", "where is this", "don't recognize", "what place", "lost"],
            identity: ["who am i", "who are you", "what's my name", "are you my", "don't know who"],
            time: ["what day", "what time", "what year", "when is", "how long", "what month"],
            activity: ["what do i do", "what should i do", "what's happening", "what happens now"],
            person: ["where is", "have you seen", "when is", "coming", "i miss"]
        };

        for (const [type, keywords] of Object.entries(patterns)) {
            if (keywords.some(kw => lower.includes(kw))) {
                return type;
            }
        }

        return "general";
    }

    _getDominantEmotion(history) {
        if (history.length === 0) return "neutral";
        const counts = {};
        for (const h of history) {
            counts[h.emotion] = (counts[h.emotion] || 0) + 1;
        }
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    }

    _calculateDuration(start, end) {
        const ms = new Date(end) - new Date(start);
        const totalSeconds = Math.floor(ms / 1000);
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
        const seconds = String(totalSeconds % 60).padStart(2, "0");
        return `${hours}:${minutes}:${seconds}`;
    }
}

module.exports = new MemoryManager();
