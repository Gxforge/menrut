# MenRut — Informe de entrega inicial

6 de noviembre de 2026. **El encargo completo no está terminado.**

## Implementado y probado
- Repositorio privado `Gxforge/menrut` creado por API.
- D1 reales: `menrut-core`, `menrut-shard-01`, `menrut-shard-02`.
- Dos migraciones CORE y una migración por shard, aplicadas local y remotamente.
- Flutter Web compilado con SDK estable 3.47.9, Dart 3.13.7.
- Web y Pages Functions desplegadas: https://menrut.pages.dev . Respuestas HTTP comprobadas: inicio 200; health/directorio/planes 200; cuenta privada sin sesión 401.
- TypeScript tipado. Pruebas: 7 unitarias TS + 3 SQLite + 8 HTTP locales + 1 widget Flutter. Análisis Flutter sin incidencias.
- Round robin persistente con trigger; prueba local 100 usuarios/200 solicitudes concurrentes, sin duplicar asignaciones.
- Fórmula exacta de permanencia; cartera de herramientas separada; restricciones de no negatividad.
- Control de archivos fuente <=300 líneas; `npm audit` sin vulnerabilidades conocidas tras actualización.
- Marca MenRut e iconos entregados incorporados; sin mensajeros ficticios.

## Implementado, sin validación completa en entorno real
- Verificador JWT Supabase JWKS con ES256/RS256, issuer/audience/exp/sub.
- Onboarding recuperable y prueba con señal de teléfono/HMAC.
- Edición de perfil con outbox y proyección versionada, reintento explícito.
- Permisos administrativos D1 y endpoints limitados de lectura.
- Manifest PWA, iconos, service worker y pantalla offline; instalación en dispositivo no comprobada.

## Preparado pero sin conectar
- Supabase Flutter y configuración pública mediante dart-define.
- Dos proyectos Supabase existentes están INACTIVE. Ninguno fue reactivado, renombrado ni modificado.
- Credenciales locales protegidas en `.env`, excluidas de Git. No se usan en Flutter.
- Estructura Android generada; no compilada. Falta JDK/SDK compatible para verificarla.
- Script de backup y procedimiento de restauración: no ejecutados ni ensayados.

## Pendiente / no disponible para uso comercial
- Seleccionar proyecto Supabase, reactivarlo, configurar Auth, retornos y políticas Storage.
- Renombrar organización y proyecto elegido con autorización de alcance precisa.
- Catálogo geográfico verificado con fuente oficial. No se sembraron localidades inventadas.
- Pagos manuales, comprobantes privados, aprobación/acreditación idempotente, renovaciones y cambio de plan.
- Ledger por liquidación temporal, herramientas/reservas/devoluciones y límites de uso.
- Entregas OTP, opiniones verificadas, reputación, moderación y notificaciones.
- Panel administrativo completo y dashboards completos de clientes, negocios y mensajeros.
- Dispatcher outbox general, fallos/reintentos automáticos, reconciliación y eventos CORE→shard.
- API completa del encargo, privacidad/borrado, auditoría transversal y alternativa administrada de prueba.
- Aislamiento de preview remoto, alertas de cuotas, bloqueo de escrituras al 100 %, migración administrativa de mensajeros.
- SEO indexable individual y metadatos por perfil.
- Pruebas completas de seguridad, experiencia móvil, PWA y restauración.

## Recursos y cuotas
Solo existen CORE y shards 01–02. Cloudflare permite preparar 03–09 por bindings; todavía no se crearon. D1 Free: diez bases, 500 MB/base, 5 GB agregados, 50 consultas/invocación, siete días Time Travel. No se activó ningún servicio de pago ni se compró dominio. Revisar cuotas de Auth/Storage/egress Supabase y pausa antes de lanzamiento; no se garantiza continuidad gratuita.

## Continuación y despliegue
1. Elegir uno de los dos proyectos Supabase existentes, sin alterar el otro.
2. Activar Auth asimétrico y políticas privadas de Storage; guardar secretos en Pages, no en Git.
3. Configurar URL/clave pública, compilar Flutter y desplegar con `python scripts/wrangler.py pages deploy app/build/web --project-name menrut --branch main`.
4. Completar primero ledger/renovación/pagos y sus pruebas de concurrencia; después herramientas, entregas, opiniones y administración.
5. Crear cada shard futuro con CLI oficial, aplicar el mismo esquema, añadir binding y medirlo antes de habilitar asignaciones.
6. Ejecutar backups y un ensayo real de recuperación antes de admitir datos comerciales.

Documentación detallada en `docs/01` a `docs/20` y guía local en README. La configuración de CI de calidad está preparada; no se afirma que su ejecución remota haya terminado.
