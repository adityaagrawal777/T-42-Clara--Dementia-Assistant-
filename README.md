# 🌸 Clara — Emotion-Aware AI Companion for Dementia Care for everyone

Clara is a chat-based AI companion designed specifically to support people living with dementia. She provides emotional reassurance, calmness, and a sense of safety through gentle, warm conversation.

> **Clara's goal is not to solve problems. Her goal is to reduce distress and provide emotional continuity.**

---

## 🧠 Architecture Overview

Clara is not a simple chatbot. She is an **orchestrated brain pipeline** with dedicated components for emotion understanding, safety validation, memory-aware context building, and humanized response delivery.

```
User Message
     │
     ▼
┌─────────────────────┐
│  Emotion Analyzer    │  Classify emotional state
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  Memory Manager      │  Repetition detection, entity tracking
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  Safety Guard (Pre)  │  Crisis detection, medical redirect
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  Context Assembler   │  Build dynamic LLM prompt
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  LLM Client (Groq)  │  Generate response
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  Safety Guard (Post) │  Validate LLM output
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  Response Pacer      │  Humanized delay & chunking
└─────────────────────┘
```

---

## 📁 Project Structure

```
Clara/
├── server.js                    # Express entry point
├── package.json
├── .gitignore
│
├── routes/
│   ├── chat.js                  # POST /api/v1/chat
│   ├── session.js               # Session management endpoints
│   ├── health.js                # GET /api/v1/health
│   └── escalate.js              # POST /api/v1/escalate
│
├── src/
│   ├── orchestrator.js          # Central brain coordinator
│   ├── emotionAnalyzer.js       # Keyword-weighted emotion classification
│   ├── memoryManager.js         # Session memory & repetition detection
│   ├── safetyGuard.js           # Pre/post response safety validation
│   ├── contextAssembler.js      # Dynamic LLM prompt builder
│   ├── llmClient.js             # Groq API wrapper with retry & fallback
│   ├── responsePacer.js         # Humanized delay & sentence chunking
│   ├── safeResponseBank.js      # Curated fallback response library
│   ├── logger.js                # Structured interaction & escalation logging
│   └── config/
│       └── persona.js           # Clara's versioned persona configuration
│
├── public/
│   ├── index.html               # Chat UI
│   ├── style.css                # Warm, calming design system
│   └── app.js                   # Frontend chat logic with pacing support
│
├── docs/
│   └── BRAIN_ARCHITECTURE.md    # Full backend design document
│
└── logs/                        # Auto-created, escalation audit trail
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ installed
- **Groq API Key**

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd Clara

# Install dependencies
npm install

# Start the server
node server.js
```

Clara will be available at **http://localhost:3000**

---

## 🔌 API Endpoints

### `POST /api/v1/chat`
Primary chat endpoint. Processes through the full brain pipeline.

```json
// Request
{
  "sessionId": "session_123",
  "message": "I feel scared and don't know where I am"
}

// Response
{
  "sessionId": "session_123",
  "reply": "You are safe, dear. I am right here with you. 💛",
  "emotion": {
    "detected": "fearful",
    "confidence": 0.85,
    "distressScore": 0.72,
    "trajectory": "stable"
  },
  "pacing": {
    "initialDelayMs": 2400,
    "chunks": [
      { "text": "You are safe, dear.", "preDelayMs": 0 },
      { "text": "I am right here with you. 💛", "preDelayMs": 1100 }
    ]
  },
  "escalation": { "triggered": false },
  "meta": { "responseId": "resp_abc123", "processingTimeMs": 1850 }
}
```

### `POST /api/v1/session`
Create a session with optional caregiver context.

```json
// Request
{
  "caregiverContext": {
    "userName": "Grandma",
    "knownTopics": ["garden", "dog Max", "daughter Sarah"],
    "avoidTopics": ["hospital", "driving"]
  }
}
```

### `GET /api/v1/session/:id`
Retrieve session state and emotion history.

### `POST /api/v1/session/:id/end`
Gracefully close a session with a warm farewell.

### `GET /api/v1/health`
System health check.

### `POST /api/v1/escalate`
Log an escalation event when crisis is detected.

---

## 🛡️ Safety Features

| Feature | Description |
|---------|-------------|
| **Crisis Detection** | Regex-based scanning for self-harm and crisis language → triggers caregiver escalation |
| **Medical Redirect** | Detects medical questions → responds with curated safe redirects, never medical advice |
| **Post-Response Validation** | Scans LLM output for forbidden patterns (mentioning dementia, pointing out repetition, future promises) |
| **Complexity Guard** | Rejects LLM responses that are too long (>60 words) or use complex vocabulary |
| **Graceful Degradation** | If LLM fails, Clara responds from the Safe Response Bank — never shows errors |
| **Regeneration** | If post-safety rejects the LLM output, it retries up to 2 times before using a fallback |

---

## 💛 Emotion System

Clara detects 7 emotional states: `anxious`, `confused`, `fearful`, `lonely`, `sad`, `neutral`, `calm`

Each emotion adjusts:
- **Tone directive** in the LLM prompt (softer when distressed)
- **Response pacing** (slower delivery when the user is upset)
- **Avatar aura color** in the frontend UI

The system also tracks:
- **Distress score** — Rolling weighted average across recent messages
- **Trajectory** — `escalating`, `stable`, or `de-escalating`

---

## ⏱️ Response Pacing

Clara never responds instantly. Her responses are deliberately paced to feel human and caring:

- **Initial delay**: 1.5–4 seconds (longer when the user is distressed)
- **Chunked delivery**: Responses split at sentence boundaries, delivered with pauses between them
- **Randomized variance**: Prevents robotic consistency

---

## 🔄 Repetition Handling

People with dementia may ask the same question many times. Clara:
- Detects semantic repetition (not just exact matches)
- **Never points out** that a question was asked before
- Responds as if hearing it for the very first time
- Uses familiar, comforting phrasing

---

## 📋 Design Principles

1. **Safety First** — Every response passes through validation. No unvalidated LLM output reaches the user.
2. **Warmth Over Accuracy** — Emotional comfort is more important than being factually correct.
3. **Graceful Degradation** — No component failure results in silence or an error message.
4. **Brevity as a Feature** — Short, warm statements (1–3 sentences) are easier to process.
5. **Never Correct, Never Rush** — Clara never points out mistakes or rushes.

---

## 📄 Documentation

- **[Backend Brain Architecture](./docs/BRAIN_ARCHITECTURE.md)** — Comprehensive internal design document covering all components, data flows, and design decisions.

---

## 🔮 Future Roadmap

- [ ] Persistent memory (database-backed cross-session memory)
- [ ] Caregiver dashboard (view emotion history, escalation logs)
- [ ] Narrative memory (caregiver-provided life stories)
- [ ] Voice input/output (Whisper + TTS)
- [ ] Multi-language support
- [ ] Emotional profile (long-term baselines per user)

---

*Built with care for those who need gentleness most. 💛*
