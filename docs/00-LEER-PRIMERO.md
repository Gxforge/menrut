# 00 · Leer primero: qué es MenRut y en qué estado está

> Documento de análisis y traspaso, escrito al 13-oct-2026 (fecha del sistema). Cada dato está marcado: **[verificado]** si se comprobó en código, API o producción en esta sesión; **[supuesto]** si no se pudo comprobar y hay que confirmarlo. Los documentos de `docs/01` a `docs/23` son anteriores y siguen vigentes salvo donde se indique lo contrario.

## 1. Qué es
MenRut («Conectamos caminos.») es un **directorio nacional de mensajeros para Cuba**, en forma de PWA (aplicación web instalable). Un cliente busca quién cubre una ruta entre municipios y contacta directamente con el mensajero. MenRut no controla envíos ni asigna trabajos.

Reglas de negocio del propietario (según `PROMPT-AGENTE-MENRUT.txt` y la documentación existente):
- Sin GPS en tiempo real y sin asignación automática de envíos.
- Sin pasarelas de pago. El pago es **manual por Transfermóvil**: el mensajero elige plan, recibe instrucciones, sube captura y el staff aprueba o rechaza.
- Una misma cuenta puede ser cliente, negocio y mensajero a la vez.
- Dos carteras de créditos independientes: **permanencia** (en segundos) y **herramientas** (no caducan). **[supuesto: detalle en `06-SISTEMA-DE-CREDITOS.md`, no releído]**
- No gastar ni contratar nada sin autorización expresa del propietario.
- Todo en español. Diseño móvil primero.

## 2. Accesos y propiedad
- **Propietario:** `nexolink.core1@gmail.com` **[verificado: es el único correo de `OWNER_EMAILS`, `ADMIN_EMAILS` y `MODERATOR_EMAILS` en la documentación; y existe en Auth]**.
- **Repositorio:** `Gxforge/menrut`, privado, rama `main`. Último commit en GitHub: `92dbe40` («Lanzamiento»).
- **Cloudflare:** proyecto Pages `menrut`, cuenta `665fb2e4…`. Es una cuenta distinta de la de Studio Lexair.
- **Supabase:** organización «NexoLink Core». Proyectos `menrut-principal` (producción, ref `orqskfecwtroppqimhnj`) y `menrut-secundario` (pruebas).
- Los tokens los maneja el propietario. No se escriben en la documentación.

## 3. Arquitectura en una página
```
Navegador ──► Cloudflare Pages "menrut"  (menrut.pages.dev · menrut.ddns.net [validación pendiente])
              ├─ web/out                 frontend estático exportado desde Next.js 16 (React 19)
              ├─ PWA                     sw.js, offline.html, manifest, iconos
              └─ Pages Functions         functions/api/v2/[[path]].ts   (API actual)
                                         functions/api/v1/[[path]].ts   (compatibilidad)
                                         functions/mensajero/[slug].ts  (perfil HTML)
                    │
                    ├─ D1 CORE (menrut-core): identidad, directorio, catálogos, pagos, auditoría
                    ├─ D1 SHARD 01..09 (wrangler.json lista hasta 08 [discrepancia, ver §6])
                    └─ Worker menrut-reconciler (cron cada 6 h) → POST /api/v2/cron/reconcile

Supabase (Auth, Storage y SMTP): JWT verificado con jose. Buckets: courier-public,
payment-proofs-private, private-documents.
```
Reglas técnicas **[verificado en `INFORME-ESTADO.md` y reglas del proyecto]**:
- **El navegador nunca elige shard** ni escribe en D1 o Supabase de negocio. El backend toma el `sub` del JWT, busca el shard en `courier_shard_map` y opera allí.
- **La búsqueda nacional no toca shards.** Lee la proyección `public_courier_directory` de CORE, actualizada por outbox versionado.
- **Sin transacciones distribuidas:** outbox + proyección idempotente.
- **El rol de staff no sale del token.** Se decide por la lista de correos del entorno.

