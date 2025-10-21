#! /bin/bash

cd docker

cd ngninx-proxy-manager
docker compose up -d

cd ../pgadmin
docker compose up -d

cd ../portainer
docker compose up -d

cd ../postgres
docker compose up -d

cd ../..