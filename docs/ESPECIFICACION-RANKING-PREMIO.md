# Ranking de mensajeros y premio trimestral — especificación

Estado: **especificación completa con todas las decisiones del titular; sin implementar.**
Fecha: 2026-11-13. Ámbito: solo MENRUT (los bots de Telegram no entran).

## 1. Decisiones cerradas (respuestas del titular, 2026-11-13)

| Tema | Decisión |
|---|---|
| Criterios | Índice combinado: valoración 50 %, entregas verificadas 35 %, reseñas 15 %. |
| Umbrales por trimestre | N = 10 entregas verificadas y M = 5 reseñas (mínimos). |
| Ámbitos del ranking | Nacional (Cuba), provincial y municipal. Cada uno con top 100. |
| Premio provincial | Top 3 de cada provincia: 1.º 35 %, 2.º 30 %, 3.º 25 %. |
| Premio municipal | Top 3 de cada municipio: 1.º 20 %, 2.º 15 %, 3.º 10 %. |
| Premio nacional | Solo el 1.º de Cuba: token del 50 %. |
| Acumulación | Si un mensajero gana en dos ámbitos, solo puede reclamar uno. Puede reclamar el mayor o regalar/ceder el otro. |
| Naturaleza del premio | Token de descuento de un solo uso. El mensajero lo activa en «activar cupo de descuento». Una vez activado, vale 24 h y sirve para comprar un plan; el descuento se aplica a esa compra y no se mantiene después. |
| Transferencia | El token se puede regalar o ceder a otro mensajero. Un usuario o negocio puede regalar un plan a cualquier mensajero o comprárselo. |
| Otros descuentos | Los descuentos por evento (como los activos hoy) siguen existiendo aparte de estos tokens. |
| Visibilidad | Pública. |
| Plazo de reclamación | 15 días desde el cierre del trimestre. |
| Carga de listas | Top 100 por ámbito, en bloques de 20 con «Cargar más». Sin carga masiva. |
| Listas municipales | Solo se publican si el municipio tiene al menos 10 mensajeros verificados. |
| Requisitos | Entregas, reseñas, cuenta activa **y cuenta verificada**. |
| Revisión legal | No se realiza. Decisión del titular. |

## 2. Datos que ya existen (lectura del código, sin cambios)

- **Cuenta verificada:** `public_courier_directory.is_verified = 1`, fijado por el admin al aprobar `courier_verifications` (`status = 'approved'`).
- **Entregas verificadas:** `delivery_verifications` con `confirmed_at` y sin `cancelled_at`; contador `verified_deliveries`.
- **Valoraciones:** `courier-reviews.ts`; una por usuario y mensajero; `myReview` en el pasaporte.
- **Cuenta activa:** `global_accounts.status = 'active'`.

## 3. Ranking

**Ventana:** trimestre natural (ene–mar, abr–jun, jul–sep, oct–dic), hora de Europa/Madrid.

**Elegibilidad (todas obligatorias):** cuenta `active` y `is_verified = 1`; al menos 10 entregas verificadas; al menos 5 reseñas recibidas, todo en el trimestre.

**Índice:**
- Valoración media con suavizado bayesiano: 50 %.
- Entregas verificadas normalizadas frente al máximo del ámbito: 35 %.
- Reseñas normalizadas frente al máximo del ámbito: 15 %.

**Desempates:** más entregas verificadas; después, antigüedad de la cuenta verificada.

**Asignación de ámbito:** provincia y municipio declarados en el perfil del mensajero.

**Listas:** nacional, provincial y municipal, cada una con top 100; carga en bloques de 20. Una lista municipal se publica solo si el municipio tiene al menos 10 mensajeros verificados; si no, el municipio no muestra lista.

## 4. Premio

- **Forma:** token de descuento de un solo uso, generado al cierre del trimestre para cada ganador con premio: provincial (35/30/25 %), municipal (20/15/10 %) y nacional 1.º (50 %).
- **Activación:** el mensajero introduce el token en «activar cupo de descuento». Desde ese momento tiene 24 h para usarlo.
- **Uso:** una compra de plan. Después el token queda consumido; el descuento no se mantiene para compras siguientes.
- **Reclamación:** 15 días desde el cierre del trimestre. Si un mensajero gana en varios ámbitos, reclama uno. Puede ceder el otro token.
- **Cesión:** el token se puede regalar o ceder. Un usuario o negocio puede regalar o comprar un plan a un mensajero.
- **Notificación:** al mensajero, y registro en su cartera.
- **Convivencia:** los descuentos por evento siguen funcionando aparte.

## 5. Anti-fraude

- Una reseña por par cliente–mensajero.
- Entregas válidas solo con confirmación del cliente y código escrito por el mensajero (flujo v2.2). Canceladas o caducadas no cuentan.
- Revisión manual del admin antes de publicar el primer ranking.
- Los tokens son transferibles por decisión del titular. Riesgo: reventa de tokens fuera de la app (ver sección 8).

## 6. Fases propuestas

1. Cálculo en solo lectura (endpoint admin con el ranking del trimestre, sin publicar).
2. Revisión del admin con datos reales.
3. Publicación de las listas y de la pantalla pública.
4. Generación de tokens, notificación y canje.

Cada fase con pruebas y despliegue según la autorización vigente.

## 7. Puntos abiertos

Sin puntos abiertos. Pendiente de implementar tras aprobación.

## 8. Riesgos

- Reventa de tokens transferibles fuera de la plataforma. Mitigación: el token vale 24 h desde la activación, lo que limita la reventa.
- Pocas entregas en municipios pequeños: listas vacías o injustas. Mitigación: lista municipal solo con 10 mensajeros verificados como mínimo.
- El 1.º nacional (50 %) supera al 1.º provincial (35 %). Es decisión del titular; conviene revisarlo antes de publicar.
- Presión sobre valoraciones: el suavizado bayesiano y una reseña por par lo reducen.
- Exposición pública: solo nombre, provincia, municipio y métricas agregadas. Sin teléfono, documentos ni ubicación exacta.
