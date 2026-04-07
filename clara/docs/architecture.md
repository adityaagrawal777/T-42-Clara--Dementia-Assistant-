# Clara AI System Architecture

Clara is structured as a resilient, multi-layered monorepo to ensure clean separation of concerns and scalability.

## 📦 Service Layers

### 1. Frontend (Next.js 14)
- **Framework**: App Router (React 18).
- **Styling**: Tailwind CSS (if requested, else CSS Modules/Vanilla CSS).
- **Communication**: WebSocket (Real-time Chat) and REST (Caregiver Dashboard).
- **Visuals**: Dynamic, emotion-aware themes and grounding avatar glows.

### 2. Backend (FastAPI)
- **Framework**: Python 3.12 (Pydantic 2.0).
- **Storage**: SQLAlchemy 2.0 (PostgreSQL/Supabase via asyncpg) and Redis for state.
- **Repository Pattern**: Abstract data access for patients, sessions, and alerts.
- **Authentication**: JWT-based (Caregiver and Patient Session tokens).

### 3. AI Engine (Ollama / Llama 3.2:1b)
- **Model**: Llama-based (fine-tuned for empathy via system prompts).
- **Intelligence**: 
  - **Mood Classification**: Multi-strategy (Pattern + LLM).
  - **Context Management**: Rolling window with automated summarization.
  - **Prompt Engineering**: Validation and Reminiscence therapy sections.

### 4. Infrastructure (Docker)
- **Networking**: Shared bridge network (`clara-net`).
- **Orchestration**: Docker Compose with health checks and volume persistence for Ollama models and Redis data.

## 🔄 Data & Communication Flow

1.  **Patient Interaction**: User speaks or types → Frontend sends message via WebSocket.
2.  **AI Orchestration**: Backend receives WS message → Decodes token → Classifies mood → Fetches context from Redis → Builds prompt → Streams response from Ollama.
3.  **Persistence**: Every message and mood change is stored in PostgreSQL for caregiver review.
4.  **Safety & Alerting**: If `[DISTRESS_DETECTED]` is identified, the backend triggers an automated alert workflow (notified to caregivers via FCM/Email).

---
*For development setups, please refer to the main [README.md](../README.md).*
