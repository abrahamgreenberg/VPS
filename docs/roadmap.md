# Roadmap

The overview is in the [README](../README.md#roadmap). This is the detailed list. Check boxes as things land.

## Order of work

| Focus                                        | Why this slot                                         | Status                                 |
| -------------------------------------------- | ----------------------------------------------------- | -------------------------------------- |
| Auth / bouncer rollout                       | Finish before starting anything new                   | Done                                   |
| Host security + local backups + housekeeping | Biggest risks first                                   | Done (see [operations](operations.md)) |
| Docker hardening                             | Finish the security pass                              | Next                                   |
| Private registry                             | Unlocks building off the VPS; small, self-contained   | Not started                            |
| CI/CD (GitHub Actions -> registry -> deploy) | Needs the registry; moves peninei off VPS-side builds | Not started                            |
| Off-box backups                              | Local dumps don't survive losing the disk             | Later                                  |
| Portfolio and other websites                 | Easy once registry + CI/CD template exists            | Later                                  |
| Ongoing                                      | Telemetry fixes, alerts, repo tidying                 | Interleave                             |

## Next

- [ ] **Private image registry** at `registry.<domain>` ([infrastructure/registry](../infrastructure/registry/README.md)): Zot, htpasswd auth
      (not `sso`), CrowdSec, retention of `latest` + the 5 newest `YYYY.MM.DD.REV` tags. Written and tested locally; deploy it, then
      prove the flow with a simple app (push from PC -> `docker stack deploy --with-registry-auth` on the VPS).
- [ ] Move peninei (then the others) to `registry.<domain>/...` images: build + push from PC,
      `docker stack deploy --with-registry-auth` on the VPS, so nothing is built on the VPS
- [ ] CI/CD with GitHub Actions (plan: [ci-cd.md](ci-cd.md)): push to `main` builds and pushes `latest`; a manual `workflow_dispatch` builds and pushes the
      next `YYYY.MM.DD.REV`. Needs thought on a public repo: only collaborators can dispatch, forks never get secrets, restrict
      the dispatch job to an environment with required reviewers, push with the `ci` user only, never use `pull_request_target`
      with secrets; then deploy (manual `docker stack deploy` first)
- [ ] **Upgrade Node 20 -> 24 (LTS)** for peninei backend/frontend and `hello`: Node 20 reached end of life on 2026-04-30. The
      base image is one `ARG NODE_IMAGE` in `peninei/backend/Dockerfile`; re-run the backend e2e check (migrate + a Prisma query) after
- [ ] Fix peninei telemetry: add traces, fix logs actually landing in Loki (metrics work; the log pipeline needs debugging)
- [ ] Proper staging vs production environments (not just SSH + `docker stack deploy`)
- [ ] Switch peninei's AI step (translation/parsing) from OpenAI to Claude

## Security

Done: Vultr firewall (22/80/443/4317), SSH key-only/no root, fail2ban, unattended-upgrades (security only, no
auto-reboot), Portainer no longer publishes ports, dashboards behind SSO, Traefik insecure API off.

- [ ] Reboot plan for kernel updates (single-node Swarm = brief downtime)
- [ ] Verify CrowdSec is actually ingesting Traefik's access log (`cscli metrics`); the stack has no log source mounted, so it may only enforce the community blocklist
- [ ] Pin remaining `:latest` images (`crowdsec`, `fbonalair/traefik-crowdsec-bouncer`, `pgadmin4`, `traefik/whoami`,
      portainer `lts`); check the bouncer image is still maintained
- [ ] Docker socket proxy (`tecnativa/docker-socket-proxy`, read-only) in front of Traefik; review the Portainer
      agent's socket + volumes mount
- [ ] `cap_drop: [ALL]`, `read_only: true`, non-root `user:` per service - only where compatible, test on each redeploy
- [ ] Image scanning (`trivy image` / `docker scout`) for peninei and the pinned third-party images
- [ ] Move `CROWDSEC_BOUNCER_API_KEY` to the existing `crowdsec_bouncer_api_key` Swarm secret (if the bouncer supports `_FILE`)
- [ ] Move remaining on-server `.env` values (peninei build/compose) to Swarm secrets where compatible
- [ ] Remove unused secret `traefik_dashboard_auth`
- [ ] `lynis audit system` and act on the findings
- [ ] Encrypted overlay networks (`--opt encrypted`) if a second node is ever added

## Backups and maintenance

Done: nightly local `pg_dumpall` (newest 2 kept), weekly Docker/log prune, Loki/Tempo/Prometheus retention
(7d / 7d / 15d).

- [ ] Docker log rotation in `/etc/docker/daemon.json` (needs a Docker restart - do it with a reboot window)
- [ ] Off-box, encrypted backups (Restic to B2 / object storage) of the dumps + Docker volumes (`grafana_data`,
      `portainer_data`, `traefik-certs`/`acme.json`, `crowdsec_*`), with a retention policy
- [ ] Backup of telemetry data / whole-system snapshots (Vultr snapshots are the cheap option)
- [ ] Alert if the newest dump is older than ~26h or a timer job fails
- [ ] Restore drill on a scratch host, documented
- [x] Registry tag pruning: Zot retention keeps `latest` + 5 newest dated tags (set up with the registry)
- [ ] Back up the registry volume (low priority: images can be rebuilt by CI) and add `registry_data` to the off-box list
- [ ] Review the dangling anonymous volumes the prune job will clean up
- [ ] Monthly check: image updates, cert expiry, CrowdSec decisions, backup restore test
- [ ] Add more password generating scripts

## Repo

- [ ] Consistent `.env.example` per stack
- [ ] Pre-commit check: `docker compose config` / `yamllint` on every stack file

## Websites to host

- [ ] Put the **portfolio** back online: image + `stack.yml` + CI are built (hosts `portfolio.` and `fywr.abrahamgreenberg.co.uk`, CrowdSec
      only); remaining: push, deploy it in Portainer, then decide the apex
- [ ] Decide the apex domain: `abrahamgreenberg.co.uk` -> portfolio, other sites on subdomains
- [ ] Add other personal projects as they're built, each with its own stack file; template: image from registry,
      `proxy-network`, router with `crowdsec-bouncer@swarm` (public) or `sso@swarm` (private)
- [ ] Home page / landing listing all services (behind `sso` for the private ones)

## Coolify?

Exploring Coolify as a dashboard to create, deploy and manage apps. It has databases and backups built in and is
described as a self-hosted PaaS. It needs more resources than this VPS comfortably has and would raise the monthly
hosting bill, so it may not be worth it for this project.

## Alerts worth adding

The metrics pipeline exists (Prometheus + Loki + cAdvisor + node-exporter + postgres-exporter + peninei's own OTEL
metrics). Infra alerts (disk, memory, targets, Postgres, restarts, OOM, 5xx, cert expiry) are provisioned with email delivery
([monitoring README](../infrastructure/monitoring/README.md#alerting-config-as-code)); the rest below is still to do.

**Infra health**

- Disk usage > 80% on the host (`node_filesystem_avail_bytes`)
- Container restart loop - N restarts in 5 minutes (cAdvisor)
- A Swarm service's running replica count < desired for > 2 minutes
- Container OOM-killed

**App health (peninei, and future apps via the same OTEL pattern)**

- HTTP 5xx rate over a rolling window (`http_requests_total{status_code=~"5.."}`)
- p95 request latency above threshold (`http_request_duration_ms`)
- `sync_duration_ms` p99 spike

**Data freshness (business logic, not just infra)**

- `halachas_scraped_total` flat for > 24h -> the daily scrape job silently failed
- `halachas_ai_parsed_total{result="failure"}` rate spike -> AI translation step degrading

**Security**

- Spike in CrowdSec bans/decisions over baseline -> possible attack in progress
- TLS certificate expiring within 14 days (Traefik/ACME)

**Meta**

- No logs received from a known service in Loki for > N minutes
- Optional: Grafana auth-proxy SSO (needs Grafana on a Traefik-only network first)

## Done

- [x] Peninei backend image slimmed: multi-stage, production deps only, `.dockerignore` (compressed 187 MB -> 155 MB); no pnpm at runtime
- [x] Peninei migrations split from the runtime: `migrate` Dockerfile target + manual `peninei/migrate/stack.yml` job; runtime has no Prisma CLI (698 MB -> 465 MB on disk)
- [x] Merged all projects into one monorepo
- [x] Rate limiting + caching on the peninei API
- [x] Alpine base images + shared pnpm store across Node containers
- [x] Offline-capable PWA download for peninei halachot
- [x] Observability stack (Grafana/Prometheus/Loki/Tempo/Alloy) stood up and validated with a disposable test app
- [x] CrowdSec + Traefik bouncer
- [x] Diagnosed and fixed a timezone-dependent date bug in peninei
- [x] Peninei converted to a Docker Swarm stack with metrics/logs wired to Grafana
- [x] Replaced Authentik with oauth2-proxy + GitHub (single user, no DB), validated on a local test rig first
- [x] Dashboards (Traefik, Grafana, pgAdmin, Portainer) behind `sso@swarm`; peninei stays public
- [x] CrowdSec bouncer no longer exposed to the internet; Traefik insecure API turned off
- [x] Repo cleanup: removed the Compose-era `infra/` and stale `test/` dirs, auth test rig moved into `infrastructure/auth/test/`
- [x] Host hardening (firewall, SSH, fail2ban, unattended-upgrades) and Portainer port closed
- [x] Grafana config as code (datasources, contact point, policy, 8 infra alert rules) + email via SMTP relay from alerts@<domain>
- [x] Nightly local Postgres backup + weekly prune timers
