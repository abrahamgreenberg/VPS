# crowdsec - intrusion detection + Traefik bouncer

**What:** CrowdSec decides which IPs are bad; the bouncer answers Traefik's forwardAuth calls ("is this IP banned?") so
banned IPs are blocked at the edge. Every public router carries `crowdsec-bouncer@swarm`.

| Service | Image | Role |
| ------- | ----- | ---- |
| `crowdsec` | `crowdsecurity/crowdsec:latest` | engine + local API, `crowdsecurity/traefik` collection, volumes `crowdsec_db`, `crowdsec_config` |
| `bouncer` | `fbonalair/traefik-crowdsec-bouncer:latest` | forwardAuth endpoint `bouncer:8080/api/v1/forwardAuth` |

The bouncer is **not** routed publicly. Traefik reaches it over `proxy-network`; the middleware itself is defined in the
[traefik](../traefik/README.md) stack. Networks: `crowdsec-net` (engine <-> bouncer), `proxy-network`.

## Deploy
First time, register the bouncer and keep the key (also store it in a password manager):

    docker exec $(docker ps -qf name=crowdsec_crowdsec) cscli bouncers add traefik-bouncer
    export CROWDSEC_BOUNCER_API_KEY=<key printed above>
    docker stack deploy -c infrastructure/crowdsec/stack.yml crowdsec

The key is currently an environment variable at deploy time. A Swarm secret `crowdsec_bouncer_api_key` already exists
for it; wiring it in is on the [roadmap](../../docs/roadmap.md#security).

## Operate
    docker exec $(docker ps -qf name=crowdsec_crowdsec) cscli decisions list
    docker exec $(docker ps -qf name=crowdsec_crowdsec) cscli metrics
    docker exec $(docker ps -qf name=crowdsec_crowdsec) cscli decisions delete --ip <ip>     # unban yourself

## Known gap - verify
The stack installs the `crowdsecurity/traefik` collection but does not mount a log source for the engine to read, so
check `cscli metrics` ("Acquisition Metrics"): if Traefik's access log isn't being ingested, CrowdSec only enforces its
community blocklist and detects nothing locally. Tracked in the [roadmap](../../docs/roadmap.md#security).
Images are unpinned (`latest`) and the bouncer image's maintenance status should be reviewed.
