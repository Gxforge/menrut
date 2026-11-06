# MenRut · Conectamos caminos

Directorio de mensajeros de Cuba. **Versión funcional parcial, no lista para lanzamiento comercial ni pagos.**

- **Web:** https://menrut.pages.dev
- **Repositorio privado:** https://github.com/Gxforge/menrut
- **Estado actual:** [informe](INFORME-ESTADO.md) · [migración y conexión](docs/22-MIGRACION-REACT-Y-CONEXION.md)

## Tecnología actual
React + TypeScript + Vite, autorizado por el propietario. Cloudflare Pages/Functions, D1 CORE + dos shards, Supabase principal para Auth/Storage. Sin servidor Node permanente, R2 ni PostgreSQL comercial. Flutter anterior conservado como respaldo en `app/`.

## Desarrollo
Node 22+, Python 3. Solo URL y clave **publicable** en `web/.env.local`; ejemplo en `web/.env.example`.

```sh
npm ci
npm run check
npx wrangler d1 migrations apply D1_CORE --local
npx wrangler d1 migrations apply D1_SHARD_01 --local
npx wrangler d1 migrations apply D1_SHARD_02 --local
npm run dev:api
# En otra terminal, opcional con recarga en caliente:
npm run dev
# Contra Pages local:
python3 tests/http_test.py
npm run test:browser
```

Build en `web/build`. Vite hace proxy relativo `/api` a Pages local. No usar `--remote` para pruebas ni ramas preview con bindings de producción. Esquema local y remoto deben tener las migraciones de `database/core` y `database/shard`.

## Funcionalidad comprobada
Directorio sin perfiles ficticios, sesión Supabase, JWT firmado verificado por Pages, onboarding recuperable, edición de perfil, avatar público con RLS, carteras separadas y liquidación temporal con ledger. Páginas de perfil HTML sin JS obligatorio y metadatos propios. Pruebas de navegador móvil/escritorio y Auth real temporal.

**Bloqueo para registro público por email:** falta SMTP personalizado. El predeterminado de Supabase solo permite correo al equipo autorizado. Confirmación conservada; no se simula entrega ni se declara registro público listo. Pagos, renovaciones, herramientas y administración completa siguen pendientes.

## Estructura
`web/src` UI; `functions` Pages API y perfiles HTML; `src/core` seguridad; `src/modules` negocio; `database` migraciones; `supabase` políticas Storage; `tests` pruebas; `docs` documentación.

`.env`, `.dev.vars`, claves de gestión, contraseñas y backups están fuera de Git. Nunca usar PAT, Cloudflare token, Supabase access token o service_role en variables VITE_. Ver diccionario de variables en el informe actual.
