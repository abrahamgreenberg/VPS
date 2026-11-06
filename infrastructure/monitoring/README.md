# monitoring - metrics, logs, traces, dashboards

**What:** the observability stack. Apps send OTLP to Alloy; host/container/Traefik/Postgres metrics are scraped by Prometheus;
Grafana shows it all.

    app --OTLP--> alloy --metrics--> prometheus --\
                        --logs-----> loki --------+--> grafana
                        --traces---> tempo -------/
    cadvisor, node-exporter, postgres-exporter, traefik  <-- scraped by prometheus

| Service | Image | Detail |
| ------- | ----- | ------ |
| `prometheus` | `prom/prometheus:v2.55.1` | 15d retention; accepts remote-write from Alloy; scrape config in `prometheus.yml` |
| `loki` | `grafana/loki:3.5.8` | logs, 7d retention (`loki-config.yaml`) |
| `tempo` | `grafana/tempo:2.6.1` | traces, 7d retention (`tempo-config.yaml`) |
| `grafana` | `registry.<domain>/infra/grafana` (built from `grafana/Dockerfile` on `grafana/grafana:11.4.0`) | `grafana.<domain>` behind `sso@swarm` + its own login; datasources, alerting and SMTP all provisioned from `grafana/` (config as code) |
| `alloy` | `grafana/alloy:v1.5.1` | **public** OTLP gateway at `alloy.<domain>` (HTTP via 443, gRPC via 4317) behind Traefik basic auth (`alloy-auth@swarm`); pipeline in `alloy-config.alloy` |
| `cadvisor`, `node-exporter` | pinned | global; container and host metrics |
| `postgres-exporter` | `v0.15.0` | reads the shared Postgres using the `postgres_*` secrets |

Networks: `monitoring-network` (internal data path), `proxy-network` (Grafana, Alloy), `database-network` (exporter).
Volumes: `prometheus_data`, `loki_data`, `tempo_data`, `grafana_data`.
Secrets: `grafana_admin_user`, `grafana_admin_password`, `grafana_smtp_password`, `postgres_user`, `postgres_password`.
Configs are created from the files in this folder.

## Deploy
    export ALERT_EMAIL_TO=you@example.com        # required: who receives alerts
    docker stack deploy -c infrastructure/monitoring/stack.yml monitoring

Needs the `grafana_smtp_password` secret first (see [Alert email](#alert-email)) and the `infra/grafana` image in the registry (push to main
first so CI builds it). In Portainer: paste `stack.yml`, set `ALERT_EMAIL_TO` (and optionally `GRAFANA_TAG`), and add the registry
under Registries (user `deployer`). From the CLI add `--with-registry-auth`.

Prerequisites: postgres stack + traefik stack (Traefik must be on `monitoring-network` to be scraped).

**Changing a config file:** Swarm configs are immutable, so editing e.g. `prometheus.yml` and redeploying under the same
name fails. Give the config a new name in `stack.yml` (e.g. `prometheus_config_v2`) or remove the stack and redeploy.

## Operate
- Grafana: log in with GitHub (SSO), then the Grafana admin credentials.
- Sending telemetry from an app: OTLP/HTTP to `https://alloy.<domain>` with `Authorization: Basic ...`, or from inside the
  Swarm to `http://alloy:4318` over `monitoring-network` (no auth needed there).
- `test-app/` is a disposable demo that generates traffic to validate the pipeline - see its README.

## Alerting (config as code)
Everything lives in `grafana/` and is baked into the Grafana image by CI, so it is read-only in the Grafana UI. To change it: edit the file, push
(`latest / grafana` builds `infra/grafana:latest`), then redeploy the stack with "Re-pull image" in Portainer. For a pinned version run
**release** with `grafana` and set `GRAFANA_TAG` to the printed tag.

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

