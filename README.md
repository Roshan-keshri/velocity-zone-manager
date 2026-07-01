# Velocity Zone Manager

Velocity Zone Manager is a full-stack demo app for managing properties and drawing delivery/coverage zones.

## Stack

- Backend: Flask, SQLAlchemy, JWT auth
- Database: PostgreSQL (via Docker Compose)
- Frontend: React + TypeScript + Vite + Tailwind CSS

## Quick Start

1. Build and start everything:

```bash
docker compose up --build
```

2. Open the app:

- Frontend: http://localhost:5173
- Backend health check: http://localhost:5000/health


## Services

- `postgres`: database initialized with [backend/db/init.sql](backend/db/init.sql)
- `backend`: Flask API on port `5000`
- `frontend`: Vite dev server on port `5173`

## Useful Commands

Run backend tests locally from repo root:

```bash
cd backend
pytest
```

Re-seed database manually inside backend container:

```bash
docker compose exec backend python seed.py
```

## API Endpoints (summary)

- `POST /auth/signup`
- `POST /auth/login`
- `GET /properties` (JWT required)
- `GET /properties/:id` (JWT required)
- `GET /properties/:id/zones` (JWT required)
