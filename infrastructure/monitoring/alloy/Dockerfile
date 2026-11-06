# Alloy with its config baked in, so the stack only needs an image tag. Built by .github/workflows/latest-alloy.yml and release.yml.
FROM grafana/alloy:v1.21.3
COPY config.alloy /etc/alloy/config.alloy
ARG VERSION=dev
LABEL org.opencontainers.image.version=$VERSION
