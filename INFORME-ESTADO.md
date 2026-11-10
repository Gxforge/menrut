# MenRut — Estado actual

10 de noviembre de 2026 (fase 2 completada en local). **Entrega parcial: el código de las fases está terminado y verificado localmente; falta desplegar (token de Cloudflare vencido, ver «Bloqueos»).**

## Implementado y probado (hoy, contra producción y local)

### Arquitectura sharded autorizada (API v2 sobre el modelo real) — fase 1
- **Identidad global**: `global_accounts` + `user_roles` + `account_profiles` (clave = `sub` de Supabase). Staff (PROPIETARIO > admin > moderador) **solo** por listas de correos del entorno.
- **Asignación round-robin persistente** (INSERT SELECT + trigger transaccional): cada mensajero nuevo recibe UN shard propietario; el navegador nunca envía `shard_id`.
- **Datos operativos en el shard dueño**: perfil, servicios, cobertura, rutas, carteras de permanencia en **segundos (1 crédito = 8640 s)**, reseñas y denuncias.
- **Búsqueda nacional sin fanout**: exclusivamente sobre la proyección pública de `menrut-core` (routes_json, services_csv, coverage_csv…), sincronizada por **outbox versionado e idempotente**.
- **Pagos idempotentes** con acreditación en segundos; renovación acumulativa; sin doble cargo por reintentos.

### Fase 2 (hoy) — lo que faltaba, ya integrado
- **Herramientas/reservas (reserva → confirmación → liberación)**: `tool_reservations` en el shard con TTL de 24 h. Reservar descuenta de la cartera «tools» (créditos enteros); confirmar aplica el efecto real (destacado 7 días con `highlighted_until` en perfil+proyección y prioridad/insignia «Destacado» en búsquedas; «anuncio-recorrido» notifica a clientes con rutas guardadas coincidentes); liberar devuelve el crédito; el vencimiento libera solo. Ledger en cada movimiento; reparación de descuentos huérfanos. UI completa en «Créditos y herramientas».
- **Entregas verificadas por OTP**: el cliente genera un código de 6 dígitos desde el pasaporte (`delivery_verifications` del shard, hash SHA-256, TTL 24 h, máx. 5 intentos, un código pendiente por pareja). El mensajero lo verifica en su nueva pantalla «Entregas verificadas»: +1 `verified_deliveries`, notificación al cliente. Las reseñas pueden enlazarse a una entrega verificada → `is_verified=1` e insignia «Entrega verificada».
- **Respuestas del mensajero a reseñas**: `POST /courier/me/reviews/:id/respond` (editable, ≤600, notifica al autor solo la primera vez). UI en Reputación (detalle de la opinión) y visualización en el pasaporte.
- **Catálogo geográfico consolidado**: `Province`/`Municipality` es EL catálogo único; `geographic_provinces`/`geographic_municipalities` pasaron a ser **vistas** de compatibilidad (la API v1 sigue funcionando contra el mismo origen físico). Migración sin pérdida: absorbe cualquier fila solo-v1 antes de sustituir.
- **Reconciliación PROGRAMADA** (antes perezosa): dos motores. (1) **Auto-disparo por tráfico**: cada request comprueba si pasaron 6 h y lanza la reconciliación completa en `waitUntil` (guarda anti-estampida por ventana). (2) **Cron externo**: worker `menrut-reconciler` (cada 6 h, `workers/reconciler/`) con secreto compartido (`POST /cron/reconcile`). Qué hace: procesa outbox pendiente de TODOS los shards, libera reservas vencidas y repara descuentos huérfanos; bitácora en `reconciliation_runs` visible en Admin → Sistema. Ambos motores probados localmente (corridas `auto:` y `cron:` registradas).
- **Aislamiento efectivo del secundario** (3 capas): guard de runtime `assertSupabaseIsolation` (la API de producción rechaza cualquier instancia que no sea menrut-principal; el modo pruebas `IS_SANDBOX=1` rechaza la principal) + **registros desactivados en menrut-secundario** (disable_signup=true, aplicado vía API de gestión) + ninguna clave de producción apunta allí.
- **PWA física instalable**: service worker (`/sw.js`: estáticos cache-first, API siempre red, navegación con respaldo `/offline`), página offline con marca, aviso «Instalar app» (beforeinstallprompt + instrucciones iOS), manifest e iconos ya presentes. Archivos servidos y probados.
- **Privacidad definitiva**: pantalla completa «Privacidad y datos» (qué datos, dónde viven, retención, derechos, términos) + **borrado de cuenta** `DELETE /me` (confirma escribiendo BORRAR): anonimiza identidad, borra favoritos/rutas guardadas/notificaciones/conversaciones, oculta el pasaporte si es mensajero, elimina la cuenta de autenticación y audita. Cartera/ledger se conservan anonimizados (obligación contable). Accesible desde Perfil de cliente y Configuración del mensajero.
- **SMTP propio verificado en producción**: confirmado por API de gestión (smtp.gmail.com:587 del propietario, confirmación de correo activa, plantillas con marca). **Prueba real de envío ejecutada** (`/auth/v1/recover` → HTTP 200; el limitador 429 confirmó la entrega anterior): el correo de recuperación salió por el SMTP del propietario a nexolink.core1@gmail.com — **falta que el propietario confirme la recepción en su bandeja**.

