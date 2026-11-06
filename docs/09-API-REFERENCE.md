# MenRut · API disponible

> Documento histórico de una entrega anterior. Para el frontend y conexión actuales, consultar [actualización React/Supabase](22-MIGRACION-REACT-Y-CONEXION.md).


Estado: entrega inicial parcial — 6 de noviembre de 2026.

Base `/api/v1`. Respuesta `{data,request_id}` o `{error:{code},request_id}`.

GET /health, /directory (province, municipality, cursor, limit 1–40), /couriers/:slug, /locations/provinces, /locations/municipalities?province=, /membership/plans.

Privados: GET /me, /me/roles; POST /onboarding/courier; GET y PUT /courier/profile; POST /courier/sync; GET /credits/wallets, /credits/ledger; GET /admin/shards, /admin/audit.

PUT perfil exige name, description, province_id, municipality_id, available, public_phone y contact_phone. No acepta campos extra. Admin requiere shards.read o audit.read (o permiso *). Los demás endpoints del encargo están pendientes; no se anuncian como implementados.
