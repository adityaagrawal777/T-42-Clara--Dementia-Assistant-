# Clara — Narrative Memory Layer
### Internal Engineering Design Document
### Version 1.0 · February 2026

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Narrative Library Structure](#2-narrative-library-structure)
3. [Safe Memory Loop Design](#3-safe-memory-loop-design)
4. [Integration With the Intent Layer & Orchestrator](#4-integration-with-the-intent-layer--orchestrator)
5. [Dementia-Safe Design Principles](#5-dementia-safe-design-principles)
6. [Scalability Plan](#6-scalability-plan)

---

## 1. Problem Statement

Clara's current Safe Response Bank (`src/safeResponseBank.js`) contains a small, flat collection of fallback responses and five pre-written calming stories. This works as a last-resort mechanism, but it has **no structure, no categorization metadata, and no retrieval intelligence.** The stories cannot be selected based on the user's emotional state, their conversation history, or the time of day. They are picked at random.

Meanwhile, the Memory Manager (`src/memoryManager.js`) supports repetition detection and entity extraction, but it has **no concept of curated narratives** — it cannot remember which stories have already been told, which narrative themes resonate with a specific user, or how to vary responses across repeated sessions.

### What is missing today:

| Gap | Consequence |
|-----|-------------|
| No structured narrative catalog | Stories cannot be filtered by emotion, category, or length — selection is random, not intentional |
| No narrative usage tracking | Clara may tell the same story three times in one session without knowing |
| No repetition-aware narrative selection | When a user asks the same question repeatedly, Clara cannot intelligently vary her response while maintaining warmth |
| No category-to-intent mapping | The Intent Layer detects `calming_story` or `grounding`, but has no structured library to draw from beyond flat fallback arrays |
| No emotional targeting | A story meant for anxiety is just as likely to be served to a lonely user as a frightened one |
| No length awareness | Short reassurance moments receive the same narrative pool as longer calming story requests |

### What this layer adds:

A **Clara Narrative Library** — a curated, structured, metadata-rich collection of dementia-safe narratives that integrates into the existing brain pipeline as a new retrieval source, sitting between the Intent Layer and the Context Assembler.

### What this layer does NOT do:

- ❌ Replace the LLM. The LLM remains Clara's primary response generator. Narratives are **supplementary** — used as fallbacks, as grounding anchors, and as seeds for LLM-generated variations.
- ❌ Introduce a database. This version uses in-memory JSON. The scalability plan (Section 6) describes the migration path.
- ❌ Add voice or multimedia. Narratives are text-only.
- ❌ Proactively push narratives. Clara never says "Let me tell you a story" unprompted. Narratives are retrieved only when the user's message or emotional state creates a natural opening.

---

## 2. Narrative Library Structure

### 2.1 Schema Definition

Each narrative in the library is a self-contained, metadata-rich entry. The schema is designed so that every field serves a **retrieval purpose** — there is no decorative metadata.

```json
{
  "id": "string — unique identifier (e.g., 'calm_garden_001')",
  "category": "string — enum: calming_story | grounding | reassurance | memory_loop | emotional_validation",
  "target_emotion": "string[] — emotions this narrative is optimized for (e.g., ['anxiety', 'fear'])",
  "tone_profile": {
    "warmth": "float 0.0–1.0 — how emotionally warm the narrative feels",
    "pace": "string — enum: slow | medium | gentle",
    "sensory_focus": "string[] — primary senses engaged (e.g., ['sight', 'touch', 'smell'])"
  },
  "length": "string — enum: short | medium | long",
  "word_count": "integer — exact word count for pacing calculations",
  "theme_tags": "string[] — semantic tags (e.g., ['garden', 'sunlight', 'birds', 'rain'])",
  "time_suitability": "string[] — when this narrative feels most natural (e.g., ['morning', 'evening', 'any'])",
  "text": "string — the complete narrative text",
  "closing_tone": "string — enum: peaceful | hopeful | warm | cozy",
  "clinical_review": {
    "approved": "boolean",
    "reviewer": "string — initials or ID of clinical reviewer",
    "reviewed_at": "ISO 8601 timestamp",
    "notes": "string — optional clinical notes"
  },
  "usage_metadata": {
    "created_at": "ISO 8601 timestamp",
    "version": "integer — revision number"
  }
}
```

### 2.2 Category Definitions

| Category | Purpose | When Retrieved |
|----------|---------|----------------|
| `calming_story` | Complete micro-narratives with beginning, middle, and end. Nature-based, conflict-free, sensory-rich. | When intent is `calming_story`, or as LLM fallback for story requests |
| `grounding` | Short sensory anchoring passages that connect the user to the present moment. Focus on touch, sight, sound. | When intent is `grounding` and the user is disoriented |
| `reassurance` | Brief, warm affirmations of safety and presence. The emotional equivalent of a hand on the shoulder. | Default fallback; when distress is elevated but no specific intent is detected |
| `memory_loop` | Variations of the same reassuring message, designed to be told repeatedly without feeling repetitive. Multiple phrasings of the same core truth. | When repetition is detected — user has asked the same question multiple times |
| `emotional_validation` | Short passages that name and normalize a feeling without trying to fix it. | When intent is `emotional_validation` — user is expressing grief, sadness, or loneliness |

### 2.3 Example Narrative Entries

**Example 1 — Calming Story (targeting anxiety)**

```json
{
  "id": "calm_meadow_001",
  "category": "calming_story",
  "target_emotion": ["anxiety", "fear"],
  "tone_profile": {
    "warmth": 0.9,
    "pace": "slow",
    "sensory_focus": ["sight", "touch", "smell"]
  },
  "length": "medium",
  "word_count": 82,
  "theme_tags": ["meadow", "breeze", "sunlight", "butterfly", "flowers"],
  "time_suitability": ["morning", "afternoon", "any"],
  "text": "There was once a quiet meadow where the grass grew soft and tall. A gentle breeze moved through it, carrying the sweet scent of wildflowers. A small butterfly with golden wings drifted lazily from one blossom to the next, never in a hurry, never worried about where to go. The sun was warm and kind, and everything in the meadow moved slowly, as if the whole world had decided to take a rest. And it was good. 💛",
  "closing_tone": "peaceful",
  "clinical_review": {
    "approved": true,
    "reviewer": "CL-01",
    "reviewed_at": "2026-02-10T00:00:00Z",
    "notes": "Appropriate for anxiety. No triggers. Gentle closure."
  },
  "usage_metadata": {
    "created_at": "2026-02-10T00:00:00Z",
    "version": 1
  }
}
```

**Example 2 — Memory Loop (for repeated "where am I?" questions)**

```json
{
  "id": "loop_location_003",
  "category": "memory_loop",
  "target_emotion": ["confusion", "anxiety"],
  "tone_profile": {
    "warmth": 0.95,
    "pace": "gentle",
    "sensory_focus": ["touch", "sight"]
  },
  "length": "short",
  "word_count": 28,
  "theme_tags": ["safety", "location", "grounding", "presence"],
  "time_suitability": ["any"],
  "text": "You are in a safe, comfortable place. Can you feel the warmth around you? That is real, and you are okay. I am right here. 💛",
  "closing_tone": "warm",
  "clinical_review": {
    "approved": true,
    "reviewer": "CL-01",
    "reviewed_at": "2026-02-10T00:00:00Z",
    "notes": "Suitable for repeated location confusion. Includes sensory anchor (warmth)."
  },
  "usage_metadata": {
    "created_at": "2026-02-10T00:00:00Z",
    "version": 1
  }
}
```

### 2.4 Library Size Guidance

| Category | Recommended Minimum | Notes |
|----------|-------------------|-------|
| `calming_story` | 10–15 | Enough variety to avoid repetition across a multi-day engagement |
| `grounding` | 8–10 | Each should emphasize a different sense (sight, touch, sound, smell) |
| `reassurance` | 10–12 | Variations of safety affirmation — same meaning, different phrasing |
| `memory_loop` | 5–8 per common question type | Multiple phrasings for "where am I?", "who are you?", "what's happening?" |
| `emotional_validation` | 8–10 | Must cover sadness, loneliness, grief, fear without silver-lining |

---

## 3. Safe Memory Loop Design

This section describes how Clara handles **repeated questions** — the single most common interaction pattern in dementia care. A person with dementia may ask "Where am I?" ten times in a single session. Clara must answer each time as if it were the first, with equal warmth, but with **enough variation** that a caregiver observing the conversation doesn't see the same sentence repeated verbatim.

### 3.1 Repetition Detection (Already Exists)

The current Memory Manager (`src/memoryManager.js`) already detects repetition via semantic fingerprinting:

```
_fingerprint(text) → normalized word set
_similarity(a, b) → Jaccard similarity score (0.0–1.0)
_detectRepetition(session, message) → { isRepeat: bool, count: int }
```

The similarity threshold is `0.6`. This means "Where am I?" and "What is this place?" are detected as the same question. **This mechanism is sufficient and does not need to change.**

### 3.2 What Changes: Repetition-Aware Narrative Selection

When repetition is detected, the current system does one thing: it tells the Context Assembler to add a repetition directive to the LLM prompt ("The user has asked this before. Respond as if it is the first time."). The LLM then generates a response — but it has no awareness of what it said last time, and may produce identical or near-identical phrasing.

The Narrative Library introduces a **rotation mechanism**:

```
REPETITION HANDLING FLOW:

  memoryResult.isRepeat == true
           │
           ▼
  ┌─────────────────────────────────┐
  │  NARRATIVE RETRIEVER            │
  │                                 │
  │  1. Identify the question type  │
  │     (location, identity, time,  │
  │      general confusion)         │
  │                                 │
  │  2. Retrieve all memory_loop    │
  │     narratives matching that    │
  │     question type               │
  │                                 │
  │  3. Exclude narratives already  │
  │     used this session (tracked  │
  │     by session.usedNarratives)  │
  │                                 │
  │  4. Select the next unused      │
  │     narrative, filtered by      │
  │     current emotion             │
  │                                 │
  │  5. If all narratives are       │
  │     exhausted, reset pool and   │
  │     start from the beginning    │
  └──────────────┬──────────────────┘
                 │
                 ▼
         Selected narrative text
         is injected as a SEED into
         the Context Assembler, not
         used directly as the response
```

### 3.3 Seed Injection vs. Direct Response

**Critical architectural decision:** Retrieved narratives are **not** returned directly to the user as-is (except in fallback scenarios). Instead, they are injected into the LLM prompt as a **seed** — a reference text that guides the LLM's generation:

```
NARRATIVE SEED DIRECTIVE (injected into system prompt):

"The user has asked a similar question before. They may not remember asking.
Respond as if it is the first time. Your response should follow the warmth
and structure of this reference, but do NOT copy it word-for-word. Use it
as inspiration for tone and content:

REFERENCE: '{narrative.text}'

Your response must feel fresh and natural while conveying the same core reassurance."
```

**Why seeding instead of direct response?**

- **Naturalness.** A directly returned narrative, repeated across sessions, begins to feel scripted — especially to caregivers who observe the conversation.
- **Emotion responsiveness.** The LLM can adjust the seed based on the current emotion state. The same grounding narrative seed produces a gentler variation when the user is highly distressed vs. mildly confused.
- **Continuity.** The LLM can weave in anchors from the conversation ("You are in a safe place. And Max is right there with you." — where Max is a caregiver-provided anchor).

**Exception:** When the LLM fails twice (exhausted regeneration attempts), the narrative is used **directly** as the response. This is the fallback path — identical to the current `getIntentFallback()` behavior in `safeResponseBank.js`, but now with a richer, emotion-matched selection pool.

### 3.4 What Clara Must NEVER Do During Repetition

| ❌ Forbidden Behavior | Why |
|----------------------|-----|
| "You already asked me that." | Causes shame, confusion, and erodes trust |
| "As I mentioned before…" | Implies expectation of memory the user cannot meet |
| "Remember when I told you…" | Directly confronts the user's memory deficit |
| Sighing, impatience markers, shortened responses | Even subtle tonal shifts signal irritation to a hypervigilant, anxious user |
| Identical verbatim responses every time | Caregivers notice. It undermines trust in the system as a whole |
| Referencing the count ("This is the 4th time…") | Absolutely never. This is the most harmful pattern possible |

### 3.5 What Clara SHOULD Do During Repetition

| ✅ Desired Behavior | How |
|--------------------|-----|
| Respond with full warmth, as if hearing the question for the first time | Repetition directive in prompt + no "you said this before" language |
| Vary phrasing naturally | Narrative seed rotation ensures different reference texts each time |
| Include at least one sensory grounding anchor | Narrative schema guarantees `sensory_focus` metadata for selection |
| Keep the core truth consistent | All `memory_loop` narratives for a given question type convey the same fundamental reassurance ("You are safe", "I am here") |
| Gradually shorten if repetition continues | After 5+ repetitions in a session, prefer `short` narratives — the user needs comfort, not content |

### 3.6 Session-Level Usage Tracking

The Memory Manager's session object gains a new field:

```
session.usedNarratives = [
  { id: "loop_location_003", usedAt: "2026-02-11T10:00:00Z", forMessage: "where am i" },
  { id: "calm_meadow_001", usedAt: "2026-02-11T10:02:30Z", forMessage: "tell me a story" }
]
```

This array is checked by the Narrative Retriever before selection. It ensures:
- No narrative is repeated within the same session (until the pool is exhausted).
- Analytics can track which narratives are used most frequently.
- Future systems can learn which narrative themes work best for specific users.

---

## 4. Integration With the Intent Layer & Orchestrator

### 4.1 New Component: Narrative Retriever

The Narrative Retriever is a new component that sits **between Intent Detection and Context Assembly** in the pipeline. It does not replace any existing component — it adds a new retrieval step.

| Aspect | Detail |
|--------|--------|
| **File** | `src/narrativeRetriever.js` |
| **Input** | `intentResult`, `emotionResult`, `memoryResult`, `sessionId` |
| **Output** | `{ narrative: object or null, mode: 'seed' or 'fallback' or 'none', reason: string }` |
| **Responsibility** | Select the most appropriate narrative from the library based on intent, emotion, repetition state, and session usage history |

### 4.2 Updated Pipeline Position

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
│  3. MEMORY LOOKUP    │  (unchanged — but session now includes usedNarratives)
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
┌─────────────────────┐
│  4.5 INTENT          │  (unchanged)
│     DETECTION        │
└────────┬────────────┘
         ▼
╔═════════════════════════╗
║  4.7 NARRATIVE          ║  ◄── NEW
║  RETRIEVER              ║
║  Select narrative from  ║
║  library based on       ║
║  intent + emotion +     ║
║  repetition state       ║
╚════════════╤════════════╝
             ▼
┌─────────────────────┐
│  5. CONTEXT ASSEMBLY │  (MODIFIED — now accepts narrativeResult)
│     Injects narrative │
│     seed if present   │
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  6. LLM GENERATION   │  (unchanged)
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  6.5 COMPLETENESS    │  (unchanged)
│     VALIDATOR        │
└────────┬────────────┘
         │
    ┌────┴─────┐
 COMPLETE   INCOMPLETE → Regenerate or narrative-based fallback (ENHANCED)
    │
    ▼
┌─────────────────────┐
│  7. SAFETY GUARD     │  (unchanged)
│     (POST-RESPONSE)  │
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  8. RESPONSE PACING  │  (unchanged)
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  9. RESPONSE DELIVER │  (unchanged)
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  9.5 NARRATIVE       │  ◄── NEW (async)
│     USAGE TRACKING   │
│     Record which     │
│     narrative was    │
│     used (if any)    │
└─────────────────────┘
```

### 4.3 Retrieval Logic — Step-by-Step

```
NarrativeRetriever.retrieve(intentResult, emotionResult, memoryResult, sessionId):

  Step 1 — DETERMINE IF RETRIEVAL IS NEEDED
    IF intentResult.intent ∈ { calming_story, grounding, emotional_validation }
      → retrieval = REQUIRED (intent demands structured content)
    ELSE IF memoryResult.isRepeat AND memoryResult.repeatCount ≥ 2
      → retrieval = REQUIRED (repetition needs varied responses)
    ELSE IF emotionResult.distressScore > 0.7
      → retrieval = OPTIONAL (high distress — a narrative seed may help anchor the LLM)
    ELSE
      → retrieval = NONE
      → RETURN { narrative: null, mode: 'none', reason: 'No retrieval trigger' }

  Step 2 — DETERMINE CATEGORY
    Map intent to narrative category:
      calming_story       → category: 'calming_story'
      grounding           → category: 'grounding'
      emotional_validation → category: 'emotional_validation'
      (repetition-triggered) → category: 'memory_loop'
      (distress-triggered)   → category: 'reassurance'

  Step 3 — FILTER CANDIDATES
    candidates = library.filter(
      category == determined_category
      AND target_emotion INCLUDES emotionResult.emotion
      AND clinical_review.approved == true
    )

    IF candidates.length == 0:
      Broaden: drop the target_emotion filter, keep category only.
      IF still empty: RETURN { narrative: null, mode: 'none', reason: 'No matching narratives' }

  Step 4 — EXCLUDE ALREADY-USED
    session = memoryManager.getSession(sessionId)
    usedIds = session.usedNarratives.map(n → n.id)
    candidates = candidates.filter(n → n.id NOT IN usedIds)

    IF candidates.length == 0:
      Reset: clear session.usedNarratives for this category, re-run filter.
      (This allows narrative reuse after the full pool is exhausted.)

  Step 5 — RANK AND SELECT
    Score each candidate:
      emotionMatchScore  = target_emotion includes current emotion ? 1.0 : 0.5
      lengthScore        = prefer 'short' when repeatCount > 4, else prefer 'medium'
      warmthScore        = tone_profile.warmth (higher is better when distress is high)
      totalScore         = emotionMatchScore × 0.4 + lengthScore × 0.3 + warmthScore × 0.3

    Select the candidate with the highest totalScore.
    On ties, select randomly among tied candidates.

  Step 6 — DETERMINE MODE
    IF this is a fallback scenario (LLM failed):
      mode = 'fallback' — narrative text will be used DIRECTLY as Clara's response
    ELSE:
      mode = 'seed' — narrative text will be injected into the LLM prompt as a reference

  RETURN {
    narrative: selectedNarrative,
    mode: 'seed' | 'fallback',
    reason: 'intent_match' | 'repetition_variation' | 'distress_anchor'
  }
```

### 4.4 Context Assembler Modification

The Context Assembler (`src/contextAssembler.js`) gains a new section — inserted as step 10, after intent-specific directives (step 9):

```
// 10. Narrative seed injection (if Narrative Retriever provided one)
if (narrativeResult && narrativeResult.mode === 'seed' && narrativeResult.narrative) {
    systemParts.push(
        `\nNARRATIVE REFERENCE:\n` +
        `Use the following as inspiration for your tone and content. ` +
        `Do NOT copy it verbatim. Adapt it naturally to the conversation.\n` +
        `"${narrativeResult.narrative.text}"`
    );
}
```

### 4.5 Updated Orchestrator Pseudo-Contract

```
ClaraOrchestrator:
  input:  UserMessage, SessionId
  output: ClaraResponse

  steps:
    emotionResult     ← EmotionAnalyzer.analyze(message, sessionHistory)
    memoryResult      ← MemoryManager.query(sessionId, message)
    safetyPreResult   ← SafetyGuard.validateInput(message, emotionResult)

    IF safetyPreResult == ESCALATE:
      trigger escalation
      RETURN fallbackResponse

    intentResult      ← IntentDetector.detect(message, emotionResult, safetyPreResult)
    narrativeResult   ← NarrativeRetriever.retrieve(intentResult, emotionResult,     // NEW
                                                     memoryResult, sessionId)

    context           ← ContextAssembler.build(message, emotionResult, memoryResult,
                                                safetyPreResult, intentResult,
                                                narrativeResult)                      // MODIFIED

    rawResponse       ← LLMClient.generate(context, intentResult.contract.maxTokens)

    completeness      ← CompletenessValidator.validate(rawResponse, intentResult)
    IF completeness == INCOMPLETE:
      rawResponse     ← LLMClient.regenerate(context, completeness.reason)
      completeness    ← CompletenessValidator.validate(rawResponse, intentResult)
      IF completeness == INCOMPLETE:
        IF narrativeResult.narrative:
          rawResponse ← narrativeResult.narrative.text                                // ENHANCED
        ELSE:
          rawResponse ← SafeResponseBank.getIntentFallback(intentResult.intent)

    safetyPostResult  ← SafetyGuard.validateOutput(rawResponse)
    IF safetyPostResult == REJECTED:
      rawResponse     ← retry or fallback (existing logic)

    pacedResponse     ← ResponsePacer.pace(rawResponse, emotionResult, intentResult)
    RETURN pacedResponse

    ASYNC:
      Logger.log(..., intentResult, narrativeResult)
      MemoryManager.update(...)
      MemoryManager.trackNarrativeUsage(sessionId, narrativeResult)                   // NEW
```

### 4.6 Component-Level Impact Summary

| Component | Change Required |
|-----------|----------------|
| **NarrativeRetriever** | **NEW.** New file `src/narrativeRetriever.js`. Implements retrieval logic. |
| **Narrative Library** | **NEW.** New file `src/data/narrativeLibrary.json`. Contains all curated narratives. |
| **Orchestrator** | Invoke `NarrativeRetriever.retrieve()` after Intent Detection. Pass `narrativeResult` to Context Assembler. Use narrative as enhanced fallback. |
| **Context Assembler** | Accept `narrativeResult` as a new parameter. Inject narrative seed into system prompt when mode is `seed`. |
| **Memory Manager** | Add `usedNarratives` field to session object. Add `trackNarrativeUsage()` method. |
| **Safe Response Bank** | No structural change. The narrative library **supplements** the Safe Response Bank; it does not replace it. The bank remains the ultimate fallback for intents that have no matching narrative. |
| **Logger** | Extend interaction logs to include `narrativeId`, `narrativeMode`, and `narrativeCategory` when a narrative was used. |

### 4.7 Interaction With Existing Intent Layer

The Narrative Retriever respects the intent system's priority and contracts:

| Intent | Narrative Retriever Behavior |
|--------|------------------------------|
| `calming_story` | Always retrieves a `calming_story` narrative as seed. If LLM fails, the narrative is the fallback. |
| `grounding` | Retrieves a `grounding` narrative. Seed includes sensory focus metadata so the LLM knows which senses to emphasize. |
| `emotional_validation` | Retrieves an `emotional_validation` narrative. Seed provides tone reference — the LLM must match the weight, not deflect. |
| `reassurance` | Retrieves a `reassurance` narrative **only** if distress is high (>0.7) or if repetition is detected. Otherwise, the LLM generates freely. |
| `gentle_redirect` | No narrative retrieval. Redirects are handled by the Safety Guard and existing Safe Response Bank. |
| `companionship` | No narrative retrieval. Companionship responses should feel spontaneous, not scripted. |

---

## 5. Dementia-Safe Design Principles

This section explains **why** a curated narrative library is not merely an engineering enhancement but a **clinical necessity** for dementia care.

### 5.1 Predictability

> *"The brain with dementia craves pattern. Novelty is not delight — it is threat."*

People with dementia lose the ability to process unexpected stimuli. An LLM generating fully novel responses every time introduces **micro-novelty** — the phrasing changes, the structure shifts, the emotional contour varies unpredictably. Over many interactions, this produces cumulative cognitive fatigue.

**How curated narratives improve predictability:**
- Each narrative is clinically reviewed and structurally consistent. A `calming_story` **always** has a beginning, middle, and peaceful ending. A `grounding` passage **always** includes a sensory anchor.
- The user does not consciously recognize the predictability — they experience it as **reliability.** "Clara always tells nice stories. Clara always helps me feel calm."
- Even when the LLM generates a variation (using the narrative as a seed), the structural envelope is constrained. The variation is within a safe range, not free-form.

### 5.2 Reduced Confusion

LLM-generated responses, even with strong prompt engineering, occasionally produce:
- Unexpected metaphors that require abstract thinking
- References to concepts the user may not recognize
- Tonal inconsistencies between sentences
- Incomplete thoughts that trail off

Each of these is a **confusion micro-event** for a person with dementia. They may not articulate the confusion, but they feel it as unease, agitation, or withdrawal.

**How curated narratives reduce confusion:**
- Every narrative is written at a **simple vocabulary level** — no abstractions, no metaphors that require interpretation.
- Sensory language (sight, touch, smell, sound) is preferred over conceptual language — sensory processing is often preserved longer than abstract reasoning in dementia.
- Narratives are reviewed by clinical advisors specifically for confusion potential. An LLM output cannot be pre-reviewed.

### 5.3 Emotional Safety

This is the most critical principle. Clara interacts with people during their most vulnerable moments — often alone, often frightened, often unable to distinguish between a screen interaction and a human one.

**Specific emotional safety guarantees provided by curated narratives:**

| Guarantee | Mechanism |
|-----------|-----------|
| No narrative contains conflict, danger, or tension | Clinical review checklist — every narrative is evaluated for emotional triggers |
| No narrative mentions people by name | Schema constraint: narratives use descriptions ("a small bird", "a little cat"), never names — names can trigger identity confusion |
| No narrative references time, dates, or seasons directly | Avoids disorientation for users who have lost time awareness |
| Every narrative ends on a peaceful, conclusive note | `closing_tone` metadata ensures retrieval selects narratives with warm endings |
| Repeated questions receive warm, varied responses | Memory loop pool + usage tracking prevents verbatim repetition while maintaining consistent core reassurance |
| Users never feel "caught" or corrected for repeating | Repetition directive + fresh narrative seed eliminates any hint of "you already asked" |

### 5.4 Avoiding Hallucinations

LLMs hallucinate. This is a known, unavoidable property of current-generation language models. In most applications, hallucination is an inconvenience. In dementia care, it is a **clinical risk**:

- LLM fabricates a person's name → User tries to remember who that person is → Increased confusion and anxiety
- LLM introduces a place or event → User cannot locate it in their memory → Disorientation
- LLM makes a false promise ("I'll tell you more tomorrow") → User remembers the promise but Clara doesn't → Trust erosion

**How curated narratives mitigate hallucination risk:**
- When a narrative seed is provided, the LLM has a **concrete reference** to work from. It is far less likely to hallucinate novel entities when it has a template guiding its output.
- In fallback mode, the narrative is used **directly** — no LLM involvement, zero hallucination risk.
- The narrative library contains only **universal, non-specific content** (gardens, birds, rain, sunlight). There is nothing to hallucinate about.

### 5.5 Trust Building

Trust in dementia care is not binary — it is **accumulated over hundreds of micro-interactions.** Each time Clara responds warmly, completely, and predictably, a small deposit is made into the trust account. Each time she falters, contradicts herself, or feels "off," a withdrawal is made.

**How the narrative library builds trust:**
- **Consistency without rigidity.** The user hears stories that feel similar in warmth and structure but are not identical. This is how trusted human caregivers behave — they have a repertoire, and they draw from it naturally.
- **Completeness guarantee.** Every narrative in the library is **complete.** There are no fragments, no trailing thoughts, no "to be continued." When the narrative is used as a fallback, the user never sees an unfinished response.
- **Emotional matching.** A frightened user receives a narrative optimized for fear. A lonely user receives one optimized for loneliness. The user feels **heard** — Clara is not giving the same generic response to every emotional state.

---

## 6. Scalability Plan

The narrative library begins as a static JSON file loaded into memory at server start. This section describes the three-phase evolution toward a persistent, searchable, clinically managed narrative system.

### 6.1 Phase 1 — Static JSON (Current)

```
src/
  data/
    narrativeLibrary.json     ← All narratives, loaded at server start
  narrativeRetriever.js       ← Reads from in-memory JSON, filters, selects
```

**Characteristics:**
- Entire library is loaded into memory as a JavaScript array on server boot
- Filtering is done with `Array.filter()` and `Array.sort()` — fast, simple, no dependencies
- Session usage tracking is in-memory (lives in `memoryManager.sessions[sessionId].usedNarratives`)
- Adding new narratives requires editing the JSON file and restarting the server
- Suitable for: **up to ~200 narratives, single-server deployment**

**Advantages at this phase:**
- Zero infrastructure cost
- No database setup or migration complexity
- Entire library is version-controlled in Git
- Clinical reviewers can review narratives in a PR-based workflow

### 6.2 Phase 2 — SQLite (Near Future)

```
data/
  clara.db                    ← SQLite file (narratives + session data)
src/
  narrativeRetriever.js       ← Queries SQLite instead of in-memory JSON
  memoryManager.js            ← Sessions persisted to SQLite
```

**What changes:**
- Narratives are stored in a `narratives` table with indexed columns for `category`, `target_emotion`, `approved`
- Session usage tracking moves from in-memory arrays to a `narrative_usage` table
- The Narrative Retriever uses SQL queries instead of array filtering
- New narratives can be added via a caregiver-facing admin tool without server restart
- Session memory persists across server restarts

**When to migrate:**
- When the narrative library exceeds ~200 entries
- When multi-session narrative tracking is needed (remembering across separate conversations)
- When a caregiver admin panel is being built

**What does NOT change:**
- The Narrative Retriever's public interface remains identical: `retrieve(intentResult, emotionResult, memoryResult, sessionId) → narrativeResult`
- The Orchestrator, Context Assembler, and all other components are unaware of the storage layer

### 6.3 Phase 3 — PostgreSQL (Production Scale)

**What changes:**
- SQLite replaced with PostgreSQL for concurrent access, connection pooling, and production reliability
- Narratives table gains JSONB columns for `tone_profile` and `usage_metadata`, enabling rich querying
- Full audit trail: every narrative edit, approval, and usage event is logged
- Role-based access: clinical reviewers can approve narratives; engineers can edit schema; caregivers can view usage reports

**When to migrate:**
- When Clara is deployed for multiple care facilities simultaneously
- When concurrent user sessions exceed SQLite's single-writer limitation
- When regulatory compliance requires a full audit trail

### 6.4 Phase 4 — Vector Search (Optional Future Extension)

**What it enables:**
- **Semantic narrative matching.** Instead of relying on `category` and `target_emotion` metadata alone, the retriever can find narratives whose **meaning** is closest to the user's current emotional context.
- **User-specific narrative resonance.** Over time, the system identifies which narrative *themes* (not specific stories) produce the best emotional trajectory improvements for a specific user. It can then prioritize similar themes.
- **Caregiver narrative suggestions.** Caregivers describe a memory or life event in free text. The vector search finds existing narratives with similar themes, or suggests gaps in the library.

**How it would work:**
- Each narrative's `text` field is embedded into a vector (using a sentence embedding model)
- User messages are embedded at query time
- The Narrative Retriever adds a **semantic similarity score** to the ranking algorithm alongside the existing metadata-based scoring
- The retrieval interface remains identical — the vector search is an implementation detail inside the Narrative Retriever

**Prerequisites:**
- A sentence embedding model (e.g., `all-MiniLM-L6-v2` or equivalent)
- A vector store (e.g., pgvector extension for PostgreSQL, or a dedicated vector DB like Pinecone/Qdrant)
- Sufficient narrative volume to benefit from semantic search (~500+ entries)

**Important note:** Vector search is a **nice-to-have**, not a requirement. Phases 1–3 are fully functional without it. The metadata-based retrieval in the Narrative Retriever is sufficient for libraries of up to several hundred narratives. Vector search becomes valuable only when the library grows large enough that metadata filtering alone produces too many candidates to rank effectively.

### 6.5 Migration Safety Principle

At every phase transition, the following contract holds:

> **The Narrative Retriever's public interface never changes.** The Orchestrator calls `narrativeRetriever.retrieve(...)` and receives a `narrativeResult`. Whether that result came from an in-memory JSON array, a SQLite query, a PostgreSQL query, or a vector similarity search is **invisible** to the rest of the system. This is the same architectural boundary used by the Memory Manager (Section 6 of BRAIN_ARCHITECTURE.md) — the storage layer is encapsulated behind a stable query interface.

---

## Appendix: File Structure After Implementation

```
Clara/
├── src/
│   ├── data/
│   │   └── narrativeLibrary.json       ◄── NEW — Curated narrative entries
│   ├── narrativeRetriever.js           ◄── NEW — Retrieval logic
│   ├── memoryManager.js                     (MODIFIED — usedNarratives tracking)
│   ├── contextAssembler.js                  (MODIFIED — narrative seed injection)
│   ├── orchestrator.js                      (MODIFIED — narrative retrieval step)
│   ├── safeResponseBank.js                  (unchanged — remains as ultimate fallback)
│   ├── intentDetector.js                    (unchanged)
│   ├── completenessValidator.js             (unchanged)
│   ├── emotionAnalyzer.js                   (unchanged)
│   ├── llmClient.js                         (unchanged)
│   ├── responsePacer.js                     (unchanged)
│   ├── safetyGuard.js                       (unchanged)
│   └── logger.js                            (MODIFIED — narrative usage logging)
├── docs/
│   ├── BRAIN_ARCHITECTURE.md                (reference)
│   ├── RESPONSE_INTENT_LAYER.md             (reference)
│   └── NARRATIVE_MEMORY_LAYER.md       ◄── THIS DOCUMENT
```

---

*End of Narrative Memory Layer Design Document*
*Next steps: Implementation of `narrativeLibrary.json` (initial curated entries), `narrativeRetriever.js`, and integration into the Orchestrator and Context Assembler.*
