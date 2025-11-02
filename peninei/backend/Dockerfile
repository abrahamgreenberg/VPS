FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest-9 --activate

COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

RUN pnpm prisma generate



# If you see Prisma migration errors in production:
# 1. Connect to the running backend container:
#    docker compose run --rm backend sh
# 2. Run one of the following (replace with your migration name):
#    pnpm prisma migrate resolve --rolled-back "20251025220827_add_chapter_and_halacha_number"
#    or, if DB is empty and you want to reset:
#    pnpm prisma migrate reset

CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start"]