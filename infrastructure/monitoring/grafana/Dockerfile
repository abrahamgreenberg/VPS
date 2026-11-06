# Grafana with this folder's provisioning (datasources, alerting) baked in, so the stack only needs an image tag.
# Built by .github/workflows/latest-grafana.yml and release.yml -> registry.<domain>/infra/grafana.
ARG GRAFANA_VERSION=11.4.0
FROM grafana/grafana:${GRAFANA_VERSION}

COPY --chown=472:0 datasources.yaml /etc/grafana/provisioning/datasources/datasources.yaml
COPY --chown=472:0 contact-points.yaml notification-policies.yaml alert-rules.yaml /etc/grafana/provisioning/alerting/

ARG VERSION=dev
LABEL org.opencontainers.image.version=$VERSION
