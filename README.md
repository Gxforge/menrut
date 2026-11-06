# MenRut · Conectamos caminos

Plataforma de mensajeros de Cuba. **Entrega inicial parcial: no lista para operar pagos ni para lanzamiento comercial.**

- Repositorio privado: https://github.com/Gxforge/menrut
- Web desplegada: https://menrut.pages.dev
- Despliegue inicial: https://35e6f4e4.menrut.pages.dev
- Informe: [INFORME-ESTADO.md](INFORME-ESTADO.md)

## Arquitectura
Flutter Web / estructura Android, Pages Functions TypeScript, D1 CORE + dos shards reales. Supabase Auth/Storage pendiente de seleccionar proyecto activo. No React, R2 ni PostgreSQL operativo.

## Desarrollo
Node 22+; Flutter estable 3.47.9; Python 3.

```sh
npm ci
npm run check
npx wrangler d1 migrations apply D1_CORE --local
npx wrangler d1 migrations apply D1_SHARD_01 --local
npx wrangler d1 migrations apply D1_SHARD_02 --local
cd app
flutter pub get
flutter analyze
flutter test
flutter build web --no-web-resources-cdn
cd ..
npx wrangler pages dev app/build/web --ip 0.0.0.0 --port 8788
# En otra terminal:
python tests/http_test.py
```

El desarrollo utiliza D1 local. **No añadir --remote para pruebas.** No hacer preview remoto hasta aislar bindings de producción.

## Configuración
`.env.example` contiene nombres sin valores. `.env` y `.dev.vars` son privados e ignorados por Git. Nunca utilizar tokens de gestión como claves públicas Flutter. Se recomienda rotarlos al terminar la configuración.

| Variable | Uso | Privada |
|---|---|---|
| GITHUB_TOKEN | Gestión/push repositorio | Sí |
| CLOUDFLARE_API_TOKEN | Gestión D1/Pages | Sí |
| CLOUDFLARE_ACCOUNT_ID | Gestión Cloudflare | No, pero no necesario en Flutter |
| SUPABASE_ACCESS_TOKEN | Gestión del proyecto Supabase | Sí |
| SUPABASE_URL | Emisor Auth y SDK Flutter | No |
| SUPABASE_PUBLISHABLE_KEY | SDK Flutter, dart-define | No |
| TRIAL_HMAC_SECRET | HMAC backend para señal de prueba | Sí |
| ALLOWED_ORIGIN | CORS del backend | No |
| API_BASE_URL | URL API para Android; vacío en web mismo origen | No |

## Código
`app/lib` (UI), `functions/api/v1` (entrada Pages), `src/core` (seguridad), `src/modules` (dominio), `database/{core,shard}/migrations`, `tests`, `scripts`, `docs`.

La carpeta docs incluye 20 documentos con límites y pendientes reales. Los esquemas anticipan funcionalidades todavía no programadas; una tabla no equivale a un módulo terminado.
