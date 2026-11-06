# Tempo with its config baked in, so the stack only needs an image tag. Built by .github/workflows/latest-tempo.yml and release.yml.
FROM grafana/tempo:2.6.1
COPY tempo-config.yaml /etc/tempo/tempo.yaml
ARG VERSION=dev
LABEL org.opencontainers.image.version=$VERSION
