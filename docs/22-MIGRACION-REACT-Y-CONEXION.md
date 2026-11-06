# MenRut — React, conexión real y estado actual

6 de noviembre de 2026. Sustituye las descripciones históricas de Flutter como frontend principal y de Supabase todavía sin conectar. El propietario autorizó expresamente React + TypeScript + Vite después de la recomendación para redes lentas. Dart/Flutter se conserva sin borrar en `app/`, pero no se compila ni despliega como frontend actual.

## Implementado y conectado
- Frontend React + TypeScript + Vite en `web/`; backend Pages Functions TypeScript y D1 conservado.
- `menrut-principal` conectado para Supabase Auth y Storage. `menrut-secundario` reservado, sin usuarios duplicados ni reparto de Auth.
- Producción: https://menrut.pages.dev . Despliegue verificado: https://f4bf3fb4.menrut.pages.dev .
- Inicio, directorio paginado, búsqueda por catálogo disponible, acceso/registro/recuperación y cambio de contraseña, sesión persistente, dashboard básico, onboarding, edición de perfil y control de teléfono público.
- Cuentas sin identidad estable pueden crear perfil, pero no reciben automáticamente prueba; visibilidad exige vigencia efectiva.
- Avatar: consentimiento explícito, WebP optimizado en navegador, límite 512.000 bytes, carpetas del propietario, validación del objeto en backend y referencia D1.
- Buckets reales `courier-public`, `payment-proofs-private`, `private-documents`. SQL aplicado en `supabase/storage-policies.sql`. No hay datos comerciales en PostgreSQL.
- Privados: sin lectura pública; escrituras de comprobantes/documentos denegadas hasta autorización de sus flujos. No hay política UPDATE de objetos. Solo avatar público WebP en uid/avatar.
- Ledger temporal añadido con trigger transaccional en ambos shards. Unidades persistidas: segundos para permanencia, créditos enteros para herramientas. UI convierte segundos/8640.
- Perfil público HTML en `/mensajero/:slug`, sin JS obligatorio, con contenido escapado, canonical y Open Graph. Estados no visibles devuelven 404. No se promete indexación ni posicionamiento.
- Directorio y apertura pública también exigen `global_accounts.status=active`.

## Límite real de correo: pendiente del propietario
No existe SMTP personalizado configurado. Supabase predeterminado solo envía a direcciones del equipo preautorizadas y tiene un límite inicial de dos mensajes/hora. Por eso el código de registro/recuperación está conectado, pero NO se declara listo para correo público. No se ha desactivado la confirmación para eludirlo. Hace falta SMTP autorizado y probar entrega/retorno real.

Fuente oficial consultada: https://supabase.com/docs/guides/auth/auth-smtp . No se ha contratado ningún servicio de correo ni activado gasto. Las credenciales deben entregarse por vía privada, no en el repositorio.

## Red lenta
Carga por sección: inicio/directorio no descargan el SDK de Auth. Build observado: JS inicial 74,30 kB gzip, CSS 4,51 kB gzip; Auth es un chunk adicional de ~57,72 kB gzip solo al abrir cuenta. Son tamaños de build, no una promesa de segundos en redes cubanas. Vite avisa de dos chunks sin comprimir >180 kB; quedan oportunidades de reducirlos. Sin fuentes externas, mapas, librerías de iconos ni fotos hero voluminosas.

`python scripts/web_budget.py` impone 95 KiB gzip JS inicial y 10 KiB CSS. PWA con manifest e iconos, pantalla offline; no se cachean APIs, sesiones ni operaciones financieras. Instalación física en dispositivo pendiente.

## Pruebas ejecutadas
- 17 pruebas TypeScript (créditos, JWT y escape HTML/SEO), 4 SQLite (incluye 16 hilos, idempotencia y ledger temporal).
- 8 HTTP locales y 8 navegador Chromium escritorio/móvil, sin desbordamiento horizontal en las vistas comprobadas. Las mismas 8 de navegador pasaron contra el despliegue remoto.
- Integración con Auth real: identidad técnica temporal confirmada por Admin API solo para el ensayo, login, JWT ES256 verificado en backend local y lectura autenticada `/me` en Pages remoto. No se escribieron perfiles ni pruebas en D1 de producción durante ese ensayo.
- Con el JWT real: onboarding local repetido, perfil, avatar y RLS; upload ajeno, prueba de comprobante no autorizada y elevación admin rechazados. Avatar y usuario temporales eliminados al finalizar. Los fixtures ocultos de D1 local se conservan para diagnóstico.
- `npm audit`: cero vulnerabilidades conocidas en la instalación verificada. Typecheck y límite 300 líneas pasan.
- Chromium inicialmente no arrancó por bibliotecas del sistema faltantes; se instalaron y se repitieron las pruebas satisfactoriamente. El build Flutter ya no es requisito del frontend actual.
- CI actualizada para Node 22, React y Pages local. La variable CI contiene solo la clave publicable. No se afirma éxito de CI remoto hasta comprobar su ejecución.

## Desarrollo y despliegue
```
npm ci
cp web/.env.example web/.env.local
# Rellenar solo URL y clave publicable del proyecto principal.
npm run check
npx wrangler d1 migrations apply D1_CORE --local
npx wrangler d1 migrations apply D1_SHARD_01 --local
npx wrangler d1 migrations apply D1_SHARD_02 --local
npm run dev:api
# En otra terminal, si se requiere HMR:
npm run dev
# Tests con API local funcionando:
python3 tests/http_test.py
npm run test:browser
```

Vite usa proxy relativo `/api` a Pages local. No hay localhost en el código que ejecuta el navegador. `.dev.vars` debe configurar URL del emisor real y secreto HMAC únicamente local. Los scripts de gestión leen `.env` privado. `tests/supabase_integration.py` exige credenciales locales de gestión y crea/elimina únicamente su identidad/archivo temporales; no se ejecuta en CI sin autorización explícita.

Deploy: `python scripts/wrangler.py pages deploy web/build --project-name menrut --branch main`. HMAC guardado como secret de Pages; URL Supabase en Wrangler. No se despliegan ramas preview porque falta aislar sus bindings D1 de producción.

## Pendientes del encargo completo
SMTP público y entrega real de recuperación; catálogo geográfico oficial; alternativa administrada de prueba; planes y límites administrables; pagos/aprobación/acreditación y renovaciones; servicios/rutas/cobertura completos; herramientas/reservas/devoluciones; opiniones/OTP/moderación; panel administrativo; borrado/privacidad y retención definitivos; reconciliación outbox general; alertas de capacidad y bloqueo de escrituras al 100 %; pruebas completas de recuperación/Android/PWA.

Subir un avatar no activa permanencia. Los planes siguen borradores. No se aceptan pagos desde esta versión. El nombre de organización continúa pendiente del panel, no de los proyectos: la API pública no dispone de renombre documentado. Las cuotas siguen compartidas: dos proyectos no aportan 100.000 MAU ni 2 GB Storage en la misma organización Free.
