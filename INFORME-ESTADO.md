# MenRut — Estado actual

6 de noviembre de 2026. **Entrega parcial: no equivale al cumplimiento completo del encargo.**

## Implementado y probado
- Migración autorizada a React + TypeScript + Vite. Flutter conservado sin borrar; ya no es frontend de despliegue.
- Web: https://menrut.pages.dev . Despliegue de esta entrega: https://f4bf3fb4.menrut.pages.dev .
- Backend Pages Functions, D1 CORE y shards 01–02 reales. Directorio central sin fanout, asignador persistente, perfil y outbox versionado.
- Supabase `menrut-principal` conectado. JWT real firmado ES256 comprobado en backend local y lectura `/me` de Pages remoto. Secundario reservado.
- Políticas Storage aplicadas: avatar público consentido y limitado al propietario; comprobantes/documentos privados sin subida cliente habilitada.
- Editor de perfil, avatar optimizado, control de teléfono público, dashboard básico, carteras y movimientos. Liquidación temporal con ledger SQL transaccional en ambos shards.
- Perfiles HTML con escape de contenido, canonical/Open Graph, sin JS obligatorio. Falta perfil real público para una comprobación SEO positiva en producción; el estado 404 fue verificado.
- Typecheck, build React y control 300 líneas pasan. `npm audit`: cero vulnerabilidades conocidas.
- Pruebas: 17 TS + 4 SQLite + 8 HTTP locales + 8 navegador (móvil/escritorio). Las 8 de navegador también pasaron contra el despliegue público. Integración adicional con cuenta y avatar técnicos temporales eliminados.

## Conectado, con bloqueo externo
Los formularios llaman a Supabase Auth, pero **el registro y recuperación para el público necesitan un SMTP propio**. El envío predeterminado se limita a miembros autorizados del equipo. No se desactivó la confirmación de correo. No se ha probado recepción real de email ni todo el ciclo de recuperación de una persona externa.

## Pendiente
Pagos y acreditación idempotente, renovación acumulativa/cambio de plan, herramientas/reservas, servicios/rutas completos, geografía oficial, OTP/opiniones, moderación, panel administrativo completo, privacidad/borrado, reconciliación outbox general, aislamiento preview, backups/restauración ensayados y PWA instalada físicamente. No se admiten pagos reales. No se publican precios borrador ni perfiles ficticios.

Nombre visible de organización todavía pendiente de cambio desde el panel Supabase. No existe endpoint público documentado de renombre. No se ha activado facturación ni contratado servicios de pago.

## Rendimiento observado
JS inicial ~74,30 kB gzip y CSS ~4,51 kB gzip; cuenta/Auth en chunk adicional ~57,72 kB gzip. Presupuesto automático: 95 KiB JS inicial y 10 KiB CSS gzip. No son tiempos medidos en Cuba. Dos chunks generan advertencia Vite por tamaño sin comprimir; quedan oportunidades de optimización.

## Variables
| Variable | Destino | Privada |
|---|---|---|
| VITE_SUPABASE_URL | Frontend web | No |
| VITE_SUPABASE_PUBLISHABLE_KEY | Frontend/CI | No |
| SUPABASE_URL | Pages, emisor JWT | No |
| ALLOWED_ORIGIN | CORS Pages | No |
| TRIAL_HMAC_SECRET | Secret Pages/backend | Sí |
| SUPABASE_ACCESS_TOKEN | Scripts de gestión | Sí |
| CLOUDFLARE_API_TOKEN | Scripts de gestión | Sí |
| GITHUB_TOKEN | Gestión/push | Sí |
| MENRUT_*_DB_PASSWORD | Gestión privada de los proyectos | Sí |

Nada privado debe llevar prefijo VITE_. SMTP requiere credenciales privadas propias, todavía no suministradas/configuradas.

Guía y pruebas reproducibles: [docs/22-MIGRACION-REACT-Y-CONEXION.md](docs/22-MIGRACION-REACT-Y-CONEXION.md). Documentos 01–21 conservan contexto histórico; este informe y el documento 22 describen el estado actual.
