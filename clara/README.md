# Clara — Dementia Care AI Companion

Clara is a professional-grade, empathetic AI companion designed specifically for dementia care. It supports both voice and chat interactions with mood-aware responses, providing a safe and grounding environment for patients while offering oversight for caregivers.

## 🚀 Vision
Clara leverages state-of-the-art LLMs (Llama 3.2 1b/8b) and empathetic persona engineering to validate and support patients, moving away from "correction therapy" toward emotional validation and reminiscence therapy.

## 🛠️ Prerequisites
- **Docker & Docker Compose**: Essential for running the multi-service architecture.
- **Node.js 20**: For the Next.js frontend development.
- **Python 3.12**: For the FastAPI backend development.
- **Ollama**: Recommended locally for development if not using the Docker container.

## ⚡ Quick Start
1.  **Clone** the repository.
2.  **Environment Setup**:
    ```bash
    cp infra/.env.example infra/.env
    # Fill in the required keys (Supabase, OpenAI/Ollama, Redis Password)
    ```
3.  **Run with Docker**:
    ```bash
    docker compose -f infra/docker-compose.yml up --build
    ```
4.  **Access the applications**:
    - **Frontend**: `http://localhost:3000`
    - **Backend API**: `http://localhost:8000/docs` (Swagger UI)
    - **Ollama API**: `http://localhost:11434`

## 🏗️ Architecture
Details on the service layers and data flow can be found in [docs/architecture.md](docs/architecture.md).

---
> [!IMPORTANT]
> **Security Reminder**: Never commit your `.env` file to the repository. The `.gitignore` is configured to protect environment secrets.
