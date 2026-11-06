#!/usr/bin/env bash
set -euo pipefail
umask 077
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
dest="backups/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$dest"
for binding in D1_CORE D1_SHARD_01 D1_SHARD_02; do
 python3 scripts/wrangler.py d1 export "$binding" --remote --output "$dest/$binding.sql"
done
sha256sum "$dest"/*.sql > "$dest/SHA256SUMS"
echo 'Backup local privado. Descárgalo y guárdalo cifrado fuera de este entorno.'
