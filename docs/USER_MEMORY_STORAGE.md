# Clara — User Memory Storage Layer
### Internal Engineering Design Document
### Version 1.0 · February 2026

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Database Table Design](#2-database-table-design)
3. [Chat Storage Flow](#3-chat-storage-flow)
4. [Repeated Question Detection Strategy](#4-repeated-question-detection-strategy)
5. [Memory Retrieval Rules](#5-memory-retrieval-rules)
6. [Dementia-Safe Constraints](#6-dementia-safe-constraints)
7. [Future Extensions](#7-future-extensions)

---

## 1. Problem Statement

Clara currently operates with a **fully in-memory session store** (`src/memoryManager.js`). The `MemoryManager` class uses a JavaScript `Map()` to hold all session data — messages, emotion history, entity sets, question fingerprints, and caregiver context. This was an appropriate starting point. It is no longer sufficient.

### What breaks today:

| Limitation | Consequence |
|-----------|-------------|
| **Server restart = total amnesia** | Every `node server.js` restart wipes all sessions. Clara forgets everything — mid-conversation. A user who was calming down starts from zero. |
| **No cross-session continuity** | If a user talks to Clara on Monday and returns on Tuesday, Clara has no memory of Monday. She cannot recognize familiar patterns, preferred narrative themes, or emotional baselines. |
| **No persistent repetition history** | Repetition detection (`_detectRepetition`) only works within a single session's `questionHashes` array. If a user asks "Where am I?" every day for a week, Clara has no mechanism to understand this is a chronic pattern — she can only detect within-session repetition. |
| **No caregiver visibility** | Caregivers cannot review interaction history, emotional trends, or escalation events after the session ends. The data simply doesn't exist anymore. |
| **Narrative usage is lost** | The Narrative Memory Layer (NARRATIVE_MEMORY_LAYER.md) tracks `session.usedNarratives` in memory. On restart, the pool resets. Clara may tell the same story every session. |
| **No emotional trending** | The Emotion Analyzer computes per-message emotion and within-session trajectory, but there is no mechanism to compute **long-term** emotional baselines (e.g., "this user is typically calmer in mornings"). |

### What this document designs:

A **persistent user memory layer** backed by SQLite that replaces the in-memory `Map()` store while preserving the exact same public interfaces (`query()`, `update()`, `getSession()`, `createSession()`) that the Orchestrator and other components depend on.

### What this document does NOT do:

- ❌ Change the Orchestrator's interface or flow. The Orchestrator still calls `memoryManager.query()` and `memoryManager.update()` — it is unaware of the storage backend.
- ❌ Introduce a new API. The existing `/api/v1/chat`, `/api/v1/session`, and other endpoints remain unchanged.
- ❌ Add user authentication. Users are identified by `sessionId` (current) or `userId` (future). Authentication is a separate concern.
- ❌ Implement full code. This is a design document. Implementation follows.

### Relationship to existing documents:

| Document | How this builds on it |
|----------|----------------------|
| **BRAIN_ARCHITECTURE.md** (Section 6) | Fulfills the "Future Memory Integration" plan. Implements the Session Memory → Persistent Memory migration described in the architecture. |
| **RESPONSE_INTENT_LAYER.md** | Memory is consumed by the Intent Detector and Context Assembler. This layer provides the persistent substrate. |
| **NARRATIVE_MEMORY_LAYER.md** (Section 3.6) | Narrative usage tracking (`usedNarratives`) moves from in-memory session arrays to persistent storage. |

---

## 2. Database Table Design

### 2.1 Design Philosophy

Five guiding rules for the schema:

1. **Read-optimized.** Clara reads memory far more than she writes. Every chat request triggers a read (message history, repetition check, emotional context). Writes happen once per exchange. Indexes must prioritize read paths.
2. **Append-only for messages.** Chat messages are never edited or deleted during normal operation. This simplifies consistency and enables audit trails.
3. **Temporal ordering.** Dementia care depends on recency. The most recent messages, emotions, and interactions are always the most relevant. Every query should naturally order by time.
4. **Separation of concerns.** Emotion data, repetition data, and narrative usage data are stored in dedicated structures — not crammed into a single wide `messages` table. This allows each subsystem to evolve independently.
5. **No personal health information (PHI) in plaintext.** Caregiver-provided context (names, topics) is stored, but the system is designed so that a future encryption layer can wrap these fields without schema changes.

---

### 2.2 Table: `users`

**Purpose:** Represents a persistent identity across sessions. A user may have many sessions over days, weeks, or months. This table is the anchor point for all cross-session memory.

| Column | Type | Purpose |
|--------|------|---------|
| `user_id` | TEXT (UUID), PRIMARY KEY | Unique, immutable identifier for the user. Generated on first session creation. |
| `display_name` | TEXT, NULLABLE | Caregiver-provided preferred name (e.g., "Nana", "Dad"). Used by Context Assembler for personalization. |
| `created_at` | TEXT (ISO 8601) | When this user record was first created. |
| `last_active_at` | TEXT (ISO 8601) | Timestamp of the user's most recent interaction. Updated on every message. |
| `caregiver_context` | TEXT (JSON blob) | Serialized JSON containing `knownTopics`, `avoidTopics`, and other caregiver-provided settings. Stored as a JSON string for flexibility — avoids rigid columns for evolving context. |
| `status` | TEXT | Enum: `active`, `inactive`, `archived`. Governs whether the user's data is included in active queries. |

**Key design decisions:**
- `caregiver_context` is a JSON blob rather than normalized columns because caregiver-provided context evolves over time. New fields (e.g., `preferredLanguage`, `dailyRoutine`) can be added without migrations.
- `user_id` is a UUID (not auto-increment) because it may be generated client-side or by an external identity provider in future deployments.
- There is no `password` or `email` column. Clara does not authenticate users directly — that is a gateway concern.

---

### 2.3 Table: `sessions`

**Purpose:** Represents a single continuous interaction window. A user may have many sessions. Each session has a lifecycle: `active` → `closed` (or `expired`).

| Column | Type | Purpose |
|--------|------|---------|
| `session_id` | TEXT (UUID), PRIMARY KEY | Unique identifier for this session. Matches the `sessionId` used in the API. |
| `user_id` | TEXT (UUID), FOREIGN KEY → `users.user_id` | Links the session to a persistent user identity. NULLABLE for anonymous sessions (backward compatibility). |
| `created_at` | TEXT (ISO 8601) | When the session started. |
| `last_activity_at` | TEXT (ISO 8601) | Most recent message timestamp. Used for session expiry calculations. |
| `status` | TEXT | Enum: `active`, `closed`, `expired`. |
| `message_count` | INTEGER | Running count of all messages (user + Clara) in this session. |
| `dominant_emotion` | TEXT, NULLABLE | Computed on session close — the most frequently detected emotion across the session. |
| `escalation_triggered` | INTEGER (0 or 1) | Whether a safety escalation occurred during this session. |
| `session_summary` | TEXT (JSON blob), NULLABLE | Populated on session close. Contains duration, message count, dominant emotion, escalation status. Used by caregiver dashboard. |

**Key design decisions:**
- `user_id` is nullable to support the current anonymous session model. Existing frontend code sends only `sessionId` — no breaking change required.
- `dominant_emotion` is computed and stored on session close (denormalized) to avoid expensive aggregation queries on the caregiver dashboard.
- Sessions are never deleted. Closed sessions remain queryable for caregiver review and long-term emotional trending.

---

### 2.4 Table: `chat_messages`

**Purpose:** The core interaction log. Every user message and every Clara response is stored as a separate row. This is the single source of truth for "what was said."

| Column | Type | Purpose |
|--------|------|---------|
| `message_id` | TEXT (UUID), PRIMARY KEY | Unique identifier for this message. |
| `session_id` | TEXT (UUID), FOREIGN KEY → `sessions.session_id` | Which session this message belongs to. |
| `user_id` | TEXT (UUID), FOREIGN KEY → `users.user_id`, NULLABLE | Denormalized for query convenience — avoids joining through `sessions` for user-level queries. |
| `role` | TEXT | Enum: `user`, `assistant`. Who sent this message. |
| `content` | TEXT | The raw message text. For user messages: the original input. For Clara: the final delivered response (post-safety, post-pacing). |
| `timestamp` | TEXT (ISO 8601) | When this message was sent/delivered. |
| `sequence_number` | INTEGER | Monotonically increasing counter within the session. Ensures correct ordering even if timestamps collide. |
| `intent` | TEXT, NULLABLE | The detected intent for this exchange (e.g., `calming_story`, `grounding`). Only populated for Clara's responses. |
| `narrative_id` | TEXT, NULLABLE | If a curated narrative was used (as seed or fallback), its ID from the Narrative Library. Links to `narrativeLibrary.json` entries. |
| `processing_time_ms` | INTEGER, NULLABLE | How long the pipeline took to generate this response. Only populated for Clara's responses. |

**Indexes:**
- `idx_messages_session_seq` — on `(session_id, sequence_number)` — primary query path: "get the last N messages for this session"
- `idx_messages_user_time` — on `(user_id, timestamp)` — cross-session query: "get all messages from this user in the last 7 days"
- `idx_messages_role` — on `(session_id, role)` — filter for "get only user messages" (used by repetition detection)

**Key design decisions:**
- `sequence_number` exists because ISO 8601 timestamps alone do not guarantee ordering within rapid exchanges. A user could send two messages within the same second.
- `user_id` is denormalized from `sessions` for query performance. The alternative — joining `chat_messages` → `sessions` → `users` for every query — adds latency on the hottest path.
- `content` stores Clara's **final** response, not the raw LLM output. If the Completeness Validator or Safety Guard modified the response, only the delivered version is stored. Raw LLM output is logged separately by the Logger (audit trail, not user-facing memory).

---

### 2.5 Table: `detected_emotions`

**Purpose:** A dedicated emotional timeline. Every user message produces an emotion analysis result. Storing these separately from `chat_messages` allows efficient emotional trend queries without scanning message content.

| Column | Type | Purpose |
|--------|------|---------|
| `emotion_id` | TEXT (UUID), PRIMARY KEY | Unique identifier. |
| `message_id` | TEXT (UUID), FOREIGN KEY → `chat_messages.message_id` | Links this emotion record to the specific message that triggered it. |
| `session_id` | TEXT (UUID), FOREIGN KEY → `sessions.session_id` | Denormalized for efficient session-level emotion queries. |
| `user_id` | TEXT (UUID), FOREIGN KEY → `users.user_id`, NULLABLE | Denormalized for cross-session emotional trending. |
| `emotion` | TEXT | The classified emotion: `anxious`, `confused`, `fearful`, `lonely`, `sad`, `neutral`, `calm`. |
| `confidence` | REAL | Classifier confidence (0.0–1.0). |
| `distress_score` | REAL | Aggregated distress score (0.0–1.0), considers recent emotion trajectory. |
| `trajectory` | TEXT | Enum: `escalating`, `stable`, `de-escalating`. Direction of emotional change. |
| `timestamp` | TEXT (ISO 8601) | When this emotion was detected. |

**Indexes:**
- `idx_emotions_session_time` — on `(session_id, timestamp)` — "get emotion timeline for this session"
- `idx_emotions_user_time` — on `(user_id, timestamp)` — "get this user's emotion history across all sessions"

**Key design decisions:**
- Emotion is stored per-message, not per-session. This granularity is essential for trajectory computation and for the caregiver dashboard's emotion timeline visualization.
- `distress_score` and `trajectory` are stored as computed values, not recomputed on read. The Emotion Analyzer has the full context at write time (rolling average, previous messages). Recomputing on read would require loading the entire emotion history.
- This table is write-once, no updates. An emotion record, once written, is immutable.

---

### 2.6 Table: `repetition_tracking`

**Purpose:** Tracks semantic fingerprints of user messages for repetition detection. Separated from `chat_messages` because fingerprinting involves normalization, stopword removal, and similarity computation — these processed artifacts should not be mixed with raw message content.

| Column | Type | Purpose |
|--------|------|---------|
| `tracking_id` | TEXT (UUID), PRIMARY KEY | Unique identifier. |
| `session_id` | TEXT (UUID), FOREIGN KEY → `sessions.session_id` | Session scope for within-session repetition. |
| `user_id` | TEXT (UUID), FOREIGN KEY → `users.user_id`, NULLABLE | User scope for cross-session repetition (future). |
| `fingerprint` | TEXT | Normalized semantic fingerprint of the user's message (lowercase, stopwords removed, remaining words sorted, joined). Matches the existing `_fingerprint()` output from `memoryManager.js`. |
| `original_message` | TEXT | The original (un-normalized) message, for debugging and caregiver review. |
| `question_type` | TEXT, NULLABLE | Classified question category: `location`, `identity`, `time`, `activity`, `general`. Used to group related repeated questions. |
| `timestamp` | TEXT (ISO 8601) | When this message was received. |
| `response_given` | TEXT, NULLABLE | The fingerprint or ID of the response Clara gave. Allows tracking whether the same response was given to the same question. |

**Indexes:**
- `idx_repetition_session` — on `(session_id, timestamp)` — "get all fingerprints for this session"
- `idx_repetition_user` — on `(user_id, fingerprint)` — "has this user ever asked this question before, in any session?"
- `idx_repetition_type` — on `(session_id, question_type)` — "how many location questions has this user asked this session?"

**Key design decisions:**
- `question_type` is a coarse classification layer on top of the fingerprint. Two messages with different fingerprints may have the same `question_type` ("Where am I?" and "What is this place?" both have type `location`). This allows higher-level analytics ("this user asks location questions 12 times per session on average").
- `response_given` links the question to the response, enabling Clara to avoid giving the same exact response to the same repeated question. The Narrative Retriever checks this field when selecting memory loop narratives.
- Fingerprints are stored as **text**, not hashes. This is intentional — the similarity comparison (`_similarity()`) needs the original word set, not a hash.

---

### 2.7 Table: `narrative_usage`

**Purpose:** Tracks which curated narratives from the Narrative Library have been used, when, and for which user/session. Prevents repetition of the same story and enables future analysis of narrative effectiveness.

| Column | Type | Purpose |
|--------|------|---------|
| `usage_id` | TEXT (UUID), PRIMARY KEY | Unique identifier. |
| `narrative_id` | TEXT | The `id` field from the narrative in `narrativeLibrary.json`. |
| `session_id` | TEXT (UUID), FOREIGN KEY → `sessions.session_id` | Which session the narrative was used in. |
| `user_id` | TEXT (UUID), FOREIGN KEY → `users.user_id`, NULLABLE | Which user received this narrative. |
| `mode` | TEXT | Enum: `seed`, `fallback`. Whether the narrative was used as an LLM seed or delivered directly as a fallback. |
| `category` | TEXT | The narrative's category (`calming_story`, `grounding`, etc.). Denormalized for efficient queries. |
| `emotion_at_usage` | TEXT | The user's detected emotion at the time the narrative was used. |
| `timestamp` | TEXT (ISO 8601) | When the narrative was used. |

**Indexes:**
- `idx_narrative_session` — on `(session_id)` — "which narratives have been used this session?" (for exclusion in Narrative Retriever)
- `idx_narrative_user` — on `(user_id, narrative_id)` — "has this user ever heard this story before?"
- `idx_narrative_category` — on `(user_id, category, timestamp)` — "how many calming stories has this user received in the past week?"

**Key design decisions:**
- This table replaces the in-memory `session.usedNarratives` array from NARRATIVE_MEMORY_LAYER.md Section 3.6.
- `emotion_at_usage` is stored to support future analysis: "Which narrative categories are most effective at de-escalating anxiety?" (compare emotion at usage time with emotion in the next message).
- Only narratives that were actually delivered (or seeded) to the user are tracked. Narratives that were retrieved but rejected by the Completeness Validator or Safety Guard are not recorded here — they are logged in the audit trail by the Logger.

---

### 2.8 Entity-Relationship Summary

```
┌──────────┐
│  users   │
│          │
│ user_id  │◄──────────────────────────────────────────────┐
└────┬─────┘                                               │
     │ 1:N                                                 │
     ▼                                                     │
┌──────────────┐                                           │
│  sessions    │                                           │
│              │                                           │
│ session_id   │◄─────────────┬─────────────┬──────────┐   │
│ user_id (FK) │              │             │          │   │
└──────────────┘              │             │          │   │
                              │             │          │   │
              ┌───────────────┘    ┌────────┘    ┌─────┘   │
              ▼                    ▼             ▼         │
     ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐
     │ chat_messages   │  │ repetition_     │  │ narrative_usage  │
     │                 │  │ tracking        │  │                  │
     │ message_id      │  │ tracking_id     │  │ usage_id         │
     │ session_id (FK) │  │ session_id (FK) │  │ session_id (FK)  │
     │ user_id (FK)    │  │ user_id (FK)    │  │ user_id (FK)     │
     └───────┬─────────┘  └─────────────────┘  └──────────────────┘
             │
             │ 1:1
             ▼
     ┌────────────────────┐
     │ detected_emotions  │
     │                    │
     │ emotion_id         │
     │ message_id (FK)    │
     │ session_id (FK)    │
     │ user_id (FK)       │
     └────────────────────┘
```

---

## 3. Chat Storage Flow

This section describes the **complete lifecycle** of a single user message, from arrival to storage, with every read and write operation clearly marked.

### 3.1 Full Flow Diagram

```
User sends message
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: SESSION RESOLUTION                                     │
│                                                                 │
│  READ: sessions WHERE session_id = ?                            │
│  IF not found:                                                  │
│    WRITE: INSERT INTO sessions (session_id, created_at, ...)    │
│    WRITE: INSERT INTO users (user_id, ...) — if userId provided │
│  ELSE:                                                          │
│    WRITE: UPDATE sessions SET last_activity_at = NOW()          │
│                                                                 │
│  Output: session object (with user_id if linked)                │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: EMOTION ANALYSIS                                       │
│  (No DB interaction — operates on the message text + recent     │
│   emotion history loaded in Step 3)                             │
│                                                                 │
│  Output: { emotion, confidence, distressScore, trajectory }     │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: MEMORY QUERY (READ-HEAVY)                              │
│                                                                 │
│  READ: chat_messages WHERE session_id = ?                       │
│        ORDER BY sequence_number DESC LIMIT 12                   │
│        → conversation window (last 12 messages)                 │
│                                                                 │
│  READ: detected_emotions WHERE session_id = ?                   │
│        ORDER BY timestamp DESC LIMIT 10                         │
│        → recent emotion history (for trajectory)                │
│                                                                 │
│  READ: repetition_tracking WHERE session_id = ?                 │
│        → all fingerprints this session (for repetition check)   │
│                                                                 │
│  COMPUTE: fingerprint of current message                        │
│  COMPARE: Jaccard similarity against stored fingerprints        │
│  Output: { isRepeat, repeatCount, conversationWindow,           │
│            emotionHistory, anchors, caregiverContext }           │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: SAFETY GUARD (PRE-RESPONSE)                            │
│  (No DB interaction — pattern matching on message text)         │
│                                                                 │
│  IF ESCALATE → log + fallback path (skip to Step 9)            │
│  IF REDIRECT → safe response path (skip to Step 9)             │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: INTENT DETECTION                                       │
│  (No DB interaction — pattern matching on message + emotion)    │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: NARRATIVE RETRIEVAL                                    │
│                                                                 │
│  READ: narrative_usage WHERE session_id = ?                     │
│        → list of already-used narrative IDs this session        │
│                                                                 │
│  READ (future): narrative_usage WHERE user_id = ?               │
│        ORDER BY timestamp DESC LIMIT 50                         │
│        → cross-session narrative history                        │
│                                                                 │
│  COMPUTE: filter + rank narratives from library                 │
│  Output: { narrative, mode, reason } or null                    │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEPS 7–8: CONTEXT ASSEMBLY → LLM GENERATION →                │
│             COMPLETENESS VALIDATION → SAFETY POST-CHECK         │
│  (No DB interaction — operates on assembled context)            │
│                                                                 │
│  Output: final Clara response text                              │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 9: STORAGE BATCH (WRITE-HEAVY)                            │
│                                                                 │
│  All writes are performed AFTER the response is delivered       │
│  to the user. This ensures response latency is not affected     │
│  by write operations.                                           │
│                                                                 │
│  WRITE: INSERT INTO chat_messages (user message)                │
│    → role='user', content=message, sequence_number=N            │
│                                                                 │
│  WRITE: INSERT INTO chat_messages (Clara response)              │
│    → role='assistant', content=reply, sequence_number=N+1,      │
│      intent=intentResult.intent, narrative_id=narrative.id      │
│                                                                 │
│  WRITE: INSERT INTO detected_emotions                           │
│    → emotion, confidence, distress_score, trajectory            │
│    → linked to the user's message_id                            │
│                                                                 │
│  WRITE: INSERT INTO repetition_tracking                         │
│    → fingerprint, question_type, response_given                 │
│                                                                 │
│  WRITE (conditional): INSERT INTO narrative_usage               │
│    → only if a narrative was used (mode = 'seed' or 'fallback') │
│                                                                 │
│  WRITE: UPDATE sessions SET last_activity_at, message_count     │
│  WRITE: UPDATE users SET last_active_at                         │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Write Batching Strategy

All Step 9 writes are executed as a **single SQLite transaction**:

```
BEGIN TRANSACTION;
  INSERT INTO chat_messages (...) VALUES (...);    -- user message
  INSERT INTO chat_messages (...) VALUES (...);    -- clara response
  INSERT INTO detected_emotions (...) VALUES (...);
  INSERT INTO repetition_tracking (...) VALUES (...);
  INSERT INTO narrative_usage (...) VALUES (...);  -- conditional
  UPDATE sessions SET ...;
  UPDATE users SET ...;
COMMIT;
```

**Why a single transaction?**
- **Atomicity.** Either all records for this exchange are stored, or none are. A partial write (message stored but emotion not stored) creates inconsistent state that could cause incorrect retrieval on the next message.
- **Performance.** SQLite's write performance is bottlenecked by `fsync`. Wrapping multiple writes in a single transaction means one `fsync` instead of six.
- **Simplicity.** One try/catch, one rollback path. If anything fails, the transaction is rolled back and the Logger records the failure. Clara's response was already delivered — the user is unaffected.

### 3.3 Async Write Design

The writes in Step 9 are **asynchronous** — they are kicked off after the HTTP response is sent to the client. This means:

```
Orchestrator.processMessage():
  ...pipeline steps...
  
  const response = this._buildResponse(...);
  
  // Return immediately — user gets response NOW
  // Writes happen in background
  setImmediate(() => {
    memoryManager.persistExchange(sessionId, {
      userMessage, claraReply, emotionResult, intentResult, narrativeResult
    });
  });
  
  return response;
```

**Failure handling:** If the async write fails (SQLite locked, disk full, corruption), the Logger records the failure with full context. The interaction is not lost — the Logger maintains its own append-only log file as a secondary record. On the next startup, a recovery process can replay logged-but-not-persisted exchanges.

---

## 4. Repeated Question Detection Strategy

### 4.1 Current Mechanism (Preserved)

The existing `_fingerprint()` and `_similarity()` methods in `memoryManager.js` are effective and production-tested. The strategy does **not** replace them — it persists their outputs and adds a classification layer.

**Existing algorithm (unchanged):**
1. Normalize the message: lowercase, remove punctuation
2. Remove stopwords (preposition, articles, common verbs)
3. Sort remaining content words alphabetically
4. Join into a single string → this is the fingerprint
5. Compare fingerprints using Jaccard similarity (intersection / union of word sets)
6. Threshold: similarity > 0.6 → classified as repetition

**Example:**
```
"Where am I?"          → fingerprint: ""     (all words are stopwords)
                       → falls back to: question_type = "location" (keyword match)

"What is this place?"  → fingerprint: "place" 
"I don't know where I am" → fingerprint: ""  → question_type = "location"
```

**Important edge case:** Very short messages (1–3 words) often produce empty fingerprints after stopword removal. For these, the system falls through to **question type classification** instead of fingerprint similarity.

### 4.2 Question Type Classification (New)

A lightweight classification layer that groups messages by semantic intent, independent of phrasing. This runs **alongside** fingerprint comparison, not instead of it.

```
QUESTION TYPE CLASSIFICATION RULES:

  LOCATION:
    Keyword patterns: "where am i", "what is this place", "where is this",
                      "don't recognize", "what place", "lost"
    → question_type = "location"

  IDENTITY:
    Keyword patterns: "who am i", "who are you", "what's my name",
                      "are you my", "don't know who"
    → question_type = "identity"

  TIME:
    Keyword patterns: "what day", "what time", "what year", 
                      "when is", "how long", "what month"
    → question_type = "time"

  ACTIVITY:
    Keyword patterns: "what do i do", "what should i do", 
                      "what's happening", "what happens now"
    → question_type = "activity"

  PERSON:
    Keyword patterns: "where is [name]", "have you seen [name]",
                      "when is [name] coming", "i miss [name]"
    → question_type = "person"

  GENERAL:
    All other messages that don't match a specific type.
    → question_type = "general"
```

### 4.3 Two-Tier Repetition Detection

The system now detects repetition at two levels:

**Tier 1 — Within-Session Repetition (existing, now persistent)**

```
READ: repetition_tracking WHERE session_id = ? AND timestamp > (session_start)

For each stored fingerprint:
  IF Jaccard_similarity(stored, current) > 0.6:
    → isRepeat = true
    → repeatCount = number of matches

ALSO CHECK question_type:
  IF current question_type matches any stored question_type in this session:
    → isRepeat = true (even if fingerprints differ)
    → repeatCount = count of same question_type entries
```

**Tier 2 — Cross-Session Repetition (new, for users with user_id)**

```
READ: repetition_tracking WHERE user_id = ? 
      AND timestamp > (NOW - 7 days)
      AND question_type = current_question_type

crossSessionRepeatCount = count of matches
```

Cross-session repetition is **not** exposed to the LLM or used to modify Clara's response tone. It has two purposes:
- **Caregiver analytics:** "This user asks 'Where am I?' an average of 8 times per session, across 5 sessions this week."
- **Narrative selection optimization:** If a user asks the same question type across many sessions, the Narrative Retriever can prioritize fresh narratives from the `memory_loop` pool that haven't been used in recent sessions.

### 4.4 Repetition Response Strategy

```
repeatCount = 0:
  → No special handling. Standard pipeline.

repeatCount = 1–2:
  → Repetition directive injected into LLM prompt.
  → Narrative seed rotated (if available).
  → Clara responds in full warmth, standard length.

repeatCount = 3–4:
  → Narrative seed from memory_loop pool, prioritizing short length.
  → Clara maintains full warmth but responses trend shorter.
  → Context Assembler adds: "Keep your response especially brief and warm."

repeatCount = 5+:
  → Narrative seed is the primary response source.
  → LLM generation still occurs but with tighter token limit (maxTokens reduced to 80).
  → If the same calming response is working, consistency is prioritized over novelty.
  → Flag sent to Logger for caregiver dashboard: "chronic_repetition_pattern"
```

### 4.5 What This Strategy Avoids

| ❌ Harmful Pattern | How It's Prevented |
|-------------------|-------------------|
| "You already asked me that" | No repetition count or history is ever exposed in the LLM prompt. The LLM only sees "respond as if first time." |
| Identical verbatim responses | Narrative seed rotation ensures different reference texts. |
| Increasingly frustrated/short tone | No "sigh" markers, no shortened warmth. Token limit decreases but warmth directive increases. |
| Cross-session "we talked about this yesterday" | Cross-session repetition data is never injected into the LLM context. It exists only for analytics and narrative selection. |

---

## 5. Memory Retrieval Rules

### 5.1 Conversation Window

**How many previous messages Clara considers for context:**

| Scenario | Window Size | Rationale |
|----------|-------------|-----------|
| Normal conversation | Last 12 messages (6 exchanges) | Enough for conversational coherence without overwhelming the LLM's context window |
| High repetition (repeatCount ≥ 4) | Last 6 messages (3 exchanges) | Reduce window when conversation is circular — more history just adds noise |
| First 3 messages of a session | All messages so far | Don't truncate a conversation that just started |
| Escalation in recent history | Last 16 messages (8 exchanges) | Wider window to ensure the LLM has full context on what triggered the distress pattern |

**Implementation:**
```
getConversationWindow(sessionId, emotionResult, memoryResult):
  
  IF session.messageCount <= 6:
    windowSize = session.messageCount
  ELSE IF memoryResult.repeatCount >= 4:
    windowSize = 6
  ELSE IF emotionResult.distressScore > 0.7:
    windowSize = 16
  ELSE:
    windowSize = 12

  READ: chat_messages 
        WHERE session_id = ?
        ORDER BY sequence_number DESC
        LIMIT windowSize

  RETURN messages in chronological order (reverse the DESC result)
```

### 5.2 Emotion History Window

The Context Assembler uses recent emotion history to inform tone. The retrieval window for emotions is different from the message window:

| Purpose | Window | Source |
|---------|--------|--------|
| Within-session trajectory | Last 10 emotion records | `detected_emotions WHERE session_id = ? ORDER BY timestamp DESC LIMIT 10` |
| Cross-session baseline (future) | Last 50 emotion records across sessions | `detected_emotions WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50` |

**The cross-session baseline is not injected into the LLM prompt.** It is used internally by the Emotion Analyzer to calibrate the `trajectory` field. For example: if a user is typically anxious (cross-session baseline), a single "anxious" message in a new session is `trajectory: stable`, not `trajectory: escalating`.

### 5.3 Retrieval Cost Management

SQLite can handle the read volumes described here without performance issues for a single-server deployment. However, the system is designed to avoid unnecessary reads:

| Optimization | How |
|-------------|-----|
| **Indexed queries only** | Every read path uses a defined index. No full table scans. |
| **Eager loading at session start** | When a session is resumed, load the conversation window, emotion history, and repetition fingerprints in a single batch query. Cache in-memory for the session duration. |
| **Write-behind caching** | The Memory Manager maintains an in-memory cache of the current session's data. Reads always hit the cache first. The cache is populated from SQLite on session resume and updated on each exchange. SQLite writes are async (Step 9). |
| **No cross-session reads on hot path** | Cross-session queries (emotional baseline, narrative usage history) are **not** performed on every message. They are computed once at session start and cached. |

### 5.4 Long History Summarization (Future-Ready)

For users with hundreds of sessions and thousands of messages, raw message retrieval becomes insufficient. The system is designed for a future **summarization layer**:

```
FUTURE: SESSION SUMMARIZER

  Trigger: session.status transitions to 'closed'
  
  Input: all chat_messages for that session
  
  Output: a natural-language summary stored in sessions.session_summary
    Format: {
      "summary": "User was initially anxious about their location. Clara 
                  provided grounding and a calming story. User calmed down 
                  over 14 messages. No escalation.",
      "key_topics": ["location_confusion", "calming_story_request"],
      "emotional_arc": "anxious → calm",
      "notable_anchors": ["garden", "cat"]
    }

  Usage: On session resume (new session for the same user), the Context 
         Assembler can include the last 3 session summaries instead of 
         raw message history — providing cross-session context without 
         token-expensive raw message injection.
```

This summarization can be performed by the LLM itself (using a dedicated, low-temperature summarization call) or by a lightweight extractive algorithm. The design supports either approach without schema changes — the `session_summary` column is a JSON blob.

---

## 6. Dementia-Safe Constraints

This section codifies the **unbreakable rules** that the memory storage layer enforces. These are not soft guidelines — they are hard constraints built into the retrieval and injection logic.

### 6.1 Constraint: Clara Never Reveals Repetition Awareness

**The rule:** No data from `repetition_tracking` — including repeat counts, fingerprint matches, or question type frequencies — is ever included in the LLM prompt in a way that could surface as "you already asked that" language.

**How it's enforced:**

```
WHAT THE LLM SEES (via Context Assembler):

  IF repetition detected:
    System prompt directive:
    "The user may ask questions that feel familiar. Always respond
     as if you are hearing the question for the very first time.
     Never reference prior conversations or prior questions.
     Be warm, patient, and fully present."

  The LLM does NOT see:
    ❌ repeatCount
    ❌ "the user asked this 4 times"
    ❌ previous responses to the same question
    ❌ any reference to the repetition_tracking table's contents
```

**Why this is architecturally enforced, not just prompt-engineered:**

Prompt engineering can fail. An LLM, despite instructions, may infer repetition from the conversation window (the same question appears multiple times in the message history). The storage layer mitigates this:

- **Conversation window deduplication:** When `repeatCount ≥ 3`, the conversation window retriever **removes duplicate user messages**, keeping only the most recent instance of each repeated question. The LLM sees a conversation that appears to have a natural flow, not a loop.
- **Response variation injection:** The window replaces duplicate Clara responses with the most recent variation, ensuring the LLM doesn't see identical assistant responses that would hint at repetition.

### 6.2 Constraint: Warmth Amplification Under Repetition

**The rule:** As repetition increases, Clara becomes **more** warm and patient, not less. The system actively counteracts any tendency toward terseness.

**How it's enforced:**

```
WARMTH SCALING:

  repeatCount 0:   warmthDirective = standard persona warmth
  repeatCount 1-2: warmthDirective += "Be especially gentle and patient."
  repeatCount 3-4: warmthDirective += "Use your warmest, most comforting tone.
                                       Imagine holding someone's hand."
  repeatCount 5+:  warmthDirective += "You are a source of infinite patience
                                       and kindness. Every moment with this
                                       person is precious. Let them feel it."
```

This is injected into the system prompt, not shown to the user. The emotional weight of the directive increases with repetition, guiding the LLM toward greater tenderness — the opposite of the natural human tendency toward impatience.

### 6.3 Constraint: Emotional Continuity

**The rule:** Clara's emotional tone must flow naturally across messages. She cannot be warm in one message and clinical in the next. She cannot be calm and then suddenly urgent without cause.

**How it's enforced:**

The Context Assembler includes the **last 3 emotion records** as a trajectory signal:

```
EMOTIONAL CONTINUITY DIRECTIVE:

  "The user's recent emotional states were:
   - 2 messages ago: anxious (distress: 0.6)
   - 1 message ago: anxious (distress: 0.5)
   - Current: confused (distress: 0.5)
   Trajectory: stable.
   
   Maintain emotional consistency. Your tone should gently match
   the user's emotional trajectory. Do not introduce sudden shifts
   in warmth, energy, or urgency."
```

The emotion values come from `detected_emotions`, not from re-analyzing old messages. This ensures consistency even if the Emotion Analyzer's model is updated mid-session.

### 6.4 Constraint: No Contradiction in Responses

**The rule:** Clara must never contradict something she said earlier in the session. If she told a story about a garden, she cannot later say "I don't know any stories about gardens."

**How it's enforced:**

- **Conversation window inclusion:** Clara always sees her own recent responses in the LLM context window. This provides implicit consistency — the LLM is less likely to contradict text it can see.
- **Narrative ID tracking:** If Clara used a narrative with theme tags `["garden", "sunlight"]`, these tags are available to the Context Assembler (via `narrativeResult` cached from previous exchanges). The assembler can inject: "In this conversation, you've already shared a story about a garden. You may reference this warmly if the user brings it up."
- **Anchor persistence:** Entities extracted from Clara's own responses (not just user messages) are stored as anchors. If Clara mentioned "a little cat" in a story, "cat" becomes an anchor available for natural callbacks.

### 6.5 Constraint: No Memory Weaponization

**The rule:** The memory system must never be used to confront, correct, test, or evaluate the user's memory.

**How it's enforced:**

This is a **design-level constraint**, not just a runtime rule. The memory system has no API endpoint, no configuration option, and no prompt pathway that would allow:
- Quizzing ("Do you remember what we talked about earlier?")
- Correcting ("Actually, you said your daughter's name was Sarah, not Susan")
- Testing ("Let's see if you remember this story")
- Comparing ("Last time you were much calmer")

These behaviors are not merely forbidden in the prompt — they are **architecturally impossible** because:
1. The LLM never receives cross-session memory about what the user said before.
2. The LLM never receives comparison data between sessions.
3. The repetition tracking data is used only for narrative selection and caregiver analytics — it is never serialized into the LLM prompt as "the user said X before."
4. The user's own previous messages, when included in the conversation window, are presented as natural conversation flow — never annotated with timestamps, repetition tags, or "this was repeated."

### 6.6 Summary of Hard Constraints

| # | Constraint | Enforcement Layer |
|---|-----------|-------------------|
| 1 | Never reveal repetition awareness | Context Assembler: no repeat data in prompt. Window deduplication. |
| 2 | Warmth amplifies with repetition | Context Assembler: escalating warmth directives. |
| 3 | Emotional continuity across messages | Emotion history injection with trajectory. |
| 4 | No self-contradiction | Conversation window + narrative tag persistence. |
| 5 | No memory weaponization | Architectural: no API or prompt path exists for memory confrontation. |
| 6 | No cross-session memory in LLM prompt | Context Assembler: only within-session data enters the prompt. Cross-session data is analytics-only. |

---

## 7. Future Extensions

### 7.1 PostgreSQL Migration

**When:** When Clara is deployed for multiple care facilities with concurrent users, or when SQLite's single-writer limitation becomes a bottleneck.

**What changes:**
- SQLite file replaced by a PostgreSQL connection (via a connection pool library)
- `TEXT` UUID columns become native `UUID` type
- `caregiver_context` and `session_summary` JSON blobs use PostgreSQL's `JSONB` type, enabling in-database JSON queries
- Connection pooling (e.g., 10–20 connections) replaces serial access
- Read replicas can be introduced for the caregiver dashboard without affecting Clara's write performance

**What does NOT change:**
- The Memory Manager's public interface: `query()`, `update()`, `createSession()`, `getSession()`
- The Orchestrator, Context Assembler, and all other components — they are unaware of the storage backend
- The schema design — all tables and columns transfer directly

**Migration approach:**
- Phase 1: Run SQLite and PostgreSQL in parallel (dual-write, read from PostgreSQL)
- Phase 2: Validate consistency between the two stores
- Phase 3: Cut over to PostgreSQL as primary, decommission SQLite

### 7.2 Vector Similarity Search

**When:** When the `repetition_tracking` table grows to thousands of entries per user and Jaccard similarity on sorted word sets becomes insufficient for nuanced semantic matching.

**What it enables:**
- **Semantic repetition detection.** "I'm scared and I don't know what's happening" and "Everything is confusing and frightening" have different words but the same meaning. Vector similarity would catch this; keyword fingerprinting may miss it.
- **Emotional context matching.** Instead of matching narratives by metadata (`target_emotion: anxiety`), match by the semantic distance between the user's message embedding and the narrative's text embedding. A message about "missing my garden" would match a garden narrative even if the user's classified emotion is `sad` (not `anxious`).

**Implementation approach (when ready):**
- Add a `pgvector` extension to PostgreSQL (Phase 7.1 must complete first)
- Generate embeddings for all narrative texts using a sentence embedding model (e.g., `all-MiniLM-L6-v2`, 384-dimensional vectors)
- Store embeddings in a new column: `narratives.text_embedding VECTOR(384)`
- Generate per-message embeddings at write time: `repetition_tracking.message_embedding VECTOR(384)`
- The Narrative Retriever adds a vector similarity score to its ranking:
  ```
  totalScore = metadataScore × 0.5 + vectorSimilarityScore × 0.5
  ```

**What does NOT change:**
- The Narrative Retriever's public interface
- The retrieval trigger logic (still based on intent + emotion + repetition state)
- The fallback behavior

### 7.3 Long-Term Emotional Trend Analysis

**When:** When Clara has 30+ sessions of data for a single user and caregivers want insights beyond per-session summaries.

**What it enables:**
- **Baseline computation:** "This user's average distress score is 0.4. Today's score of 0.7 is significantly elevated."
- **Time-of-day patterns:** "This user is typically calmer in mornings (average distress 0.3) and more anxious in evenings (average distress 0.6)."
- **Trajectory over weeks/months:** "The user's weekly average distress has decreased from 0.6 to 0.4 over the past month."
- **Narrative effectiveness scoring:** "Calming stories reduce this user's distress score by an average of 0.15 points in the next message. Grounding narratives reduce it by 0.22 points."

**Data source:** The `detected_emotions` table already has all the required data — `user_id`, `emotion`, `distress_score`, `trajectory`, `timestamp`. No schema change is needed.

**Implementation approach:**
- A scheduled background job (daily or on-demand) computes aggregate metrics per user:
  ```
  emotional_trends = {
    baseline_distress: AVG(distress_score) over last 30 sessions,
    morning_avg: AVG(distress_score) WHERE hour(timestamp) BETWEEN 6 AND 12,
    evening_avg: AVG(distress_score) WHERE hour(timestamp) BETWEEN 18 AND 23,
    weekly_trend: [week1_avg, week2_avg, week3_avg, week4_avg],
    top_question_types: GROUP BY question_type ORDER BY COUNT DESC LIMIT 5,
    effective_narrative_categories: (category, avg_distress_delta) sorted by delta
  }
  ```
- These aggregates are stored in a new `user_trends` table or as a JSON blob in `users.emotional_trends`
- The caregiver dashboard queries these aggregates — never the raw emotion table
- Clara's runtime pipeline does **not** consume trend data in the current design. Future consideration: the Emotion Analyzer could use the baseline to calibrate trajectory detection.

### 7.4 Extension Readiness Summary

| Extension | Schema Change Needed | Interface Change | Data Already Being Collected |
|-----------|---------------------|-------------------|------------------------------|
| PostgreSQL | Type promotions only | None | N/A (infrastructure swap) |
| Vector search | New `embedding` columns | None (internal to Retriever) | Fingerprints → embeddings |
| Emotional trends | Optional `user_trends` table | None (analytics-only) | ✅ `detected_emotions` has everything |
| Session summarization | Already designed: `sessions.session_summary` | None | ✅ `chat_messages` has full history |
| Narrative effectiveness | Join `narrative_usage` + `detected_emotions` | None | ✅ Both tables link via `session_id` + `timestamp` |

---

## Appendix: File Structure After Implementation

```
Clara/
├── data/
│   └── clara.db                            ◄── NEW — SQLite database file
├── src/
│   ├── data/
│   │   └── narrativeLibrary.json                (unchanged)
│   ├── db/
│   │   ├── connection.js                   ◄── NEW — SQLite connection manager
│   │   ├── migrations/
│   │   │   └── 001_initial_schema.js       ◄── NEW — Schema creation migration
│   │   └── queries/
│   │       ├── messageQueries.js           ◄── NEW — Prepared statements for chat_messages
│   │       ├── emotionQueries.js           ◄── NEW — Prepared statements for detected_emotions
│   │       ├── repetitionQueries.js        ◄── NEW — Prepared statements for repetition_tracking
│   │       ├── narrativeUsageQueries.js    ◄── NEW — Prepared statements for narrative_usage
│   │       ├── sessionQueries.js           ◄── NEW — Prepared statements for sessions
│   │       └── userQueries.js              ◄── NEW — Prepared statements for users
│   ├── memoryManager.js                         (MODIFIED — SQLite backend replaces Map())
│   ├── narrativeRetriever.js                    (MODIFIED — reads narrative_usage from DB)
│   ├── contextAssembler.js                      (MODIFIED — window deduplication logic)
│   ├── orchestrator.js                          (MODIFIED — async write call)
│   ├── emotionAnalyzer.js                       (unchanged)
│   ├── intentDetector.js                        (unchanged)
│   ├── completenessValidator.js                 (unchanged)
│   ├── llmClient.js                             (unchanged)
│   ├── responsePacer.js                         (unchanged)
│   ├── safeResponseBank.js                      (unchanged)
│   ├── safetyGuard.js                           (unchanged)
│   └── logger.js                                (MODIFIED — writes failure recovery log)
├── docs/
│   ├── BRAIN_ARCHITECTURE.md                    (reference)
│   ├── RESPONSE_INTENT_LAYER.md                 (reference)
│   ├── NARRATIVE_MEMORY_LAYER.md                (reference)
│   └── USER_MEMORY_STORAGE.md              ◄── THIS DOCUMENT
```

---

*End of User Memory Storage Layer Design Document*
*Next steps: Implementation of `src/db/connection.js`, `001_initial_schema.js` migration, and refactoring `memoryManager.js` to use SQLite as its storage backend while preserving the existing public interface.*
