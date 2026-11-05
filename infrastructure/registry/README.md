# registry - private image registry (Zot)

**What:** `registry.<domain>`, where images are pushed from my PC / GitHub Actions and pulled by the Swarm, so nothing
has to be built on the VPS. [Zot](https://zotregistry.dev) was chosen over `registry:2` for per-user permissions (a
genuinely pull-only credential) and built-in garbage collection + tag retention.

| Item | Detail |
| ---- | ------ |
| Image | `ghcr.io/project-zot/zot-linux-amd64:v2.1.22` (x86_64; swap for `-arm64` on ARM) |
| Routing | `registry.<domain>` via Traefik with `crowdsec-bouncer@swarm`. **Not** behind `sso`: docker/CI can't do browser logins |
| Auth | htpasswd (bcrypt) in the Swarm secret `registry_htpasswd_v1`; anonymous access is denied |
| Storage | `registry_data` volume at `/var/lib/registry` |
| Network | `proxy-network` only, no published ports |

## Users
| User | Can | Used by |
| ---- | --- | ------- |
| `ci` | pull, push new tags, **overwrite** tags (needed for `latest`) | GitHub Actions / my PC |
| `deployer` | pull only | the VPS (`docker login` for `--with-registry-auth`) |
| `admin` | everything, including delete | me, rarely; keep the password offline |

Access rules live in `config.json` (`http.accessControl`). Verified locally against the real image: wrong password and
anonymous are rejected, `deployer` can pull but a push returns "access denied".

## Tag plan and retention
| Tag | Meaning |
| --- | ------- |
| `latest` | newest build of `main`, for development |
| `YYYY.MM.DD.REV` (e.g. `2026.11.05.1`) | a release; `REV` counts releases made that day |

Zot's retention policy (`config.json`, runs with garbage collection every 6h) keeps **`latest` and the 5 most recently
pushed `YYYY.MM.DD.REV` tags per repository**, and deletes everything else - including untagged leftovers and any tag
that matches neither rule (so `dev`, `sha-abc123`, `v1` etc. would be removed). Tested locally with 8 images: the 5
newest dated tags and `latest` survived. Buildx provenance/SBOM attestations (GitHub's default) survive too.

Two rules to keep it predictable:
- Each dated tag must be its own **build**. Retention ranks tags by push time of the *image*, so two dated tags that
  point at the same digest tie and the wrong one can be dropped. (Re-tagging `latest` as a release is fine, only one
  dated tag then points at it.)
- A tag that a running service is pinned to is only safe while it is among the newest 5, so don't pin production to an old tag.

## Deploy
Prerequisites: DNS `A` record `registry.<domain>` -> the VPS; the traefik stack redeployed with the longer
`readTimeout` (Traefik v3's default 60s aborts big layer uploads); `proxy-network` exists.

    cd ~/repos/vps && git pull
    docker stack deploy -c infrastructure/traefik/stack.yml traefik          # picks up readTimeout (brief proxy restart)
    ./infrastructure/registry/create-secrets.sh                              # prints 3 passwords ONCE - save them
    docker stack deploy -c infrastructure/registry/stack.yml registry
    docker service ps registry_zot && docker service logs registry_zot --tail 20

## Use it
From my PC (use the `ci` credentials):

    docker login registry.abrahamgreenberg.co.uk -u ci
    docker build -t registry.abrahamgreenberg.co.uk/apps/hello:latest .
    docker push registry.abrahamgreenberg.co.uk/apps/hello:latest

On the VPS, once (so `docker stack deploy --with-registry-auth` can pull; the login is stored in `~/.docker/config.json`,
so restrict the file to my user):

    docker login registry.abrahamgreenberg.co.uk -u deployer
    docker stack deploy --with-registry-auth -c <app>/stack.yml <app>      # image: registry.abrahamgreenberg.co.uk/apps/<name>:<tag>

Inspect (as `ci` or `admin`):

    curl -su ci:<password> https://registry.abrahamgreenberg.co.uk/v2/_catalog
    curl -su ci:<password> https://registry.abrahamgreenberg.co.uk/v2/apps/hello/tags/list

## Operate
- **Change the config:** edit `config.json`, bump `registry_config_v1` -> `_v2` in `stack.yml`, redeploy the stack.
- **Add/rotate a user:** `REGISTRY_HTPASSWD_SECRET=registry_htpasswd_v2 ./create-secrets.sh` (regenerates all three
  passwords), bump the secret name in `stack.yml`, redeploy, update GitHub secrets and the VPS `docker login`.
- **Delete a tag by hand** (admin): `skopeo delete` / `regctl tag rm`, or let retention do it.
- **Disk:** `docker exec $(docker ps -qf name=registry_zot) du -sh /var/lib/registry`. The weekly prune job does not
  touch this named volume.
- Logs: `docker service logs registry_zot`. Repeated bad logins are slowed by `failDelay`; CrowdSec only blocks them if it is really ingesting Traefik logs (unverified, see the [crowdsec README](../crowdsec/README.md#known-gap---verify)).

## Backups
Not yet. The registry is reproducible: every image can be rebuilt from git by CI, and the config + users are in the repo
and in Swarm secrets (keep the three passwords in the password manager). The real loss from a dead disk is the five
release tags you might want to roll back to. When off-box backups happen, add the `registry_data` volume - see the
[roadmap](../../docs/roadmap.md#backups-and-maintenance).

## Known limits
- One replica on one volume; `update_config: stop-first` means a brief outage on redeploy.
- No web UI or metrics extensions enabled (smaller attack surface). Adding Zot's Prometheus metrics is a later option.
- Passwords in `docker login` land in a plain credentials file unless a credential helper is configured.
