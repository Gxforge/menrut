# MenRut · Decisiones

> Documento histórico de una entrega anterior. Para el frontend y conexión actuales, consultar [actualización React/Supabase](22-MIGRACION-REACT-Y-CONEXION.md).


Estado: entrega inicial parcial — 6 de noviembre de 2026.

ADR-001: usar segundos enteros de crédito para evitar redondeo de intervalos. ADR-002: asignación por INSERT+trigger en una sola transacción, no leer-modificar en memoria. ADR-003: directorio CORE sin consultas nacionales a shards. ADR-004: versionado monotónico de proyección y outbox. ADR-005: sin prueba automática por correo porque es fácil crear cuentas nuevas. ADR-006: sin reutilizar proyectos Supabase ajenos sin selección explícita.

Deuda consciente: no se completaron módulos comerciales, no hay aislamiento de preview, no hay políticas Storage aplicadas ni catálogo geográfico oficial sembrado. No rellenar catálogos con municipios inventados. Ampliar pruebas antes de declarar aceptación final.

Fuentes consultadas: https://developers.cloudflare.com/pages/functions/wrangler-configuration/ ; https://developers.cloudflare.com/d1/platform/limits/ ; https://supabase.com/docs/guides/auth/jwts ; ayuda instalada Wrangler d1 export. Falta verificar geografía oficial y todas las cuotas Supabase.
