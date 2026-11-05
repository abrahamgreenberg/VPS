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
| `grafana` | `grafana/grafana:11.4.0` | `grafana.<domain>` behind `sso@swarm` + its own login; datasources provisioned from `grafana-datasources.yaml` |
| `alloy` | `grafana/alloy:v1.5.1` | **public** OTLP gateway at `alloy.<domain>` (HTTP via 443, gRPC via 4317) behind Traefik basic auth (`alloy-auth@swarm`); pipeline in `alloy-config.alloy` |
| `cadvisor`, `node-exporter` | pinned | global; container and host metrics |
| `postgres-exporter` | `v0.15.0` | reads the shared Postgres using the `postgres_*` secrets |

Networks: `monitoring-network` (internal data path), `proxy-network` (Grafana, Alloy), `database-network` (exporter).
Volumes: `prometheus_data`, `loki_data`, `tempo_data`, `grafana_data`.
Secrets: `grafana_admin_user`, `grafana_admin_password`, `postgres_user`, `postgres_password`.
Configs are created from the files in this folder.

## Deploy
    docker stack deploy -c infrastructure/monitoring/stack.yml monitoring

Prerequisites: postgres stack + traefik stack (Traefik must be on `monitoring-network` to be scraped).

**Changing a config file:** Swarm configs are immutable, so editing e.g. `prometheus.yml` and redeploying under the same
name fails. Give the config a new name in `stack.yml` (e.g. `prometheus_config_v2`) or remove the stack and redeploy.

## Operate
- Grafana: log in with GitHub (SSO), then the Grafana admin credentials.
- Sending telemetry from an app: OTLP/HTTP to `https://alloy.<domain>` with `Authorization: Basic ...`, or from inside the
  Swarm to `http://alloy:4318` over `monitoring-network` (no auth needed there).
- `test-app/` is a disposable demo that generates traffic to validate the pipeline - see its README.
- Alert rules aren't set up yet: see the list in the [roadmap](../../docs/roadmap.md#alerts-worth-adding).
