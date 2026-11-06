#!/usr/bin/env bash
# Print the next release tag YYYY.MM.DD.REV for a given date.
#   usage: next-release-tag.sh YYYY.MM.DD < tags-list.json
# stdin is the registry's /v2/<repo>/tags/list response ({"name": "...", "tags": [...]}; "tags" may be
# null or missing for an empty/unknown repository). REV = 1 + the highest REV already pushed for that date.
set -euo pipefail

day="${1:?usage: next-release-tag.sh YYYY.MM.DD < tags.json}"
[[ "$day" =~ ^[0-9]{4}\.[0-9]{2}\.[0-9]{2}$ ]] || { echo "bad date: $day" >&2; exit 2; }

python3 -c '
import json, re, sys
day = sys.argv[1]
data = json.load(sys.stdin)
tags = data.get("tags") or []
pat = re.compile("^" + re.escape(day) + r"\.([0-9]+)$")
revs = [int(m.group(1)) for t in tags if (m := pat.match(t))]
print(f"{day}.{max(revs, default=0) + 1}")
' "$day"
