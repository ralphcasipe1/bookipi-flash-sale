# Bookipi Flash Sale

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| [Node.js](https://nodejs.org/) | **>=24.16.0** | Pinned to `24.16.0` in `.node-version` / `.nvmrc`. Use [fnm](https://github.com/Schniz/fnm) (`fnm use`) or [nvm](https://github.com/nvm-sh/nvm) (`nvm use`) |
| [Docker](https://www.docker.com/) | Latest | For Valkey and MongoDB via Compose |
| npm | 11+ | Comes with Node 24; lockfile is compatible with `npm ci` |

## Install

```bash
git clone <repo-url>
cd bookipi-flash-sale
nvm use
npm i
```

## Run (development)

Start infrastructure, then run API and web in dev mode.

```bash
# 1. Valkey (6379) + MongoDB (27017)
npm run docker:up

# 2. API (port 3000) + web (port 5173)
npm run dev
```

| Service | URL |
|---------|-----|
| API health | http://localhost:3000/health |
| Web | http://localhost:5173 |

Stop infrastructure when finished:

```bash
npm run docker:down
```

### Run API or web only

```bash
npm run dev --workspace=@flash-sale/api
npm run dev --workspace=@flash-sale/web
```

### Production build

```bash
npm run build
npm run start --workspace=@flash-sale/api   # serves dist on port 3000
npm run preview --workspace=@flash-sale/web   # previews built SPA
```

## Run (Docker API container)

Default Compose starts **infra only**. To run the API in a container:

```bash
npm run docker:up              # Valkey + MongoDB
npm run docker:up:app          # infra + API image (profile app)
# or build manually:
npm run docker:build:api
```

API image uses multi-stage build targets (`api`, `worker`). Select a target with:

```bash
docker build --target api -t flash-sale-api .
```

## Quality checks

```bash
npm run lint
npm run format:check
npm run types:check
npm run test:unit
npm run test:integration
npm run test              # unit + integration + stress
```

Integration tests use isolated infra ports via `docker-compose.test.yml` (Valkey `6380`, MongoDB `27018`). CI starts that profile automatically; locally you can run:

```bash
docker compose -f docker-compose.test.yml up -d --wait
npm run test:integration
docker compose -f docker-compose.test.yml down
```

## Project layout

```
app-api/           Fastify server (@flash-sale/api)
app-web/           React + Vite + UnoCSS (@flash-sale/web)
package-shared/    Shared types (@flash-sale/shared)
package-config/    Shared tsconfig base
docker-compose.yml Valkey + MongoDB (dev)
Dockerfile         Multi-stage images: api | worker | web
```

## What's next

TODO
