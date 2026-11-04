# Local forward-auth test rig

TODO:
GET BETTER AUTH
GET BETTER DEPLOYMENT STACK
FIX PENINEI
GET OTHER APPS DEPLOYED
:)

Traefik + oauth2-proxy (GitHub) + whoami, on `*.localtest.me` (resolves to 127.0.0.1).

## 1. Routing only (no secrets needed)

    docker compose up -d
    curl -i http://open.localtest.me          # 200, whoami output

## 2. Add auth

    cp .env.example .env                      # fill in; see comments in the file
    docker compose --profile auth up -d
    curl -i http://protected.localtest.me     # 302 -> auth.localtest.me/oauth2/sign_in

Then in a browser: open http://protected.localtest.me, log in with GitHub, and you should
see whoami with `X-Auth-Request-Email`. Open http://protected2.localtest.me - no second login.

## Checks

- no cookie -> 302 to sign-in (never 200)
- allowed GitHub user -> 200 with X-Auth-Request-Email
- other GitHub user -> 403
- second subdomain -> no re-login (cookie domain `.localtest.me`)

Tear down: `docker compose --profile auth down`
