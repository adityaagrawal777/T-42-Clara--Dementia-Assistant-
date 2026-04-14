# Clara: The Empathetic Dementia Assistant — Project Guide

## 1. Project Overview
**Clara** is a sophisticated, AI-driven companion designed specifically for individuals living with dementia. It serves a dual purpose:
1.  **For Patients**: Provides a constant, empathetic presence that can engage in meaningful conversation, support memory recall, and assist with daily routines using real-time streaming AI.
2.  **For Caregivers**: Offers a powerful dashboard to monitor patient well-being, track session history, and receive proactive alerts regarding the patient's cognitive state and mood.

The project is architected for low-latency, human-like interaction, utilizing advanced LLMs (via Ollama/Gemini) with a robust backend to ensure safety and persistent memory.

---

## 2. Core Capabilities (Current Stage)
- **Real-Time Streaming Chat**: Clara "thinks" and speaks in real-time, providing immediate responses to minimize patient confusion.
- **Empathetic AI Engine**: Personality-driven responses tailored to dementia care, focusing on validation and gentle redirection.
- **Patient Management**: Secure profiles for patients, including "Family & Friends" context for RAG-based memory support.
- **Caregiver Dashboard**: Full observability into patient sessions, mood trends, and cognitive performance.
- **Mood & Safety Monitoring**: Backend classifiers that analyze patient input for distress or safety risks.
- **Authentication**: Role-based access control (RBAC) ensuring only authorized caregivers can access patient data.

---

## 3. Tech Stack

### Backend (Python Core)
- **FastAPI**: High-performance web framework for the API gateway.
- **SQLAlchemy (Async)**: Modern ORM for database interactions.
- **PostgreSQL + pgvector**: Relational data storage with vector support for AI memory (RAG).
- **Redis**: Low-latency caching and session management.
- **Ollama**: Local AI engine for hosting empathetic models (Llama 3/Mistral/etc.).
- **Pydantic V2**: Strict data validation and settings management.
- **Alembic**: Database version control and migrations.
- **Sentry & Structlog**: Professional observability and structured logging.

### Frontend (TypeScript/React Core)
- **Next.js 14 (App Router)**: Framework for high-performance server-side rendering and routing.
- **TailwindCSS**: Utility-first styling with a custom, premium design system.
- **Framer Motion**: Fluid, high-end animations for a premium user experience.
- **Zustand**: Lightweight, reactive state management for the chat and UI state.
- **Lucide React**: Clean, modern iconography.
- **Recharts**: Dynamic data visualization for patient health metrics.

---

## 4. Directory & File Breakdown

### Root Directory
- `PROJECT_GUIDE.md`: This file — the definitive map of the project.
- `README.md`: High-level introduction and quick start.
- `backend.log` / `frontend.log`: Runtime logs for debugging.
- `clara/`: Main source directory containing the entire application code.

### Backend (`clara/backend/`)
#### Core Application (`app/`)
- `main.py`: Entry point. Initializes FastAPI, middleware, and routers.
- `config.py`: Centralized settings management using `BaseSettings`.

#### AI Engine (`app/ai/`)
- `clara_engine.py`: The "brain." Orchestrates LLM calls, context management, and tools.
- `ollama_client.py`: Async client for interacting with the Ollama service.
- `prompt_builder.py`: Constructs complex, empathetic prompts based on patient context.
- `context_manager.py`: Handles conversation history and RAG context injection.
- `mood_classifier.py`: Analyzes text for emotional state and safety concerns.
- `exceptions.py`: AI-specific error handling.
- `clara.Modelfile`: Definition file for the custom Ollama model.

#### API Layer (`app/api/v1/`)
- `router.py`: Root router connecting all sub-modules.
- `auth.py`: Caregiver registration, login, and token management.
- `patient_auth.py`: Specific authentication flows for patients (e.g., PIN-based).
- `patients.py`: Patient profile management (CRUD).
- `sessions.py`: Tracking chat sessions and history.
- `caregiver.py`: Endpoints for caregiver-specific dashboard data.
- `chat.py`: The real-time chat gateway (HTTP and potentially WebSocket).

