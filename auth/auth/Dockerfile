# Use official Node.js image
FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest-9 --activate

COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Only copy source in production (dev uses bind mount)
COPY . .

RUN pnpm prisma generate
RUN pnpm build


# Use dev script in development, otherwise default to production
# CMD ["sh", "-c", "if [ \"$NODE_ENV\" = 'development' ]; then pnpm dev; else node dist/server.js; fi"]
CMD ["node", "dist/server.js"]