#!/usr/bin/env bash
# Creates the htpasswd Swarm secret for the registry (users: admin, ci, deployer). Run on a manager node.
# Passwords are generated and shown ONCE - save them in your password manager (and `ci` in GitHub secrets).
# Swarm secrets can't be read back. Skips if the secret already exists.
set -euo pipefail

# The secret name comes from stack.yml so the script always creates exactly what the stack expects.
here="$(cd "$(dirname "$0")" && pwd)"
SECRET="${REGISTRY_HTPASSWD_SECRET:-$(sed -n '/^secrets:/,$p' "$here/stack.yml" | awk '/^ +name:/ {print $2; exit}')}"
[ -n "$SECRET" ] || { echo "could not read the secret name from stack.yml" >&2; exit 1; }

if docker secret inspect "$SECRET" >/dev/null 2>&1; then
  echo "secret $SECRET exists - skipping (to rotate passwords: bump the version in stack.yml, then re-run)"
  exit 0
fi

# bcrypt hash from stdin (so the password never appears in `ps`). Use local htpasswd if present, else a throwaway container.
hash_line() {
  local user="$1" pass="$2"
  if command -v htpasswd >/dev/null 2>&1; then
    printf '%s' "$pass" | htpasswd -niB "$user"
  else
    printf '%s' "$pass" | docker run --rm -i --entrypoint htpasswd httpd:2 -niB "$user"
  fi
}
genpw() { openssl rand -base64 36 | tr -d '/+=\n' | cut -c1-32; }

declare -A pw
users=(admin ci deployer)
file="$(mktemp)"; trap 'rm -f "$file"' EXIT
for u in "${users[@]}"; do
  pw[$u]="$(genpw)"
  hash_line "$u" "${pw[$u]}" >> "$file"
done

docker secret create "$SECRET" "$file" >/dev/null
echo "created secret $SECRET. SAVE THESE NOW (shown once):"
echo "  admin    ${pw[admin]}      (delete tags, full access - keep offline)"
echo "  ci       ${pw[ci]}      (push; goes in GitHub Actions secrets)"
echo "  deployer ${pw[deployer]}      (pull only; used on the VPS for docker login)"
