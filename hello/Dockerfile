# Tiny static site on a non-root nginx (listens on 8080).
FROM nginxinc/nginx-unprivileged:1.30-alpine

# Shown on the page so it's obvious which build is live: docker build --build-arg VERSION=2026.11.05.1 ...
ARG VERSION=dev

COPY --chown=101:101 index.html /usr/share/nginx/html/index.html
USER root
RUN sed -i "s/__VERSION__/${VERSION}/g" /usr/share/nginx/html/index.html
USER 101

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
