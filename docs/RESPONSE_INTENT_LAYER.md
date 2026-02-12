s# Clara — Response Intent Handling Layer
### Internal Engineering Design Document
### Version 1.0 · February 2026

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Response Intent Categories](#2-response-intent-categories)
3. [Intent Detection Logic](#3-intent-detection-logic)
4. [Intent-Specific Response Rules](#4-intent-specific-response-rules)
5. [Response Completeness Guarantee](#5-response-completeness-guarantee)
6. [Integration Into the Existing Brain Flow](#6-integration-into-the-existing-brain-flow)
7. [Dementia-Safe Constraints](#7-dementia-safe-constraints)

---

## 1. Problem Statement

Clara currently processes every user message through a single, intent-agnostic pipeline: Emotion Analysis → Context Assembly → LLM Generation → Safety Guard → Pacing. This pipeline works well for short reassurance exchanges but **fails structurally** when the user's request has a specific deliverable — a story, a grounding exercise, a comforting memory walk-through.

### What goes wrong today:

| Symptom | Root Cause |
|---------|-----------|
| Clara starts a story but ends after one sentence | `maxResponseTokens: 200` truncates mid-narrative; no instruction tells the LLM a story requires a beginning, middle, and end |
| Response feels fragmented or "patched together" | The Response Pacer splits output into ≤2 chunks at sentence boundaries, which can fracture a narrative meant to be consumed whole |
| Clara promises something and doesn't deliver | The LLM generates an opening like *"Let me tell you a little story…"* but the token limit or safety post-check cuts it short |
| Repeated correction loops | User says "finish the story" → Clara treats it as a new independent message → generates another fragment instead of continuing |

### What is NOT the problem:

- The Emotion Analyzer works correctly — it identifies distress.
- The Safety Guard works correctly — it filters unsafe output.
- The Pacer works correctly — it humanizes delivery timing.

**The gap is that no component understands _what kind of response_ the user actually needs.** The pipeline lacks a semantic understanding of response intent.

---

## 2. Response Intent Categories

A small, deliberately constrained set of intents. Every user message maps to exactly one.

| Intent | Trigger Pattern | Description |
|--------|----------------|-------------|
| `reassurance` | General distress, vague worry, uncertainty | Clara's default mode. Short, warm, present-tense comfort. |
| `grounding` | Disorientation, confusion about place/time/identity | Sensory anchoring. Help the user feel connected to the immediate present. |
| `calming_story` | Explicit or implicit request for a story, tale, or narrative | A self-contained, gentle micro-narrative with beginning, middle, and soft ending. |
| `emotional_validation` | Expression of sadness, grief, loss, loneliness | Acknowledging and sitting with the user's feeling — not fixing it, not redirecting. |
| `gentle_redirect` | Questions Clara cannot answer (medical, factual, time-sensitive) | Warmly steering the conversation away from unsafe territory without the user feeling dismissed. |
| `companionship` | Small talk, greetings, conversational engagement, "just talking" | Warm, light, human-like presence. The user is not in distress — they want company. |

### Design decisions:

- **Six intents, no more.** Every additional intent increases branching complexity and the chance of misclassification. For dementia care, a wrong intent is worse than a slightly generic one.
- **`reassurance` is the universal fallback.** If detection fails or confidence is low, every message defaults to reassurance. This is clinically the safest starting point.
- **No `memory_recall` intent yet.** True memory-based storytelling ("tell me about my dog") requires the persistent Memory layer (Section 6 of BRAIN_ARCHITECTURE.md), which is not yet implemented. When it is, `memory_recall` becomes the seventh intent, governed by caregiver-approved anchors only.

---

## 3. Intent Detection Logic

Intent detection is **rule-based and deterministic**, not probabilistic. This is a deliberate choice: in dementia care, predictability is more important than cleverness. The user must get the same type of response for the same type of request every time.

### 3.1 Detection Strategy: Keyword-Pattern Matching with Priority Ordering

The Intent Detector scans the user's message against ordered pattern groups. The first match wins. If no pattern matches, the intent is `reassurance`.

```
DETECTION PRIORITY (evaluated top-to-bottom, first match wins):

1. SAFETY OVERRIDE
   If SafetyGuard.validateInput() returned REDIRECT or ESCALATE →
   Intent is forced to `gentle_redirect` (REDIRECT) or `reassurance` (ESCALATE).
   No further detection needed.

2. CALMING STORY
   Pattern group:
   - "tell me a story"
   - "can you tell me a story"
   - "i want a story"
   - "read me something"
   - "tell me something nice"
   - "tell me something calming"
   - "i need a story"
   - "story to calm me"
   - "something to make me feel better" (if emotion is NOT sad/lonely)
   Match type: substring (case-insensitive)

3. GROUNDING
   Pattern group:
   - "where am i"
   - "what is this place"
   - "who am i"
   - "what day is it"
   - "what's happening"
   - "nothing makes sense"
   - "i don't recognize"
   - "i don't understand anything"
   Also triggers if: Emotion = confused AND confidence ≥ 0.5

4. EMOTIONAL VALIDATION
   Pattern group:
   - "i miss [*]"
   - "i lost [*]"
   - "nobody loves me"
   - "nobody cares"
   - "everyone left"
   - "i'm all alone"
   - "why did they leave"
   Also triggers if: Emotion ∈ {sad, lonely} AND confidence ≥ 0.6

5. GENTLE REDIRECT
   Pattern group:
   - "what medicine"
   - "what should i take"
   - "am i sick"
   - "what's wrong with me"
   - "when is my appointment"
   - "can i go home"
   - "take me home"
   Also triggers if: SafetyGuard pre-result flag = "medical_inquiry"

6. COMPANIONSHIP
   Pattern group:
   - "hello", "hi", "hey"
   - "how are you"
   - "what's your name"
   - "tell me about yourself"
   - "what do you like"
   - "let's talk"
   - "i'm bored"
   Also triggers if: Emotion = calm OR neutral, AND no distress pattern

7. REASSURANCE (default)
   All other messages land here.
```

### 3.2 Why Priority Ordering Matters

Consider: *"I'm scared, can you tell me a story to calm me down?"*

- Emotion Analyzer says: `fearful` (correct)
- Without priority: ambiguous — is this `calming_story` or `reassurance`?
- With priority: `calming_story` matches at rank 2 → intent is `calming_story`, with the emotion context (`fearful`) passed alongside it

The emotion and intent are **complementary, not competing.** The intent determines *what* to generate. The emotion determines *how* to generate it (tone, warmth level, pacing).

### 3.3 Detection Output

```
IntentDetector.detect(message, emotionResult, safetyPreResult) → {
    intent:      string,     // one of the 6 intents
    confidence:  string,     // "pattern_match" | "emotion_inferred" | "default"
    matchedRule: string,     // which pattern/rule triggered (for logging)
}
```

The `confidence` field is not a probability — it is a **provenance tag** indicating how the intent was determined:
- `"pattern_match"` — a keyword pattern was matched directly
- `"emotion_inferred"` — no keyword matched, but the Emotion Analyzer's output triggered an intent rule
- `"default"` — no match found, defaulted to `reassurance`

---

## 4. Intent-Specific Response Rules

Each intent carries a **response contract** — a set of structural, tonal, and completeness constraints that the Context Assembler injects into the LLM prompt and the Completeness Validator enforces after generation.

---

### 4.1 `reassurance`

| Aspect | Rule |
|--------|------|
| **Structure** | 1–2 short, warm sentences. Present tense. |
| **Minimum completeness** | At least one affirmation of safety or presence ("You are safe", "I am here"). |
| **Tone** | Soft, motherly, unhurried. |
| **Must avoid** | Questions, new information, future promises, clinical language. |
| **Max tokens** | 100 |
| **Pacing** | Standard chunking (up to 2 chunks). |

**Example pattern:**
> "You are safe, dear. I am right here with you. 💛"

---

### 4.2 `grounding`

| Aspect | Rule |
|--------|------|
| **Structure** | 2–3 short sentences. First: acknowledge. Second: orient. Third (optional): reassure. |
| **Minimum completeness** | Must include at least one concrete, sensory grounding anchor (a sense: sight, sound, touch, smell). |
| **Tone** | Calm, steady, present-tense. Gently orienting, never correcting. |
| **Must avoid** | Abstract concepts, time references (unless caregiver-provided), "you should remember." |
| **Max tokens** | 120 |
| **Pacing** | Standard chunking. |

**Example pattern:**
> "You are in a safe, comfortable place. Can you feel the chair underneath you? That is solid and real. You are okay. 💛"

---

### 4.3 `calming_story`

This is the most complex intent and the primary failure case today.

| Aspect | Rule |
|--------|------|
| **Structure** | A single, self-contained micro-narrative. Must have: (a) a gentle opening that sets the scene, (b) a soft middle with one simple event or image, (c) a warm, conclusive ending. |
| **Minimum completeness** | All three parts (beginning, middle, end) must be present. The story must feel **finished** — the last sentence must clearly be a conclusion, not a mid-thought. |
| **Tone** | Dreamy, soft, slow — like a bedtime story. Simple vocabulary. Sensory details (nature, warmth, light). |
| **Must avoid** | Conflict, tension, suspense, danger, sadness, complex plots, unfamiliar names, cliffhangers. |
| **Max tokens** | **400** (override of the global 200-token cap) |
| **Pacing** | **NO CHUNKING.** The entire story is delivered as **a single, uninterrupted block.** The initial typing delay is extended to 3000–4500ms to simulate thoughtful composition. |
| **Concreteness** | Story themes are drawn from a safe palette: gardens, birdsong, warm kitchens, gentle rain, sunlight through windows, a friendly cat, a path through a meadow. No people with names (to avoid triggering identity confusion). |

**Why 400 tokens?**
A 200-token story cannot have a beginning, middle, and end. It produces the exact truncation problem this layer solves. 400 tokens allows approximately 6–8 sentences — enough for a complete micro-narrative without becoming overwhelming. The Completeness Validator (Section 5) ensures the LLM actually uses the budget to finish the story rather than stopping at 2 sentences.

**Why no chunking?**
Chunking a story into two parts with a typing delay in between fragments the narrative experience. The user sees half a story, then a pause, then the rest — this creates anxiety ("Is she done? Is there more?"). A story must arrive as a single, continuous unit.

**Response contract (injected as LLM directive):**
```
STORY REQUIREMENTS:
- You must tell a complete, short story with a clear beginning, middle, and ending.
- The story must feel FINISHED. The last sentence must be a gentle conclusion.
- Use 4–8 sentences.
- Use nature, warmth, and sensory details.
- Do NOT use character names. Use descriptions: "a small bird", "a little cat."
- Do NOT leave the story unfinished.
- Do NOT say "would you like to hear more?" — this IS the complete story.
```

---

### 4.4 `emotional_validation`

| Aspect | Rule |
|--------|------|
| **Structure** | 2–3 sentences. First: mirror the feeling. Second: normalize it. Third (optional): gentle presence. |
| **Minimum completeness** | Must explicitly name or reflect the emotion ("That sounds really hard", "It's okay to feel sad"). Must NOT jump to reassurance without first sitting with the feeling. |
| **Tone** | Gentle, empathetic, unhurried. Not cheerful — matching the user's weight. |
| **Must avoid** | "Cheer up", silver linings, memories of the lost person (risk of confusion), suggesting activities. |
| **Max tokens** | 120 |
| **Pacing** | Standard chunking. Slightly longer initial delay (adds 500ms to simulate "sitting with it" before responding). |

**Example pattern:**
> "That sounds really hard, dear. Missing someone you love — that is such a deep feeling. I am right here with you. 💛"

---

### 4.5 `gentle_redirect`

| Aspect | Rule |
|--------|------|
| **Structure** | 2 sentences. First: validate the concern warmly. Second: redirect to safety without dismissing. |
| **Minimum completeness** | Must acknowledge the user's question/request before redirecting. Must NOT ignore what they said. |
| **Tone** | Warm but gently steering. Never patronizing, never dismissive. |
| **Must avoid** | Actually answering medical/factual questions, saying "I can't help with that", technical explanations. |
| **Max tokens** | 100 |
| **Pacing** | Standard chunking. |

**Example pattern:**
> "That is a really good question, dear. Your care team knows all about that — they are looking after you so well. 💛"

---

### 4.6 `companionship`

| Aspect | Rule |
|--------|------|
| **Structure** | 1–3 sentences. Conversational, light, gentle. May include a soft open-ended cue (not a direct question). |
| **Minimum completeness** | Must respond to what the user said, not just emit generic warmth. If the user asks a question ("How are you?"), it must be answered within Clara's persona. |
| **Tone** | Warm, friendly, slightly playful. The lightest tone in Clara's repertoire. |
| **Must avoid** | Complex topics, probing personal questions, rapid topic changes. |
| **Max tokens** | 150 |
| **Pacing** | Standard chunking. |

**Example pattern:**
> "Hello, dear! I am so happy to talk with you. It is such a lovely day. 🌸"

---

## 5. Response Completeness Guarantee

This is the architectural mechanism that ensures Clara never promises something and fails to deliver. It operates as a **post-generation validation step** — a Completeness Validator that sits between LLM Generation and the existing Safety Guard (post-response).

### 5.1 The Response Contract

Each intent has a **response contract** (defined in Section 4). The contract specifies:

```
ResponseContract = {
    intent:              string,
    requiredParts:       string[],       // structural elements that MUST be present
    minSentences:        number,         // minimum number of sentences
    maxTokens:           number,         // intent-specific token cap
    allowChunking:       boolean,        // whether the Pacer may split this response
    completionSignals:   string[],       // patterns that indicate a complete response
    incompletionSignals: string[],       // patterns that indicate a truncated response
}
```

### 5.2 Contracts Per Intent

| Intent | `requiredParts` | `minSentences` | `maxTokens` | `allowChunking` |
|--------|----------------|----------------|-------------|-----------------|
| `reassurance` | `["affirmation"]` | 1 | 100 | yes |
| `grounding` | `["acknowledge", "anchor"]` | 2 | 120 | yes |
| `calming_story` | `["opening", "middle", "ending"]` | 4 | 400 | **no** |
| `emotional_validation` | `["mirror", "normalize"]` | 2 | 120 | yes |
| `gentle_redirect` | `["acknowledge", "redirect"]` | 2 | 100 | yes |
| `companionship` | `["engagement"]` | 1 | 150 | yes |

### 5.3 Completion Signals

Signals used by the Completeness Validator to determine if a response is truly finished:

**Positive signals (response is complete):**
- Ends with a period, exclamation mark, or emoji
- For `calming_story`: contains temporal closure language ("and so", "from that day", "as the sun set", "and everything was", "the end")
- Sentence count meets or exceeds `minSentences`

**Negative signals (response is incomplete):**
- Ends with a comma, ellipsis, dash, or conjunction ("and", "but", "so", "then")
- Contains promise language without delivery ("Let me tell you", "Here's a story", "Once upon a time") but has fewer than `minSentences`
- For `calming_story`: no discernible ending — no sentence with conclusive tone in the final position
- Response ends with a question offering more ("Would you like to hear more?", "Shall I continue?")

### 5.4 Validation Flow

```
LLM generates raw response
         │
         ▼
┌────────────────────────┐
│  COMPLETENESS          │
│  VALIDATOR             │
│                        │
│  Check against the     │
│  ResponseContract for  │
│  the detected intent   │
└────────┬───────────────┘
         │
    ┌────┴─────┐
    │          │
 COMPLETE   INCOMPLETE
    │          │
    ▼          ▼
  Pass to    Regenerate with
  Safety     completion
  Guard      instruction
             (up to 2 attempts)
                │
           ┌────┴─────┐
           │          │
        COMPLETE   STILL INCOMPLETE
           │          │
           ▼          ▼
         Pass to    Use intent-specific
         Safety     fallback from
         Guard      Safe Response Bank
```

### 5.5 Regeneration Strategy

When a response is flagged as incomplete, the Completeness Validator does **not** ask the LLM to "continue" — this produces disjointed patchwork. Instead, it sends a **full regeneration request** with an explicit completion instruction:

```
COMPLETION INSTRUCTION (appended to messages for retry):

"Your previous response was incomplete. It did not finish properly.
You MUST respond with a COMPLETE [intent type] in a single message.
Do not reference your previous attempt. Start fresh.
The response must feel complete and finished — the reader must not
feel like something is missing."
```

### 5.6 Intent-Specific Fallbacks

If regeneration also fails (2 attempts exhausted), the system falls back to a **pre-approved, clinically reviewed response** specific to the detected intent — not a generic fallback.

| Intent | Fallback Response |
|--------|------------------|
| `reassurance` | "You are safe, dear. I am right here with you. Everything is okay. 💛" |
| `grounding` | "You are in a safe, comfortable place. I am right here. You are okay. 💛" |
| `calming_story` | A pre-written, complete micro-story (stored in the Safe Response Bank under a `calming_stories` category — a small pool of 5–10 clinically reviewed stories, selected randomly) |
| `emotional_validation` | "That sounds really hard, dear. What you are feeling — it matters. I am here with you. 💛" |
| `gentle_redirect` | "That is a really good question. Your care team knows all about that — they are taking such good care of you. 💛" |
| `companionship` | "I am so happy to be here with you. You are wonderful company. 🌸" |

**Critical note on `calming_story` fallback:** The fallback must be a **complete, pre-written story**, not a one-liner. The Safe Response Bank must have a `calming_stories` category containing fully formed micro-narratives that satisfy the same contract (beginning, middle, ending). Example:

> "Once, there was a little garden tucked behind a stone wall. In the garden, golden flowers swayed gently in the warm breeze, and a small orange butterfly drifted from bloom to bloom. A soft rain began to fall, and each drop made the flowers nod as if they were saying hello. When the sun came back out, a little rainbow stretched quietly across the sky. Everything in the garden was peaceful and still — just as it should be. 💛"

---

## 6. Integration Into the Existing Brain Flow

### 6.1 Updated Pipeline Position

The Intent Layer introduces two new components into the existing orchestration pipeline:

```
User Message
     │
     ▼
┌─────────────────────┐
│  1. INPUT RECEIVE    │  (unchanged)
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  2. EMOTION ANALYSIS │  (unchanged)
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  3. MEMORY LOOKUP    │  (unchanged)
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  4. SAFETY GUARD     │  (unchanged)
│     (PRE-RESPONSE)   │
└────────┬────────────┘
         │
    ┌────┴─────┐
  SAFE     ESCALATE/REDIRECT → (unchanged)
    │
    ▼
╔═════════════════════════╗
║  4.5  INTENT DETECTION  ║  ◄── NEW
║  Detect response intent ║
║  from message + emotion ║
║  + safety result        ║
╚════════════╤════════════╝
             ▼
┌─────────────────────┐
│  5. CONTEXT ASSEMBLY │  (MODIFIED — now intent-aware)
│     Injects intent-  │
│     specific LLM     │
│     directives and   │
│     token override   │
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  6. LLM GENERATION   │  (MODIFIED — uses intent-specific maxTokens)
└────────┬────────────┘
         ▼
╔═════════════════════════╗
║  6.5  COMPLETENESS      ║  ◄── NEW
║  VALIDATOR              ║
║  Validate response      ║
║  against intent          ║
║  contract               ║
╚════════════╤════════════╝
         │
    ┌────┴─────┐
 COMPLETE   INCOMPLETE → Regenerate or intent-specific fallback
    │
    ▼
┌─────────────────────┐
│  7. SAFETY GUARD     │  (unchanged)
│     (POST-RESPONSE)  │
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  8. RESPONSE PACING  │  (MODIFIED — respects allowChunking from contract)
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  9. RESPONSE DELIVER │  (unchanged)
└─────────────────────┘
```

### 6.2 Component-Level Impact

| Existing Component | Change Required |
|-------------------|----------------|
| **Orchestrator** | Invoke `IntentDetector.detect()` after Safety Guard (pre). Pass `intentResult` to Context Assembler, LLM Client, Completeness Validator, and Response Pacer. |
| **Context Assembler** | Accept `intentResult` as a new parameter. Use it to inject intent-specific LLM directives (e.g., the story contract) into the system prompt. Override `maxTokens` based on intent. |
| **LLM Client** | Accept an optional `maxTokens` override per call (currently hardcoded from persona config). |
| **Response Pacer** | Check `intentResult.contract.allowChunking`. If `false`, deliver the entire response as a single chunk with an extended initial delay. |
| **Safety Guard (post)** | No change. It continues to validate the final output regardless of intent. The Completeness Validator runs before the Safety Guard — they are complementary, not duplicative. |
| **Memory Manager** | No change in this phase. Future: intent history can inform memory (e.g., "user has requested 3 stories this session"). |

### 6.3 New Components

| Component | File | Responsibility |
|-----------|------|---------------|
| **IntentDetector** | `src/intentDetector.js` | Pattern-match user message → intent classification |
| **CompletenessValidator** | `src/completenessValidator.js` | Validate LLM output against the intent's response contract |
| **Response Contracts** | `src/config/responseContracts.js` | Config file defining contracts per intent (structure, token limits, chunking rules, signals) |

### 6.4 Updated Orchestrator Pseudo-Contract

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

    intentResult    ← IntentDetector.detect(message, emotionResult, safetyPreResult)  // NEW

    context         ← ContextAssembler.build(message, emotionResult, memoryResult,
                                              safetyPreResult, intentResult)           // MODIFIED
    rawResponse     ← LLMClient.generate(context, intentResult.contract.maxTokens)     // MODIFIED

    completeness    ← CompletenessValidator.validate(rawResponse, intentResult)         // NEW
    IF completeness == INCOMPLETE:
      rawResponse   ← LLMClient.regenerate(context, completeness.reason)
      completeness  ← CompletenessValidator.validate(rawResponse, intentResult)
      IF completeness == INCOMPLETE:
        rawResponse ← SafeResponseBank.getIntentFallback(intentResult.intent)          // NEW

    safetyPostResult← SafetyGuard.validateOutput(rawResponse)
    IF safetyPostResult == REJECTED:
      rawResponse   ← retry or fallback (existing logic)

    pacedResponse   ← ResponsePacer.pace(rawResponse, emotionResult, intentResult)     // MODIFIED
    RETURN pacedResponse

    ASYNC: Logger.log(..., intentResult), MemoryManager.update(...)
```

---

## 7. Dementia-Safe Constraints

This section explains **why** intent-controlled responses are not merely an engineering improvement but a **clinical safety requirement** for users with dementia.

### 7.1 Trust

People with dementia often lose the ability to distinguish between reliable and unreliable sources of information. Once trust is established with a companion like Clara, it becomes **load-bearing** — the user depends on that trust for emotional regulation.

**How incomplete responses break trust:**
- Clara says "Let me tell you a story…" and then stops → The user feels abandoned mid-moment.
- Clara's story is split into two chunks with a typing pause → The user may forget the first chunk by the time the second arrives, or may think Clara stopped talking.
- Clara gives a fragment that doesn't resolve → The user cannot "fill in the gaps" from memory the way a neurotypical user would.

**How intent control preserves trust:**
- If Clara says "Let me tell you a story," the story **will** be complete. Every time.
- The response contract guarantees structural completeness before delivery.
- The user learns, at a subconscious level, that Clara finishes what she starts.

### 7.2 Predictability

Dementia progressively damages the brain's ability to handle novelty and surprise. Predictable patterns are soothing; unpredictable behavior is distressing.

**How the intent layer improves predictability:**
- The same type of request always produces the same *shape* of response. "Tell me a story" always yields a beginning-middle-end narrative. "Where am I?" always yields a grounding response with sensory anchors.
- The user does not need to explicitly understand this — they experience it as consistency. "Clara always tells proper stories. Clara always helps me feel oriented."

### 7.3 Reduced Confusion

Fragmented or mid-sentence responses are not merely unsatisfying — for a person with dementia, they can be **genuinely confusing**:
- "Was she talking to someone else?"
- "Did the screen break?"
- "Why did she stop?"

These micro-confusions may seem small, but they accumulate. Each one increases cognitive load and can contribute to agitation.

**The intent layer eliminates this class of confusion entirely.** Every response is validated for completeness before the user ever sees it. The user never encounters a half-thought from Clara.

### 7.4 Emotional Safety

The most critical constraint. Dementia care is not a consumer product — it is a tool used during vulnerable moments by vulnerable people, often without a caregiver present in the room.

**Specific emotional safety guarantees provided by this layer:**

| Guarantee | Mechanism |
|-----------|-----------|
| Clara never promises a story and delivers a fragment | Completeness Validator + story contract |
| Clara never ends a response on an anxious note | Completion signals check for conclusive, warm endings |
| Clara's stories never contain conflict, danger, or suspense | Intent-specific `must avoid` rules injected into the LLM prompt |
| If all else fails, the user still gets a complete, comforting response | Intent-specific fallbacks — not generic "I am here" for every failure |
| grounding responses always include at least one sensory anchor | `requiredParts` contract check |
| emotional validation never jumps to "cheer up" | Intent rule explicitly forbids silver-lining language |

### 7.5 Why Generic Fallbacks Are Not Enough

The current system uses a single-tier fallback: *"I am right here with you. Everything is okay. 💛"*

This is safe. But it is not always **appropriate**:
- User asks for a story → gets "I am right here with you" → feels dismissed.
- User expresses deep grief → gets "Everything is okay" → feels unheard.
- User asks "Where am I?" → gets "I am right here with you" → still disoriented.

Intent-specific fallbacks ensure that even in total system failure, the response **matches the shape of what the user asked for.** A story request gets a story. A grounding request gets grounding. A grief expression gets validation.

This is the difference between a system that is *safe* and a system that is *caring*.

---

*End of Response Intent Handling Layer Design Document*
*Next steps: Implementation of `IntentDetector`, `CompletenessValidator`, and `responseContracts` config, followed by integration into the Orchestrator and Context Assembler.*
