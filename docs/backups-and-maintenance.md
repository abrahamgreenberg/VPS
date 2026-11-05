# Backups & housekeeping

Local-only for now (no off-box copy). See "Later" for the long-term plan.

## What runs (systemd timers on the VPS)

| Job | When | Script | What it does |
| --- | ---- | ------ | ------------ |
| `pg-backup.timer` | nightly ~03:15 | `infrastructure/backup/pg-backup.sh` | `pg_dumpall` (all databases + roles) from the postgres swarm container -> `/var/backups/postgres/pg_dumpall_<stamp>.sql.gz`. Verified (gzip + completion marker) before older dumps are rotated; **keeps the newest 2**. Dir is root-only (700). |
| `docker-prune.timer` | Sundays ~04:00 | `infrastructure/maintenance/docker-prune.sh --all-images --volumes` | Removes stopped containers (>24h), dangling images, unused images older than 14d, build cache older than 7d, **anonymous** unused volumes older than 7d, and trims the journal to 200M. Never touches named volumes, networks or secrets. |

## Install / update (on the VPS)

    cd ~/repos/vps && git pull
    sudo ./infrastructure/install-host-jobs.sh      # copies scripts to /usr/local/sbin, enables both timers
    sudo /usr/local/sbin/pg-backup.sh               # run one backup now and check it
    sudo ls -lh /var/backups/postgres
    sudo /usr/local/sbin/docker-prune.sh --dry-run --all-images --volumes   # review before the first real run

Re-run the installer after any `git pull` that changes these scripts (they are copied, not symlinked,
so root never executes code out of a user-writable checkout).

Check on them: `systemctl list-timers`, `journalctl -u pg-backup.service -n 20`, `journalctl -u docker-prune.service -n 50`.

Tunables are env vars (`KEEP`, `BACKUP_DIR`, `IMAGE_AGE`, `BUILD_CACHE_AGE`, `VOLUME_MIN_AGE_DAYS`, `JOURNAL_MAX`);
set them in a unit override (`sudo systemctl edit pg-backup.service`) if you need to change them.

## Restore

Into a fresh/scratch Postgres (never over a live cluster):

    gunzip -c /var/backups/postgres/pg_dumpall_<stamp>.sql.gz \
      | docker exec -i <postgres-container> sh -c 'psql -U "$(cat /run/secrets/postgres_user)" -d postgres'

"role ... already exists" / "database ... already exists" errors for the bootstrap superuser and `postgres`
database are expected. Tested end-to-end against a throwaway `postgres:15`.

Caveats: this is a logical dump of Postgres only. Grafana/Loki/Prometheus/Tempo/Portainer/CrowdSec volumes,
Traefik's `acme.json` and the Swarm secrets are **not** backed up (secrets: keep the source values in your
password manager). The dumps live on the same disk as the database, so they protect against bad
migrations and accidental deletes, **not** disk loss.

## Docker log rotation (one-time, manual)

Container logs are unbounded by default. Add (merge with any existing file) to `/etc/docker/daemon.json`:

    { "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }

Applies to containers created after a Docker restart. `sudo systemctl restart docker` restarts every
container (brief downtime on a single-node swarm), so do it in a maintenance window, e.g. together with a
kernel-update reboot.

## Later

- Off-box, encrypted backups (Restic to B2 / object storage) of Postgres dumps, Traefik certs, Grafana/Portainer/CrowdSec volumes
- Backup of telemetry data / whole-system snapshots (Vultr snapshots are the cheap option)
- Alert when the newest dump is older than ~26h or a job fails
- Restore drill on a scratch host, documented
- Registry GC / prune old image tags once the private registry exists
- Loki / Prometheus / Tempo retention limits