#### Data Layer (`app/db/`, `app/models/`, `app/repositories/`, `app/schemas/`)
- **DB**:
  - `session.py`: Async engine and session factory setup.
  - `base.py`: Declarative base for SQLAlchemy models.
  - `redis.py`: Redis client initialization and teardown.
- **Models** (Database Entities):
  - `caregiver.py`, `patient.py`, `session.py`, `message.py`, `alert.py`, `audit.py`.
- **Repositories** (Data Access Pattern):
  - `base.py`: Generic CRUD operations.
  - `patient_repo.py`, `message_repo.py`, etc.: Entity-specific queries.
- **Schemas** (Pydantic Models):
  - `caregiver.py`, `patient.py`, `session.py`, `alert.py`: Data shapes for API I/O.

#### Logic & Safety (`app/services/`, `app/middleware/`, `app/safety/`)
- **Services**: `auth_service.py`, `chat_service.py`, `email_service.py`, `audit_service.py`.
- **Middleware**: `logging.py`, `rate_limit.py`, `error_handler.py`.
- **Safety**: Specialized logic to prevent toxic or confusing AI outputs.

#### Infrastructure & Tests
- `migrations/`: Alembic directory containing the database schema timeline.
- `tests/`: Comprehensive test suite (unit and integration).
- `requirements.txt`: Backend python dependencies.
- `Dockerfile`: Container definition for backend services.
- `alembic.ini`: Database migration configuration.

---

### Frontend (`clara/frontend/`)
#### App Structure (`src/app/`)
- `layout.tsx`: Root layout (fonts, providers, global styles).
- `page.tsx`: Landing page.
- `signin/page.tsx`: Unified authentication interface.
- `chat/page.tsx`: The primary interaction surface for patients.
- `caregiver/`: Sub-routes for the caregiver dashboard and insights.

#### UI Components (`src/components/`)
- `ui/`: Reusable, atomic components (Buttons, Inputs, Cards).
- `chat/`: Chat-specific components (Message bubbles, Typing indicators, Stream handler).
- `caregiver/`: Dashboard charts, patient list items, and alert cards.

#### State & Logic (`src/store/`, `src/lib/`, `src/hooks/`)
- `store/claraStore.ts`: Central Zustand store for conversation and user state.
- `lib/api-client.ts`: Axios/Fetch wrapper for backend communication.
- `hooks/`: Custom React hooks for timers, streaming, and effects.

#### Styling & Config
- `styles/globals.css`: Global Tailwind and CSS variable definitions.
- `tailwind.config.ts`: Custom design tokens (colors, spacing, animations).
- `package.json`: Frontend dependency list.
- `next.config.mjs`: Next.js specific optimizations.

---

## 5. Infrastructure & Operations
- **`clara/infra/`**:
  - `docker-compose.yml`: Local development stack (App, DB, Redis, Ollama).
  - `.env.example`: Template for required environment variables.
- **`clara/ollama/`**:
  - `Dockerfile`: Custom Ollama image with pre-loaded models and configs.
- **Batch Scripts**:
  - `start_backend.bat` / `start_frontend.bat`: Convenience scripts for quick local launch.

---

## 6. How it works (The Workflow)
1.  **Patient Auth**: Patient logs in (via caregiver PIN or auto-login).
2.  **Session Init**: A new session is created in the DB, and the AI context is primed with patient memory.
3.  **The Loop**:
    - Patient speaks/types.
    - `chat_service` receives input and calls `clara_engine`.
    - `clara_engine` builds an empathetic prompt and streams tokens from Ollama.
    - Frontend reflects tokens in real-time via the `TypingIndicator` and stream handler.
4.  **Insight Logging**: Every turn is analyzed for mood; distressed patterns trigger an `Alert` visible to the caregiver.
5.  **Audit**: Every critical action is logged in the `audit` table for security and compliance.
