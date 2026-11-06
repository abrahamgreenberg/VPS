# Prometheus with its config baked in, so the stack only needs an image tag. Built by .github/workflows/latest-prometheus.yml and release.yml.
FROM prom/prometheus:v2.55.1
COPY prometheus.yml /etc/prometheus/prometheus.yml
ARG VERSION=dev
LABEL org.opencontainers.image.version=$VERSION
