# Use official Node.js image
FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest-9 --activate

COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

RUN pnpm prisma generate
RUN pnpm build && ls -la dist/

# CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/server.js"]
CMD ["node", "dist/server.js"]