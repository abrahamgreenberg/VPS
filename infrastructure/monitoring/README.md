# monitoring - metrics, logs, traces, dashboards

**What:** the observability stack. Apps send OTLP to Alloy; host/container/Traefik/Postgres metrics are scraped by Prometheus;
Grafana shows it all.

    app --OTLP--> alloy --metrics--> prometheus --\
                        --logs-----> loki --------+--> grafana
                        --traces---> tempo -------/
    cadvisor, node-exporter, postgres-exporter, traefik  <-- scraped by prometheus

Folders `prometheus/`, `loki/`, `tempo/`, `alloy/`, `grafana/` each hold a service's config plus a tiny Dockerfile that bakes it into
the upstream image. CI builds them (path-filtered, `latest / <service>`) and pushes `registry.<domain>/infra/<service>`.

| Service | Base image (pinned in its Dockerfile) | Detail |
| ------- | ------------------------------------- | ------ |
| `prometheus` | `prom/prometheus:v2.55.1` | 15d retention; accepts remote-write from Alloy; scrape config `prometheus/prometheus.yml` |
| `loki` | `grafana/loki:3.5.8` | logs, 7d retention (`loki/loki-config.yaml`) |
| `tempo` | `grafana/tempo:2.6.1` | traces, 7d retention (`tempo/tempo-config.yaml`) |
| `grafana` | `grafana/grafana:11.4.0` | `grafana.<domain>` behind `sso@swarm` + its own login; datasources, alerting and SMTP provisioned from `grafana/` |
| `alloy` | `grafana/alloy:v1.5.1` | **public** OTLP gateway at `alloy.<domain>` (HTTP via 443, gRPC via 4317) behind Traefik basic auth (`alloy-auth@swarm`); pipeline `alloy/config.alloy` |
| `cadvisor`, `node-exporter` | stock, pinned in `stack.yml` | global; container and host metrics |
| `postgres-exporter` | stock `v0.15.0` | reads the shared Postgres using the `postgres_*` secrets |

Networks: `monitoring-network` (internal data path), `proxy-network` (Grafana, Alloy), `database-network` (exporter).
Volumes: `prometheus_data`, `loki_data`, `tempo_data`, `grafana_data`.
Secrets: `grafana_admin_user`, `grafana_admin_password`, `grafana_smtp_password`, `postgres_user`, `postgres_password`.
No Swarm configs: configuration travels inside the images, so there is nothing to version or bump.

## Deploy and update
First time:
1. Push to main so CI builds the five `infra/*` images (check the Actions tab).
2. Create the `grafana_smtp_password` secret (see [Alert email](#alert-email)). Prerequisites: postgres + traefik stacks.
3. Portainer -> Stacks -> Add stack: paste `stack.yml`; env vars `ALERT_EMAIL_TO` (required) and optionally `PROMETHEUS_TAG`, `LOKI_TAG`,
   `TEMPO_TAG`, `ALLOY_TAG`, `GRAFANA_TAG` (default `latest`); the registry (user `deployer`) must be added under Registries.
   (If the stack currently runs from the CLI, `docker stack rm monitoring` first; the volumes survive.)

Every later config change: edit the file on your machine -> push -> CI rebuilds only the changed service's image ->
Portainer -> the stack -> **Update the stack** with "Re-pull image and redeploy". To pin or roll back, run the **release**
workflow for that service and set its `*_TAG` variable. Changing `stack.yml` itself needs no CI: paste it into Portainer.
CLI alternative: `ALERT_EMAIL_TO=... docker stack deploy --with-registry-auth -c infrastructure/monitoring/stack.yml monitoring`.

## Operate
- Grafana: log in with GitHub (SSO), then the Grafana admin credentials.
- Sending telemetry from an app: OTLP/HTTP to `https://alloy.<domain>` with `Authorization: Basic ...`, or from inside the
  Swarm to `http://alloy:4318` over `monitoring-network` (no auth needed there).
- `test-app/` is a disposable demo that generates traffic to validate the pipeline - see its README.

## Alerting (config as code)
Everything lives in `grafana/` and is baked into the image, so it is read-only in the Grafana UI. To change it: see
[Deploy and update](#deploy-and-update).

| File | What |
| ---- | ---- |
| `datasources.yaml` | Prometheus, Loki, Tempo |
| `contact-points.yaml` | `email` -> `$ALERT_EMAIL_TO` |
| `notification-policies.yaml` | everything -> email; grouped, 12h repeat while still firing |
| `alert-rules.yaml` | disk > 85%, memory > 90%, scrape target down, Postgres down, container restart loop, OOM-killed, Traefik 5xx > 5%, TLS cert < 14 days |

Rules evaluate every minute against Prometheus; a missing metric counts as OK, a failing query raises a "DatasourceError" alert.
Not yet alertable (no metric exists): stale Postgres backup, CrowdSec ban spikes, peninei app metrics - see the
[roadmap](../../docs/roadmap.md#alerts-worth-adding).

### Alert email
Grafana only **sends** mail, through an SMTP relay, so alerts come from `alerts@abrahamgreenberg.co.uk` without running a mail
server (Vultr blocks port 25 and a VPS IP has poor mail reputation). Default provider: [Resend](https://resend.com) (free tier).
1. Resend -> Domains -> add `abrahamgreenberg.co.uk`. It shows DNS records (SPF, DKIM, optionally DMARC).
2. Namecheap -> Domain List -> Manage -> Advanced DNS -> add those records exactly as shown (TXT/MX/CNAME; the host column
   is relative, e.g. `resend._domainkey`). Wait for Resend to show "Verified" (minutes to an hour).
   Add DMARC too: TXT `_dmarc` = `v=DMARC1; p=none; rua=mailto:<your address>`.
3. Resend -> API Keys -> create one with "Sending access" for that domain.
4. On the VPS: `printf '%s' 're_xxxxxxxx' | docker secret create grafana_smtp_password -`
5. Deploy the stack (above). Test: Grafana -> Alerting -> Contact points -> `email` -> Test.

Another provider works too: set `SMTP_HOST` (`host:port`, STARTTLS on 587), `SMTP_USER` and the secret value to its SMTP credentials.
Rotating the key: create a new secret under a new name, point the stack at it, redeploy, then remove the old one.

