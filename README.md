# Bookipi Flash Sale


## Prerequisites

| Tool | Version | Required for |
|------|---------|--------------|
| [Node.js](https://nodejs.org/) | **24.16.0** (`.nvmrc`) | API, web, tests |
| [Docker](https://www.docker.com/) | Latest | Valkey, MongoDB, integration tests |
| [k6](https://k6.io/docs/get-started/installation/) | Latest | Stress tests only (`brew install k6`) |
| npm | 11+ | Install & scripts |

```bash
git clone <repo-url>
cd bookipi-flash-sale
nvm use          # or: fnm use
npm install
```

---

## Quick start (local dev)

Three terminals — infra, API, web:

```bash
# Terminal 1 — Valkey (:6379) + MongoDB (:27017)
npm run docker:up

# Terminal 2 — API (:3000) with an active sale seeded on startup
SALE_START=2026-06-08T00:00:00.000Z \
SALE_END=2026-12-31T23:59:59.000Z \
INITIAL_STOCK=100 \
VALKEY_URL=redis://localhost:6379 \
MONGODB_URL=mongodb://localhost:27017/flash_sale \
npm run dev -w @flash-sale/api

# Terminal 3 — React dev server (:5173), proxies /sale → API
npm run dev -w @flash-sale/web
```

| What | URL |
|------|-----|
| Web UI | http://localhost:5173 |
| API health | http://localhost:3000/health |
| Swagger docs | http://localhost:3000/docs |
| Sale status | http://localhost:3000/sale/status |

Open the web UI, enter an email or username, click **Buy now**.

Stop infra when done: `npm run docker:down`

---

## Running services

### All at once (Turbo)

Starts API + web dev servers together. You still need Docker infra running first.

```bash
npm run docker:up
npm run dev
```

### API only

```bash
npm run docker:up

# Minimal — health check only (no sale routes without Valkey)
npm run dev -w @flash-sale/api

# Full stack — Valkey inventory + MongoDB order persistence
VALKEY_URL=redis://localhost:6379 \
MONGODB_URL=mongodb://localhost:27017/flash_sale \
SALE_START=2026-06-08T00:00:00.000Z \
SALE_END=2026-12-31T23:59:59.000Z \
INITIAL_STOCK=100 \
npm run dev -w @flash-sale/api
```

Production build:

```bash
npm run build -w @flash-sale/shared && npm run build -w @flash-sale/api
VALKEY_URL=redis://localhost:6379 npm run start -w @flash-sale/api
```

### Web only

Requires a running API (Vite proxies `/sale` to `localhost:3000`).

```bash
npm run dev -w @flash-sale/web
```

Preview production build:

```bash
npm run build -w @flash-sale/web
npm run preview -w @flash-sale/web
```

### Order worker (async MongoDB writes)

Runs separately from the API — subscribes to Valkey pub/sub and persists orders.

```bash
npm run docker:up

VALKEY_URL=redis://localhost:6379 \
MONGODB_URL=mongodb://localhost:27017/flash_sale \
npm run dev:worker -w @flash-sale/api
```

When the worker runs in its own process, disable the in-process subscriber on the API:

```bash
ORDER_WORKER_IN_PROCESS=false npm run dev -w @flash-sale/api
```

---

## Docker

### Infra only (default)

Valkey + MongoDB — use with local `npm run dev` for hot reload.

```bash
npm run docker:up
npm run docker:down
```

### Full stack (containers)

Builds and runs **api**, **worker**, and **web** via Compose profile `app`:

```bash
npm run docker:up:app
```

| Service | URL |
|---------|-----|
| Web (nginx) | http://localhost:8080 |
| API | http://localhost:3000 |

Individual image builds:

```bash
npm run docker:build:api
npm run docker:build:worker
npm run docker:build:web
```

### MongoDB on Linux kernel 6.19+

If MongoDB exits immediately on OrbStack or newer kernels, the compose files already set `GLIBC_TUNABLES=glibc.pthread.rseq=1`. See [docker-library/mongo#748](https://github.com/docker-library/mongo/discussions/748).

---

## Testing

### Unit tests (no Docker)

Pure domain logic — runs in milliseconds.

```bash
npm run test:unit
# or scoped:
npm run test:unit -w @flash-sale/api
```

### Integration tests (Docker required)

Uses isolated ports via `docker-compose.test.yml` (Valkey **6380**, MongoDB **27018**).

```bash
docker compose -f docker-compose.test.yml up -d --wait

VALKEY_URL=redis://localhost:6380 \
MONGODB_URL=mongodb://localhost:27018/flash_sale \
npm run test:integration -w @flash-sale/api

docker compose -f docker-compose.test.yml down
```

CI runs the same flow automatically on push/PR.

### Stress test (k6)

Proves **no overselling under load**: successes must equal `INITIAL_STOCK`.

**Prerequisites:** Valkey running, API on port 3000, [k6 installed](https://k6.io/docs/get-started/installation/).

```bash
# Terminal 1 — API (MongoDB optional; purchase hot path is Valkey)
npm run docker:up
VALKEY_URL=redis://localhost:6379 npm run dev -w @flash-sale/api

# Terminal 2 — reset inventory, then load test
INITIAL_STOCK=100 VALKEY_URL=redis://localhost:6379 npm run stress:reset -w @flash-sale/api

API_URL=http://localhost:3000 INITIAL_STOCK=100 npm run test:stress -w @flash-sale/api
```

| Variable | Default | Purpose |
|----------|---------|---------|
| `API_URL` | `http://localhost:3000` | Target API |
| `INITIAL_STOCK` | `100` | Expected success count (must match seeded stock) |
| `STRESS_VUS` | `500` | Virtual users |
| `STRESS_ITERATIONS` | `500` | Total purchase attempts (one per user) |

**Sample output:**

```
── Flash sale stress summary ──
Initial stock (expected successes): 100
Actual successes:                   100
Sold out responses:                 400
Already purchased responses:        0
Sale not active responses:          0
Oversell check:                     PASS
Request rate (RPS):                 847.3
p95 latency (ms):                   12.4
p99 latency (ms):                   28.6
```

k6 fails if successes ≠ `INITIAL_STOCK`, any duplicate buyer wins, or p99 exceeds 500 ms.

**k6 via Docker** (no local install):

```bash
docker run --rm -i \
  -e API_URL=http://host.docker.internal:3000 \
  -e INITIAL_STOCK=100 \
  grafana/k6 run - < app-api/stress/purchase.k6.js
```

### All quality checks

```bash
npm run lint
npm run format:check
npm run types:check
npm run build
npm run test:unit
npm run test:integration   # requires test Docker infra
npm run test:stress        # requires k6 + running API
```

---

## Environment variables

| Variable | Default | Used by | Purpose |
|----------|---------|---------|---------|
| `VALKEY_URL` | `redis://localhost:6379` | API, worker, stress | Valkey connection |
| `MONGODB_URL` | — | API, worker | MongoDB connection (optional for API dev) |
| `SALE_START` | — | API | ISO timestamp — sale window start |
| `SALE_END` | — | API | ISO timestamp — sale window end |
| `INITIAL_STOCK` | — | API, stress | Items available at sale start |
| `ORDER_WORKER_IN_PROCESS` | `true` | API | Set `false` when running standalone worker |
| `PORT` | `3000` | API | HTTP port |
| `VITE_API_BASE_URL` | `""` | Web | API base URL (empty = relative, uses Vite proxy) |

Sale seeding happens automatically on API startup when `VALKEY_URL`, `SALE_START`, `SALE_END`, and `INITIAL_STOCK` are all set. For stress tests, use `npm run stress:reset` to re-seed without restarting the API.

---

## Project layout

```
app-api/              Fastify server (@flash-sale/api)
  src/domain/         Pure business rules (unit tested)
  src/infrastructure/ Valkey Lua inventory, MongoDB orders
  src/routes/         HTTP endpoints
  stress/             k6 load test + sale reset helper
  __tests__/          Integration tests (Vitest + Docker)
app-web/              React 19 + Vite + UnoCSS (@flash-sale/web)
package-shared/       Zod schemas + shared types (@flash-sale/shared)
package-config/       Shared tsconfig
docker-compose.yml    Valkey + MongoDB (dev)
docker-compose.test.yml  Isolated ports for CI/local integration tests
Dockerfile            Multi-stage targets: api | worker | web
```

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/sale/status` | Sale status + remaining stock |
| `POST` | `/sale/purchase` | Attempt purchase `{ userId }` |
| `GET` | `/sale/purchase/:userId` | Lookup prior purchase |
| `GET` | `/docs` | Swagger UI |

---

## What's next

TODO
