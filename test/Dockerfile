# Base image with Node.js and Python
FROM python:3.12-slim

# Install Node.js
RUN apt-get update && \
    apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean

# Install cron
RUN apt-get install -y cron

# Set workdir
WORKDIR /app

# Copy Node.js code
COPY nodejs/ ./nodejs/
WORKDIR /app/nodejs

# Install Node.js dependencies
RUN npm install

# Copy Python scripts
COPY python/ ../python/

# Copy cron file
COPY cronfile /etc/cron.d/mycron
RUN chmod 0644 /etc/cron.d/mycron && crontab /etc/cron.d/mycron

# Expose Node.js port
EXPOSE 4001

# Start cron and Node.js server
CMD cron && node server.js
