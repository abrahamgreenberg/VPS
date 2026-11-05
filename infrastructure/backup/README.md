# backup - nightly Postgres dump (local)

**What:** dumps every database and role of the shared Postgres to local disk, nightly, keeping the newest 2.
**Not** a full-system backup: see [docs/operations.md](../../docs/operations.md#backups) for what is and isn't covered.

| File | Purpose |
| ---- | ------- |
| `pg-backup.sh` | `pg_dumpall` inside the postgres Swarm container, gzipped to `/var/backups/postgres/pg_dumpall_<stamp>.sql.gz` |
| `pg-backup.service` / `.timer` | systemd oneshot + nightly timer (~03:15, up to 10 min random delay, runs on boot if missed) |

## How it works
1. Finds the running `postgres_postgres.*` task container.
2. Runs `pg_dumpall` as the superuser named in the `postgres_user` secret (local socket, no password needed in the official image).
3. Verifies the dump (non-empty, valid gzip, pg_dumpall's completion marker) **before** touching older dumps.
4. Keeps the newest `KEEP` (default 2) and deletes the rest. A failed run exits non-zero and deletes nothing.

Files are written `umask 077`; the directory is root-only (700). Env overrides: `BACKUP_DIR`, `KEEP`, `CONTAINER_FILTER`.

## Deploy
Installed together with the maintenance job, from the repo root on the VPS:

    git pull
    sudo ./infrastructure/install-host-jobs.sh      # copies scripts to /usr/local/sbin, enables the timers
    sudo /usr/local/sbin/pg-backup.sh               # run one now
    sudo ls -lh /var/backups/postgres

The scripts are *copied* (not symlinked) so root never runs code from a user-writable checkout - re-run the installer
after a `git pull` that changes them.

## Operate
    systemctl list-timers pg-backup.timer
    journalctl -u pg-backup.service -n 20

## Restore
Into a fresh/scratch Postgres, never over a live cluster:

    gunzip -c /var/backups/postgres/pg_dumpall_<stamp>.sql.gz \
      | docker exec -i <postgres-container> sh -c 'psql -U "$(cat /run/secrets/postgres_user)" -d postgres'

"role ... already exists" / "database ... already exists" errors for the bootstrap superuser and the `postgres`
database are expected. Tested end-to-end against a throwaway `postgres:15`.

## Limitations
Same disk as the database (no protection from disk loss); Postgres only. Off-box backups are on the
[roadmap](../../docs/roadmap.md#backups-and-maintenance).
