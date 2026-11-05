# Deployment runbook

How to bring the whole platform up on a fresh VPS, and how to redeploy one piece. Each stack has its own
README (linked below) with the details for that stack.

Everything runs on a **single-node Docker Swarm** on a Vultr VPS. DNS is at Namecheap.

## 1. One-time host setup

1. Create the VPS (Ubuntu), a non-root sudo user (`devuser`), and add your SSH key.
2. Harden it - see [operations.md](operations.md#host-security) (Vultr firewall, SSH, fail2ban, automatic patching).
3. Install Docker, then:

       docker swarm init --advertise-addr <vps-ip>
       docker network create --driver overlay --attachable proxy-network
       docker network create --driver overlay --attachable database-network
       docker network create --driver overlay --attachable monitoring-network

   These three are **external** networks shared by every stack. A service only joins the ones it needs.
4. Clone the repo: `git clone https://github.com/abisammy/vps ~/repos/vps`.
5. Install the backup + housekeeping timers: [`infrastructure/backup`](../infrastructure/backup/README.md) and
   [`infrastructure/maintenance`](../infrastructure/maintenance/README.md) (`sudo ./infrastructure/install-host-jobs.sh`).

## 2. DNS (Namecheap)

A records pointing at the VPS IP (or one wildcard `*.abrahamgreenberg.co.uk`):

| Host | Served by | Gate |
| ---- | --------- | ---- |
| `auth.` | [auth](../infrastructure/auth/README.md) | CrowdSec |
| `traefik.` `grafana.` `pgadmin.` `portainer.` `whoami.` | traefik / monitoring / postgres / portainer | CrowdSec + SSO |
| `alloy.` | monitoring (OTLP gateway) | basic auth (no CrowdSec) |
| `registry.` | [registry](../infrastructure/registry/README.md) | CrowdSec + htpasswd (not SSO) |
| `peninei.` | [peninei](../peninei/README.md) | CrowdSec (public) |
| `hello.` | [hello](../hello/README.md) | CrowdSec (public) |

Firewall (Vultr): inbound **22, 80, 443, 4317** only. Docker's published ports bypass `ufw`, so the Vultr firewall
is the real perimeter.

## 3. Secrets

Swarm secrets are immutable and can't be read back, so **keep the source values in a password manager**.
Create with `printf '%s' "<value>" | docker secret create <name> -`.

| Secret / config | Used by | Notes |
| --------------- | ------- | ----- |
| `postgres_user`, `postgres_password` | postgres, monitoring (postgres-exporter) | superuser for the shared DB |
| `pgadmin_default_email`, `pgadmin_default_password` | postgres (pgAdmin) | |
| `grafana_admin_user`, `grafana_admin_password` | monitoring | |
| `alloy_basic_auth_users` | traefik | htpasswd line: `htpasswd -nbB <user> '<password>'` |
| `oauth_client_secret`, `oauth_cookie_secret`, config `allowed_emails` | auth | made by `infrastructure/auth/create-secrets.sh` |
| `peninei_database_url`, `peninei_openai_api_key` | peninei | |
| `registry_htpasswd_v1` | registry | users `admin`, `ci`, `deployer`; made by `infrastructure/registry/create-secrets.sh` |
| `crowdsec_bouncer_api_key` | *(not wired up yet)* | the crowdsec stack still reads the env var below |
| `traefik_dashboard_auth` | *(unused leftover)* | safe to `docker secret rm` |

Environment variables read **at deploy time** (not stored anywhere on the server):

| Variable | Stack | Value |
| -------- | ----- | ----- |
| `GITHUB_CLIENT_ID` | auth | prod GitHub OAuth app client id |
| `CROWDSEC_BOUNCER_API_KEY` | crowdsec | from `docker exec <crowdsec container> cscli bouncers add traefik-bouncer` |

## 4. Deploy order

Order matters because later stacks reference earlier ones (networks, secrets, Traefik middlewares).

    cd ~/repos/vps && git pull

    docker stack deploy -c infrastructure/postgres/stack.yml    postgres
    docker stack deploy -c infrastructure/traefik/stack.yml     traefik
    docker stack deploy -c infrastructure/crowdsec/stack.yml    crowdsec     # needs CROWDSEC_BOUNCER_API_KEY
    docker stack deploy -c infrastructure/auth/stack.yml        auth         # name MUST be "auth"; needs GITHUB_CLIENT_ID
    docker stack deploy -c infrastructure/monitoring/stack.yml  monitoring
    docker stack deploy -c infrastructure/portainer/stack.yml   portainer
    docker stack deploy -c infrastructure/registry/stack.yml    registry     # needs the registry_htpasswd_v1 secret; see its README
    # apps: see peninei/README.md

The stack name is the prefix in service names (`auth_oauth2-proxy`, `postgres_postgres`) and some configs rely on
it, so don't rename them.

## 5. Verify

    docker stack ls && docker service ls                 # every service n/n
    sudo ss -tulpn                                       # only 22, 80, 443, 4317 (+ swarm ports, blocked by the Vultr firewall)
    curl -I https://auth.abrahamgreenberg.co.uk          # TLS works
    # open https://grafana.abrahamgreenberg.co.uk        # GitHub login, then Grafana

## 6. Redeploy one piece / roll back

- Redeploy: `git pull`, then `docker stack deploy -c <stack file> <name>`. Only changed services restart.
- Roll back a service: `docker service rollback <stack>_<service>` (peninei has automatic rollback configured), or
  check out the previous commit and redeploy the stack.
- **Gotcha:** `docker stack deploy` does **not** unpublish a port you deleted from the file. Remove it explicitly:
  `docker service update --publish-rm <port> <service>`.
- **Gotcha:** in Swarm, a published port bound to `127.0.0.1` is *not* honoured - it still listens on `0.0.0.0`.
  Don't publish ports at all for anything that goes through Traefik.
- Swarm configs are immutable too: to change one, create a new name and update the stack file (see
  [monitoring](../infrastructure/monitoring/README.md)).
