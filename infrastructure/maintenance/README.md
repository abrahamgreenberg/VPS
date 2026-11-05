# maintenance - weekly Docker + log housekeeping

**What:** reclaims disk space without touching live data. Runs Sundays ~04:00 as a systemd timer.

| File | Purpose |
| ---- | ------- |
| `docker-prune.sh` | the cleanup script |
| `docker-prune.service` / `.timer` | systemd oneshot (`--all-images --volumes`) + weekly timer |

## What it removes
| Target | Rule |
| ------ | ---- |
| Stopped containers | stopped for more than 24h (`CONTAINER_AGE`) |
| Dangling images | always |
| Unused images (`--all-images`) | created more than 14d ago (`IMAGE_AGE`); images used by *any* container are kept |
| Build cache | older than 7d (`BUILD_CACHE_AGE`) |
| Anonymous volumes (`--volumes`) | unused, 64-hex name, and older than 7d (`VOLUME_MIN_AGE_DAYS`) |
| Journal | vacuumed to 200M (`JOURNAL_MAX`), plus `apt-get clean` |

**Never** removed: named volumes (Postgres, Grafana, Traefik certs, ...), networks, secrets, configs.

Caveat: `--all-images` deletes unused local images, including old local `peninei-*` builds you might want to roll
back to. Until the private registry exists those can't be re-pulled, only rebuilt.

## Deploy
Installed together with the backup job - see [../backup/README.md](../backup/README.md#deploy). Always look first:

    sudo /usr/local/sbin/docker-prune.sh --dry-run --all-images --volumes

## Operate
    systemctl list-timers docker-prune.timer
    journalctl -u docker-prune.service -n 50      # shows disk before/after

Change thresholds with a unit override: `sudo systemctl edit docker-prune.service`.

Not handled here: Docker container log rotation (needs a Docker restart, see
[docs/operations.md](../../docs/operations.md#housekeeping)).
