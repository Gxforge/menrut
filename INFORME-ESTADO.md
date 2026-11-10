# MenRut — Estado actual

10 de noviembre de 2026. **Entrega parcial: no equivale al cumplimiento completo del encargo.**

## Implementado y probado (hoy, contra producción)

### Arquitectura sharded autorizada (API v2 sobre el modelo real)
- **Identidad global**: `global_accounts` + `user_roles` + `account_profiles` (clave = `sub` de Supabase). Staff (PROPIETARIO > admin > moderador) **solo** por listas de correos del entorno, jamás de metadatos de usuario ni del body.
- **Asignación round-robin persistente** (INSERT SELECT + trigger transaccional de v1, probada bajo concurrencia): cada mensajero nuevo recibe UN shard propietario; el navegador nunca envía `shard_id`; los reintentos devuelven la asignación existente; no se reasigna al iniciar sesión.
- **Datos operativos en el shard dueño**: perfil, servicios, cobertura, rutas, carteras de permanencia en **segundos (1 crédito = 8640 s)**, reseñas y denuncias.
- **Búsqueda nacional sin fanout**: exclusivamente sobre la proyección pública de `menrut-core` ampliada (routes_json, services_csv, coverage_csv, is_demo, is_verified…), sincronizada por **outbox versionado e idempotente** con reintentos. Abrir pasaporte: resuelve shard en CORE, comprueba cuenta/visibilidad/vigencia y consulta UN único shard.
- **Pagos idempotentes**: `payment_proofs` + acreditación al shard con `operation_id` único (UNIQUE del ledger + processed_events) y estado `credited`; renovación acumulativa conservando intervalos parciales; sin doble cargo por reintentos (probado).
- **Reseñas de usuarios registrados** (decisión del propietario): POST `/couriers/:id/reviews` escribe en el shard, actualiza agregados y resincroniza la proyección.
- Favoritos, rutas guardadas, conversaciones, mensajes y notificaciones en tablas globales nuevas de CORE (identidad global, sin duplicar clientes en shards).
- **Supabase**: login/registro/foto SOLO en `menrut-principal`. El round-robin entre proyectos Supabase quedó ELIMINADO de la lógica: `menrut-secundario` es reservado (entorno de pruebas aislado, sin reparto de usuarios ni respaldo automático).
- **Visor de bases en vivo** (GET `/admin/databases`): menrut-core + los 9 shards sondeados por bindings reales + los 2 proyectos Supabase (principal = producción; secundario = reservado) con salud real. Sin tokens de gestión en el frontend.

### Verificado en producción (menrut.pages.dev)
- `/api/v2/territories` (16 provincias, 168 municipios), `/search` (10 resultados, filtro por tipo zona/municipal/provincial), `/couriers/:id` (pasaporte con insignia «Mensajero de demostración»), `/plans` (1500/2500/4000 CUP aprobados), `/routes/popular`.
- **Ciclo completo autenticado probado contra producción** con cuentas de prueba (eliminadas después junto con todos sus datos): registro mensajero → asignación shard 3 (puntero avanzaba 2→3) → prueba 70 créditos/7 días → perfil+ruta → reseña de cliente → favorito → conversación → pago Básico 1500 → decisión del propietario con monto confirmado → cartera acreditada en segundos → idempotencia (reintento no duplica) → denuncias en shard → moderación agregada.
- 17 pruebas TS + 4 SQLite pasando (allocator, asentamiento, restricciones). Typecheck raíz + web limpio. **Ningún archivo de código fuente supera 300 líneas** (regla del encargo restaurada).
- Mensajeros demo migrados al modelo nuevo con `is_demo=1` (nunca se muestran como reales: insignia visible en tarjetas y pasaporte).

### Frontend
- Next.js 16 confirmado como frontend autorizado (sustituye a la app Vite, conservada en `src/` con sus pruebas).
- Pantallas troceadas (23 archivos >300 líneas → 0), 28 componentes shadcn sin uso eliminados, tipos divididos por dominio, visor de bases rediseñado con sondeos reales, selector de tipo de mensajero en búsqueda.
- CI reparado: workflow con bun + export estático + D1 local + pruebas HTTP; `build-static.sh` portable.

## Conectado, con bloqueo externo
- **SMTP propio**: el propietario informa tenerlo configurado con clave propia (no suministrada al agente). No se desactivó la confirmación de correo. Falta probar recepción real y el ciclo completo de recuperación de una persona externa.

## Pendiente
Herramientas/reservas con reserva-confirmación-liberación, entregas verificadas por OTP, respuestas del mensajero a reseñas, catálogo geográfico oficial consolidado (hoy conviven Province/Municipality y geographic_*), reconciliación general programada (hoy es perezosa: por sync y por decisión de pago), recuperación ensayada, aislamiento efectivo del secundario como entorno de pruebas (hoy solo está aislado por configuración), PWA instalada físicamente, políticas definitivas de privacidad y borrado. Tablas legacy (User, CourierProfile, Route…) quedan solo de lectura para auditoría; ningún endpoint las escribe.

## Decisiones documentadas
- Catálogo de planes: `MembershipPlan` (CORE) es LA fuente (precios aprobados por el propietario); la tabla `plans` de v1 queda sin uso.
- Reseñas sin entrega verificada permitidas por decisión del propietario; las verificadas quedan marcadas `is_verified=1` para el futuro flujo OTP.
- Auditoría en `audit_events` (sin FK a tablas legacy); `AuditLog` legacy conservada solo de lectura.
- Despliegue por subida directa (wrangler pages deploy) con funciones y bindings desde el repo; la integración git de Pages no está activa.

## Variables
Sin cambios respecto al informe anterior. Ningún secreto en Git; `.dev.vars` y `.seed/` ignorados. Token de Cloudflare verificado (cuenta activa; D1 lectura). No se activa ningún servicio de pago.
