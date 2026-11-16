# Docker and Local Development

## Services

`docker-compose.yml` runs:

- **db:** `pgvector/pgvector:pg16`, PostgreSQL database and persistent volume.
- **backend:** FastAPI/Uvicorn, migrations, API port `8000`.
- **frontend:** Vite dev server, port `5173`.

The backend waits for the database health check before migrations/startup.
Compose passes `DATABASE_URL`, JWT settings, and optional Gemini settings to
the backend. The frontend receives `VITE_API_URL`.

## Cache strategy

Backend and frontend Dockerfiles install dependencies before copying changing
source files. Dependency layers remain cached when only application code
changes. BuildKit cache mounts preserve pip/npm downloads. `.dockerignore`
keeps virtual environments, node modules, build output, uploads, tests, and
local databases out of build contexts.

## Commands

```powershell
docker compose up --build
docker compose build backend
docker compose up -d backend
docker compose build frontend
docker compose up -d frontend
docker compose config
```

Use a root `.env` for `GEMINI_API_KEY`, `GEMINI_MODEL`,
`GEMINI_TIMEOUT_SECONDS`, and a local JWT secret. `.env` is ignored and must
not be committed.

## Interview trade-off

Compose is appropriate for local reproducibility. Production would separate
managed PostgreSQL/object storage, use secret management, health/readiness
probes, image scanning, CI builds, and independent deployment scaling.
