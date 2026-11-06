# MenRut · Despliegue Cloudflare

> Documento histórico de una entrega anterior. Para el frontend y conexión actuales, consultar [actualización React/Supabase](22-MIGRACION-REACT-Y-CONEXION.md).


Estado: entrega inicial parcial — 6 de noviembre de 2026.

Node >=22 y Flutter 3.47.9. Ejecutar npm ci, npm run check, cd app && flutter pub get && flutter analyze && flutter test && flutter build web --no-web-resources-cdn. Después `python scripts/wrangler.py pages deploy app/build/web --project-name menrut --branch main`.

D1: `python scripts/wrangler.py d1 migrations apply D1_CORE --local`; repetir para SHARD_01 y SHARD_02. Solo con intención explícita cambiar a --remote. IDs de Wrangler son los recursos reales creados, no marcadores.

Wrangler usa Pages y tres bindings. Preview todavía NO está aislado de producción: no desplegar ramas preview hasta crear tres bases distintas y configurar bindings env.preview. Desarrollo local usa almacenamiento local sin remote=true. No se configuró CI de despliegue automático ni integración Git de Pages.

Se fijó compatibility_date=2026-05-01 tras detectar runtime local antiguo; se actualizó Wrangler a 4.158.0 y tipos a 5.20261106.1 para corregir seis avisos de dependencias. No se necesitan funcionalidades nuevas de fechas posteriores.
