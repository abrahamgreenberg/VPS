# auth (oauth2-proxy + GitHub forward-auth)

Replaces Authentik. One middleware, `sso@swarm` = CrowdSec -> oauth2-proxy. Attach to any router:

    traefik.http.routers.<name>.middlewares=sso@swarm

Only the single email in the `allowed_emails` config can log in. Cookie is shared across
`*.abrahamgreenberg.co.uk` (single sign-on). Test locally first: `test/auth/`.

## Rollout (run on the manager node, in this order)

### 1. Remove Authentik
Authentik only ever protected the Traefik dashboard and `whoami`. Those two routes will return
404 until step 3 (a missing middleware fails closed - they do not become public).

    # backup first
    docker exec "$(docker ps -qf name=postgres_postgres)" sh -c \
      'pg_dump -U "$(cat /run/secrets/postgres_user)" -Fc authentik' > ~/authentik-$(date +%F).dump
    ls -lh ~/authentik-*.dump                      # must be non-empty

    docker stack rm authentik
    docker service ls | grep authentik             # wait until empty
    docker secret rm authentik_secret_key authentik_postgres_user authentik_postgres_password
    docker volume ls | grep authentik              # then: docker volume rm <each>

    # find the role name BEFORE dropping, and make sure nothing else uses it
    docker exec -it "$(docker ps -qf name=postgres_postgres)" sh -c 'psql -U "$(cat /run/secrets/postgres_user)" -c "\du"'
    # then in psql:
    #   DROP DATABASE authentik WITH (FORCE);
    #   DROP ROLE <authentik_role>;

### 2. Test the removal
    docker service ls                              # every other service at desired replicas
    docker network ls | grep authentik             # nothing
    curl -sI https://grafana.abrahamgreenberg.co.uk | head -1   # still up
    curl -sI https://whoami.abrahamgreenberg.co.uk | head -1    # 404 (not 200)
    docker service logs traefik_traefik --since 10m 2>&1 | grep -i -E 'error|authentik' | tail

Check your app sites (peninei, portfolio, grafana, pgadmin, portainer) load. Nothing but
whoami + the dashboard should have changed.

### 3. Deploy the new auth stack (whoami is the test app)
Prereqs: DNS A record for `auth.abrahamgreenberg.co.uk`; a *prod* GitHub OAuth app with
Homepage `https://auth.abrahamgreenberg.co.uk` and Callback
`https://auth.abrahamgreenberg.co.uk/oauth2/callback`.

    git pull
    ./infrastructure/auth/create-secrets.sh
    export GITHUB_CLIENT_ID=<prod client id>
    docker stack deploy -c infrastructure/auth/stack.yml auth
    docker service ps auth_oauth2-proxy --no-trunc          # Running
    docker service logs auth_oauth2-proxy --tail 30

    # whoami + dashboard carry sso@swarm in the committed traefik stack
    docker stack deploy -c infrastructure/traefik/stack.yml traefik

Test on whoami ONLY:
- `curl -I https://whoami.abrahamgreenberg.co.uk` -> 401 (sign-in page), never 200
- browser: log in with GitHub -> whoami shows `X-Auth-Request-Email`
- different GitHub account -> 403   <-- the security check, do not skip
- cookie in devtools: Domain `.abrahamgreenberg.co.uk`, Secure, HttpOnly

### 4. Confirm everything Authentik covered is protected
- `https://traefik.abrahamgreenberg.co.uk` -> sign-in, then dashboard, no second login
- Then close the temporary hole: in `infrastructure/traefik/stack.yml` replace
  `--api.insecure=true` with `--api.dashboard=true`, redeploy traefik, and re-check the
  dashboard still loads behind sso.

### 5. Push
Commit and push; nothing here needs a rebuild.

## Rollback
Before step 1 nothing changes. After: the only things behind `sso` are the dashboard and whoami;
to reopen the dashboard in an emergency, redeploy traefik with its middlewares label set to
`crowdsec-bouncer@swarm` only (SSH access is unaffected).

## Changing the allowed email
Configs are immutable: `docker config create allowed_emails_v2 -`, change the `configs:` name in
`stack.yml`, redeploy.
