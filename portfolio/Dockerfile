# ── Build stage: Eleventy -> _site/ ───────────────────────────────────────────
ARG NODE_IMAGE=node:20-alpine
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build

# ── Serve stage: non-root nginx on 8080 ───────────────────────────────────────
FROM nginxinc/nginx-unprivileged:1.30-alpine
COPY --from=build --chown=101:101 /app/_site /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
