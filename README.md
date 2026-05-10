<p align="center">
  <a href="https://openpieces.com" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="public/banner-for-dark.png">
      <source media="(prefers-color-scheme: light)" srcset="public/banner-for-light.png">
      <img src="public/banner-for-light.png" alt="OpenPieces Logo"/>
    </picture>
  </a>
</p>


<p align="center">OpenPieces is an intelligent personal assistant that dynamically creates, deploys, and manages tools — called *pieces* — on the fly. When it encounters a task it can't handle with its existing toolkit, it autonomously builds a new piece to fill the gap, deploys it instantly, and retains it for future use. Over time, OpenPieces grows a continuously expanding ecosystem of capabilities, adapting to your needs without manual intervention.</p>


<p align="center">
  <a href="https://openpieces.com" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/openpieces.com-6366f1" alt="OpenPieces"></a>
  <a href="https://discord.gg/openpieces" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Discord-Join%20Server-5865F2?logo=discord&logoColor=white" alt="Discord"></a>
  <a href="https://x.com/openpieces" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/twitter/follow/openpieces?style=social" alt="Twitter"></a>
  <a href="https://docs.openpieces.com" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Docs-6366f1.svg" alt="Documentation"></a>
  <a href="https://openpieces.com" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Get%20Started-000000?logo=github&logoColor=white" alt="Get Started"></a>
</p>

![OpenPieces](public/op_public.png)

---

## Quick Start

```bash
cp .env.example .env
# Fill in the required values in .env — see Environment Variables below
docker compose up -d --build
```

Open [http://localhost:3141](http://localhost:3141) and go to `/setup`.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) ≥ 24
- [Docker Compose](https://docs.docker.com/compose/install/) v2

---

## Production Deploy

### 1. Clone and configure

```bash
git clone <your-repo>
cd openpieces
cp .env.example .env
```

Edit `.env` — at minimum you need to set:
- `AUTH_SECRET` — session signing key
- `SECRETS_ENCRYPTION_KEY` — encryption key
- `INTERNAL_API_KEY` — internal service auth
- `OPENCODE_SERVER_PASSWORD` — OpenCode server password
- `POSTGRES_PASSWORD` — database password
- `AI_GATEWAY_API_KEY` — for all AI routing via Vercel Gateway

Generate a secret: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

### 2. Launch

```bash
docker compose up -d --build
```

This starts all services with health checks and restart policies:
- **app** — Next.js standalone server
- **worker** — background job processor (AI tasks, brain reinforcement)
- **db** — PostgreSQL 16 with pgvector (bundled)
- **opencode** — AI coding assistant

### 3. Access

Go to `http://localhost:3141/setup` to create your admin account.

### 4. Subdomain routing (optional)

Give each service its own domain at `https://{serviceId}.yourdomain.com` so links and assets resolve correctly without path-prefix tricks:

1. Add a wildcard DNS record: `*.yourdomain.com` → your VPS IP
2. Set `SERVICE_DOMAIN=yourdomain.com` in `.env`
3. (Optional) Set DNS provider credentials in `caddy/Caddyfile` for automatic wildcard TLS
4. Launch with the edge proxy:

```bash
docker compose --profile edge up -d --build
```

Caddy handles TLS termination and routes `{id}.yourdomain.com` directly to each service's port. The legacy `/api/s/{id}` paths continue to work as fallback.

---

## Development

For local development with hot reload:

```bash
docker compose -f docker-compose.dev.yml up --build
```

- App → [http://localhost:3141](http://localhost:3141)
- OpenCode → `localhost:4096`

**Rebuild after dependency changes:**
```bash
docker compose -f docker-compose.dev.yml up --build
```

**Clean slate:**
```bash
docker compose -f docker-compose.dev.yml down -v
```

**Database migrations:**
```bash
npm run db:generate   # edit schema.ts first — generates migration SQL
npm run migrate       # applies migrations to the database
```
Triggers and functions can't be auto-generated — create a `.sql` manually, copy the previous snapshot (update `id`/`prevId`), add a journal entry, then `npm run migrate`.

---

## Managing

**Tail logs:**
```bash
docker compose logs --tail=50 -f
```

**Restart a service:**
```bash
docker compose restart app
```

**Update to latest:**
```bash
docker compose up -d --build
```

**Stop everything:**
```bash
docker compose down
```

**Wipe database and start fresh:**
```bash
docker compose down -v
```

---

## Using an External Database

By default a PostgreSQL container is started automatically. To use your own (Supabase, Neon, Railway, etc.):

1. Set `DATABASE_URL` in `.env` to your connection string
2. Remove the `db` service from `docker-compose.yml`

The bundled Postgres includes `pgvector` for embedding storage — your external DB will need it too.

---

## Environment Variables

### Required for production

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Auth.js session signing key. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `SECRETS_ENCRYPTION_KEY` | Encryption key for stored secrets. Generate with the command above. |
| `INTERNAL_API_KEY` | Key used by OpenCode to authenticate against the internal API. Generate with the command above. |
| `OPENCODE_SERVER_PASSWORD` | Password for the OpenCode server. |
| `POSTGRES_PASSWORD` | Password for the bundled PostgreSQL database. |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key required to route global AI model calls. |

### Optional

| Variable | Default | Description |
|---|---|---|
| `APP_PORT` | `3141` | Internal port for the Next.js app (exposed to host) |
| `OPENCODE_PORT` | `4096` | Internal port for the OpenCode server |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3141` | Public URL — change to your domain in production |
| `SERVICE_DOMAIN` | — | Enable subdomain routing — services will be at `https://{id}.{SERVICE_DOMAIN}` |
| `CADDY_ADMIN_URL` | `http://caddy:2019` | Caddy admin API endpoint (internal) |
| `TAVILY_API_KEY` | — | Tavily web search API key |
| `DB_POOL_MAX` | `5` | Connection pool size for the app |
| `PG_BOSS_POOL_SIZE` | `5` | Connection pool size for the worker |
| `PG_BOSS_CONCURRENCY` | `10` | Max concurrent background jobs |

---

## Tech Stack

- **[Next.js 16](https://nextjs.org)** — App Router, React Server Components
- **[React 19](https://react.dev)** — concurrent features
- **[Tailwind CSS v4](https://tailwindcss.com)** — styling
- **[Xyflow](https://xyflow.com)** — workflow canvas
- **[Motion](https://motion.dev)** — animations
- **[PostgreSQL 16](https://www.postgresql.org)** + **[pgvector](https://github.com/pgvector/pgvector)** — database and embeddings
