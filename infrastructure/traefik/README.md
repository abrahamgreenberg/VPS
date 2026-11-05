# traefik - edge proxy, TLS, shared middlewares

**What:** the only thing that listens publicly (80, 443, 4317). Routes by Docker labels on each service, terminates TLS
(Let's Encrypt, HTTP-01) and defines the middlewares every other stack attaches. Also runs `whoami`, a tiny test service
kept on purpose for checking routing and SSO.

| Item | Detail |
| ---- | ------ |
| Image | `traefik:v3.7`, Swarm provider on `/var/run/docker.sock` (read-only), must run on a manager |
| Entrypoints | `web` :80 (permanent redirect to HTTPS), `websecure` :443, `grpc` :4317 (OTLP gRPC to Alloy) |
| Certs | ACME `acme.json` in the `traefik-certs` volume |
| Dashboard | `traefik.<domain>`, behind `crowdsec-bouncer@swarm,sso@swarm`; `api.insecure` is off |
| Metrics | Prometheus, scraped by the monitoring stack at `traefik_traefik:8080` |
| Networks | `proxy-network`, `monitoring-network` |
| Secret | `alloy_basic_auth_users` (htpasswd) |

Middlewares defined here (by labels): `crowdsec-bouncer` (forwardAuth to the bouncer) and `alloy-auth` (basic auth for the
OTLP gateway). `sso` is defined by the [auth](../auth/README.md) stack.

## Deploy
    docker stack deploy -c infrastructure/traefik/stack.yml traefik       # name must be "traefik"

Prerequisites: the networks and the `alloy_basic_auth_users` secret ([deployment](../../docs/deployment.md)), DNS records,
and ports 80/443/4317 open in the Vultr firewall.

## Operate
    docker service logs -f traefik_traefik
    docker service logs traefik_traefik 2>&1 | grep -i acme            # cert issuance problems

## Notes
- Add a service: give it `traefik.enable=true`, a router rule, `entrypoints=websecure`, `tls.certresolver=letsencrypt`,
  the `loadbalancer.server.port`, and `middlewares=crowdsec-bouncer@swarm` (public) or `sso@swarm` (private).
- Ports are published in `host` mode (long syntax), which preserves the real client IP for CrowdSec.
- Pin note: image tag is `v3.7`; `traefik/whoami` is unpinned (`latest`).
