/**
 * Memory Manager
 * Manages session memory, repetition detection, and entity extraction.
 * Currently in-memory per session. Designed for future persistent storage plug-in.
 */

class MemoryManager {
    constructor() {
        // In-memory session store
        this.sessions = new Map();
    }

    /**
     * Initialize a new session
     */
    createSession(sessionId, caregiverContext = {}) {
        const session = {
            id: sessionId,
            createdAt: new Date().toISOString(),
            lastActivityAt: new Date().toISOString(),
            messages: [],           // { role, content, timestamp, emotion }
            emotionHistory: [],     // { emotion, confidence, distressScore, timestamp }
            entities: new Set(),    // Extracted names, places, objects
            anchors: [],            // Positive/neutral entities Clara can reference
            questionHashes: [],     // Semantic fingerprints of questions asked
            caregiverContext: {
                userName: caregiverContext.userName || null,
                knownTopics: caregiverContext.knownTopics || [],
                avoidTopics: caregiverContext.avoidTopics || []
            },
            messageCount: 0,
            status: "active"
        };

        this.sessions.set(sessionId, session);
        return session;
    }

    /**
     * Get or create a session
     */
    getSession(sessionId) {
        return this.sessions.get(sessionId) || null;
    }

    /**
     * Query memory for context relevant to the current message
     */
    query(sessionId, message) {
        const session = this.sessions.get(sessionId);

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

        // Check for repetition
        const repeatInfo = this._detectRepetition(session, message);

        // Get conversation window (last 12 messages)
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
     * Update session after a completed exchange
     */
    update(sessionId, userMessage, claraReply, emotionResult) {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        const now = new Date().toISOString();

        // Add messages
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

        // Update emotion history
        session.emotionHistory.push({
            emotion: emotionResult.emotion,
            confidence: emotionResult.confidence,
            distressScore: emotionResult.distressScore,
            trajectory: emotionResult.trajectory,
            timestamp: now
        });

        // Extract and store entities
        const entities = this._extractEntities(userMessage);
        entities.forEach(e => session.entities.add(e));

        // Store question fingerprint for repetition detection
        const fingerprint = this._fingerprint(userMessage);
        session.questionHashes.push(fingerprint);

        // Update anchors (positive entities)
        if (emotionResult.emotion === "calm" || emotionResult.emotion === "neutral") {
            entities.forEach(e => {
                if (!session.anchors.includes(e)) {
                    session.anchors.push(e);
                }
            });
        }

        session.messageCount += 2;
        session.lastActivityAt = now;
    }

    /**
     * Get session summary (for /session/:id endpoint)
     */
    getSessionSummary(sessionId) {
        const session = this.sessions.get(sessionId);
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
     * End a session
     */
    endSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        session.status = "closed";
        const dominantEmotion = this._getDominantEmotion(session.emotionHistory);

        const duration = this._calculateDuration(session.createdAt, new Date().toISOString());

        return {
            duration,
            messageCount: session.messageCount,
            dominantEmotion,
            escalationTriggered: false // TODO: track escalations
        };
    }

    // --- Private Methods ---

    _detectRepetition(session, message) {
        const fingerprint = this._fingerprint(message);
        const matches = session.questionHashes.filter(h => this._similarity(h, fingerprint) > 0.6);
        return {
            isRepeat: matches.length > 0,
            count: matches.length
        };
    }

    _fingerprint(text) {
        // Simple semantic fingerprint: normalize, remove stopwords, sort remaining words
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
        // Simple entity extraction: capitalized words that aren't sentence starters
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
