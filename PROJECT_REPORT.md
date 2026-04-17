# Clara Companion — Comprehensive Project Report

> **Status**: Industrial Pre-Alpha &nbsp;|&nbsp; **License**: Proprietary &nbsp;|&nbsp; **Last Updated**: April 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [The Problem It Solves](#2-the-problem-it-solves)
3. [System Architecture](#3-system-architecture)
4. [Tech Stack](#4-tech-stack)
5. [Directory Structure](#5-directory-structure)
6. [Backend — File-by-File](#6-backend--file-by-file)
7. [Frontend — File-by-File](#7-frontend--file-by-file)
8. [AI & ML Engine](#8-ai--ml-engine)
9. [Database Schema](#9-database-schema)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [Real-Time Chat System](#11-real-time-chat-system)
12. [Safety & Distress Detection](#12-safety--distress-detection)
13. [Caregiver Dashboard](#13-caregiver-dashboard)
14. [Configuration & Environment](#14-configuration--environment)
15. [Docker & Deployment](#15-docker--deployment)
16. [Security Architecture](#16-security-architecture)
17. [Performance Design](#17-performance-design)
18. [Known Limitations & Roadmap](#18-known-limitations--roadmap)
19. [Developer Quick Start](#19-developer-quick-start)

---

## 1. Project Overview

**Clara** is an industrial-grade, empathetic AI companion built specifically for people living with dementia. It runs as a full-stack web application and operates entirely on-premise using local LLM inference — no patient data ever leaves the facility's network.

The system has two primary users:

| User Type | Interface | Purpose |
|-----------|-----------|---------|
| **Patient** | Chat / Voice UI | Ongoing companion for emotional support, memory engagement, and daily conversation |
| **Caregiver / Staff** | Dashboard | Monitor patient well-being, resolve safety alerts, view mood trends, manage profiles |

Clara is not a chatbot. It is an always-present companion that remembers patients across sessions, adapts its persona to each individual's history and preferences, and silently alerts caregivers the moment distress is detected — without ever alarming the patient.

---

## 2. The Problem It Solves

Dementia care presents several interconnected challenges:

**For patients:**
- Isolation and loneliness between scheduled caregiver visits
- Need for continuous, validating social interaction
- Difficulty being understood — caregivers may correct false beliefs or use clinical language
- Risk of distress going unnoticed between rounds

**For caregivers:**
- Inability to monitor emotional state of multiple patients simultaneously
- Delayed awareness of safety incidents (falls, fear episodes, suicidal ideation)
- No longitudinal view of mood trends across days/weeks
- Limited time for individual patient engagement

**Clara's solution:**
- Provides patients with a 24/7 companion that speaks naturally, never corrects, and validates their emotional reality
- Uses clinical reminiscence therapy principles (anchoring, positive memory recall)
- Detects and escalates distress in real time via multi-tier pattern matching
- Gives caregivers a live dashboard with KPIs, mood timelines, and alert workflows
- Stores semantic memory across sessions so every conversation feels continuous
- Operates fully offline on local hardware — zero cloud dependency

---

## 3. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER (Next.js 14)                   │
│                                                                  │
│   Patient Chat UI              Caregiver Dashboard               │
│   ─────────────                ────────────────────              │
│   WebSocket handler            KPI analytics                     │
│   Token streaming              Mood timeline (Recharts)          │
│   Voice STT/TTS                Alert center                      │
│   Distress overlay             Patient profile editor            │
│   Zustand state                Session transcripts               │
│   Framer Motion animations     Patient roster                    │
└──────────────────────────┬───────────────────────────────────────┘
                           │ WebSocket + REST (HTTP/1.1)
┌──────────────────────────▼───────────────────────────────────────┐
│               ORCHESTRATION LAYER (FastAPI + Uvicorn)            │
│                                                                  │
│   WebSocket Gateway    Auth Service     Caregiver API            │
│   Chat Service         Safety Layer     Audit Logger             │
│   AI Engine            Rate Limiting    Email Notifier           │
│   Middleware Stack      Error Handler                            │
└───────────┬──────────────────────────────────┬───────────────────┘
            │                                  │
┌───────────▼──────────┐          ┌────────────▼────────────────────┐
│   AI INFERENCE LAYER │          │   PERSISTENCE LAYER             │
│                      │          │                                 │
│   Ollama             │          │   PostgreSQL 15 + pgvector      │
│   ─────────          │          │   ──────────────────────        │
│   llama3.1:8b        │          │   patients, caregivers,         │
│   (chat + reasoning) │          │   organizations, sessions,      │
│                      │          │   messages (with 768-dim        │
│   nomic-embed-text   │          │   vector embedding),            │
│   (semantic memory)  │          │   alerts, audit logs            │
│                      │          │                                 │
└──────────────────────┘          │   Redis 7                       │
                                  │   ──────                        │
                                  │   Conversation context          │
                                  │   (session-scoped, 24h TTL)     │
                                  └─────────────────────────────────┘
                                             │
                                  ┌──────────▼────────────────────┐
                                  │   EXTERNAL SERVICES           │
                                  │                               │
                                  │   Resend (alert emails)       │
                                  │   Sentry (error tracking)     │
                                  │   Firebase FCM (push, WIP)    │
                                  └───────────────────────────────┘
```

**Key architectural decisions:**

- **Local inference only** — Ollama runs on-premise; no API keys or cloud calls for LLM inference
- **WebSocket for chat** — Enables token-by-token streaming for immediate conversational feel
- **pgvector for memory** — Semantic similarity search gives Clara genuine cross-session recall
- **Redis for context** — Low-latency session context with auto-expiry, avoiding DB reads per turn
- **Async Python throughout** — FastAPI + SQLAlchemy async + httpx async ensures no I/O blocking

---

## 4. Tech Stack

### Backend

| Technology | Version | Role |
|-----------|---------|------|
| Python | 3.12 | Runtime |
| FastAPI | 0.115.0 | Web framework (async, OpenAPI built-in) |
| Uvicorn | 0.30.6 | ASGI server |
| SQLAlchemy | 2.0.35 | Async ORM |
| Alembic | 1.13.3 | Database migrations |
| Pydantic | 2.9.2 | Request/response validation and settings |
| asyncpg | latest | Async PostgreSQL driver |
| redis-py | latest | Async Redis client |
| httpx | latest | Async HTTP client (Ollama communication) |
| python-jose | 3.3.0 | JWT signing and verification |
| passlib + bcrypt | 1.7.4 | Password / passphrase hashing |
| structlog | 24.4.0 | Structured JSON logging |
| Sentry SDK | 2.14.0 | Error tracking and performance monitoring |
| Resend | 2.4.0 | Transactional email (clinical alerts) |

### Frontend

| Technology | Version | Role |
|-----------|---------|------|
| Next.js | 14.2.3 | SSR framework, App Router |
| React | 18.3.1 | UI library |
| TypeScript | 5.4.5 | Type safety |
| Zustand | 4.5.2 | Global state management |
| Framer Motion | 12.38.0 | Animations and transitions |
| TailwindCSS | 3.4.3 | Utility-first styling |
| Recharts | 2.12.7 | Mood timeline charts |
| Axios | latest | HTTP client with interceptors |

### AI / ML

| Component | Technology | Purpose |
|-----------|-----------|---------|
| LLM Inference | Ollama (self-hosted) | Local runtime, no cloud dependency |
| Chat Model | llama3.1:8b | Conversation, reasoning, persona |
| Embedding Model | nomic-embed-text | 768-dim vectors for semantic memory |
| Prompt System | Custom PromptBuilder | Dynamic, patient-specific system prompts |
| Memory Store | PostgreSQL + pgvector | Cosine similarity search across sessions |
| Context Cache | Redis | Short-term conversation window (20 turns) |

### Infrastructure

| Technology | Version | Role |
|-----------|---------|------|
| PostgreSQL | 15-alpine | Primary relational database |
| pgvector | 0.3.6 | Vector similarity extension |
| Redis | 7-alpine | Ephemeral session context |
| Docker + Compose | latest | Local development orchestration |
| GitHub Actions | — | CI/CD pipeline |

---

## 5. Directory Structure

```
ClaraCompanion/
├── clara/
│   ├── backend/                        # FastAPI Python application
│   │   ├── app/
│   │   │   ├── main.py                 # App factory, lifespan, middleware, routing
│   │   │   ├── config.py               # Centralized Pydantic settings
│   │   │   ├── ai/
│   │   │   │   ├── clara_engine.py     # Core AI orchestration (streaming, memory, mood)
│   │   │   │   ├── ollama_client.py    # Async Ollama HTTP client (chat, embed, health)
│   │   │   │   ├── prompt_builder.py   # Dynamic per-patient system prompt construction
│   │   │   │   ├── context_manager.py  # Redis conversation context + summarization
│   │   │   │   ├── mood_classifier.py  # Emotion classification from patient text
│   │   │   │   └── exceptions.py       # AI-layer exception types
│   │   │   ├── api/
│   │   │   │   ├── v1/
│   │   │   │   │   ├── router.py       # V1 API root router (assembles all routes)
│   │   │   │   │   ├── auth.py         # Caregiver login, patient-session token
│   │   │   │   │   ├── patient_auth.py # Patient register + login
│   │   │   │   │   ├── patients.py     # Patient CRUD
│   │   │   │   │   ├── sessions.py     # Session history endpoints
│   │   │   │   │   ├── chat.py         # WebSocket gateway (main chat endpoint)
│   │   │   │   │   └── caregiver.py    # Dashboard analytics, alerts, mood timeline
│   │   │   │   └── deps.py             # FastAPI dependency injections (auth guards)
│   │   │   ├── db/
│   │   │   │   ├── base.py             # DeclarativeBase, Timestamp/SoftDelete/TenantMixin
│   │   │   │   ├── session.py          # AsyncEngine factory, get_db dependency
│   │   │   │   └── redis.py            # Redis client init, constants
│   │   │   ├── models/                 # SQLAlchemy ORM models
│   │   │   │   ├── organization.py     # Tenant root
│   │   │   │   ├── caregiver.py        # Caregiver staff accounts
│   │   │   │   ├── patient.py          # Patient profiles + AI persona data
│   │   │   │   ├── session.py          # ClaraSession (chat session container)
│   │   │   │   ├── message.py          # Chat messages + pgvector embedding column
│   │   │   │   ├── alert.py            # Safety alerts
│   │   │   │   └── audit.py            # Compliance audit log
│   │   │   ├── repositories/           # Database access layer
│   │   │   │   ├── base.py             # Generic async CRUD repository
│   │   │   │   ├── patient_repo.py     # Patient queries (org-scoped)
│   │   │   │   ├── message_repo.py     # Message persistence + semantic search
│   │   │   │   ├── session_repo.py     # Session queries + counters
│   │   │   │   ├── alert_repo.py       # Alert queries + resolution
│   │   │   │   └── organization_repo.py
│   │   │   ├── schemas/                # Pydantic request/response models
│   │   │   │   ├── patient.py
│   │   │   │   ├── message.py
│   │   │   │   ├── session.py
│   │   │   │   ├── alert.py
│   │   │   │   └── caregiver.py
│   │   │   ├── services/               # Business logic
│   │   │   │   ├── auth_service.py     # JWT generation, bcrypt verification
│   │   │   │   ├── chat_service.py     # Message orchestration (persist + embed + audit)
│   │   │   │   ├── email_service.py    # Resend clinical alert emails
│   │   │   │   └── audit_service.py    # AuditLog writer
│   │   │   ├── safety/                 # Distress pipeline
│   │   │   │   ├── distress_detector.py   # Multi-tier regex pattern engine
│   │   │   │   ├── alert_service.py       # Alert creation + notification dispatch
│   │   │   │   ├── rule_engine.py         # Rule definitions
│   │   │   │   └── notification/
│   │   │   │       ├── email_notifier.py  # Email alert sender
│   │   │   │       └── fcm.py             # Firebase Cloud Messaging (WIP)
│   │   │   └── middleware/
│   │   │       ├── logging.py          # Structured per-request logging
│   │   │       ├── rate_limit.py       # Per-IP flood protection
│   │   │       └── error_handler.py    # Global exception handler
│   │   ├── migrations/                 # Alembic migration history
│   │   │   ├── env.py                  # Async Alembic environment config
│   │   │   └── versions/
│   │   │       ├── 2026_03_19_*.py     # Enterprise tenancy + org isolation
│   │   │       ├── 2026_03_20_*.py     # Audit logs, patient activation
│   │   │       └── 2026_04_04_*.py     # pgvector embedding column
│   │   ├── tests/                      # Test suite (scaffolded)
│   │   ├── requirements.txt
│   │   ├── Dockerfile                  # Multi-stage backend image
│   │   ├── alembic.ini
│   │   └── start_backend.bat
│   │
│   ├── frontend/                       # Next.js 14 application
│   │   ├── src/
│   │   │   ├── app/                    # Next.js App Router
│   │   │   │   ├── layout.tsx          # Root layout (providers, fonts, theme)
│   │   │   │   ├── page.tsx            # Landing / home page
│   │   │   │   ├── signin/page.tsx     # Unified auth (patient + caregiver login)
│   │   │   │   ├── chat/page.tsx       # Primary patient chat interface
│   │   │   │   ├── sessions/page.tsx   # Patient session history
│   │   │   │   └── caregiver/
│   │   │   │       ├── layout.tsx      # Dashboard shell layout
│   │   │   │       ├── page.tsx        # KPI dashboard + alert feed
│   │   │   │       ├── login/page.tsx  # Caregiver login page
│   │   │   │       ├── patients/page.tsx
│   │   │   │       ├── patients/[id]/page.tsx  # Patient detail view
│   │   │   │       ├── alerts/page.tsx
│   │   │   │       └── unauthorized.tsx
│   │   │   ├── components/
│   │   │   │   ├── chat/
│   │   │   │   │   ├── ChatWindow.tsx          # Message list + auto-scroll
│   │   │   │   │   ├── InputBar.tsx            # Text input + voice toggle
│   │   │   │   │   ├── MessageBubble.tsx       # Role-styled message card
│   │   │   │   │   ├── TypingIndicator.tsx     # Animated dots during stream
│   │   │   │   │   ├── MoodIndicator.tsx       # Mood badge
│   │   │   │   │   ├── EmergencyCard.tsx       # Fullscreen distress overlay
│   │   │   │   │   ├── VoiceToggle.tsx         # STT activation button
│   │   │   │   │   ├── SuggestedReplies.tsx    # Quick-reply chips
│   │   │   │   │   ├── Sidebar.tsx             # Session info panel
│   │   │   │   │   └── ChatHeader.tsx
│   │   │   │   ├── caregiver/
│   │   │   │   │   ├── AlertFeed.tsx           # Alert list with resolve action
│   │   │   │   │   ├── SessionList.tsx         # Paginated session history
│   │   │   │   │   ├── SessionTranscript.tsx   # Full message replay
│   │   │   │   │   ├── MoodTimeline.tsx        # Recharts mood visualization
│   │   │   │   │   └── PatientProfileEditor.tsx
│   │   │   │   └── ui/
│   │   │   │       ├── Button.tsx
│   │   │   │       ├── AlertNotification.tsx
│   │   │   │       ├── Spinner.tsx
│   │   │   │       └── ErrorBoundary.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useClaraSocket.ts       # WebSocket lifecycle manager
│   │   │   │   ├── useVoiceOrchestrator.ts # STT + TTS coordination
│   │   │   │   └── useMoodUI.ts            # Mood-to-UI state mapping
│   │   │   ├── store/
│   │   │   │   └── claraStore.ts           # Zustand global store
│   │   │   ├── lib/
│   │   │   │   ├── api.ts                  # Axios instance + interceptors
│   │   │   │   ├── tokens.ts               # JWT localStorage utilities
│   │   │   │   └── constants.ts            # Voice params, app constants
│   │   │   ├── types/
│   │   │   │   └── index.ts                # Shared TypeScript types
│   │   │   └── styles/
│   │   │       └── globals.css             # Tailwind base + CSS variables
│   │   ├── public/                         # Static assets
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.mjs
│   │   ├── tailwind.config.ts
│   │   └── Dockerfile
│   │
│   ├── infra/
│   │   ├── docker-compose.yml          # Full local dev stack
│   │   └── .env.example                # Environment variable template
│   │
│   └── ollama/
│       └── Dockerfile                  # Ollama container with pre-pulled models
│
├── README.md
├── PROJECT_REPORT.md                   # This file
├── PROJECT_GUIDE.md                    # Architecture decision guide
├── VOICE_FEATURE_TEST.md
├── VOICE_AGENT_IMPLEMENTATION.md
└── CAREGIVER_DASHBOARD_AUDIT.md
```

---

## 6. Backend — File-by-File

### `app/main.py` — Application Factory

The entry point and configuration hub for the FastAPI application.

**Responsibilities:**
- Runs the async **lifespan** context: on startup it initialises Sentry, health-checks Ollama, and pre-warms both the chat model and the embedding model in parallel. On shutdown it gracefully closes the Redis and Ollama connections.
- Registers the **middleware stack** in order (CORS → error handler → rate limiter → structured logger). FastAPI processes middleware bottom-up, so logging is the innermost layer.
- Mounts the V1 API router at `/api/v1`.
- Provides `GET /` (service discovery) and `GET /health` (lightweight status check).

**Key startup sequence:**
```
1. Sentry init (if DSN configured)
2. ollama_client.health_check()
3. asyncio.gather(
     ollama_client.chat(["hi"], model=chat_model),   # pre-warm chat model into VRAM
     ollama_client.embed("warmup"),                   # pre-warm embedding model into VRAM
   )
4. yield  →  app serves requests
5. ollama_client.close()
6. close_redis()
```

---

### `app/config.py` — Settings

Pydantic `BaseSettings` class that reads all configuration from environment variables. Grouped into nested models:

| Config Group | Key Variables |
|-------------|---------------|
| `db` | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` |
| `redis` | `REDIS_URL`, `REDIS_PASSWORD` |
| `ollama` | `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_EMBEDDING_MODEL`, temperature, num_ctx, etc. |
| `memory` | `MEMORY_TOP_K`, `MEMORY_SIMILARITY_THRESHOLD` |
| `auth` | `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRY_MINUTES` |
| `email` | `RESEND_API_KEY`, `ALERT_EMAIL_FROM`, `ALERT_EMAIL_TO`, `FRONTEND_URL` |
| `obs` | `SENTRY_DSN_BACKEND`, `ENVIRONMENT` |

Uses `@lru_cache` on `get_settings()` so the config is parsed once and reused.

---

### `app/ai/clara_engine.py` — AI Orchestration Engine

The core of the system. The `ClaraEngine` class owns the entire pipeline from user input to streamed response.

**`process_message()` — the main method:**

```
Step 1: Fire three async tasks concurrently (gather pattern)
        ├── mood_task     → mood_classifier.classify(user_message)
        ├── context_task  → context_manager.load_context(session_id)   [Redis GET]
        └── memory_task   → _retrieve_memories(patient, session_id, message)
                              └── ollama_client.embed(user_message)
                              └── message_repo.semantic_search(patient_id, ...)

Step 2: Safety scan (synchronous regex, < 1ms)
        └── distress_detector.analyze_with_severity(user_message)
        └── If distressed → fire AlertService.create_and_notify() as background task

Step 3: Await context_task and memory_task only (mood is not blocking)

Step 4: Build full message payload
        ├── System prompt (built fresh from patient profile)
        ├── Memory messages (recalled past interactions as system context)
        ├── Recent context (last 20 turns from Redis)
        └── User message

Step 5: Stream from Ollama
        └── ollama_client.chat_stream(messages) → yields token deltas
        └── _StreamBuffer.process_token() → removes internal [markers]
        └── yield EngineResponse(token=...) to WebSocket handler

Step 6: Post-stream finalization
        ├── await mood_task (should be done by now)
        ├── Sanitize full response (ResponseSanitizer)
        ├── Save user + clara turns to Redis context
        └── yield EngineResponse(is_final=True, mood=..., distress=...)
```

**`_StreamBuffer` class:**  
Maintains `in_brackets: bool` state. Any character inside `[...]` is swallowed, preventing internal markers (e.g., `[DISTRESS_DETECTED]`) from reaching the patient's screen while adding zero latency to clean tokens.

---

### `app/ai/ollama_client.py` — Async Ollama HTTP Client

Wraps Ollama's REST API using a persistent `httpx.AsyncClient` with a shared connection pool (50 max connections, 10 keepalive).

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `chat_stream()` | `POST /api/chat` (stream=True) | Yields content delta strings token by token |
| `chat()` | `POST /api/chat` (stream=False) | Non-streaming: mood classification, context summarization |
| `embed()` | `POST /api/embeddings` | Returns 768-dim float list (nomic-embed-text) |
| `health_check()` | `GET /api/tags` | Confirms Ollama is reachable |
| `close()` | — | Graceful shutdown of httpx pool |

The client is created eagerly in `__init__` (not lazily) so that no connection pool allocation overhead hits the first user request.

A singleton `ollama_client` instance is exported at module level and shared across the application.

---

### `app/ai/prompt_builder.py` — Dynamic Prompt Construction

Builds the system prompt from a patient's database profile. No patient-specific text is hardcoded anywhere.

**Six sections assembled per request:**

| Block | What It Instructs |
|-------|-------------------|
| `_identity_block` | You are Clara, speaking directly to [name]. Never claim to be AI. Never use third-person pronouns for the patient. |
| `_patient_context_block` | About [name]: full name, age, hometown, occupation, family members, favourite topics, meaningful memories |
| `_communication_style_block` | Keep replies to 1–2 sentences. Direct address only. One question at a time. No sarcasm. Never use slang terms (buddy, pal, etc.) |
| `_memory_grounding_block` | Use reminiscence therapy. Reference interests naturally. Never quiz or test memory. |
| `_dementia_care_protocol_block` | Accept their reality. Never contradict. Watch for sundowning. Offer reassurance. |
| `_safety_protocol_block` | If distress detected, append `[DISTRESS_DETECTED]` at the end. Never show this marker to the patient. |

**`ResponseSanitizer`:**  
Post-generation safety net. Scans Clara's full response for forbidden address terms (`"buddy"`, `"pal"`, `"dude"`, `"hon"`, etc.) and replaces them with the patient's name using whole-word regex matching.

---

### `app/ai/context_manager.py` — Redis Context Window

Manages the rolling conversation history stored in Redis.

| Property | Value |
|----------|-------|
| Redis key | `clara:session:{session_id}:context` |
| TTL | 24 hours |
| Max messages | 20 |
| Overflow strategy | Summarize oldest 10 turns into a single system message |

**Summarization prompt** (sent to Ollama non-streaming):
> "Summarize this interaction between a dementia patient and Clara in one short, factual sentence for continuity. Start with 'Earlier: '."

This keeps the context window lean while preserving important session history. Fallback on summarization failure: truncate the oldest message.

---

### `app/ai/mood_classifier.py` — Emotion Analysis

Analyses the patient's input text and returns a `MoodResult` with:
- `mood`: `"calm"` | `"happy"` | `"confused"` | `"distressed"`
- `confidence`: float 0–1

Runs as a non-critical async task. The stream begins before mood classification is complete; the result is only awaited post-stream to attach to the final response frame.

---

### `app/api/v1/auth.py` — Authentication Endpoints

| Endpoint | Method | Caller | Returns |
|----------|--------|--------|---------|
| `/auth/token` | POST | Caregiver | JWT with `role="caregiver"` |
| `/auth/patient-session` | POST | Caregiver (for a patient) | JWT with `role="patient_session"` |
| `/auth/me` | GET | Any authenticated user | Current user info |
| `/auth/demo-session` | GET | Dev only | Demo patient token |

---

### `app/api/v1/patient_auth.py` — Patient Authentication

| Endpoint | Method | Action |
|----------|--------|--------|
| `/auth/patient/register` | POST | Creates patient + first session. Bcrypt-hashes passphrase. Returns JWT + session_id. |
| `/auth/patient/login` | POST | Verifies passphrase. Creates new ClaraSession. Returns JWT + session_id. |

Patient registration checks for duplicate names within the same organization (case-insensitive).

---

### `app/api/v1/chat.py` — WebSocket Gateway

The most critical endpoint in the system. Handles the full real-time chat lifecycle.

**Connection flow:**
```
1. WebSocket connects with ?token=JWT in query string
2. Decode and validate JWT (role must be patient_session)
3. Verify session belongs to this patient + organization
4. Load patient profile from DB (with 5-second timeout)
5. Send { "type": "connection_ack" } to client
6. Enter message loop:
   a. await websocket.receive_json()
   b. Validate { "type": "message", "content": "...", "input_mode": "..." }
   c. async for engine_response in chat_service.handle_message(...)
      - yield { "type": "token", "content": "..." } for each delta
      - yield { "type": "mood", "mood": "...", "confidence": ... } on completion
      - yield { "type": "done", "distress_detected": ..., ... } as final frame
7. Handle disconnect / error gracefully
```

---

### `app/api/v1/caregiver.py` — Dashboard API

| Endpoint | Returns |
|----------|---------|
| `GET /caregiver/analytics` | `total_patients`, `active_sessions`, `unresolved_alerts`, `stability_index` |
| `GET /caregiver/alerts` | All unresolved alerts for the organization |
| `PATCH /caregiver/alerts/{id}/resolve` | Marks alert resolved, records resolver |
| `GET /caregiver/patients/{id}/mood-timeline` | Day-by-day mood distribution (7–30 days) |
| `GET /caregiver/patients/{id}/sessions` | Paginated session list |
| `GET /caregiver/patients/{id}/sessions/{sid}/messages` | Full session transcript |
| `GET /caregiver/patients/{id}/alerts` | Patient-specific alert history |

All endpoints require `role="caregiver"` (or admin) and are scoped to `organization_id`.

---

### `app/api/v1/patients.py` — Patient CRUD

| Endpoint | Action |
|----------|--------|
| `GET /patients/` | List all active patients in the organization |
| `POST /patients/` | Create patient (caregiver-only) |
| `GET /patients/{id}` | Fetch full patient profile |
| `PATCH /patients/{id}` | Update profile fields (name, preferences, life memories, etc.) |

---

### `app/db/base.py` — ORM Base & Mixins

Three mixins applied to models:

| Mixin | Columns Added | Purpose |
|-------|---------------|---------|
| `TimestampMixin` | `created_at`, `updated_at` | Auto-managed timestamps |
| `SoftDeleteMixin` | `is_deleted`, `deleted_at` | Logical delete (data never physically removed) |
| `TenantMixin` | `organization_id` (FK) | Multi-tenancy: all queries must include this |

---

### `app/db/session.py` — Database Connection

Creates the async SQLAlchemy engine and session factory. Exports `get_db()` as a FastAPI dependency that yields an `AsyncSession` per request with automatic commit/rollback.

Connection pool is pre-warmed at startup (not on first request) using `pool_pre_ping=True`.

---

### `app/db/redis.py` — Redis Client

Initialises an async Redis client using `redis.asyncio`. Exports:
- `redis_client`: shared async instance
- `SESSION_CONTEXT_KEY`: key template `clara:session:{session_id}:context`
- `SESSION_TTL`: 86400 (24 hours)
- `close_redis()`: graceful shutdown

---

### `app/repositories/` — Data Access Layer

All repositories extend `BaseRepository` which provides generic `get_by_id`, `get_all`, `create`, `update`, `delete`.

**`MessageRepository` — most important:**

- `add_message(org_id, patient_id, session_id, role, content, mood, input_mode)` — persists a message turn
- `update_embedding(message_id, embedding)` — attaches 768-dim vector post-stream (async background)
- `get_session_messages(session_id)` — full chronological history
- `get_recent_messages(session_id, limit=20)` — recent turns for context window fill
- `semantic_search(patient_id, current_session_id, query_embedding, top_k, threshold)` — cosine similarity search

```sql
-- Semantic search query (pgvector)
SELECT * FROM messages
WHERE patient_id = :patient_id
  AND session_id != :current_session_id   -- exclude current session
  AND role = 'clara'                       -- only embed Clara's responses
  AND embedding IS NOT NULL
  AND is_deleted = FALSE
  AND (embedding <=> CAST(:vec AS vector)) < :threshold  -- cosine distance
ORDER BY embedding <=> CAST(:vec AS vector)
LIMIT :top_k
```

**`SessionRepository`:**
- `get_by_id_scoped(session_id, org_id)` — validates org ownership before returning
- `increment_message_count_scoped()` — atomic counter increment
- `increment_alert_count_scoped()` — tracks alerts per session

---

### `app/services/chat_service.py` — Message Orchestration

Sits between the WebSocket handler and the AI engine. For each user message:

1. Calls `clara_engine.process_message()` and iterates the async generator
2. Persists the patient's message to the database
3. As the final EngineResponse arrives, persists Clara's response
4. Increments session `message_count`
5. Writes an `AuditLog` entry for the interaction
6. Fires `message_repo.update_embedding()` as a background task (non-blocking)
7. Yields token/mood/done frames back to the WebSocket handler

---

### `app/services/email_service.py` — Clinical Alert Emails

Sends HTML emails via the Resend API when a distress alert fires. The email includes:
- Alert severity label (CRITICAL / HIGH / MEDIUM) with colour coding
- Patient's name
- Detected risk categories
- Snippet of the triggering message
- Link to the caregiver dashboard
- ISO timestamp

---

### `app/safety/distress_detector.py` — Pattern Engine

Analyses patient text against a layered set of compiled regex patterns. Returns a `DistressResult` with:
- `is_distressed: bool`
- `severity: "critical" | "high" | "medium" | None`
- `categories: list[str]` — e.g., `["suicidal_ideation", "acute_fear"]`

Pattern tiers:

| Tier | Example triggers | Categories |
|------|-----------------|-----------|
| CRITICAL | "kill myself", "can't breathe", "heart attack", "paralyzed" | suicidal_ideation, medical_emergency, dying, immobility |
| HIGH | "chest tight", "terrified", "want to leave", "trapped" | physical_pain, acute_fear, exit_seeking |
| MEDIUM | "where am I", "nobody cares", "where's my doctor" | disorientation, emotional_distress, caregiver_concern |

Runs synchronously on every message, typically < 1ms.

---

### `app/middleware/`

| File | Behaviour |
|------|-----------|
| `logging.py` | Logs method, path, status code, duration_ms, client IP using structlog |
| `rate_limit.py` | Per-IP rate limiting to prevent flood abuse |
| `error_handler.py` | Catches all unhandled exceptions. Returns safe error JSON. Forwards to Sentry in production. |

---

## 7. Frontend — File-by-File

### Pages (`src/app/`)

| Page | Route | Access | Purpose |
|------|-------|--------|---------|
| `layout.tsx` | `/` | All | Root layout: providers, fonts, global CSS |
| `page.tsx` | `/` | Public | Landing / home |
| `signin/page.tsx` | `/signin` | Public | Unified auth UI — patient register, patient login, caregiver login (tabs) |
| `chat/page.tsx` | `/chat` | Patient | Main interaction surface — connects WebSocket, renders message stream |
| `sessions/page.tsx` | `/sessions` | Patient | Patient's own session history |
| `caregiver/page.tsx` | `/caregiver` | Caregiver | KPI dashboard: 4 metric cards + alert feed + patient roster |
| `caregiver/login/page.tsx` | `/caregiver/login` | Public | Caregiver-specific login page |
| `caregiver/patients/page.tsx` | `/caregiver/patients` | Caregiver | Full patient roster grid |
| `caregiver/patients/[id]/page.tsx` | `/caregiver/patients/:id` | Caregiver | Patient detail: mood chart, sessions, alerts, profile editor |
| `caregiver/alerts/page.tsx` | `/caregiver/alerts` | Caregiver | Organization-wide alert management |
| `caregiver/unauthorized.tsx` | `/caregiver/unauthorized` | Public | Access denied page |

---

### `store/claraStore.ts` — Global State

Zustand store. Manages all runtime state for the chat interface:

```typescript
{
  // Session identity
  sessionId: string | null
  patientId: string | null
  patientName: string | null
  status: "idle" | "connecting" | "active" | "ended" | "error"

  // Messages
  items: Message[]              // all chat turns
  isStreaming: boolean          // true while Ollama is generating
  lastMessageDone: string | null

  // Mood
  current: MoodState            // latest classified mood
  history: MoodState[]          // mood history for session

  // Voice
  isListening: boolean          // STT active
  isSpeaking: boolean           // TTS active
  mode: "chat" | "voice" | "mixed"

  // Connection
  isConnected: boolean
  lastPing: number | null
  reconnectAttempts: number

  // Safety
  alerts: Alert[]
  emergency: EmergencyState     // triggers EmergencyCard overlay

  // WebSocket
  sendMessage: ((content, mode) => void) | null
}
```

---

### `hooks/useClaraSocket.ts` — WebSocket Manager

The most complex hook. Manages the full WebSocket lifecycle.

**Responsibilities:**
- Opens `ws://backend/api/v1/chat/{session_id}?token={JWT}`
- Handles inbound message types:
  - `token` → appends to current streaming message
  - `mood` → updates Zustand mood state
  - `done` → finalises message, triggers emergency card if `distress_detected=true`
  - `error` → surfaces error state
- Reconnection: exponential backoff, max 5 attempts
- Exposes `sendMessage(content, input_mode)` to components

---

### `hooks/useVoiceOrchestrator.ts` — Voice Engine

Coordinates the two voice pipelines:

**Speech-to-Text (STT):**
- Browser Web Speech API (`SpeechRecognition`)
- Continuous recognition mode
- Shows interim transcripts in real time
- Auto-submits after 5 seconds of silence
- Disabled on non-supporting browsers

**Text-to-Speech (TTS):**
- Browser `SpeechSynthesisUtterance`
- Prefers female voice when available
- Adjusts parameters per detected mood:
  - Calm: rate 1.0, pitch 1.0
  - Happy: rate 1.15, pitch 1.1
  - Distressed: rate 0.85, pitch 0.95

---

### Chat Components (`components/chat/`)

| Component | Responsibility |
|-----------|---------------|
| `ChatWindow.tsx` | Renders the message list. Auto-scrolls to latest. Shows hero greeting on empty session. |
| `InputBar.tsx` | Text input with send button and voice toggle. Handles both chat and voice modes. |
| `MessageBubble.tsx` | Renders an individual message. Left-aligned for patient, right-aligned for Clara. Shows mood badge and input mode icon. |
| `TypingIndicator.tsx` | Three animated dots, shown while `isStreaming=true`. |
| `EmergencyCard.tsx` | Fullscreen overlay shown when `distress_detected=true`. Shows severity and categories. Dismiss button. |
| `MoodIndicator.tsx` | Colour-coded badge for the current session mood. |
| `SuggestedReplies.tsx` | Quick-reply chips for common responses. |
| `VoiceToggle.tsx` | Microphone button for toggling STT. |
| `Sidebar.tsx` | Session metadata panel (patient name, session start time, message count). |

---

### Caregiver Components (`components/caregiver/`)

| Component | Responsibility |
|-----------|---------------|
| `AlertFeed.tsx` | Renders a list of alert cards. Each card shows severity badge, patient name, category tags, message snippet, timestamp, and a Resolve button (optimistic UI). |
| `SessionList.tsx` | Paginated list of past sessions for a patient. Expandable to show transcript preview. |
| `SessionTranscript.tsx` | Full message replay for a specific session. Shows all patient + Clara turns with timestamps. |
| `MoodTimeline.tsx` | Recharts bar/line chart. X-axis = days, Y-axis = mood distribution (calm/happy/confused/distressed). Supports 7-day and 30-day views. |
| `PatientProfileEditor.tsx` | Editable form for all patient profile fields: name, preferred name, date of birth, hometown, language, occupation history, family names, favourite topics, life memories. |

---

### `lib/api.ts` — HTTP Client

Axios instance pre-configured with:
- Base URL pointing to backend
- Request interceptor: automatically injects `Authorization: Bearer {token}` from localStorage
- Response interceptor: handles 401 (redirect to sign-in), surfaces error messages

---

## 8. AI & ML Engine

### Models in Use

| Model | Parameters | Purpose | Context |
|-------|-----------|---------|---------|
| llama3.1:8b | 8 billion | Chat, reasoning, persona, safety signalling | 4096 tokens |
| nomic-embed-text | 137 million | 768-dim semantic embeddings for long-term memory | — |

Both models run locally via Ollama. No external API calls for inference.

---

### Prompt Engineering Philosophy

Clara's system prompt is assembled dynamically from the patient's database record on every request. There is no generic prompt — every interaction is personalised.

The prompt enforces five non-negotiable constraints through multiple redundant rules:
1. **First-person direct address** — never third-person pronouns for the patient
2. **Short responses** — 1–2 sentences maximum (clinical guideline for dementia)
3. **Single questions** — never two questions in one message
4. **No correction of false beliefs** — a core principle of validation therapy
5. **No AI disclosure** — Clara never identifies as software

---

### Long-Term Semantic Memory

Each session builds persistent memory automatically:

```
Every Clara response →
  embed with nomic-embed-text (768-dim vector) →
  store in messages.embedding (pgvector) →
  
On new user message →
  embed user message →
  cosine similarity search across all previous sessions →
  top 4 matches (distance < 0.35 threshold) →
  injected into system prompt as:
    { role: "system", content: "## Memories:\n- [past interaction]\n- [past interaction]" }
```

This gives Clara genuine cross-session memory without fine-tuning. The patient feels remembered because Clara actually recalls relevant past moments.

---

### Context Window Strategy

Short-term context (within a session) is stored in Redis:

| Property | Value |
|----------|-------|
| Max turns | 20 messages |
| On overflow | Summarise oldest 10 → single system message ("Earlier: ...") |
| TTL | 24 hours |

This keeps the LLM's effective context lean (avoiding slow prefill) while preserving session continuity.

---

### Inference Parameters

| Parameter | Value | Effect |
|-----------|-------|--------|
| temperature | 0.65 | Warm and natural, but not erratic |
| num_ctx | 4096 | Context window size |
| num_predict | 400 | Max tokens per response |
| top_k | 50 | Top-k sampling |
| top_p | 0.92 | Nucleus sampling |
| repeat_penalty | 1.1 | Reduces repetitive phrases |

---

## 9. Database Schema

### Entity Relationship Summary

```
Organization (1)
  ├── Caregiver (N)
  ├── Patient (N)
  │     ├── ClaraSession (N)
  │     │     └── Message (N)  ← embedding: Vector(768)
  │     └── Alert (N)
  └── AuditLog (N)
```

---

### Key Models

**`Organization`**
```
id            UUID (PK)
name          VARCHAR
slug          VARCHAR (unique)
assistant_name VARCHAR (default "Clara")
admin_email   VARCHAR
is_active     BOOLEAN
```

**`Patient`**
```
id                 UUID (PK)
organization_id    UUID (FK → Organization)
name               VARCHAR
preferred_name     VARCHAR | NULL
date_of_birth      DATE | NULL
hometown           VARCHAR | NULL
language           VARCHAR (default "en")
hashed_passphrase  VARCHAR | NULL (bcrypt)
is_active          BOOLEAN
is_deleted         BOOLEAN
deleted_at         TIMESTAMP | NULL
occupation_history TEXT | NULL
family_names       JSONB | NULL  -- {"mother": "Jane", "sister": "Sarah"}
favourite_topics   JSONB | NULL  -- ["gardening", "birds", ...]
life_memories      JSONB | NULL  -- [{"title": "...", "description": "..."}, ...]
created_at         TIMESTAMP
updated_at         TIMESTAMP
```

**`ClaraSession`**
```
id              UUID (PK)
organization_id UUID (FK)
patient_id      UUID (FK → Patient)
mode            VARCHAR  -- "chat" | "voice" | "mixed"
mood_summary    VARCHAR | NULL
message_count   INTEGER (default 0)
alert_count     INTEGER (default 0)
started_at      TIMESTAMP
ended_at        TIMESTAMP | NULL   -- NULL = currently active
is_deleted      BOOLEAN
```

**`Message`**
```
id              UUID (PK)
organization_id UUID (FK)
session_id      UUID (FK → ClaraSession, indexed)
patient_id      UUID (FK → Patient, indexed)   -- denormalized for O(1) security
role            VARCHAR   -- "patient" | "clara"
content         TEXT
mood            VARCHAR | NULL
mood_score      FLOAT | NULL
input_mode      VARCHAR | NULL   -- "chat" | "voice"
embedding       VECTOR(768) | NULL  -- pgvector: nomic-embed-text
created_at      TIMESTAMP
is_deleted      BOOLEAN
```

**`Alert`**
```
id               UUID (PK)
organization_id  UUID (FK)
session_id       UUID (FK, indexed)
patient_id       UUID (FK, indexed)
severity         VARCHAR   -- "critical" | "high" | "medium" | "low"
trigger_phrase   TEXT | NULL
rule_name        VARCHAR | NULL
message_content  TEXT | NULL
mood_at_trigger  VARCHAR | NULL
notified_at      TIMESTAMP | NULL
resolved_at      TIMESTAMP | NULL  -- NULL = unresolved
resolved_by      VARCHAR | NULL
created_at       TIMESTAMP
```

**`AuditLog`**
```
id             UUID (PK)
organization_id UUID (FK, indexed)
user_id        UUID | NULL (indexed)
actor_role     VARCHAR   -- "caregiver" | "admin" | "system"
action         VARCHAR   -- "create" | "update" | "delete" | "view_pii" | "ai_interaction"
resource_type  VARCHAR   -- "patient" | "session" | "alert"
resource_id    UUID | NULL
payload_before JSONB | NULL
payload_after  JSONB | NULL
ip_address     VARCHAR | NULL
user_agent     TEXT | NULL
created_at     TIMESTAMP
```

---

### Alembic Migrations History

| Migration | Date | Changes |
|-----------|------|---------|
| `2026_03_19` | Mar 19 2026 | Enterprise hardening: organization_id FK on all tables, soft-delete columns |
| `2026_03_20` | Mar 20 2026 | Audit log table, `is_active` on patients |
| `2026_04_04` | Apr 4 2026 | `embedding VECTOR(768)` column on messages (pgvector) |

---

## 10. Authentication & Authorization

### JWT Token Structure

```json
{
  "sub": "user_uuid",
  "org_id": "organization_uuid",
  "role": "caregiver | admin | patient_session",
  "patient_id": "patient_uuid | null",
  "exp": 1234567890
}
```

- Signed with HS256 using `JWT_SECRET`
- Caregiver tokens: 480-minute expiry
- Patient tokens: 480-minute expiry, carry `patient_id`

### Role Hierarchy

| Role | Permissions |
|------|------------|
| `super_admin` | Full system access |
| `admin` | Full organization access |
| `caregiver` | Dashboard, patient management, alert resolution |
| `patient_session` | Chat WebSocket only |

### FastAPI Dependency Guards

```python
# Caregiver-only routes
async def require_caregiver(token) → CurrentUser:
    decoded = auth_service.decode_token(token)
    assert decoded.role in ["caregiver", "admin", "super_admin"]
    return decoded

# Patient chat
async def require_patient(token) → CurrentUser:
    decoded = auth_service.decode_token(token)
    assert decoded.role == "patient_session"
    return decoded
```

### Multi-Tenant Isolation

Every database query is org-scoped. Repository methods enforce this at the data layer:

```python
# Correct (always)
SELECT * FROM patients
WHERE organization_id = :org_id AND id = :patient_id

# An unscoped query (never acceptable)
SELECT * FROM patients WHERE id = :patient_id
```

The WebSocket handler additionally verifies that the session being connected to belongs to the requesting patient's organization before allowing any messages.

---

## 11. Real-Time Chat System

### WebSocket Message Protocol

**Client → Server:**
```json
{ "type": "message", "content": "Hello Clara", "input_mode": "chat" }
```

**Server → Client (streaming):**
```json
{ "type": "token", "content": "Hello" }
{ "type": "token", "content": " there" }
{ "type": "token", "content": "," }
...
{ "type": "mood", "mood": "calm", "confidence": 0.91 }
{ "type": "done", "distress_detected": false, "distress_severity": null, "distress_categories": [] }
```

**On distress detection:**
```json
{ "type": "done", "distress_detected": true, "distress_severity": "high", "distress_categories": ["acute_fear", "exit_seeking"] }
```

### Token Delivery Latency

The system is designed for minimum first-token latency:

1. Startup pre-warms both models → no VRAM loading on first request
2. httpx connection pool created eagerly → no TCP setup on first call
3. Parallel task dispatch (mood + context + memory) → minimises blocking before stream starts
4. Zero token buffering → every token is forwarded to WebSocket immediately on receipt
5. `_StreamBuffer` processes tokens character-by-character in < 1µs

---

## 12. Safety & Distress Detection

### Detection Pipeline

```
Patient message arrives
       ↓
distress_detector.analyze_with_severity(text)   ← synchronous, < 1ms
       ↓
      ┌── Not distressed → normal flow
      │
      └── Distressed →
            ├── severity: "critical" | "high" | "medium"
            ├── categories: ["suicidal_ideation", "acute_fear", ...]
            ├── asyncio.create_task(AlertService.create_and_notify(...))
            │         ├── Persist Alert row to database
            │         └── email_service.send_clinical_alert(caregiver_email, ...)
            │
            └── LLM prompt includes safety instructions to:
                  - Respond with extra calm and reassurance
                  - Append [DISTRESS_DETECTED] at end of response
                  - _StreamBuffer strips marker before patient sees it
                  - Final EngineResponse carries distress_detected=True
                        ↓
                  Frontend → EmergencyCard overlay shown to caregiver (separate view)
```

### Pattern Tiers

**CRITICAL — immediate escalation:**

| Pattern | Category |
|---------|---------|
| kill myself, want to die, no reason to live | suicidal_ideation |
| I'm dying, going to die | dying |
| heart attack, stroke, can't breathe, seizure | medical_emergency |
| can't move, paralyzed, fell down | immobility |

**HIGH — urgent attention:**

| Pattern | Category |
|---------|---------|
| pain, hurts, burning, chest tight | physical_pain |
| scared, terrified, panic, trapped | acute_fear |
| go home, want to leave, let me out | exit_seeking |

**MEDIUM — monitor:**

| Pattern | Category |
|---------|---------|
| where am I, don't recognise you, lost | disorientation |
| nobody cares, all alone, forgotten | emotional_distress |
| where's my doctor, they left me | caregiver_concern |

### Dual-Layer Safety Response

Clara's safety response operates at two levels simultaneously:
1. **Linguistic** — the LLM is instructed to respond with calm and reassurance
2. **Operational** — the alert fires to caregivers independently of the LLM's response quality

Even if the model produces an imperfect response, the alert system ensures human intervention is triggered.

---

## 13. Caregiver Dashboard

### KPI Metrics

```
GET /caregiver/analytics

{
  "total_patients":    COUNT(patients) WHERE is_active=true, is_deleted=false
  "active_sessions":   COUNT(clara_sessions) WHERE ended_at IS NULL
  "unresolved_alerts": COUNT(alerts) WHERE resolved_at IS NULL
  "stability_index":   % of messages with mood IN ('calm','happy')
                       in the last 7 days (0–100)
}
```

### Dashboard Pages

**Main Dashboard (`/caregiver`)**
- 4 animated KPI cards with loading skeletons
- Alert feed (organization-wide, most recent first)
- Patient roster preview (top 8 patients, links to detail)

**Patient Detail (`/caregiver/patients/{id}`)**
- Profile card: name, age, family members, interests
- Mood timeline chart (7 or 30-day range, bar/line toggle)
- Session list (paginated, with message count and duration)
- Expandable session transcripts
- Alert history for this patient
- Profile editor (all fields editable inline)

**Alert Center (`/caregiver/alerts`)**
- All organization alerts sorted by severity
- Each card: severity badge, patient name, category tags, message excerpt, timestamp
- One-click resolve (optimistic UI — card moves to resolved section instantly)
- Filter by severity and date range

---

## 14. Configuration & Environment

All configuration is managed via environment variables, read through Pydantic `BaseSettings` in `app/config.py`. Copy `clara/infra/.env.example` to `.env` and fill in your values.

```env
# ── Database ─────────────────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/clara

# ── Redis ────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=your_redis_password

# ── AI (Ollama) ──────────────────────────────────────────────────
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_TEMPERATURE=0.65
OLLAMA_NUM_CTX=4096
OLLAMA_NUM_PREDICT=400
OLLAMA_TOP_K_SAMPLING=50
OLLAMA_TOP_P=0.92
OLLAMA_REPEAT_PENALTY=1.1

# ── Memory retrieval ─────────────────────────────────────────────
MEMORY_TOP_K=4
MEMORY_SIMILARITY_THRESHOLD=0.65

# ── Authentication ───────────────────────────────────────────────
JWT_SECRET=change_this_to_a_long_random_string
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=480

# ── Email Alerts ─────────────────────────────────────────────────
RESEND_API_KEY=re_xxxxxxxxxxxxx
ALERT_EMAIL_FROM=alerts@your-domain.com
ALERT_EMAIL_TO=caregiver@facility.com
FRONTEND_URL=http://localhost:3000

# ── Observability ────────────────────────────────────────────────
SENTRY_DSN_BACKEND=https://xxx@sentry.io/xxx  # optional
ENVIRONMENT=development
```

---

## 15. Docker & Deployment

### Services (docker-compose.yml)

```yaml
services:
  frontend:     Next.js app          → port 3000
  backend:      FastAPI (Uvicorn)    → port 8000
  postgres:     PostgreSQL 15        → port 5432  (volume: postgres_data)
  redis:        Redis 7              → port 6379
  ollama:       Ollama + models      → port 11434 (volume: ollama_data)
```

All services communicate on an internal `clara-net` bridge network.

### Backend Dockerfile (multi-stage)

```dockerfile
# Stage 1: Builder — install Python deps into /install
FROM python:3.12-slim AS builder
RUN pip install --prefix=/install -r requirements.txt

# Stage 2: Runtime — minimal image, non-root user
FROM python:3.12-slim
COPY --from=builder /install /usr/local
COPY . /app
WORKDIR /app
RUN groupadd -g 1001 appuser && useradd -r -u 1001 -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

### Ollama Dockerfile

Pre-pulls the required models during image build so they are available immediately on container start:

```dockerfile
FROM ollama/ollama:latest
RUN ollama pull llama3.1:8b
RUN ollama pull nomic-embed-text
```

---

## 16. Security Architecture

### Authentication Security
- **JWT signing**: HS256 with a long random secret (must be set via env var, never committed)
- **Password hashing**: bcrypt with default salt rounds (12)
- **Token expiry**: 8 hours maximum (no refresh tokens yet)

### Authorization Security
- RBAC enforced at the FastAPI dependency layer
- WebSocket validates both role AND org membership before any message is processed
- Patient tokens carry `patient_id` and can only connect to sessions belonging to that patient

### Data Isolation
- All database queries include `organization_id` as the first filter
- Repository methods are designed to be impossible to call without `org_id`
- Soft deletes prevent accidental data exposure via direct ID lookups

### Transport Security
- HTTPS required in production (TLS termination at load balancer or nginx)
- CORS whitelist enforced (configurable via `ALLOWED_ORIGINS`)
- Rate limiting middleware prevents brute-force and flood attacks

### Operational Security
- Non-root user in Docker containers
- No secrets committed to repository (all from env vars)
- Sentry error tracking in production with environment tagging
- Audit log captures all PII access events with IP address

---

## 17. Performance Design

### First-Token Latency (Primary Goal)

The system is explicitly engineered for minimal time from user input to first streamed token:

| Optimization | How |
|-------------|-----|
| Model pre-warming at startup | `asyncio.gather(chat_warmup, embed_warmup)` — both models loaded into VRAM before first request |
| Eager httpx client | Created in `__init__`, not on first call |
| Parallel task dispatch | `mood_task`, `context_task`, `memory_task` all fire concurrently |
| Redis for context | Avoids DB round-trip for conversation history |
| Zero token buffering | Each Ollama delta is immediately forwarded to WebSocket |

### Database Performance

- Indexed columns: `patient_id`, `session_id`, `organization_id`, `resolved_at`, `email`
- Denormalized `patient_id` in `messages` for O(1) security checks (avoids JOIN)
- Soft-delete filter (`is_deleted = FALSE`) on all indexed queries
- Pagination on all list endpoints (`skip` + `limit`)
- pgvector cosine similarity index for embedding search

### Async Architecture

- 100% async Python (FastAPI + SQLAlchemy async + httpx async + redis asyncio)
- Zero blocking I/O on any request path
- Background tasks for embedding updates and email dispatch
- Non-critical tasks (mood classification) do not block streaming

---

## 18. Known Limitations & Roadmap

### Current Limitations

| Area | Limitation |
|------|-----------|
| **AI** | Single Ollama instance — no load balancing or failover |
| **AI** | Distress detection is regex-only — no ML-based false-positive reduction |
| **Auth** | No token refresh — patients must re-login after 8 hours |
| **Caregiver** | No role granularity — all caregivers see all patients in the org |
| **Voice** | Browser Web Speech API only — no server-side STT/TTS |
| **Memory** | Embedding only on Clara's responses (not patient turns) |
| **Compliance** | No HIPAA/GDPR export tooling yet |
| **Testing** | Test coverage is minimal (scaffolded only) |

### Roadmap

**Short-term (next sprint):**
- [ ] Token refresh endpoint
- [ ] Caregiver-to-patient assignment (restrict visibility)
- [ ] Unit tests for distress detection, auth flows, semantic search

**Medium-term:**
- [ ] Advanced mood analytics (trends, anomaly detection)
- [ ] Patient consent management workflow
- [ ] Session recording and replay with timestamps
- [ ] Multi-language response capability (beyond profile language field)

**Long-term:**
- [ ] ML-based distress classifier (replaces regex tier)
- [ ] EHR integration (HL7/FHIR)
- [ ] Custom AI persona per organization
- [ ] HIPAA compliance exports
- [ ] WebRTC video call support
- [ ] Offline mode (service workers for low-connectivity environments)

---

## 19. Developer Quick Start

### Prerequisites

- Docker + Docker Compose
- Node.js 20+
- Python 3.12+
- Ollama (local) or Docker Compose (handled automatically)

---

### Option A: Full Docker Stack (recommended)

```bash
# 1. Clone and configure
git clone <repo>
cd ClaraCompanion/clara/infra
cp .env.example .env
# Edit .env with your values

# 2. Start all services
docker-compose up -d

# 3. Run migrations
docker-compose exec backend alembic upgrade head

# 4. Access
# Frontend: http://localhost:3000
# Backend docs: http://localhost:8000/docs
# API: http://localhost:8000/api/v1
```

---

### Option B: Local Development

**Backend:**
```bash
cd clara/backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../infra/.env.example .env    # adjust paths as needed
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd clara/frontend
npm install
# create .env.local with NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
# Available at http://localhost:3000
```

**Ollama (local):**
```bash
ollama pull llama3.1:8b
ollama pull nomic-embed-text
# Ollama runs on http://localhost:11434 by default
```

**Database (Docker only):**
```bash
cd clara/infra
docker-compose up postgres redis -d
```

---

### Creating the First Organization & Caregiver

The system requires a seed organization and caregiver account. Use the database directly or a seed script:

```sql
-- Insert organization
INSERT INTO organizations (id, name, slug, admin_email, is_active)
VALUES (gen_random_uuid(), 'Demo Care Home', 'demo', 'admin@demo.com', true);

-- Insert caregiver (password: use bcrypt hash of your choice)
INSERT INTO caregivers (id, organization_id, email, hashed_password, full_name)
VALUES (gen_random_uuid(), '<org_id>', 'caregiver@demo.com', '<bcrypt_hash>', 'Demo Caregiver');
```

---

### Key API Endpoints for Testing

| Purpose | Request |
|---------|---------|
| Caregiver login | `POST /api/v1/auth/token` `{"email": "...", "password": "..."}` |
| Create patient | `POST /api/v1/patients/` (caregiver token required) |
| Patient register | `POST /api/v1/auth/patient/register` |
| Patient login | `POST /api/v1/auth/patient/login` |
| Connect to chat | `WebSocket /api/v1/chat/{session_id}?token={jwt}` |
| Dashboard KPIs | `GET /api/v1/caregiver/analytics` |
| Health check | `GET /health` |

---

*This report was generated from a full codebase audit conducted April 2026.*  
*For architecture decisions and rationale, see `PROJECT_GUIDE.md`.*  
*For voice feature implementation details, see `VOICE_AGENT_IMPLEMENTATION.md`.*
