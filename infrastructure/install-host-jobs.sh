#!/usr/bin/env bash
# Installs the nightly Postgres backup + weekly prune as systemd timers. Run on the VPS:
#   sudo ./infrastructure/install-host-jobs.sh
# Scripts are COPIED to /usr/local/sbin (root-owned) so root never runs code from a user-writable
# git checkout. Re-run after every `git pull` that changes them.
set -euo pipefail
[ "$EUID" -eq 0 ] || { echo "run with sudo" >&2; exit 1; }
here="$(cd "$(dirname "$0")" && pwd)"

install -m 750 -o root -g root "$here/backup/pg-backup.sh"          /usr/local/sbin/pg-backup.sh
install -m 750 -o root -g root "$here/maintenance/docker-prune.sh"  /usr/local/sbin/docker-prune.sh
install -m 644 -o root -g root "$here/backup/pg-backup.service" "$here/backup/pg-backup.timer" \
                               "$here/maintenance/docker-prune.service" "$here/maintenance/docker-prune.timer" \
                               /etc/systemd/system/
install -d -m 700 -o root -g root /var/backups/postgres

systemctl daemon-reload
systemctl enable --now pg-backup.timer docker-prune.timer
systemctl list-timers pg-backup.timer docker-prune.timer --no-pager
