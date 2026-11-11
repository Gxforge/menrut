# 03 · Checklist de producción (estado al 13-oct-2026)

Leyenda: ✅ hecho y comprobado · 🟡 parcial o pendiente de confirmación · ⛔ bloqueado por decisión del propietario. (Solo símbolos de estado en esta lista; no son iconos de la app.)

| # | Punto pedido por el propietario | Estado | Detalle y siguiente paso |
|---|---|---|---|
| 1 | Confirmar CI en verde | 🟡 | El último commit `92dbe40` falla en 19 s sin pasos ejecutados. Causa supuesta: minutos de Actions del repo privado. **Siguiente:** revisar la configuración en GitHub. Corregir el `|| tsc` que oculta fallos. Corregir el informe («repo público», «24 pruebas»). |
| 2 | Retirar el token de `scripts/activate_shards.py` | 🟡 | En el árbol de trabajo ya se lee de `CLOUDFLARE_API_TOKEN` y el comentario antiguo está borrado. **Pendiente:** el valor sigue en el historial de Git. Rotarlo al final (el propietario quiere esperar al traspaso). |
| 3 | Flujo de pagos manuales (Transfermóvil) | 🟡 | Existe en la app (instrucciones, subida de captura, revisión en `admin-payments`). **Falta definir** el flujo exacto de aprobación y de monto antes de darlo por cerrado. |
| 4 | Verificación de mensajeros | 🟡 | Existe la pantalla `admin-couriers` (aprobar o rechazar). **Falta definir** el criterio de verificación y quién lo decide. Hay un mensajero pendiente (Airien). |
| 5 | Eliminar cuentas | ⛔ | Pendiente de alcance. El propietario dijo «todas las cuentas que estén dentro», pero la lista incluye su propia cuenta y la de Studio Lexair. **Hay que confirmar** si se borran las 3 cuentas de Auth y qué datos de CORE y de shards se eliminan. Borrar sin respaldo no es reversible. |
| 6 | Enlace de admin para el propietario | ✅ | `https://menrut.pages.dev/?admin` (también `menrut.ddns.net` cuando valide). Sin sesión lleva a inicio de sesión; con sesión de staff, al panel. El permiso lo decide el backend. Probado en Chromium. |
| 7 | Dominio `menrut.ddns.net` | 🟡 | CNAME apunta a `menrut.pages.dev` (captura no-ip). Añadido al proyecto Pages: validación en curso. **Pendiente:** cambiar `site_url` de Supabase (hoy `menrut.pages.dev`) y revisar `ALLOWED_ORIGIN`. |
| 8 | Marca «Desarrollado por Studio Lexair» en «Acerca de» | ✅ | Tarjeta en Ajustes del mensajero, con enlace a `studiolexair.ddns.net`. Desplegada. **Pendiente:** confirmar que el enlace es el correcto. |
| 9 | Documentación de trabajo y análisis | ✅ | `00-LEER-PRIMERO.md`, `PAGINAS-Y-DISENO.md`, `FLUJO-DE-TRABAJO.md`, este documento. Sin commit todavía. |
| 10 | Precios de planes | 🟡 | Son borradores. Confirmar antes de publicar. |
| 11 | Pantalla de administración solo para staff real | 🟡 | El frontend solo oculta. **Pendiente:** comprobar en el backend que `?admin` y los endpoints de staff rechazan a usuarios sin rol. |

## Decisiones que necesito del propietario
1. **Eliminar cuentas:** ¿las 3 cuentas de Auth (incluida la suya y la de Studio Lexair) y sus datos, o solo cuentas de prueba?
2. **Pagos manuales:** ¿flujo exacto de aprobación y de monto?
3. **Verificación de mensajeros:** ¿criterio y quién aprueba?
4. **Despliegue de hoy:** ¿lo mantiene o lo revierto? Ver `FLUJO-DE-TRABAJO.md` §7.
5. **Commit:** ¿hago commit de los 3 archivos y los 2 documentos en una rama, sin push?
