# Private VPS — Personal Infrastructure & App Platform

A single Vultr VPS (DNS on Namecheap) hosting several personal side projects. Started as one `docker compose` file behind Nginx Proxy Manager with no monitoring and secrets sitting in `.env` files; is being migrated, stack by stack, into a small production-style platform: Docker Swarm, Traefik, a full observability pipeline, and perimeter security.

## The problem

Running several unrelated apps (a scraper/API/PWA, a portfolio site, more to come) on one box, solo, with no ops team, meant:

- **No visibility.** If something broke I would not be alerted to this, and I wouldn't be able to diagnose the issue correctly.
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
| `auth`       | oauth2-proxy + GitHub forward-auth (`sso@swarm` middleware) in front of every dashboard; single allowed email, no database ([docs](infrastructure/auth/README.md)) |
| `postgres`   | Shared PostgreSQL instance + pgAdmin                                                                 |
| `portainer`  | Swarm ops UI                                                                                         |

Networking is a set of external, attachable overlay networks (`proxy-network`, `database-network`, `monitoring-network`) shared across stacks, so a new service only joins the networks it needs instead of everything being flat.

### Projects running on it

**Peninei Halacha** (`peninei/`) - a daily-halacha (jewish law) scraper from an existing hebrew website. It is composed of a scraper, API, and offline-capable PWA (Express/Prisma backend, Vite/React frontend). This was the first real app migrated onto the new platform end-to-end: converted to a Docker Swarm stack (`peninei/stack.yml`, single-domain path-based routing so frontend and API share one origin with no CORS), instrumented with OpenTelemetry metrics/logs shipped to Grafana, and had a real production bug (see below) fixed along the way. The simplicity of this app allowed me to easil test the new infrastructure and validate the observability pipeline before trusting it with a more complex app.

**Observability test app** (`infrastructure/monitoring/test-app/`) - a disposable multi-service Flask demo (gateway → orders → inventory/payments + a load generator) built specifically to validate the OTLP → Alloy → Prometheus/Loki/Tempo → Grafana pipeline _before_ trusting it with a real app. `common/telemetry.py` became the reference implementation the peninei backend's telemetry was ported from.

**Portfolio** (`portfolio/`) - personal site, served behind the same Traefik proxy used for a writing class.

## Technical Highlights / What I Learned

- **Principles of good observability.** I learned how to navigate the grafana dashboard, and more importantly the task that metrics, logs and traces are meant to be used for. I intend to use these principles in future projects.

- **Docker Compose is not suited for production** - My docker hosting originally used docker swarm as it was what I tested and developed with on my local PC and was somewhat comfortable for it. However, I quickly found out that it did not scale well for hosting multiple projects on a small vps. I found that Docker Swarm was best suited for the vps as it provides many more features, such as the ability to scale up instances live, but without the complexity of Kubernetes.

- **How to more effectively set up build processes** - Currently my system of deployment is to push changes to the repository, SSH to the vps, pull and build the changes locally. I have been in the process with setting up a self-hosted docker image host which will allow me to build locally/from a github workflow and then push and automatically deploy new builds much easier.

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

### Future: Coolify?

I have been exploring the use of Coolify to deploy apps on my VPS. This will provide me with a dashboard that I can use to create deploy and manage instances. It has databases and backups built in, and has been described as a self-hosted SAAS. It has fairly high performance requirements however, and will increase my monthly hosting bill, which may not be worth or the scope of this project.

### Timeline (suggested order)

| When    | Focus                                            | Why this slot                                                                              |
| ------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Now     | Deploy + verify the auth / bouncer changes       | Finish the current rollout before starting anything new (`infrastructure/auth/README.md`)  |
| Week 1  | **Backups** (Postgres + volumes, off-box)        | Biggest risk today: one disk failure loses everything. Images can be rebuilt, data can't   |
| Week 2  | **Private registry**                             | Unlocks building off the VPS; small, self-contained stack                                  |
| Week 3  | **CI/CD** (GitHub Actions -> registry -> deploy) | Needs the registry; moves peninei off VPS-side builds                                      |
| Week 4  | Server maintenance scripts + hardening           | Prune, log rotation, disk alert, patching, firewall; easier once backups exist             |
| Week 5+ | Portfolio and other websites                     | Easy once the registry + CI/CD template exists                                             |
| Ongoing | Telemetry fixes, alerts, repo cleanup            | Interleave; clean up in small commits as you touch each area                               |

### Next (in order)

