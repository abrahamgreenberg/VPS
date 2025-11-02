#!/bin/bash

# Container names
NAMES=(testsite6001 testsite6002 testsite6003)
PORTS=(6001 6002 6003)

# Stop and remove containers if they exist
for NAME in "${NAMES[@]}"; do
  if docker ps -a --format '{{.Names}}' | grep -q "^$NAME$"; then
    echo "Stopping and removing existing container: $NAME"
    docker stop "$NAME" >/dev/null 2>&1
    docker rm "$NAME" >/dev/null 2>&1
  fi
done

# Run containers
for i in {0..2}; do
  docker run -d \
    --name "${NAMES[$i]}" \
    --network proxy-network \
    -p 127.0.0.1:${PORTS[$i]}:80 \
    -v ./test.html:/usr/local/apache2/htdocs/index.html \
    httpd:alpine
done