# Clara — Backend Brain Architecture
### Internal Engineering Design Document
### Version 1.0 · February 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [API Endpoint Design](#2-api-endpoint-design)
3. [Single Chat Request Flow](#3-single-chat-request-flow)
4. [Clara Orchestrator Role](#4-clara-orchestrator-role)
5. [Separation of Concerns](#5-separation-of-concerns)
6. [Future Memory Integration](#6-future-memory-integration)
7. [Response Pacing Strategy](#7-response-pacing-strategy)
8. [Appendix: Design Principles](#8-appendix-design-principles)

---

## 1. System Overview

Clara's backend brain is a **multi-layered processing pipeline** that transforms raw user text into emotionally appropriate, dementia-safe responses. It is not a simple LLM proxy — it is an orchestration system that coordinates emotion analysis, safety validation, memory-aware context building, and humanized response delivery.

### High-Level Architecture

```
┌──────────────┐
│   Chat UI    │  (already exists)
│  (Frontend)  │
└──────┬───────┘
       │  HTTP / WebSocket
       ▼
┌──────────────────────────────────────────────────────┐
│                   API GATEWAY                        │
│          Rate Limiting · Auth · Logging              │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│              CLARA ORCHESTRATOR                      │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │  Emotion     │  │  Memory     │  │  Safety      │ │
│  │  Analyzer    │  │  Manager    │  │  Guard       │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘ │
│         │                │                │          │
│         ▼                ▼                ▼          │
│  ┌───────────────────────────────────────────────┐   │
│  │          RESPONSE COMPOSER                    │   │
│  │     (Prompt Builder → LLM → Post-Process)    │   │
│  └──────────────────────┬────────────────────────┘   │
│                         │                            │
│  ┌──────────────────────▼────────────────────────┐   │
│  │          RESPONSE PACER                       │   │
│  │     (Humanized Delay · Chunking · Delivery)   │   │
│  └───────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

---

## 2. API Endpoint Design

### 2.1 `POST /api/v1/chat`

**Purpose:** Primary endpoint. Accepts a user message, processes it through Clara's brain pipeline, and returns Clara's response.

**Request:**
```json
{
  "sessionId": "string (UUID)",
  "message": "string (user's text, max 500 chars)",
  "timestamp": "ISO 8601 string",
  "metadata": {
    "inputMethod": "typed | pasted",
    "locale": "en-US"
  }
}
```

**Response:**
```json
{
  "sessionId": "string",
  "reply": "string (Clara's response text)",
  "emotion": {
    "detected": "anxious | confused | fearful | lonely | sad | neutral | calm",
    "confidence": 0.0-1.0
  },
  "pacing": {
    "delayMs": 2400,
    "chunks": [
      { "text": "You are safe, dear.", "delayMs": 0 },
      { "text": "I am right here with you. 💛", "delayMs": 1200 }
    ]
  },
  "meta": {
    "responseId": "string (UUID)",
    "processingTimeMs": 850
  }
}
```

**Notes:**
- The `pacing` object allows the frontend to simulate human-like delivery by revealing chunks with delays.
- The `emotion` field is returned for frontend UI adaptation (e.g., softer colors when distress is detected), but is never shown to the user.

---

### 2.2 `POST /api/v1/session`

**Purpose:** Creates or resumes a session. A session represents a single continuous interaction window.

**Request:**
```json
{
  "userId": "string (optional, for returning users)",
  "caregiverContext": {
    "userName": "string (patient's preferred name, optional)",
    "knownTopics": ["garden", "daughter Sarah", "dog Max"],
    "avoidTopics": ["hospital", "driving"]
  }
}
```

**Response:**
```json
{
  "sessionId": "string (UUID)",
  "greeting": "Hello, dear. I'm Clara. I'm so happy to see you today. 💛",
  "createdAt": "ISO 8601"
}
```

**Notes:**
- `caregiverContext` is provided by a caregiver or care team, never by the patient directly.
- `knownTopics` and `avoidTopics` directly influence prompt composition later.
- If no `userId` is provided, an anonymous session is created.

---

### 2.3 `GET /api/v1/session/:sessionId`

**Purpose:** Retrieves session state — useful for reconnection or frontend hydration after page refresh.

**Response:**
```json
{
  "sessionId": "string",
  "status": "active | expired | closed",
  "emotionHistory": [
    { "timestamp": "...", "emotion": "anxious", "confidence": 0.82 }
  ],
  "messageCount": 12,
  "createdAt": "ISO 8601",
  "lastActivityAt": "ISO 8601"
}
```

---

### 2.4 `POST /api/v1/session/:sessionId/end`

**Purpose:** Gracefully closes a session. Triggers Clara to deliver a warm, comforting farewell.

**Request:**
```json
{
  "reason": "user_initiated | caregiver_initiated | timeout"
}
```

**Response:**
```json
{
  "farewell": "It was so lovely talking with you. You are wonderful. Take care, dear. 💛",
  "sessionSummary": {
    "duration": "00:14:32",
    "messageCount": 12,
    "dominantEmotion": "calm",
    "escalationTriggered": false
  }
}
```

---

### 2.5 `GET /api/v1/health`

**Purpose:** System health check for monitoring, load balancers, and uptime dashboards.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": "4d 12h 03m",
  "components": {
    "llm": "connected",
    "memory": "connected",
    "emotionEngine": "operational"
  }
}
```

---

### 2.6 `POST /api/v1/escalate`

**Purpose:** Triggered internally or by the safety guard when Clara detects that a user may need human intervention (e.g., mentions self-harm, extreme distress beyond Clara's scope).

**Request:**
```json
{
  "sessionId": "string",
  "reason": "distress_threshold | safety_keyword | caregiver_requested",
  "severity": "low | medium | high | critical",
  "context": "last 3 messages truncated"
}
```

**Response:**
```json
{
  "escalationId": "string (UUID)",
  "acknowledged": true,
  "notifiedParties": ["caregiver_email", "care_team_dashboard"]
}
```

---

## 3. Single Chat Request Flow

When a user sends a message, it passes through the following pipeline:

```
User Message
     │
     ▼
┌─────────────────────┐
│  1. INPUT RECEIVE    │  Validate, sanitize, log timestamp
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  2. EMOTION ANALYSIS │  Classify emotional state from text
│                      │  Output: { emotion, confidence }
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  3. MEMORY LOOKUP    │  Check session history for:
│                      │  - Repeated questions
│                      │  - Previously mentioned names/topics
│                      │  - Emotional trajectory
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  4. SAFETY GUARD     │  Scan for:
│     (PRE-RESPONSE)   │  - Crisis language
│                      │  - Medical requests
│                      │  - Manipulation attempts
│                      │  Output: SAFE / ESCALATE / REDIRECT
└────────┬────────────┘
         │
    ┌────┴─────┐
    │          │
  SAFE     ESCALATE ──► Trigger /escalate endpoint
    │                    + Return safe fallback response
    ▼
┌─────────────────────┐
│  5. CONTEXT ASSEMBLY │  Build the LLM prompt:
│                      │  - System persona (Clara)
│                      │  - Emotion-adjusted tone directive
│                      │  - Relevant memory fragments
│                      │  - Caregiver-provided context
│                      │  - Repetition-aware instructions
│                      │  - Recent conversation window
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  6. LLM GENERATION   │  Send assembled prompt to LLM
│                      │  Receive raw response text
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  7. SAFETY GUARD     │  Validate LLM output:
│     (POST-RESPONSE)  │  - No medical advice leaked
│                      │  - No future promises
│                      │  - No complex/new info
│                      │  - No repetition callouts
│                      │  - Tone is warm, not clinical
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  8. RESPONSE PACING  │  Calculate humanized delay
│                      │  Split into chunks if needed
│                      │  Attach pacing metadata
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  9. RESPONSE DELIVER │  Return JSON to frontend
│                      │  Log interaction for analytics
│                      │  Update session state
└─────────────────────┘
```

### Step-by-Step Detail

#### Step 1 — Input Receive
- Validate `sessionId` exists and is active.
- Sanitize message (strip HTML, limit length to 500 chars).
- Log raw input with timestamp for audit trail.
- If session is expired, return a gentle re-greeting instead of an error.

#### Step 2 — Emotion Analysis
- Run the user's message through the **Emotion Analyzer** component.
- Classification categories: `anxious`, `confused`, `fearful`, `lonely`, `sad`, `neutral`, `calm`.
- Also compute a **distress score** (0.0–1.0) that aggregates across recent messages, not just the current one.
- The distress score considers **emotional trajectory** — is the user getting more anxious over time, or calming down?

#### Step 3 — Memory Lookup
- Query session history for:
  - **Repetition detection:** Has the user asked this same question (or semantically similar) before? If yes, flag it — but the instruction to Clara is to respond as if it's the first time.
  - **Named entities:** Has the user mentioned names, places, or objects? These become "anchor points" Clara can reference to provide continuity.
  - **Emotional trajectory:** Array of recent emotion classifications to detect patterns.
- This step is **read-only** for now. Write operations happen after response delivery (Step 9).

#### Step 4 — Safety Guard (Pre-Response)
- Scan the user's message for:
  - **Crisis keywords** (self-harm, extreme distress markers) → Trigger escalation.
  - **Medical requests** ("What medicine should I take?") → Prepare a gentle redirect response.
  - **Identity confusion** ("Are you my daughter?") → Flag for Clara to gently clarify without causing distress.
  - **Adversarial or manipulation attempts** → Default to safe, warm fallback.
- Output: `SAFE` (continue pipeline), `ESCALATE` (alert caregiver + safe response), or `REDIRECT` (skip LLM, use pre-approved safe response).

#### Step 5 — Context Assembly
- This is the **prompt engineering** layer. It assembles a complete prompt for the LLM:
  - **Base persona** — Clara's core identity and behavioral rules (loaded from a versioned config, never hardcoded).
  - **Emotion directive** — Dynamically adjusted: "The user appears anxious. Use an especially soft and reassuring tone. Speak slowly."
  - **Memory fragments** — Relevant context from session: "The user mentioned their dog Max earlier. The user has asked where they are 3 times."
  - **Caregiver context** — "The patient prefers to be called 'Nana'. Avoid mentioning hospitals."
  - **Repetition instruction** — "The user has asked this question before. Respond as if it is the first time. Use familiar, comforting phrasing."
  - **Conversation window** — Last N messages (sliding window, typically 10–15 messages).

#### Step 6 — LLM Generation
- Send the assembled prompt to the LLM provider.
- Parameters: temperature 0.7, max tokens 200 (keep responses short and gentle), top_p 0.9.
- Timeout: 10 seconds. If LLM fails, return a pre-approved fallback: *"I am right here with you. Everything is okay."*

#### Step 7 — Safety Guard (Post-Response)
- Validate the LLM's output against rules:
  - ❌ Contains medical advice → Strip and replace.
  - ❌ References future events not in caregiver context → Remove.
  - ❌ Uses complex vocabulary or jargon → Simplify or reject.
  - ❌ Points out repetition ("You already asked that") → Reject and regenerate.
  - ❌ Tone is clinical, cold, or robotic → Reject and regenerate.
  - ✅ Warm, short, simple, reassuring → Pass through.
- Maximum 2 regeneration attempts. After that, use fallback.

#### Step 8 — Response Pacing
- Calculate a **humanized delay** based on response length and detected emotion.
- See [Section 7](#7-response-pacing-strategy) for full strategy.

#### Step 9 — Response Delivery
- Return the response JSON to the frontend.
- Asynchronously:
  - Log the full interaction (input, emotion, output, timing).
  - Update session state (message count, emotion history).
  - Update memory store (new entities, repetition counters).

---

## 4. Clara Orchestrator Role

The **Clara Orchestrator** is the central coordination layer. It is the conductor of the pipeline — it does not play any instrument itself.

### What it coordinates:
- Receives the incoming request from the API gateway.
- Invokes each pipeline component in sequence (Emotion → Memory → Safety → Context → LLM → Safety → Pacing).
- Handles branching logic (e.g., if the Safety Guard returns `ESCALATE`, the Orchestrator skips LLM generation and returns a safe fallback).
- Manages timeouts and fallbacks at every step.
- Aggregates the outputs of all components into the final response shape.
- Triggers async post-processing (logging, memory updates).

### What it must NOT be responsible for:
- ❌ **Emotion classification logic** — Delegated to the Emotion Analyzer.
- ❌ **Memory querying or storage** — Delegated to the Memory Manager.
- ❌ **Prompt construction** — Delegated to the Context Assembler (a sub-component of Response Composer).
- ❌ **LLM communication** — Delegated to the LLM Client wrapper.
- ❌ **Safety rule definitions** — Delegated to the Safety Guard (rules are config-driven).
- ❌ **Response timing calculations** — Delegated to the Response Pacer.
- ❌ **Logging implementation** — Delegated to the Logging Service.

### Orchestrator contract (pseudo-interface):

```
ClaraOrchestrator:
  input:  UserMessage, SessionId
  output: ClaraResponse

  steps:
    emotionResult   ← EmotionAnalyzer.analyze(message, sessionHistory)
    memoryResult    ← MemoryManager.query(sessionId, message)
    safetyPreResult ← SafetyGuard.validateInput(message, emotionResult)

    IF safetyPreResult == ESCALATE:
      trigger escalation
      RETURN fallbackResponse

    context         ← ContextAssembler.build(message, emotionResult, memoryResult, caregiverContext)
    rawResponse     ← LLMClient.generate(context)
    safetyPostResult← SafetyGuard.validateOutput(rawResponse)

    IF safetyPostResult == REJECTED:
      rawResponse   ← retry or fallback

    pacedResponse   ← ResponsePacer.pace(rawResponse, emotionResult)
    RETURN pacedResponse

    ASYNC: Logger.log(...), MemoryManager.update(...)
```

---

## 5. Separation of Concerns

### 5.1 Emotion Analyzer

**Responsibility:** Determine the user's emotional state from their text input.

| Aspect | Detail |
|--------|--------|
| **Input** | Current message text + recent message history (last 5) |
| **Output** | `{ emotion: string, confidence: float, distressScore: float, trajectory: string }` |
| **Trajectory values** | `escalating`, `stable`, `de-escalating` |
| **Implementation approach** | Lightweight classifier (can be a small fine-tuned model, keyword heuristics, or an LLM-based classification call) |
| **Must NOT do** | Generate responses, access memory, or make safety decisions |

**Key design decisions:**
- The Emotion Analyzer considers **trajectory**, not just point-in-time emotion. A user who says "I'm fine" after 4 anxious messages is still flagged as `trajectory: de-escalating` with a moderate distress score.
- The distress score is a **rolling weighted average**, giving more weight to recent messages.
- It classifies into broad, actionable categories — not fine-grained sentiment. Clara doesn't need to know the difference between "irritated" and "frustrated" — both map to a comfort response.

---

### 5.2 Memory Manager

**Responsibility:** Provide conversational context and detect patterns across the session.

| Aspect | Detail |
|--------|--------|
| **Input** | Session ID, current message |
| **Output** | `{ isRepeat: bool, repeatCount: int, mentionedEntities: [...], emotionHistory: [...], anchors: [...] }` |
| **Anchors** | Familiar names, places, or objects the user has mentioned that Clara can reference to provide continuity |
| **Must NOT do** | Classify emotions, generate responses, or enforce safety rules |

**Key design decisions:**
- **Repetition detection** uses semantic similarity, not exact string matching. "Where am I?" and "What is this place?" are treated as the same question.
- **Anchors** are entities extracted from conversation that have positive or neutral emotional valence. If a user mentions "my dog Max" fondly, "Max" becomes an anchor Clara can use: *"Max sounds like a wonderful companion."*
- The Memory Manager has **read** and **write** interfaces. Reads happen during the pipeline. Writes happen asynchronously after response delivery.
- Currently in-memory (per session). Future: persistent storage. See [Section 6](#6-future-memory-integration).

---

### 5.3 Response Composer

**Responsibility:** Build the LLM prompt and transform raw LLM output into Clara's voice.

| Sub-component | Responsibility |
|---------------|---------------|
| **Context Assembler** | Constructs the full prompt from persona config, emotion directives, memory fragments, caregiver context, and conversation window |
| **LLM Client** | Sends the prompt to the LLM provider. Handles retries, timeouts, and provider failover |
| **Post-Processor** | Cleans up the LLM output — removes markdown artifacts, ensures emoji consistency, trims excess length |

**Key design decisions:**
- Clara's persona is stored as a **versioned configuration file**, not hardcoded in source. This allows clinical teams to refine her tone without code deployments.
- The Context Assembler uses a **template system** with dynamic slots:
  ```
  [BASE_PERSONA]
  [EMOTION_DIRECTIVE: {emotion}, {distressScore}]
  [MEMORY_CONTEXT: {anchors}, {repeatCount}]
  [CAREGIVER_CONTEXT: {preferredName}, {knownTopics}, {avoidTopics}]
  [CONVERSATION_WINDOW: last {N} messages]
  ```
- Max response length is capped at **200 tokens** (~2-3 short sentences). Dementia care benefits from brevity.
- The LLM Client must support **provider failover**. If the primary LLM is down, switch to a secondary provider automatically. If all providers fail, use a curated fallback bank.

---

### 5.4 Safety Guard

**Responsibility:** Ensure that both user input and Clara's output are safe for a dementia care context.

| Phase | What it checks |
|-------|---------------|
| **Pre-Response (input)** | Crisis language, medical requests, identity confusion, adversarial prompts |
| **Post-Response (output)** | Medical advice, future promises, complex language, repetition callouts, cold tone |

**Key design decisions:**
- Safety rules are defined in a **configuration file**, not in code. Clinical advisors can update rules without engineering involvement.
- The Safety Guard has a **tiered response system**:
  - `SAFE` — Continue normally.
  - `REDIRECT` — Skip LLM, use a pre-approved response from the **Safe Response Bank**.
  - `ESCALATE` — Alert caregiver/care team + use a calming fallback response.
- The **Safe Response Bank** is a curated collection of pre-written, clinically reviewed responses for common difficult situations:
  - "Where is my mother?" → *"She loves you so much, dear. You are so loved."*
  - "I want to go home." → *"I understand, dear. You are safe right here. This is a good place."*
  - Medical questions → *"That's a really good question. Your care team knows all about that. They are looking after you so well."*
- Post-response validation can **reject and request regeneration** up to 2 times. After that, a fallback is used. Clara must never be silent.

---

## 6. Future Memory Integration

Memory is essential to Clara's long-term effectiveness. While this version uses in-memory session history, the architecture is designed with clear integration points for persistent memory.

### Where memory plugs in:

```
┌──────────────────────────────────────────────┐
│            MEMORY MANAGER                    │
│                                              │
│  ┌────────────────┐   ┌───────────────────┐  │
│  │ Session Memory  │   │ Persistent Memory │  │  ◄── FUTURE
│  │ (in-memory,     │   │ (database,        │  │
│  │  current chat)  │   │  cross-session)   │  │
│  └───────┬────────┘   └───────┬───────────┘  │
│          │                    │               │
│          ▼                    ▼               │
│  ┌─────────────────────────────────────────┐  │
│  │         UNIFIED QUERY INTERFACE         │  │
│  │  query(sessionId, message) →            │  │
│  │    { repeats, entities, anchors,        │  │
│  │      emotionHistory, narratives }       │  │
│  └─────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### Future memory layers:

| Layer | Purpose | Example |
|-------|---------|---------|
| **Session Memory** (exists now) | Track current conversation | "User asked 'where am I?' 3 times this session" |
| **User Memory** (future) | Persist facts across sessions | "User's daughter is named Sarah. User had a dog named Max." |
| **Narrative Memory** (future) | Caregiver-provided life stories | "User was a school teacher. Loved gardening. Grew up in Pune." |
| **Emotional Profile** (future) | Long-term emotional baselines | "User is typically calm in mornings, more anxious in evenings." |

### Integration contract:

The Memory Manager's `query()` interface remains the same regardless of which storage layers are active. The Orchestrator and Response Composer do not need to know whether data came from session memory or a persistent database. This is the key architectural boundary — **the Memory Manager is the sole gateway to all memory, present and future.**

### Dementia-safe narrative rules (for future implementation):
- Narratives are **never introduced proactively** by Clara. They are only used when the user's message creates a natural opening.
- Narratives must be reviewed and approved by caregivers.
- Clara references narratives gently: *"You've always loved the garden, haven't you?"* — not: *"According to your profile, you enjoyed gardening as a hobby."*
- Conflicting memories from the user are never corrected. If the user says "I was a pilot" but the narrative says "teacher", Clara follows the user's lead: *"That sounds wonderful. Tell me more about flying."*

---

## 7. Response Pacing Strategy

Instant responses feel robotic and unsettling, especially for users with dementia. Clara must feel **present and thoughtful**, not machine-fast.

### 7.1 Typing Delay

Before Clara's response appears, the frontend shows a "typing" indicator. The backend controls how long this delay lasts.

**Delay formula:**

```
baseDelay       = 1200ms  (minimum thinking time)
emotionDelay    = distressScore × 800ms  (slower when user is distressed)
lengthDelay     = responseLength × 15ms  (simulate reading/typing)
varianceDelay   = random(-200ms, +400ms) (prevent robotic consistency)

totalDelay      = baseDelay + emotionDelay + lengthDelay + varianceDelay
cap             = clamp(totalDelay, 1500ms, 4000ms)
```

**Rationale:**
- When the user is distressed, a slightly longer pause feels like Clara is **truly listening and considering carefully**, not rushing.
- The variance prevents the delay from feeling mechanical.
- The cap ensures Clara never takes too long (which could increase anxiety) or too short (which feels robotic).

### 7.2 Message Chunking

For responses longer than 1 sentence, Clara delivers them in **sequential chunks** with pauses between them, mimicking how a patient, caring person speaks.

**Chunking rules:**
- Split responses at sentence boundaries (`.`, `!`, `?`).
- Maximum 2 chunks per response (more would be overwhelming).
- Inter-chunk delay: 800–1500ms (randomized).
- Each chunk appears with a brief typing indicator before it.

**Example:**

```
User: "I don't know where I am."

Chunk 1 (after 2200ms typing delay):
  "You are safe, dear."

Chunk 2 (after 1100ms typing delay):
  "I am right here with you. Everything is okay. 💛"
```

### 7.3 Pacing Response Format

The backend includes pacing instructions in the API response so the frontend can implement the delays:

```json
{
  "pacing": {
    "initialDelayMs": 2200,
    "chunks": [
      { "text": "You are safe, dear.", "preDelayMs": 0 },
      { "text": "I am right here with you. Everything is okay. 💛", "preDelayMs": 1100 }
    ]
  }
}
```

The frontend reads this and:
1. Shows typing indicator for `initialDelayMs`.
2. Displays chunk 1.
3. Shows typing indicator again for chunk 2's `preDelayMs`.
4. Displays chunk 2.

### 7.4 Anti-Patterns to Avoid

| ❌ Anti-Pattern | Why it's harmful |
|----------------|-----------------|
| Instant responses (<500ms) | Feels robotic, breaks illusion of presence |
| Fixed/constant delays | Feels mechanical after a few messages |
| Very long delays (>5s) | Increases anxiety — "Did Clara leave?" |
| Streaming word-by-word | Too technical, distracting, hard to follow for dementia patients |
| Long multi-paragraph responses | Overwhelming, cognitive overload |

---

## 8. Appendix: Design Principles

These principles guide every architectural decision in Clara's backend:

### 🛡️ 1. Safety First, Always
Every response passes through safety validation. There is no code path where an unvalidated LLM response reaches the user. If all else fails, Clara defaults to a pre-approved, clinically safe reassurance.

### 💛 2. Warmth Over Accuracy
If Clara is unsure, she does not say "I don't know." She says "You are safe. I am here with you." Emotional safety takes absolute priority over informational correctness.

### 🔄 3. Graceful Degradation
If the LLM is down, Clara still responds (from the Safe Response Bank). If the Emotion Analyzer fails, Clara defaults to a gentle, neutral tone. No component failure results in silence or an error message to the user.

### 🧩 4. Loose Coupling
Each component (Emotion, Memory, Safety, LLM, Pacing) is independent and replaceable. The Orchestrator coordinates them but does not contain their logic. Any component can be swapped, upgraded, or scaled independently.

### 📏 5. Brevity as a Feature
Clara's responses are deliberately short (1–3 sentences, max 200 tokens). This is not a limitation — it is a clinical design decision. Short, warm statements are easier to process and more comforting than long explanations.

### 🔇 6. Never Correct, Never Rush
Clara never points out that a question was asked before. Clara never corrects a confused statement. Clara never rushes the conversation. These are not bugs — they are the most important features.

### 📊 7. Observable but Invisible
Every interaction is logged for caregiver dashboards and clinical review. But the user never sees metrics, scores, or system information. To the user, Clara is simply a warm presence.

---

*End of Backend Brain Architecture Document*
*Next steps: Implementation of individual components, starting with the Orchestrator and Emotion Analyzer.*