- [ ] **Set up a private image registry** at `registry.<domain>` (not started). Notes: use its own htpasswd auth (not `sso`, the docker CLI can't do browser logins) behind CrowdSec; Zot is preferred over `registry:2` because it supports per-user permissions (a genuinely pull-only `deployer` credential) and has built-in garbage collection; needs persistent storage and a backup
- [ ] Once the registry exists, move peninei (then others) to `registry.<domain>/...` images: build + push from PC, `docker stack deploy --with-registry-auth` on the VPS, so nothing is built on the VPS
- [ ] CI/CD with GitHub Actions (build, push to the registry, deploy)
- [ ] Fix peninei telemetry: add traces, fix logs actually landing in Loki (metrics work; log pipeline needs debugging)
- [ ] Better deployment environments (proper staging vs. production, not just SSH + `docker stack deploy`)
- [ ] Switch peninei's AI step (translation/parsing) from OpenAI to Claude

### Server maintenance (todo)

Backups
- [ ] Nightly encrypted backups (Restic) of: Postgres (`pg_dump` all DBs, not just the volume), Docker volumes (`grafana_data`, `portainer_data`, `zot_data`, `traefik-certs`/`acme.json`, `crowdsec_*`), and the Swarm Docker secrets/configs source of truth (password manager, since secrets can't be read back out)
- [ ] Off-box destination (object storage / second provider) + retention policy (e.g. 7 daily / 4 weekly / 6 monthly)
- [ ] Backup script lives in the repo (`infrastructure/backup/`), runs from cron/systemd timer, alerts on failure
- [ ] Restore drill: bring up Postgres + a volume from backup on a scratch host and document the steps

Housekeeping / cleanup scripts
- [ ] Scheduled `docker system prune` (dangling images, stopped containers, build cache) - not `--volumes`
- [ ] Prune old image tags from the registry (GC frees the disk once tags are deleted)
- [ ] Docker log rotation (`json-file` `max-size`/`max-file` in `daemon.json`) and journald size limit
- [ ] Loki / Prometheus / Tempo retention limits so the disk doesn't fill
- [ ] Disk usage alert (>80%) wired to the monitoring stack

Host hardening and patching
- [ ] `unattended-upgrades` for security patches; reboot plan for Swarm (single node = brief downtime)
- [ ] SSH: key-only, no root login, non-default fail2ban/CrowdSec SSH collection
- [ ] Firewall (ufw/Vultr firewall): only 22, 80, 443 (+4317 OTLP); confirm nothing else is published
- [ ] Pin remaining `:latest` images (`crowdsec`, `fbonalair/traefik-crowdsec-bouncer`, `pgadmin4`, portainer `lts`) and review whether the bouncer image is still maintained
- [ ] Remove the `whoami` test service once it's no longer needed
- [ ] Monthly check: image updates, cert expiry, CrowdSec decisions, backup restore test

### Repo cleanup (todo)

- [ ] Consistent `.env.example` per stack (layout is now `infrastructure/<stack>/stack.yml` for platform, `<app>/stack.yml` for apps)
- [ ] Fix naming typos (`peninei` vs `penieni`, `READEME` in history is fine to leave) and make `.gitignore` cover every `.env` / local secret file
- [ ] Add a short `docs/runbook.md` (deploy order, secrets list, rollback, DNS records) so nothing lives only in my head
- [ ] Pre-commit check: `docker compose config`/`yamllint` on every stack file

### Websites to host (todo)

- [ ] Put the **portfolio** back online (`portfolio/` already has a Dockerfile; needs a Swarm `stack.yml`, `portfolio.` / apex route, CrowdSec only, image from the registry)
- [ ] Decide the apex domain: `abrahamgreenberg.co.uk` -> portfolio, other sites on subdomains
- [ ] Add other personal projects as they're built, each with its own stack file; use the template: image from registry, `proxy-network`, router with `crowdsec-bouncer@swarm` (public) or `sso@swarm` (private)
- [ ] Home page / landing listing all services (behind `sso` for the private ones)

### Later

- [ ] Wire up the alerts listed above
- [ ] Disaster-recovery drills (restore DB + volumes from backup, redeploy from Git only)
- [ ] VPS backups at the volume/DB level (nightly, encrypted - see runbook §7.4 for the Restic sketch; tracked above)
- [ ] Optional: Grafana auth-proxy SSO (needs Grafana on a Traefik-only network first)

### Done

- [x] Merged all projects into one monorepo
- [x] Repo cleanup: removed the Compose-era `infra/` and stale `test/` dirs; auth test rig now at `infrastructure/auth/test/`; notes in `docs/`
- [x] Rate limiting + caching on the peninei API
- [x] Alpine base images + shared pnpm store across Node containers
- [x] Offline-capable PWA download for peninei halachot
- [x] Observability stack (Grafana/Prometheus/Loki/Tempo/Alloy) stood up and validated with a disposable test app before touching production code
- [x] CrowdSec + Traefik bouncer
- [x] Diagnosed and fixed a timezone-dependent date bug in peninei
- [x] Peninei converted to a Docker Swarm stack with metrics/logs wired to Grafana
- [x] Replaced Authentik with oauth2-proxy + GitHub (single user, no DB), validated on a local test rig first
- [x] Dashboards (Traefik, Grafana, pgAdmin, Portainer) behind `sso@swarm`; peninei stays public
- [x] CrowdSec bouncer no longer exposed to the internet (middleware moved into the Traefik stack); Traefik insecure API mode turned off
