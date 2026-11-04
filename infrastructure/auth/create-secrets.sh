#!/usr/bin/env bash
# Creates the Swarm secrets + config that stack.yml needs. Run on a manager node.
# Skips anything that already exists (Swarm secrets/configs are immutable).
set -euo pipefail

exists() { docker "$1" inspect "$2" >/dev/null 2>&1; }

if exists secret oauth_client_secret; then
  echo "secret oauth_client_secret exists - skipping"
else
  read -rsp "GitHub OAuth client secret (prod app): " client_secret; echo
  printf '%s' "$client_secret" | docker secret create oauth_client_secret -
fi

if exists secret oauth_cookie_secret; then
  echo "secret oauth_cookie_secret exists - skipping"
else
  openssl rand -base64 32 | tr -- '+/' '-_' | tr -d '\n' | docker secret create oauth_cookie_secret -
fi

if exists config allowed_emails; then
  echo "config allowed_emails exists - skipping (to change it: create allowed_emails_v2 and update stack.yml)"
else
  read -rp "Allowed email (your GitHub PRIMARY verified email): " email
  printf '%s\n' "$email" | docker config create allowed_emails -
fi

docker secret ls --filter name=oauth_
docker config ls --filter name=allowed_emails
