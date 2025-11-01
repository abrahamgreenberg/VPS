# Stage 1: Build frontend
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_FRONTEND_API_URL
ENV VITE_FRONTEND_API_URL=$VITE_FRONTEND_API_URL

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
