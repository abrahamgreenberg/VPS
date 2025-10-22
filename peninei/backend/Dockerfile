FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .


RUN npx prisma generate


# EXPOSE $API_PORT

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]