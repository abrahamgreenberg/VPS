# Dockerfile
FROM python:3.12-slim

# Install Node.js and cron
RUN apt-get update && \
    apt-get install -y curl gnupg cron && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean

# Set working directory
WORKDIR /app

# Copy Node.js code and install dependencies
COPY nodejs/package*.json ./nodejs/
WORKDIR /app/nodejs
RUN npm install

COPY nodejs/ ./     # Copy Node.js code

# Copy Python scripts
COPY python/ ../python/

# Setup cron
COPY cronfile /etc/cron.d/mycron
RUN chmod 0644 /etc/cron.d/mycron && crontab /etc/cron.d/mycron

# Expose Node.js port
EXPOSE 4001

# Start cron and Node.js server
CMD ["sh", "-c", "cron && node server.js"]