### Verificación de hoy
- **CI «Calidad» VERDE en GitHub Actions** (repo público → runner disponible): typecheck, 24 pruebas, regla 300 líneas, build estático, migraciones locales a las 10 bases y comprobaciones HTTP contra Pages Functions locales.
- 17 pruebas TS + 7 SQLite (nuevas: ciclo de vida de reservas —sin doble cargo, reintento y devolución única—, restricciones del OTP y vistas del catálogo consolidado). Typecheck raíz + web limpios. **Ningún archivo supera 300 líneas.** Build estático completo con sw.js/offline.html.
- Local con Pages Functions reales: territorios (v2) y locations (v1, ya sobre las vistas) correctos; cron con secreto correcto/incorrecto; endpoints nuevos exigen sesión; reconciliación auto y cron registradas.

## Conectado, con bloqueo externo
- **Cloudflare: el token de la cuenta venció/revocó ~15:40 UTC del 10-nov** (el despliegue de las 15:32 fue el último en funcionar; verificación posterior: 401/9109). Mientras no haya token nuevo NO se pueden aplicar las migraciones a las 10 bases de producción ni desplegar Pages. Todo está listo: `bash scripts/deploy_production.sh` (migraciones idempotentes + build + deploy) con `CLOUDFLARE_API_TOKEN` en el entorno. Opcional: `bash scripts/deploy_reconciler.sh` (cron externo + secreto CRON_SECRET en Pages).
- **Repo público** (decisión del propietario para minutos ilimitados de GitHub Actions); volver a privado cuando esté en producción.

## Pendiente
- **Desplegar la fase 2** (requiere token de Cloudflare nuevo): migraciones 0006 (core) + 0005 (9 shards) + build + pages deploy.
- **Confirmar recepción del correo** de recuperación en la bandeja del propietario (envío verificado HTTP 200).
- Retirar/etiquetar los 11 mensajeros demo antes de lanzar reales (insignia «demostración» ya visible).
- Recuperación ensayada de shards (backup/restore documentado y probado en frío).

## Decisiones documentadas
- Catálogo de planes: `MembershipPlan` (CORE) es LA fuente; `plans` de v1 sin uso.
- Reseñas sin entrega verificada permitidas por decisión del propietario; las verificadas quedan marcadas.
- El destacado (herramienta) prioriza dentro del grupo de relevancia y muestra insignia; nunca falsea la valoración.
- Carteras y ledger se conservan tras borrar la cuenta (anonimizados) por obligación contable.
- Despliegue por subida directa (wrangler pages deploy); la integración git de Pages no está activa.

## Variables
Sin cambios en producción. Nuevas variables preparadas: `CRON_SECRET` (Pages + worker reconciler; ya generada en `.cron-secret`, ignorada por git) e `IS_SANDBOX` (opcional, solo para entornos de pruebas con el secundario). Ningún secreto en Git.
