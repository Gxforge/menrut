# Versión y aviso de actualización (técnico)

- **Versión visible:** `web/package.json` (campo `version`, hoy 2.0.0) → Ajustes → Acerca de.
- **Compilación:** `scripts/build-static.sh` fija `NEXT_PUBLIC_APP_BUILD` = `<commit corto>-<fecha UTC>`
  y escribe `out/version.json` con `{version, build, mandatory}`.
- **Obligatoria:** por defecto `true`. Para una actualización opcional, compila con `APP_UPDATE_MANDATORY=false`.
- **Cabecera:** `/version.json` se sirve con `Cache-Control: no-store` (`web/public/_headers`).
- **Cliente:** `web/src/components/menrut/core/UpdateGate.tsx` consulta `version.json` cada 60 s y al volver a la app.
  - Si la compilación cambia: aviso «Actualización en proceso». Obligatoria → recarga a los 8 s.
  - Tras la recarga: pantalla «Verificando la actualización…» que comprueba `version.json` y `/api/v2/plans`.
  - No borra la caché del navegador. El service worker ya revalida la navegación en red.
- **Autor de cambios:** añade una entrada en `docs/NOVEDADES.md` en lenguaje no técnico en cada versión.
