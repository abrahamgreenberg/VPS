# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:20-alpine

# Two images come out of this file:
#   --target runtime   the API (default, last stage). No Prisma CLI, no pnpm, no sources.
#   --target migrate   one-shot `prisma migrate deploy`. Only the Prisma CLI + prisma/ folder.

# ---- build: full deps -> generated Prisma client + dist/ -> prune dev deps ------
FROM ${NODE_IMAGE} AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
RUN pnpm prisma generate && pnpm build
# Remember the exact CLI version from the lockfile for the migrate image, then drop
# every devDependency and the optional peers (typescript, prisma CLI, ...). The client stays.
RUN node -p "require('prisma/package.json').version" > /prisma-version \
 && pnpm prune --prod --no-optional

# ---- migrate: just the Prisma CLI (same version as @prisma/client) + migrations --
FROM ${NODE_IMAGE} AS migrate
WORKDIR /app
COPY --from=build /prisma-version /tmp/prisma-version
RUN npm install --prefix /opt/prisma --cache /tmp/npm-cache --no-audit --no-fund "prisma@$(cat /tmp/prisma-version)" \
 && rm -rf /tmp/npm-cache /tmp/prisma-version /root/.cache
ENV PATH=/opt/prisma/node_modules/.bin:$PATH
COPY prisma ./prisma
# Needs BACKEND_DATABASE_URL (see peninei/migrate-stack.yml). If Prisma reports a failed
# migration: run this image with `prisma migrate resolve --rolled-back "<migration name>"`.
CMD ["prisma", "migrate", "deploy"]

# ---- runtime (default): node + prod node_modules + compiled code ----------------
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
CMD ["node", "dist/server.js"]
