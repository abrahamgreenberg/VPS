FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .


RUN npx prisma generate


# EXPOSE $BACKEND_API_PORT

# If you see Prisma migration errors in production:
# 1. Connect to the running backend container:
#    docker compose run --rm backend sh
# 2. Run one of the following (replace with your migration name):
#    npx prisma migrate resolve --rolled-back "20251025220827_add_chapter_and_halacha_number"
#    or, if DB is empty and you want to reset:
#    npx prisma migrate reset

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]