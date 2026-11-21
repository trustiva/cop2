# Document Copilot — Glass-Box Gemini RAG Research Assistant

[![Python 3.13](https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Gemini API](https://img.shields.io/badge/Gemini-3.5%20Flash--Lite-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![pgvector](https://img.shields.io/badge/Postgres-pgvector%20%2B%20FTS-336791?logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Deploy on Railway](https://img.shields.io/badge/Deploy-Railway-0B0D0E?logo=railway&logoColor=white)](docs/guides/railway-deployment.md)

An open-source, production-ready **Glass-Box RAG** AI copilot for querying SEC 10-K/10-Q filings and custom research memos with **strict citation verification**, **live agent reasoning traces**, **drag-and-drop Gemini embedding ingestion**, and a **keyboard-first `⌘K` terminal UI**.

## Why Document Copilot?

Most open-source RAG demos dump unverified text from an LLM. Document Copilot enforces an institutional **grounding trust contract**:
- **Live Glass-Box Agent Trace**: Watch every retrieval, Gemini reasoning, and citation-verification step stream in real time via SSE, with model & latency telemetry.
- **Anti-Hallucination Grounding Validator**: Every claim must reference a retrieved `chunk_id` with verifiable source text, or the assistant issues a controlled refusal.
- **Interactive Passage Inspector**: Click any verified citation pill (even after reloading a thread) to inspect the exact highlighted passage and jump straight to the original SEC EDGAR filing.
- **In-App Drag-and-Drop Document Ingestion**: Drop `.md`, `.txt`, or `.html` filings/memos directly in the UI to chunk and embed them into Supabase `pgvector` with `gemini-embedding-2`.
- **Keyboard-First Analyst UX**: `⌘K` / `Ctrl+K` Command Palette, ticker focus chips (`AAPL`, `MSFT`, `GOOGL`, `AMZN`, `NVDA`), Dark/Light mode, copy with citations, and one-click `.md` research brief export.

## Architecture

```text
React 19 + Tailwind v4 SPA (Nginx)
   │  SSE (/chat/stream) · REST (/threads, /documents/upload, /documents/stats)
   ▼
FastAPI + PydanticAI Agent (Python 3.13 + uv)
   ├── Hybrid Retriever: Supabase pgvector (1536d) + Postgres FTS + RRF Fusion
   ├── Google Gemini API: gemini-3.5-flash-lite (chat) + gemini-embedding-2 (vectors)
   └── Grounding Validator: Enforces chunk_id & quote verification before streaming
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| **LLM & Embeddings** | Google Gemini API (`gemini-3.5-flash-lite` + `gemini-embedding-2` @ 1536d) |
| **Agent Framework** | PydanticAI + custom Hybrid Retriever tools + multi-turn memory |
| **Backend** | Python 3.13, FastAPI, SQLAlchemy 2.0, Alembic, `psycopg` v3, `uv` |
| **Database & Auth** | Supabase PostgreSQL (`pgvector` + `tsvector` GIN) + Supabase Email Auth |
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS v4 |
| **Deployment** | Docker + Railway (auto-migrations + dynamic `$PORT` Nginx) |

## Quick Start

1. **Supabase**: Follow [docs/guides/supabase-setup.md](docs/guides/supabase-setup.md) to get `DATABASE_URL` (`postgresql+psycopg://...`), `SUPABASE_URL`, and `SUPABASE_ANON_KEY`.
2. **Gemini API Key**: Create a key in [Google AI Studio](https://aistudio.google.com/apikey).
3. **Backend (`backend/`)**:
   ```bash
   cp .env.example .env   # fill in DATABASE_URL, SUPABASE_*, GEMINI_API_KEY
   uv sync
   uv run alembic upgrade head
   uv run uvicorn app.main:app --reload
   ```
4. **Frontend (`frontend/`)**:
   ```bash
   cp .env.example .env   # fill in VITE_API_BASE_URL, VITE_SUPABASE_*
   pnpm install
   pnpm dev
   ```
5. **Load Sample SEC Filings** (optional — or use the in-app **Upload Filing / Memo** modal):
   ```bash
   python data/download.py
   cd backend && uv run python -m app.ingest.pipeline --limit 5
   ```

## Deploy to Railway

See the step-by-step guide in [docs/guides/railway-deployment.md](docs/guides/railway-deployment.md).
