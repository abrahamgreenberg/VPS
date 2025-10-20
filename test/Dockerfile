# Use an image with Node.js + Python
FROM python:3.12-slim AS base

# Install dependencies
RUN apt-get update && \
    apt-get install -y curl cron && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Node.js app and install dependencies
COPY nodejs/package*.json ./nodejs/
WORKDIR /app/nodejs
RUN npm install

# Copy full Node.js code
COPY nodejs/ ./nodejs/

# Copy Python script
WORKDIR /app
COPY python/ ./python/

# Copy cron schedule
COPY crontab /etc/cron.d/my-cron
RUN chmod 0644 /etc/cron.d/my-cron && crontab /etc/cron.d/my-cron

# Expose Node.js port
EXPOSE 4001

# Run cron in background and Node.js server
CMD ["sh", "-c", "cron && node /app/nodejs/server.js"]
