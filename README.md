# Fullstack Monorepo

Production-oriented layout with a **React 19 + Vite** client, **Express** API, **PostgreSQL**, and **Prisma**. State on the client uses **Redux Toolkit** and **RTK Query** for API calls and caching.

## Layout

- `frontend/` — React 19, Vite, Redux Toolkit, RTK Query, React Router
- `backend/` — Express, JWT auth, Prisma, bcrypt password hashing
- `docker-compose.yml` — `client`, `server`, `postgres`

## Prerequisites

- Node.js 20+
- npm (or use `npm install` as shown below)
- Docker & Docker Compose (for containerized run)

## Local development

### 1. Database

PostgreSQL must be listening on **localhost:5432** before the API starts. Easiest option (Docker Desktop must be running):

```bash
cd backend
npm run db:all
```

(`db:all` starts Postgres in Docker, then runs migrations and seed. Use a **new terminal** after installing Docker so `docker` is on your PATH.)

Or start a one-off container:

```bash
docker run --name monorepo-pg -e POSTGRES_USER=app -e POSTGRES_PASSWORD=app -e POSTGRES_DB=appdb -p 5432:5432 -d postgres:16-alpine
```

If Prisma reports **“Can't reach database server at localhost:5432”**, Postgres is not running or `DATABASE_URL` in `backend/.env` is wrong.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET

npm install
npm run db:all
npm run dev
```

API base URL defaults to `http://localhost:5050` (port 5000 is often taken by macOS AirPlay Receiver).

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL should match the API (default http://localhost:5050)

npm install
npm run dev
```

Open `http://localhost:5173`.

### Example credentials (after seed)

- `admin@example.com` / `password123`
- `user@example.com` / `password123`

## Docker (full stack)

Run **Postgres, API, and frontend** together from the repository root:

```bash
docker compose up --build
```

Detached (background):

```bash
docker compose up -d --build
```

Then open:

- **App:** http://localhost:5173  
- **API:** http://localhost:5050  
- **Swagger UI:** http://localhost:5050/docs (raw OpenAPI: `/docs/openapi.json`)  
- **Postgres:** localhost:5432 (`app` / `app` / `appdb`)

Optional env overrides (copy root `.env.example` → `.env`):

```bash
cp .env.example .env
# Edit JWT_SECRET; VITE_API_URL must be reachable from your browser (default http://localhost:5050 is correct on your machine)
docker compose up --build
```

The **server** container runs `prisma migrate deploy`, **`prisma db seed`** (demo users), then starts Node. The **client** image bakes `VITE_API_URL` at **build** time (`frontend/Dockerfile` `ARG VITE_API_URL`) so the browser calls your host-mapped API on port 5050.

Stop everything:

```bash
docker compose down
```

If you previously started **only** Postgres for local dev, stop those containers or use the same compose project so ports stay consistent.

## Docker (development with hot-reload)

For **development** with live file watching and hot-reload:

```bash
docker compose -f docker-compose.dev.yml up
```

This uses the base Node.js Alpine image directly and:
- Mounts your local source directories as volumes (changes reflect immediately)
- Installs dependencies on container start (cached in named volumes)
- Runs `npm run dev` for both backend and frontend
- Includes `CHOKIDAR_USEPOLLING=true` and `CHOKIDAR_INTERVAL=100` for reliable file watching in Docker

**What's mounted:**
- `./backend` → `/app` (backend source + hot-reload with `node --watch`)
- `./frontend` → `/app` (frontend source + Vite HMR)
- `node_modules` are stored in named volumes (persist across restarts, not overwritten by host)

**Workflow:**
1. Edit files in `backend/` or `frontend/` on your host
2. Changes are detected via polling (Chokidar)
3. Backend auto-restarts, frontend hot-reloads in browser

**Stop dev environment:**

```bash
docker compose -f docker-compose.dev.yml down
```

**Note:** First startup takes longer (installs deps), but subsequent starts are fast since `node_modules` are cached. Production compose (`docker-compose.yml`) builds static assets and runs optimized images.

## Database migrations

| Context | Command |
|--------|---------|
| Local dev (create migration + apply) | `cd backend && npx prisma migrate dev` |
| Production / CI (apply existing migrations) | `cd backend && npx prisma migrate deploy` |

Prisma schema: `backend/prisma/schema.prisma`.  
Initial migration: `backend/prisma/migrations/`.

## API overview

| Method | Path | Auth |
|--------|------|------|
| GET | `/docs` | No (Swagger UI) |
| GET | `/health` | No |
| POST | `/auth/register` | No |
| POST | `/auth/login` | No |
| GET | `/auth/me` | Bearer JWT |
| GET | `/users` | Bearer JWT |
| GET | `/users/:id` | Bearer JWT |
| PATCH | `/users/me` | Bearer JWT (self only) |
| DELETE | `/users/me` | Bearer JWT (soft-delete, self only) |
| POST | `/excel/upload` | Bearer JWT |

## Scripts

| Location | Script | Purpose |
|----------|--------|---------|
| `backend` | `npm run dev` | API with watch |
| `backend` | `npm run prisma:migrate` | Dev migrations |
| `backend` | `npm run prisma:seed` | Seed users |
| `frontend` | `npm run dev` | Vite dev server |
| `frontend` | `npm run build` | Production build |

## Linting & formatting

```bash
cd backend && npm run lint && npm run format
cd frontend && npm run lint && npm run format
```

## Security notes

- Set a strong `JWT_SECRET` in production.
- Use HTTPS in production and restrict CORS origins as needed (`backend/src/app.js`).
- Passwords are hashed with bcrypt (cost factor 12) via `backend/src/lib/hash.js`.
- PATCH and DELETE on `/users/me` operate on the authenticated user only (identity from JWT, no RBAC).
