# auth (oauth2-proxy + GitHub forward-auth)

Replaces Authentik. One Traefik middleware, `sso@swarm` = CrowdSec -> oauth2-proxy. Single user
(one allowed email), no database. Cookie is shared across `*.abrahamgreenberg.co.uk`, so you log in
once for every protected dashboard.

## What is protected

| Host                 | Stack      | Gate                                   |
| -------------------- | ---------- | -------------------------------------- |
| `traefik.`           | traefik    | `sso@swarm`                            |
| `grafana.`           | monitoring | `sso@swarm` (+ Grafana's own login)    |
| `pgadmin.`           | postgres   | `sso@swarm` (+ pgAdmin's own login)    |
| `portainer.`         | portainer  | `sso@swarm` (+ Portainer's own login)  |
| `whoami.`            | traefik    | `sso@swarm` (test app)                 |

Deliberately NOT behind sso (clients can't do browser logins / must be public):
- `peninei.` - public (CrowdSec only)
- `alloy.` - OTLP gateway, htpasswd basic auth (`alloy-auth@swarm`)
- `registry.` (planned) - will use the registry's own htpasswd, not sso
- `auth.` - the login page itself (CrowdSec only)

## Protect a new service
Add one label to its router (CrowdSec is already first in the chain, don't list it twice):

    - "traefik.http.routers.<name>.middlewares=sso@swarm"

## How it works
1. Request hits Traefik -> `sso` chain: `crowdsec-bouncer` -> `oauth-errors` -> `oauth-auth`.
2. `oauth-auth` (forwardAuth) asks `auth_oauth2-proxy:4180/oauth2/auth`: 202 = allowed, 401 = not logged in.
3. On 401, `oauth-errors` serves the oauth2-proxy sign-in page; the button goes to GitHub.
4. The wildcard `oauth2-all` router sends `/oauth2/*` on every subdomain to oauth2-proxy.
5. GitHub redirects to `auth.<domain>/oauth2/callback`; only the email in the `allowed_emails`
   config is accepted (`EMAIL_DOMAINS` is intentionally unset - `*` would admit any GitHub account).

Grafana/pgAdmin/Portainer keep their own logins behind sso (defence in depth). Grafana's
auth-proxy header SSO is deliberately not enabled: it needs Grafana on a network only Traefik
can reach, otherwise any container on `proxy-network` could forge the header.

## Deploy / redeploy

    git pull
    ./infrastructure/auth/create-secrets.sh        # first time only; skips what exists
    export GITHUB_CLIENT_ID=<prod client id>
    docker stack deploy -c infrastructure/auth/stack.yml auth        # stack name must be "auth"

Secrets/config: `oauth_client_secret`, `oauth_cookie_secret`, `allowed_emails`. GitHub OAuth app
callback: `https://auth.abrahamgreenberg.co.uk/oauth2/callback`.

## Operations
- **Change allowed email:** configs are immutable - `docker config create allowed_emails_v2 -`,
  change the `configs:` name in `stack.yml`, redeploy.
- **Rotate client secret:** `docker stack rm auth`, `docker secret rm oauth_client_secret`, re-run
  `create-secrets.sh`, redeploy.
- **Log out:** `https://auth.abrahamgreenberg.co.uk/oauth2/sign_out`
- **Locked out of a dashboard:** SSH in; set that router's label to `crowdsec-bouncer@swarm` and
  redeploy its stack. Peninei and the other public apps never depend on sso.
- **Test locally first:** `test/auth/` (Compose + `*.localtest.me`).

## Troubleshooting
| Symptom                                   | Likely cause                                              |
| ----------------------------------------- | --------------------------------------------------------- |
| deploy: "secret/config not found"         | `create-secrets.sh` not run                               |
| GitHub `incorrect_client_credentials`     | wrong client secret (see rotate above)                    |
| your own account gets 403                 | allowed email isn't your GitHub *primary verified* email  |
| redirect loop after login                 | cookie domain / whitelist domain mismatch                 |
| sign-in button loops                      | `oauth2-all` router missing or lower priority             |
| cert warning on `auth.`                   | DNS not pointing at the VPS yet / cert still issuing      |
