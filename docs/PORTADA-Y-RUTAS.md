# Portada y rutas web (versión 2.1.0)

| URL | Qué abre | Notas |
|---|---|---|
| `/` | Portada institucional (`web/src/app/page.tsx`, `components/marketing/`) | Sin cuenta. |
| `/app/` | Aplicación MENRUT (`web/src/app/app/page.tsx`) | Las pantallas siguen siendo internas (estado en Zustand). |
| `/app/*` | La misma aplicación | Reescritura 200 en `web/public/_redirects`. |
| `/admin` | Aplicación, pantalla de acceso del staff | Reescritura a `/app/`; `isAdminEntry` lee `/admin` sin cambiar la URL. |
| `/?admin` | Redirige a `/app/?admin` | Lo hace `EntryRedirect`. |
| `/cuenta` | Aplicación | Destino antiguo de un correo de recuperación. |
| `/api/v2/*` | API (Pages Functions) | Sin cambios. |
| `/offline` | Página sin conexión | Sin cambios. |

## Redirecciones desde la portada (`EntryRedirect`)
La portada envía a `/app/` (conservando `?` y `#`) cuando:
- el `#hash` trae tokens o errores de Supabase (`access_token`, `type=recovery`, `error`…);
- la URL trae `?code=` (flujo PKCE) o `?admin`;
- la app se abre instalada (`display-mode: standalone`): así las PWA instaladas con la raíz antigua siguen abriendo la aplicación.

## Exportación
`next.config.ts` activa `trailingSlash: true` solo en `EXPORT_STATIC=1`, para que `/app/` tenga `app/index.html`.

## Pendiente (requiere al titular)
- Páginas legales (privacidad y términos): el texto lo define el titular (catálogo, sección 15).
- Canales de contacto oficiales: no se muestran hasta confirmarlos.
- Dominio: `menrut.ddns.net` sigue siendo el host; no se ha cambiado DNS.
- Supabase: no se han añadido URLs de `/app/` a la lista de redirecciones. Los callbacks siguen usando las rutas actuales, que se reescriben.
- Manifest: `start_url` y `scope` apuntan a `/app/`; `id` se mantiene en `/` para no crear una app nueva en los móviles que la tengan instalada.
