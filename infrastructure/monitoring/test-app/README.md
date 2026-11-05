# test-app - disposable observability demo

Five tiny Flask services (gateway -> orders -> inventory/payments, plus a load generator) that emit OpenTelemetry
metrics, logs and traces. Built to prove the OTLP -> Alloy -> Prometheus/Loki/Tempo -> Grafana pipeline works **before**
pointing a real app at it. `common/telemetry.py` is the reference implementation the peninei backend's telemetry was
ported from. Not deployed on the VPS.

## Run
Against the public gateway (copy and fill `.env`, the basic-auth value is explained in `.env.example`):

    cp .env.example .env
    docker compose up --build

Or as plain Python processes with no Docker: `./run_local.sh`.

Then look for the services in Grafana (Explore -> Prometheus / Loki / Tempo). `PAYMENTS_DECLINE_RATE` makes some
requests fail on purpose so there are errors to look at.
