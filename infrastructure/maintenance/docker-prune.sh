#!/usr/bin/env bash
# Weekly housekeeping: reclaim Docker + log disk space without touching named volumes or live data.
#
#   docker-prune.sh --dry-run                   # show what would go (run this first)
#   docker-prune.sh                             # stopped containers, dangling images, old build cache, logs
#   docker-prune.sh --all-images --volumes      # also unused old images + stale anonymous volumes
#
# Never removes: running/stopped-recently containers' images, NAMED volumes, networks, secrets.
set -euo pipefail

DRY_RUN=0 ALL_IMAGES=0 VOLUMES=0
CONTAINER_AGE="${CONTAINER_AGE:-24h}"        # only remove containers stopped for longer than this
IMAGE_AGE="${IMAGE_AGE:-336h}"               # --all-images: only images created > 14d ago
BUILD_CACHE_AGE="${BUILD_CACHE_AGE:-168h}"   # 7d
VOLUME_MIN_AGE_DAYS="${VOLUME_MIN_AGE_DAYS:-7}"
JOURNAL_MAX="${JOURNAL_MAX:-200M}"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --all-images) ALL_IMAGES=1 ;;
    --volumes) VOLUMES=1 ;;
    -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

say() { printf '\n== %s\n' "$*"; }
run() { if [ "$DRY_RUN" = 1 ]; then echo "[dry-run] $*"; else "$@"; fi; }

say "Disk before"; df -h / | tail -n 1

say "Stopped containers (> $CONTAINER_AGE)"
if [ "$DRY_RUN" = 1 ]; then docker container ls -a --filter status=exited --filter status=dead --format '{{.Names}}\t{{.Image}}\t{{.Status}}'
else docker container prune -f --filter "until=$CONTAINER_AGE"; fi

say "Dangling images"
if [ "$DRY_RUN" = 1 ]; then docker image ls --filter dangling=true; else docker image prune -f; fi

if [ "$ALL_IMAGES" = 1 ]; then
  say "Unused images older than $IMAGE_AGE (images used by ANY container are kept)"
  if [ "$DRY_RUN" = 1 ]; then echo "(all images listed; only unused ones older than $IMAGE_AGE would be removed)"; docker image ls; else docker image prune -a -f --filter "until=$IMAGE_AGE"; fi
fi

say "Build cache older than $BUILD_CACHE_AGE"
if [ "$DRY_RUN" = 1 ]; then docker buildx du 2>/dev/null || docker builder du 2>/dev/null || true
else docker builder prune -f --filter "until=$BUILD_CACHE_AGE"; fi

if [ "$VOLUMES" = 1 ]; then
  say "Anonymous unused volumes older than ${VOLUME_MIN_AGE_DAYS}d (64-hex names only; named volumes are never touched)"
  cutoff=$(date -d "-${VOLUME_MIN_AGE_DAYS} days" +%s)
  while read -r vol; do
    [[ "$vol" =~ ^[0-9a-f]{64}$ ]] || continue
    created=$(date -d "$(docker volume inspect -f '{{.CreatedAt}}' "$vol")" +%s 2>/dev/null || echo "$cutoff")
    [ "$created" -lt "$cutoff" ] || { echo "keep (too new): $vol"; continue; }
    run docker volume rm "$vol"
  done < <(docker volume ls -q -f dangling=true)
fi

say "Logs"
if command -v journalctl >/dev/null; then run journalctl --vacuum-size="$JOURNAL_MAX"; fi
if command -v apt-get >/dev/null; then run apt-get clean; fi

say "Disk after"; df -h / | tail -n 1
