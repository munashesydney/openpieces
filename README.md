# openpieces

A workflow management platform built with Next.js 16, React 19, and Tailwind CSS v4.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) ≥ 24
- [Docker Compose](https://docs.docker.com/compose/install/) v2 (ships with Docker Desktop)

---

## Setup

Copy the environment template and fill in your values:

```bash
cp .env.example .env
```

### Choosing your database

Open `.env` and set `COMPOSE_PROFILES`:

| Value | What happens |
|---|---|
| `with-db` *(default)* | Docker builds and manages a Postgres container for you — zero config |
| *(empty)* | No DB container is started; set `DATABASE_URL` to your own hosted instance |

**Using your own hosted Postgres** (Supabase, Neon, Railway, PlanetScale, etc.):

```env
COMPOSE_PROFILES=
DATABASE_URL=postgresql://user:password@your-host:5432/dbname
```

---

## Development

Starts the app with **hot reload** and streams all logs directly to your terminal so you can see exactly what's happening in real time.

```bash
# With bundled Postgres (COMPOSE_PROFILES=with-db in .env)
docker compose up --build

# With your own hosted Postgres (COMPOSE_PROFILES= in .env)
docker compose up --build
```

- App → [http://localhost:3000](http://localhost:3000)
- Bundled Postgres → `localhost:5432` (connect with any GUI like pgAdmin or TablePlus)

**Watching logs for a specific service:**

```bash
# App logs only
docker compose logs -f app

# Database logs only (only available when using bundled Postgres)
docker compose logs -f db
```

**Rebuilding after dependency changes** (`package.json` changed etc.):

```bash
docker compose up --build
```

**Stopping and cleaning up:**

```bash
# Stop containers but keep the database volume
docker compose down

# Nuclear — also wipe the postgres volume (fresh DB)
docker compose down -v
```

**Running a one-off command inside the app container:**

```bash
docker compose exec app sh
```

---

## Production

Builds the optimised **standalone** Next.js image and runs everything detached. The Postgres port is intentionally **not** exposed to the host in this mode.

```bash
# Set real secrets in .env before running this
# With bundled Postgres (COMPOSE_PROFILES=with-db):
docker compose -f docker-compose.prod.yml up --build -d

# With your own hosted Postgres (COMPOSE_PROFILES=):
docker compose -f docker-compose.prod.yml up --build -d
```

**Checking status:**

```bash
docker compose -f docker-compose.prod.yml ps
```

**Tailing production logs** (last 50 lines then follow):

```bash
docker compose -f docker-compose.prod.yml logs --tail=50 -f
```

**Deploying an update:**

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

**Stopping production:**

```bash
docker compose -f docker-compose.prod.yml down
```

---

## Project Structure

```
openpieces/
├── app/                  # Next.js App Router pages
│   ├── workflows/        # Workflow builder & execution viewer
│   ├── pieces/           # Pieces catalogue
│   ├── memory/           # Memory store
│   └── settings/         # App settings
├── components/           # Shared UI components
│   ├── layout/           # Sidebar, header, dashboard shell
│   ├── workflows/        # Workflow canvas, nodes, AI chat
│   ├── overview/         # Composer, model/mode pickers
│   ├── settings/         # Settings sections & rows
│   └── basic/            # Buttons, dropdowns, page titles
├── lib/                  # Shared utilities & data
├── Dockerfile            # Multi-stage build (dev + prod)
└── next.config.ts        # Next.js config (standalone output)
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `COMPOSE_PROFILES` | Set to `with-db` to spin up a bundled Postgres container; leave empty to use your own | `with-db` |
| `POSTGRES_USER` | Database username (bundled DB only) | `openpieces` |
| `POSTGRES_PASSWORD` | Database password (bundled DB only) | — |
| `POSTGRES_DB` | Database name (bundled DB only) | `openpieces` |
| `DATABASE_URL` | Full Postgres connection string | — |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app | `http://localhost:3000` |

---

## Tech Stack

- **[Next.js 16](https://nextjs.org)** — App Router, React Server Components
- **[React 19](https://react.dev)** — latest concurrent features
- **[Tailwind CSS v4](https://tailwindcss.com)** — utility-first styling
- **[Xyflow](https://xyflow.com)** — workflow canvas / node graph
- **[Motion](https://motion.dev)** — animations
- **[next-themes](https://github.com/pacocoursey/next-themes)** — dark/light mode
- **[PostgreSQL 16](https://www.postgresql.org)** — relational database
