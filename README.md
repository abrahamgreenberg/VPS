# Private VPS — Personal Infrastructure & App Platform

A single Vultr VPS (DNS on Namecheap) hosting several personal side projects. Started as one `docker compose` file behind Nginx Proxy Manager with no monitoring and secrets sitting in `.env` files; is being migrated, stack by stack, into a small production-style platform: Docker Swarm, Traefik, a full observability pipeline, and perimeter security — while the app running on top of it (Peninei Halacha) gets the same instrumentation and bug-fixing treatment.

## The problem

Running several unrelated apps (a scraper/API/PWA, a portfolio site, more to come) on one box, solo, with no ops team, meant:

- **No visibility.** If something broke at 2am, I found out from a user, not a dashboard.
- **No isolation or repeatability.** Everything was one `docker-compose.yml` per project, hand-run over SSH; there was no consistent way to roll out a new service, roll back a bad deploy, or reason about what was actually running.
- **Secrets in plaintext.** Database URLs and API keys lived in `.env` files on disk.
- **No perimeter security.** Anything exposed was exposed directly, with no bot/abuse mitigation and no central auth in front of admin panels (pgAdmin, Portainer, etc.).
- **Adding a new project was expensive.** Every new app meant hand-writing Traefik labels, wiring networks, and re-deriving the same Swarm boilerplate again.

## What I built

