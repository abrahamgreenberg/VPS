#!/usr/bin/env bash
# Nightly logical backup of the shared Postgres (ALL databases + roles) to local disk.
# Runs as root via pg-backup.timer. Keeps only the newest $KEEP dumps.
#
# Restore (into a fresh/scratch Postgres):
#   gunzip -c /var/backups/postgres/pg_dumpall_<stamp>.sql.gz \
#     | docker exec -i <postgres-container> sh -c 'psql -U "$(cat /run/secrets/postgres_user)" -d postgres'
set -euo pipefail
umask 077

BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgres}"
KEEP="${KEEP:-2}"
CONTAINER_FILTER="${CONTAINER_FILTER:-name=^postgres_postgres\.}"   # swarm task: <stack>_<service>.<n>.<id>

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

cid="$(docker ps -q --filter "$CONTAINER_FILTER" | head -n1)"
if [ -z "$cid" ]; then
  echo "ERROR: no running postgres container matching '$CONTAINER_FILTER'" >&2
  exit 1
fi

final="$BACKUP_DIR/pg_dumpall_$(date +%Y%m%d-%H%M%S).sql.gz"
tmp="$final.partial"
trap 'rm -f "$tmp"' EXIT

# The superuser name comes from the swarm secret inside the container. Local socket
# connections inside the official image are trust-auth, so no password is needed.
docker exec "$cid" sh -c 'exec pg_dumpall -U "$(cat /run/secrets/postgres_user)"' | gzip -9 > "$tmp"

# Verify BEFORE touching older backups: non-empty, valid gzip, and pg_dumpall's completion marker.
[ -s "$tmp" ] || { echo "ERROR: dump is empty" >&2; exit 1; }
gzip -t "$tmp"
gzip -dc "$tmp" | tail -n 5 | grep -q "PostgreSQL database cluster dump complete" \
  || { echo "ERROR: dump looks truncated (no completion marker)" >&2; exit 1; }

mv "$tmp" "$final"
echo "OK: $final ($(du -h "$final" | cut -f1))"

# Rotate: keep the newest $KEEP, delete the rest (only reached if this dump verified).
ls -1t "$BACKUP_DIR"/pg_dumpall_*.sql.gz | tail -n +"$((KEEP + 1))" | xargs -r rm -v --
