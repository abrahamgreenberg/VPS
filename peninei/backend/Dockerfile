# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:20-alpine

# ---- shared: pnpm + manifests -------------------------------------------------
FROM ${NODE_IMAGE} AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY package.json pnpm-lock.yaml ./

# ---- production dependencies only, plus the generated Prisma client ------------
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod
COPY prisma ./prisma
RUN pnpm prisma generate

# ---- build: full deps (typescript) -> dist/ ------------------------------------
FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
RUN pnpm prisma generate && pnpm build

# ---- runtime: node + prod node_modules + compiled code. No pnpm, no sources ----
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY prisma ./prisma

# Migrations run on start (prisma is a production dependency for this reason).
# If Prisma complains about a failed migration in production:
#   docker exec -it <backend container> sh   then   node_modules/.bin/prisma migrate resolve --rolled-back "<migration name>"
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/server.js"]
