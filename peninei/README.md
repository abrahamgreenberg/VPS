# Peninei Halacha

A daily-halacha (Jewish law) reader. A scheduled scraper pulls the day's text from an existing Hebrew site, an AI step
parses/translates it, and an Express API serves it to an offline-capable PWA. Live at `peninei.abrahamgreenberg.co.uk`
(public, CrowdSec only - no SSO). It was the first real app moved onto the Swarm platform.

| Part | Stack |
| ---- | ----- |
| `backend/` | Node 20, Express 5, TypeScript, Prisma + PostgreSQL, Zod, Swagger UI, in-memory cache + rate limiting; scheduled jobs in `src/scheduled/` (scrape, then AI parse via OpenAI) |
| `frontend/` | Vite + React PWA, served by nginx; halachot can be downloaded for offline use |
| Telemetry | OpenTelemetry metrics + logs -> Alloy (`http://alloy:4318` on `monitoring-network`) -> Grafana. Traces and the Loki log path are still being fixed ([roadmap](../docs/roadmap.md#next)) |

## Layout
    backend/            API, scheduler, Prisma schema + migrations, Dockerfile
    frontend/           PWA, Dockerfile
    stack.yml           Swarm stack (production)
    docker-compose.yml  builds the two images; also the older Compose-era runtime
    scripts/            older Compose-era deploy scripts (live / staging)
    .env.example        variables used when building / running with Compose

## Routing
One domain, path-based, so the frontend and API share an origin (no CORS): `/api/*` -> backend (port 5002, priority 10),
everything else -> frontend (nginx :80). Both routers carry `crowdsec-bouncer@swarm`.

## Secrets
Swarm secrets (read into env at container start): `peninei_database_url`, `peninei_openai_api_key`
([how to create](../docs/deployment.md#3-secrets)). The backend runs `prisma migrate deploy` on start.
Networks: `proxy-network`, `database-network`, `monitoring-network`.

## Deploy
Images are built on the VPS (private registry + CI/CD are on the [roadmap](../docs/roadmap.md#next)):

    cd ~/repos/vps && git pull
    cd peninei && cp -n .env.example .env        # set VITE_FRONTEND_API_URL etc. (build arg for the frontend)
    docker compose build                          # produces peninei-backend:latest and peninei-frontend:latest
    cd .. && docker stack deploy -c peninei/stack.yml peninei

Updates are `start-first` with automatic rollback on failure; manual: `docker service rollback peninei_backend`.

If Prisma complains about a failed migration in production, see the comment at the bottom of `backend/Dockerfile`.

## Develop
    cd backend && pnpm install && pnpm dev      # needs a Postgres + backend env vars (see .env.example)
    cd frontend && pnpm install && pnpm dev

API docs (Swagger UI) are served by the backend.