| Stack        | Purpose                                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| `traefik`    | Edge reverse proxy / automatic TLS (Let's Encrypt) — replacing Nginx Proxy Manager                   |
| `monitoring` | Grafana, Prometheus, Loki, Tempo, Alloy (OTLP collector), cAdvisor, node-exporter, postgres-exporter |
| `crowdsec`   | Intrusion detection + a Traefik bouncer middleware that auto-blocks abusive IPs                      |
| `authentik`  | SSO / forward-auth for admin panels (mid-rollout)                                                    |
| `postgres`   | Shared PostgreSQL instance + pgAdmin                                                                 |
| `portainer`  | Swarm ops UI                                                                                         |

Networking is a set of external, attachable overlay networks (`proxy-network`, `database-network`, `monitoring-network`) shared across stacks, so a new service only joins the networks it needs instead of everything being flat.

### Projects running on it

**Peninei Halacha** (`peninei/`) — a daily-halacha scraper, API, and offline-capable PWA (Express/Prisma backend, Vite/React frontend). This was the first real app migrated onto the new platform end-to-end: converted to a Docker Swarm stack (`peninei/stack.yml`, single-domain path-based routing so frontend and API share one origin with no CORS), instrumented with OpenTelemetry metrics/logs shipped to Grafana, and had a real production bug (see below) fixed along the way.

**Observability test app** (`infrastructure/monitoring/test-app/`) — a disposable multi-service Flask demo (gateway → orders → inventory/payments + a load generator) built specifically to validate the OTLP → Alloy → Prometheus/Loki/Tempo → Grafana pipeline _before_ trusting it with a real app. `common/telemetry.py` became the reference implementation the peninei backend's telemetry was ported from.

**Portfolio** (`portfolio/`) — personal site, served behind the same Traefik proxy.

## Technical highlights / what I learned

A few things worth calling out, since they were real debugging/design problems rather than boilerplate:

- **Found and fixed a timezone bug that only reproduces outside the UK.** Peninei was showing _yesterday's_ halacha for US users. Root cause: `new Date("YYYY-MM-DD")` parses date-only strings as **UTC midnight**, but the code then mutated that `Date` with local-time methods (`setHours`, `toISOString`) — which silently reads back the _previous_ local calendar day in any UTC-negative timezone. It never showed up in dev because the developer (me) is in a UTC-positive timezone. Fixed by never round-tripping a calendar date through a UTC-interpreting parse — wrote small helpers that only ever use local `getFullYear`/`getMonth`/`getDate`.
- **Separated "loading" from "slow."** The frontend was blocking the whole UI behind a spinner (and briefly flashing "no data found") for however long a cold network request took. Decoupled render-from-cache (instant, from `localStorage`) from fetch-and-reconcile (background, non-blocking) so perceived latency dropped to zero regardless of actual backend latency — which is now separately measurable (see below).
- **Instrumentation ordering matters in Node.** OpenTelemetry's `http`/`express` auto-instrumentation only works if it patches those modules _before_ they're `require`d elsewhere — so `telemetry.ts` has to be the first import in the entrypoint, not just "imported somewhere."
- **Docker Swarm + locally-built images is a footgun.** With no registry, `docker stack deploy` compares image _tags_, not content — rebuilding `myapp:latest` and redeploying does **not** roll the service. Either force it (`docker service update --force`) or use content-addressed tags (git SHA) per deploy.
- **Moved secrets out of `.env` and into Swarm secrets** using the `entrypoint: sh -c 'export X="$(cat /run/secrets/x)" && exec ...'` pattern, so connection strings and API keys are never written to disk in plaintext or baked into an image.
- **Picked path-based routing over subdomains for peninei** specifically to eliminate CORS as a category of bug — one Traefik router matches `PathPrefix(/api)` at higher priority, everything else falls through to the static frontend.

## Observability: alerts worth adding next

The metrics pipeline exists (Prometheus + Loki + cAdvisor + node-exporter + postgres-exporter + peninei's own OTEL metrics); alerting on top of it doesn't yet. Concrete rules I'd add first:

**Infra health**

- Disk usage > 80% on the host (`node_filesystem_avail_bytes`)
- Container restart loop — N restarts in 5 minutes (cAdvisor)
- A Swarm service's running replica count < desired for > 2 minutes
- Container OOM-killed

**App health (peninei, and future apps via the same OTEL pattern)**

- HTTP 5xx rate over a rolling window (`http_requests_total{status_code=~"5.."}`)
- p95 request latency above threshold (`http_request_duration_ms`)
- `sync_duration_ms` p99 spike — the earlier "why is this slow" question becomes answerable instead of anecdotal

**Data freshness (business-logic alert, not just infra)**

- `halachas_scraped_total` flat for > 24h → the daily scrape job silently failed
- `halachas_ai_parsed_total{result="failure"}` rate spike → AI translation step degrading

**Security**

- Spike in CrowdSec bans/decisions over baseline → possible attack in progress
- TLS certificate expiring within 14 days (Traefik/ACME)

**Meta**

- No logs received from a known service in Loki for > N minutes → the service died in a way that didn't even log an error

## Roadmap

### Now: Coolify

The single biggest unlock. Every project onboarded so far has meant hand-writing a `stack.yml`, Traefik labels, network wiring, and a secrets dance from scratch — useful to learn once, not something I want to keep doing by hand for every future micro-app. Self-hosting [Coolify](https://coolify.io/) on top of the existing Swarm/Traefik/Postgres foundation should turn "deploy a new personal project" into a few clicks (git push → build → routed + TLS'd + monitored) instead of a bespoke stack file per app, while the underlying infra this repo already built (networks, Postgres, observability, security) keeps doing the heavy lifting underneath it.

### Next

- [ ] Fix peninei telemetry: add traces, fix logs actually landing in Loki (metrics work; log pipeline needs debugging)
- [ ] Self-hosted image registry, so images are built locally and pushed rather than built directly on the VPS
- [ ] CI/CD with GitHub Actions (build, push, deploy)
- [ ] Protect more admin surfaces (pgAdmin, Portainer, Traefik dashboard, Grafana) with Authentik forward-auth
- [ ] Switch peninei's AI step (translation/parsing) from OpenAI to Claude
- [ ] Better deployment environments (proper staging vs. production, not just SSH + `docker stack deploy`)
- [ ] VPS backups at the volume/DB level (nightly, encrypted — see runbook §7.4 for the Restic sketch)
- [ ] Remove old code (anything superseded by the Swarm/Traefik migration)

### Later

- [ ] Wire up the alerts listed above
- [ ] Finish the Authentik + CrowdSec rollout across all admin routes
- [ ] Disaster-recovery drills (restore DB + volumes from backup, redeploy from Git only)
- [ ] Home page listing all services

### Done

- [x] Merged all projects into one monorepo
- [x] Rate limiting + caching on the peninei API
- [x] Alpine base images + shared pnpm store across Node containers
- [x] Offline-capable PWA download for peninei halachot
- [x] Observability stack (Grafana/Prometheus/Loki/Tempo/Alloy) stood up and validated with a disposable test app before touching production code
- [x] CrowdSec + Traefik bouncer
- [x] Diagnosed and fixed a timezone-dependent date bug in peninei
- [x] Peninei converted to a Docker Swarm stack with metrics/logs wired to Grafana
