#!/usr/bin/env bash
# MENRUT — Despliega el worker del cron de reconciliación y comparte su
# secreto con el proyecto Pages (la misma variable CRON_SECRET en ambos).
# Requiere: export CLOUDFLARE_API_TOKEN=... (permisos Workers:edit,
# Pages:edit y D1:read de la cuenta 665fb2e43961e57d2f22283c6dec7d5c).
set -euo pipefail
cd "$(dirname "$0")/../workers/reconciler"

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "ERROR: falta CLOUDFLARE_API_TOKEN en el entorno." >&2
  exit 1
fi

# Secreto compartido: se genera UNA vez y vive en .cron-secret (ignorado por git).
SECRET_FILE="$(dirname "$0")/../../.cron-secret"
if [ ! -f "$SECRET_FILE" ]; then
  openssl rand -hex 24 > "$SECRET_FILE"
  chmod 600 "$SECRET_FILE"
  echo "Generado nuevo secreto en $SECRET_FILE (no se sube a git)."
fi
SECRET="$(cat "$SECRET_FILE")"

# 1) Publicar el worker (crea el cron «17 */6 * * *»).
npx wrangler deploy

# 2) Secreto del worker.
echo "$SECRET" | npx wrangler secret put CRON_SECRET

# 3) La MISMA variable en Pages (production + preview) para validar X-Cron-Secret.
echo "$SECRET" | npx wrangler pages secret put CRON_SECRET --project-name menrut

echo "LISTO: reconciliación programada cada 6 h (17 */6 * * *)."
echo "Prueba manual: curl -s -X POST https://menrut.pages.dev/api/v2/cron/reconcile -H \"X-Cron-Secret: \$SECRET\""
