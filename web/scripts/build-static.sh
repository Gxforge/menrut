#!/usr/bin/env bash
# MENRUT — Build de exportación estática (Cloudflare Pages).
# Portable: SRC por argumento (por defecto $PWD). Copia el proyecto a /tmp
# (el original queda intacto), retira lo que rompe `output: export` (route
# handlers de src/app/api, middleware) y compila con NEXT_PUBLIC_API_BASE=/api/v2
# inlineado. Uso:  bash scripts/build-static.sh [ruta-del-proyecto-next]
set -euo pipefail

SRC="${1:-$PWD}"
SRC="$(cd "$SRC" && pwd)"
WORK=/tmp/menrut-export
OUT="$SRC/out"

if [ ! -f "$SRC/package.json" ] || [ ! -d "$SRC/src/app" ]; then
  echo "ERROR: $SRC no parece la raíz de la app Next.js (falta package.json o src/app)." >&2
  exit 1
fi

rm -rf "$WORK"
mkdir -p "$WORK"

# .env SE copia a propósito: los NEXT_PUBLIC_* deben quedar inlineados en el
# bundle; la copia vive solo en /tmp (nunca en el repositorio).
rsync -a \
  --exclude node_modules \
  --exclude .next \
  --exclude out \
  --exclude dev.log \
  --exclude server.log \
  --exclude .git \
  --exclude db \
  --exclude upload \
  --exclude download \
  --exclude docs \
  --exclude examples \
  --exclude agent-ctx \
  --exclude mini-services \
  "$SRC/" "$WORK/"

# node_modules como directorio REAL (Turbopack rechaza symlinks que apuntan
# fuera de la raíz del proyecto). En el mismo dispositivo se usa una copia por
# hardlinks (instantánea, sin espacio extra); si no, copia completa.
if [ -d "$SRC/node_modules" ]; then
  if [ "$(stat -c %d "$SRC")" = "$(stat -c %d "$WORK")" ]; then
    echo "Copiando node_modules por hardlinks…"
    cp -al "$SRC/node_modules" "$WORK/node_modules"
  else
    echo "Copiando node_modules (dispositivos distintos)…"
    cp -a "$SRC/node_modules" "$WORK/node_modules"
  fi
else
  echo "AVISO: no hay node_modules en $SRC; se instalan en la copia…"
  (cd "$WORK" && bun install)
fi

# Los route handlers rompen `output: export`: fuera de la copia.
if [ -d "$WORK/src/app/api" ]; then
  mv "$WORK/src/app/api" "$WORK/.api-backup"
fi

# El middleware también rompe la exportación estática.
if [ -e "$WORK/src/middleware.ts" ]; then
  mv "$WORK/src/middleware.ts" "$WORK/.middleware-backup"
  echo "middleware.ts movido a .middleware-backup"
elif [ -e "$WORK/src/middleware.js" ]; then
  mv "$WORK/src/middleware.js" "$WORK/.middleware-backup"
  echo "middleware.js movido a .middleware-backup"
fi

cd "$WORK"
EXPORT_STATIC=1 NEXT_PUBLIC_API_BASE=/api/v2 bunx next build
rm -rf "$OUT"
cp -r "$WORK/out" "$OUT"

# ─── Verificaciones ─────────────────────────────────────────────────────────
test -f "$OUT/index.html" || { echo "ERROR: falta \$OUT/index.html" >&2; exit 1; }

CHUNKS=$(grep -rl 'api/v2' "$OUT/_next/static/chunks/" | head -3 || true)
echo "Chunks con /api/v2 inlineada:"
echo "$CHUNKS"
[ -n "$CHUNKS" ] || { echo "ERROR: la base /api/v2 no aparece en los chunks" >&2; exit 1; }

if grep -rq 'NEXT_PUBLIC_API_BASE' "$OUT"; then
  echo "ERROR: NEXT_PUBLIC_API_BASE sin inlinear en la salida" >&2
  exit 1
fi

echo "OK: index.html presente, base /api/v2 inlineada, sin variables pendientes."
echo "— Tamaño total —"
du -sh "$OUT"
echo "— Raíz de \$OUT —"
ls -la "$OUT"
