#!/usr/bin/env bash
# MENRUT — Despliegue de producción en UN comando (migraciones + web + API).
# Requiere: export CLOUDFLARE_API_TOKEN=... con D1:edit, Pages:edit y
# Workers:edit de la cuenta 665fb2e43961e57d2f22283c6dec7d5c.
# Pasos:
#   1) Verificación local completa (typecheck, pruebas, regla 300 líneas).
#   2) Migraciones idempotentes a las 10 bases D1 de producción.
#   3) Build estático de la web y subida directa (wrangler pages deploy).
#   4) (opcional, una vez) bash scripts/deploy_reconciler.sh — cron externo.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "ERROR: falta CLOUDFLARE_API_TOKEN en el entorno." >&2
  exit 1
fi

echo "── 1/3 Verificación local ──"
npm run typecheck
npm test
npm run quality

echo "── 2/3 Migraciones de producción (10 bases, idempotentes) ──"
python3 scripts/apply_v3_phase2.py
python3 scripts/apply_chat_codes.py   # v2.2: chat con código de entrega (core 0009, shards 0006)

echo "── 3/3 Build y despliegue de Pages ──"
npm run build
npx wrangler pages deploy web/out --project-name menrut --branch main \
  --commit-dirty=true

echo "LISTO: https://menrut.pages.dev"
echo "Recordatorio: la reconciliación programada ya corre sola con el tráfico;"
echo "para el cron externo (sin tráfico), ejecuta una vez: bash scripts/deploy_reconciler.sh"
