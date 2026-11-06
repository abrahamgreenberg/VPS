# Loki with its config baked in, so the stack only needs an image tag. Built by .github/workflows/latest-loki.yml and release.yml.
FROM grafana/loki:3.7.9
COPY loki-config.yaml /etc/loki/local-config.yaml
ARG VERSION=dev
LABEL org.opencontainers.image.version=$VERSION
