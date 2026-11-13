# Coordinación entre el agente de bots y el agente de la aplicación MenRut

**Estado:** propuesta de trabajo para revisar en conjunto. Decisiones del propietario recogidas el 2026-11-11. La fuente de detalle es `docs/PLAN-BOTS-MENRUT.md`; las secciones posteriores de ese plan sustituyen sus preguntas o umbrales anteriores. Este documento no implica que las funciones ya existan.

## Regla de coordinación

- No trabajar sobre los mismos archivos simultáneamente ni sobrescribir cambios del otro agente. Antes de editar, revisar el estado y los commits más recientes; comunicar por el repositorio las interfaces, decisiones y resultados.
- El agente de bots no modifica pantallas, servicios o esquema de la aplicación que tenga a cargo el otro agente. El agente de la aplicación no cambia la implementación de bots sin coordinarlo.
- Antes de crear proyectos, aplicar migraciones o modificar bases, acordar diseño, costos y solicitar la confirmación específica del propietario. Pagos y autenticación no se cambian sin preguntar. No borrar datos de clientes sin confirmación.
- No colocar secretos, conversaciones privadas, reportes reales ni datos personales en Git, documentos, pruebas o logs. No simular que una capacidad está desplegada o una comunicación entre agentes ya ocurrió solo porque este documento se publicó.

## Responsabilidad del agente de bots

1. Diseñar e implementar **MenRut Agent**: guardián por grupo, moderación, alertas al propietario, administración privada, anuncios y tareas programadas. Las reglas de MenRut y Studio Lexair se configuran por separado y se coordinan con los bots de Studio Lexair para evitar acciones duplicadas.
2. Diseñar e implementar **MenRut Soporte**: responder preguntas pertinentes en grupo, con botón para seguir en privado, preguntas frecuentes y contacto con el propietario. Verificar capacidades y permisos reales de Telegram antes de prometer atención o mensajería.
3. Restringir cada comando administrativo al ID verificado del propietario y al contexto autorizado. Los botones y comandos públicos no conceden permisos administrativos; ocultar comandos no sustituye la comprobación del servidor.
4. Diseñar cómo recibe eventos mínimos y autorizados de la aplicación: reportes, avisos de moderación, estado operativo y anuncios de versiones realmente publicadas. Las integraciones solo se implementan tras acordar contratos y permisos.
5. Preparar pruebas, controles anti-duplicados, recuperación y monitoreo; documentar límites, fallos y despliegues. No afirmar entrega exactamente una vez ni activar moderación destructiva sin pruebas y permisos.

## Responsabilidad del agente de la aplicación

1. Revisar el chat existente, las valoraciones, perfiles, planes, notificaciones y reportes; documentar qué existe y qué falta antes de prometer capacidades.
2. Diseñar la interfaz y el backend del chat con servidor y filtro automático: no permitir enlaces ni archivos, y rechazar mensajes de **1.200 caracteres o más**. El filtro de ofensas/emojis se acordará por separado para evitar falsos positivos. No confiar únicamente en validación del navegador.
3. Diseñar la opción de reportar un mensaje específico o los **últimos 10 mensajes**; mostrar y pedir confirmación de lo que se comparte. Usar la mínima información necesaria y acceso restringido.
4. Diseñar el flujo de valoraciones ofensivas: ocultar en los casos y umbrales acordados, avisar al autor en la aplicación y dar 24 horas para editar; si se cumplen las condiciones de sanción acordadas, bloqueo de publicar valoraciones y usar chat durante 24 horas, **no de toda la cuenta**. Falta acordar cómo se inicia el plazo, apelación, revisión y qué significa bloquear el chat.
5. Diseñar el conteo de **cinco reportes de cinco usuarios distintos en 30 días** contra un mismo mensajero, usuario o negocio. Avisar y activar investigación e insignia de mala reputación visible **solo para el administrador y la persona o negocio afectado**, no al público. Definir medidas contra abuso, retención, apelación y vencimiento; los reportes no son prueba de culpabilidad.
6. Avisar al agente de bots de las interfaces propuestas, eventos y decisiones de datos; solicitar confirmación al propietario antes de crear o cambiar las tablas, proyectos o permisos necesarios.

## Contrato de integración a diseñar juntos (no existe todavía)

| Evento o servicio | Origen propuesto | Destino propuesto | Detalles pendientes |
|---|---|---|---|
| Reporte confirmado por usuario | Aplicación | Soporte/Agent | ID de caso, destinatario autorizado, mensaje o 10 últimos, consentimiento, retención y controles de acceso |
| Valoración marcada | Aplicación | Agent y notificación en aplicación | Señal mínima, plazo, revisión humana, falsos positivos y acceso privado |
| Cinco reportantes en 30 días | Aplicación | Agent / administración | Ventana móvil, identidad única, casos duplicados, prueba de abuso e insignia privada |
| Nueva versión publicada | Proceso de publicación confirmado | Agent | Fuente de verdad, texto aprobado, grupo destino, clave para evitar duplicados; conservar anuncios anteriores |
| Salud de plataforma | Servicios de MenRut | Agent | Indicadores mínimos, límites de frecuencia, recuperación y costos |

La aplicación y los bots no deben depender de nombres o formatos inventados aquí como si ya estuvieran implementados. Antes de construir, acordar autenticación entre servicios, integridad, idempotencia, reintentos, mínimos privilegios, manejo de caídas y pruebas.

## Privacidad y aclaraciones

- Se acordó que **todos los mensajes** pasen por un filtro automático de seguridad. Esto implica procesamiento técnico del contenido. La revisión del contexto de un caso por el bot o administrador se activa por reporte; no prometer que el contenido nunca es procesado antes.
- Al reportar, una persona elige mensaje concreto o los diez últimos y confirma qué comparte. Evitar enviar todo el historial, y no registrar contenido privado en logs por defecto.
- El propietario pidió estudiar **dos proyectos Supabase después de documentar**. No se ha verificado la capacidad gratuita ni que dos proyectos aporten 1 GB o se puedan crear sin costos; no crearlos sin diseño y confirmación específica.
- Bots MenRut son administradores en ambos grupos según comprobación, pero no tenían webhook configurado cuando se revisó; esto no demuestra si algún proceso de polling estaba activo.

## Flujo de comunicación sugerido

1. Cada agente registra aquí o en un documento enlazado sus propuestas y dependencias, sin incluir información sensible.
2. El otro agente revisa y confirma los contratos antes de tocar la integración; si hay conflicto de archivos o cambios de la rama remota, se detiene y coordina.
3. El propietario aprueba los cambios de base o decisiones pendientes. Cada agente prueba, registra commit y despliegue y comparte límites conocidos; no hay cambios de producción solo por publicar esta documentación.