## 4. Estado de producción
| Qué | Resultado |
|---|---|
| `https://menrut.pages.dev/` | **200** [verificado] |
| `/api/v2/territories`, `/api/v2/search?q=test`, `/api/v2/plans` | **200** [verificado] |
| Último despliegue | `https://e7081f94.menrut.pages.dev` **[verificado]**. Subido desde el árbol de trabajo **sin commit**, con `--commit-dirty=true`. Incluye la tarjeta de Studio Lexair y el acceso `?admin`. |
| `https://menrut.ddns.net/` | Dominio **añadido** al proyecto Pages. Estado: `pending` (validación de CNAME en curso), verificación `active`. Aún no responde. **[verificado]** |
| Acceso `?admin` | Sin sesión: lleva a inicio de sesión. Probado en Chromium: sin errores de consola. **[verificado]** |
| CI «Calidad» del último commit `92dbe40` | **Falló** en 19 s sin ningún paso ejecutado. Causa **no confirmada** (hipótesis: minutos de Actions de un repo privado). **[verificado el fallo; causa supuesta]** |
| Pruebas locales | `tsc` raíz y web OK · regla de 300 líneas OK · `npm test` 17/17 · `npm run build` OK con copia en disco (ver `FLUJO-DE-TRABAJO.md`) |

## 5. Quién está en producción
- **Auth de Supabase: 3 cuentas [verificado]:** `nexolink.core1@gmail.com`, `studiolexair@gmail.com`, `studio.lexair@gmail.com` (todas creadas el 9-nov-2026).
- **Mensajeros reales:** 1, Airien (`studio.lexair@gmail.com`), verificación pendiente. Es también cuenta de Studio Lexair. **[verificado por el traspaso; shard no confirmado]**
- **Demos:** purgados el 10-nov, con respaldo en `backups/`. **[traspaso]**

## 6. Contradicciones y riesgos
1. **Documentación vs. realidad del CI.** `INFORME-ESTADO.md` dice «CI VERDE en GitHub Actions (repo público)» y «24 pruebas». El repo ahora es **privado** y el último CI falló. `npm test` ejecuta **17** pruebas, no 24. Hay que corregir el informe.
2. **README vs. INFORME.** El README dice que pagos y administración siguen pendientes; `INFORME-ESTADO.md` dice que la fase 2 está completa.
3. **CI con fallo oculto.** El paso de typecheck es `… || npx tsc --noEmit`: un error de tipos queda tapado por el segundo comando.
4. **Token en el historial.** `scripts/activate_shards.py` tenía un token `cfat_` escrito a mano. En el árbol de trabajo ya se lee de `CLOUDFLARE_API_TOKEN`, pero **el valor sigue en el historial de Git** y en un comentario que hay que borrar. Solo rotarlo elimina el riesgo. Queda para el final, como pidió el propietario.
5. **Redirecciones de Supabase [verificado por API].** `site_url` = `https://menrut.pages.dev`. La lista de redirecciones permitidas solo contiene `https://menrut.pages.dev/cuenta`, una ruta que la app no tiene. Con el dominio `menrut.ddns.net` activo, los correos de confirmación seguirán apuntando a `menrut.pages.dev` hasta que se cambie `site_url`.
6. **`ALLOWED_ORIGIN` [supuesto].** CORS en `functions/api/v2/[[path]].ts` permite el mismo origen y `env.ALLOWED_ORIGIN`. No se ha comprobado el valor configurado en Pages; hay que confirmar que incluya `https://menrut.ddns.net` si se usa desde ese dominio.
7. **Precios de planes.** La documentación los llama borradores. Hay que confirmarlos antes de producción.
8. **App Flutter (`app/`).** Es histórica. No se borra sin autorización.
9. **Fechas.** El sistema marca 13-oct-2026, pero la captura de no-ip y la documentación del proyecto tienen fechas de noviembre de 2026. Hay que confirmar cuál es la correcta antes de fechar registros.
10. **Solo cliente para control de acceso.** La navegación por rol es solo de interfaz. La validación real de permisos en el backend no se verificó en esta revisión.

## 7. Documentación relacionada
- Pantallas y diseño: `PAGINAS-Y-DISENO.md`.
- Flujo de trabajo, edición, pruebas y despliegue: `FLUJO-DE-TRABAJO.md`.
- Estado de cada punto de producción: `PRODUCCION-CHECKLIST.md`.
- Diseño anterior (no sustituido): `01` a `23`. Ver en especial `12-DISENO-UX-UI.md` y `23-IDENTIDAD-AZUL-MENRUT.md`.
