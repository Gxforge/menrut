# MenRut · Plan de los dos bots de Telegram

**Estado:** documento de diseño para revisar con el propietario. No es una lista de funciones ya construidas. No se han creado proyectos nuevos ni cambiado permisos, reglas, pagos o autenticación.

## 1. Lo que quiere el propietario

- Hay dos grupos con reglas diferentes: MenRut (`@MenRutCuba`) y Studio Lexair (`@StudioLxair`). Ambos bots MenRut son administradores de ambos grupos; sus permisos y comportamiento deben configurarse por grupo.
- **MenRut Agent** debe ser guardián, moderador y administrador de la plataforma: detectar problemas, avisar, comunicar novedades y vigilar aspectos operativos. En el grupo MenRut debe vigilar y actuar como guardián; las funciones concretas para cada grupo quedan por acordar.
- **MenRut Soporte** debe responder preguntas en los grupos y ofrecer un botón para continuar en un chat privado con el bot.
- Ninguna persona salvo el propietario, identificado por su cuenta numérica de Telegram, puede ejecutar comandos administrativos. Las funciones públicas para usuarios son distintas de los comandos administrativos y no conceden privilegios.
- Los cambios de la aplicación deben documentarse y poder anunciarse automáticamente en el grupo, sin borrar los anuncios anteriores.
- Las valoraciones ofensivas no deben quedar visibles sin revisión. El propietario propone avisar al administrador y al autor, darle 24 horas para editar y, si no lo hace, eliminar la valoración e imponerle un bloqueo de 24 horas. Alcance exacto y excepciones pendientes.
- El filtro automático procesa todos los mensajes; la revisión del contenido de una conversación por el bot o administrador para investigar un caso se activa cuando se reporta (ver secciones 12 y 15).
- El propietario quiere estudiar más adelante dos proyectos de Supabase para datos de los bots, con optimización de almacenamiento y presupuesto mínimo. **No crearlos ni modificar bases antes de terminar el diseño y recibir confirmación específica.** No se ha verificado que dos proyectos aporten 1 GB utilizable, que sea posible crearlos en el plan actual ni que no tengan costos o pausas.

## 2. Funciones propuestas para MenRut Agent

### 2.1 Guardián por grupo
1. Un mensaje llega a un grupo donde el bot tiene los permisos necesarios.
2. El bot aplica las reglas configuradas para ese grupo, no una lista idéntica para ambos.
3. Registra el resultado necesario y actúa o avisa según la regla aprobada.

### 2.2 Enlaces y spam
1. El guardián detecta enlaces, publicidad repetitiva o mensajes masivos según la política del grupo.
2. Comprueba excepciones autorizadas y el contexto antes de decidir.
3. Puede advertir, ocultar o borrar el mensaje si se configura y tiene permiso; comunica al administrador los casos acordados.

### 2.3 Archivos y mensajes problemáticos
1. El bot identifica el tipo de contenido recibido: texto, archivos, medios, contactos u otros.
2. Aplica la regla de ese tipo de contenido; no supone que puede leer o analizar cualquier archivo.
3. Cuando no puede inspeccionarlo con seguridad, aplica la política aprobada o solicita revisión humana.

**Decisión del propietario:** no permitir que los clientes suban archivos ni publiquen mensajes excesivamente largos; eliminarlos inmediatamente por seguridad. Tampoco permitir enlaces ni ciertos emojis problemáticos. Falta acordar el límite exacto de longitud, qué emojis se bloquean, las excepciones y si cada regla aplica a ambos grupos, al chat de MenRut o a ambos. Un bot no puede garantizar que un archivo sea seguro solo por su extensión. En Telegram la eliminación requiere permisos y debe comprobarse su resultado.

### 2.4 Ofensas, amenazas y contexto
1. El guardián revisa el texto visible que Telegram le entregue de acuerdo con las reglas del grupo.
2. Distingue, en la medida de lo posible, palabras citadas, bromas, insultos dirigidos y amenazas.
3. Aplica la respuesta acordada o avisa para revisión, sin prometer detección perfecta.

### 2.5 Advertencias, restricciones y apelación
1. Cuando se confirme una infracción, el bot comunica la regla y la medida aplicada.
2. Si la política lo contempla, aplica una restricción temporal y registra su vencimiento.
3. El propietario puede revisar y levantar la medida; se ofrece una vía para apelar.

**Requiere acuerdo:** número de advertencias, excepciones, duración, alcance y cuándo debe intervenir una persona.

### 2.6 Herramientas privadas del propietario
1. El propietario abre el menú administrativo en privado.
2. El bot valida el ID numérico del remitente y también el contexto permitido en el servidor.
3. Muestra solo las acciones autorizadas y registra intentos y resultados importantes.

Los menús visibles u ocultos no son seguridad: cada acción administrativa debe volver a verificar la identidad. Las funciones públicas para usuarios se autorizan por separado.

### 2.7 Anuncios y mensajes programados
1. El propietario redacta un anuncio, elige grupo, fecha y hora y ve una vista previa.
2. Confirma el envío o la programación; el bot verifica que tiene permiso para publicar.
3. El bot conserva los anuncios anteriores, registra el resultado y comunica cualquier error.

### 2.8 Actualizaciones automáticas de MenRut
1. Un cambio publicado y aprobado produce una nota de versión desde una fuente confiable.
2. El sistema crea un anuncio legible con novedades, correcciones y enlace a la versión cuando corresponda.
3. Lo publica en el grupo configurado sin borrar mensajes anteriores y evita repetir el mismo anuncio.

**Por definir:** qué cuenta como actualización publicada, quién aprueba el texto y si todas las correcciones se anuncian. Un commit o un despliegue fallido no debe presentarse como actualización disponible.

### 2.9 Salud y alertas de la plataforma
1. El agente verifica indicadores acordados, como disponibilidad de páginas, API y tareas programadas.
2. Agrupa los fallos y evita alertar repetidamente por el mismo incidente.
3. Notifica al propietario cuando se detecte un problema y, si se comprueba, cuando se recupere.

Las comprobaciones deben ser ligeras, no revelar datos personales y no generar costos no autorizados.

### 2.10 Resúmenes para el propietario
1. El agente reúne estadísticas agregadas autorizadas de actividad y moderación.
2. Prepara un resumen periódico sin contenido privado innecesario.
3. Lo envía al propietario en el horario y zona acordados.

## 3. Funciones propuestas para MenRut Soporte

### 3.1 Preguntas en el grupo
1. Una persona hace una pregunta relacionada con MenRut en el grupo.
2. El bot responde brevemente si puede identificarla con suficiente confianza.
3. Incluye un botón para continuar por privado; evita responder a todas las conversaciones o interrumpir.

**Por definir:** si debe responder solo al mencionarlo, al responderle, por palabras clave o a toda pregunta pertinente. Telegram puede limitar qué mensajes ve un bot; hay que verificar privacidad y permisos sin desactivarlos innecesariamente.

### 3.2 Conversación privada
1. El usuario pulsa el botón y abre el bot en privado.
2. El bot le ofrece temas y preguntas frecuentes sobre cuenta, perfil, búsqueda, planes y otros asuntos.
3. Si no resuelve el problema, ofrece enviarlo al propietario o al equipo de soporte.

Telegram normalmente exige que la persona inicie primero el bot antes de que este pueda enviarle mensajes privados. Si no lo hace, el sistema debe ofrecer otra vía, no fingir que fue notificado.

### 3.3 Solicitud al administrador
1. El usuario describe el problema y ve qué información se enviará.
2. Tras confirmarlo, el bot remite la solicitud al chat privado autorizado.
3. Solo confirma el envío al usuario cuando Telegram lo haya aceptado.

### 3.4 Respuesta y seguimiento
1. El administrador selecciona una solicitud y redacta una respuesta.
2. El bot verifica autorización, destinatario y confirmación antes de enviar.
3. Registra el resultado y permite cerrar o revisar el caso, si se aprueba guardar esos datos.

**Requiere diseño y confirmación de base de datos, retención y privacidad.**

### 3.5 Denuncias y apelaciones
1. Una persona describe una denuncia o solicita revisar una medida.
2. El bot explica qué información se compartirá y pide confirmación.
3. La envía al propietario para que la revise; no promete que una sanción se levantará automáticamente.

## 4. Valoraciones ofensivas en la aplicación

### Flujo solicitado, sujeto a aprobación de detalles
1. Cuando llega una valoración, el sistema revisa el texto y oculta la que se identifique como ofensiva, evitando mostrarla públicamente mientras se revisa.
2. Avisa al propietario y, dentro de MenRut, informa al autor del motivo general y del plazo de 24 horas para editar; por Telegram solo se avisa si existe un vínculo autorizado y el bot puede escribirle.
3. Si no se corrige dentro del plazo, se aplica la medida acordada: eliminación o retirada y bloqueo de 24 horas, con registro y opción de revisión.

**Decisiones antes de implementar:**
- ¿Se oculta automáticamente con toda coincidencia o solo con alta confianza? ¿Qué pasa con citas, errores y falsos positivos?
- ¿Las 24 horas empiezan al guardar la valoración o al avisar al usuario? ¿Qué ocurre si falla la notificación?
- **Decisión del propietario:** el bloqueo de 24 horas impide publicar valoraciones y usar el chat; no bloquea el acceso a toda la aplicación. Falta precisar si impide leer el chat o solo escribir, y si afecta a todas las conversaciones.
- ¿Se elimina definitivamente la valoración o se retira de la vista y se conserva una evidencia mínima durante un plazo definido? No borrar datos de clientes sin confirmación.
- ¿Quién revisa apelaciones y cómo se revierte una sanción equivocada?
- La notificación dentro de la aplicación requiere funcionalidad y almacenamiento; los cambios de base requieren confirmación previa.

## 5. Chats entre usuarios: solo bajo reporte

1. Un participante reporta un mensaje o conversación y se le explica qué fragmento se compartirá.
2. El sistema habilita la revisión únicamente del contenido y contexto necesarios para ese reporte; el agente analiza ese material y avisa al propietario cuando proceda.
3. El propietario o una regla aprobada decide qué hacer y el sistema guarda solo la evidencia necesaria durante el plazo acordado.

**Aclaración posterior del propietario:** el filtro automático sí procesa todos los mensajes; la revisión detallada de un caso por el bot o administrador se activa mediante reporte. Revisar la implementación real del chat antes de prometer lectura en tiempo real.

## 6. Reglas distintas para cada grupo

Se necesita una tabla de decisiones para cada grupo:

| Regla | Grupo MenRut | Grupo Studio Lexair |
|---|---|---|
| Enlaces de miembros | Por acordar | Por acordar |
| Excepciones y dominios permitidos | Por acordar | Por acordar |
| Insultos y amenazas | Por acordar | Por acordar |
| Fotos, archivos y otros contenidos | Por acordar | Por acordar |
| Advertencias y restricciones | Por acordar | Por acordar |
| Respuestas automáticas de Soporte | Por acordar | Por acordar |
| Anuncios y horarios | Por acordar | Por acordar |
| Acciones de cada uno de los cuatro bots | Por acordar | Por acordar |

Los bots de Studio Lexair ya existen: antes de activar moderación de MenRut en ese grupo hay que estudiar qué hace cada bot y evitar borrados, avisos o sanciones duplicados.

## 7. Privacidad, seguridad y límites técnicos

- El ID del propietario se debe obtener y verificar de forma segura; nunca asumir que el nombre visible identifica a una persona. No incluirlo ni publicar datos sensibles innecesariamente.
- Telegram puede impedir que un bot escriba a alguien que no lo haya iniciado o lo haya bloqueado. Hay que ofrecer notificaciones en la aplicación u otra vía acordada.
- Permisos de administrador y privacidad del bot afectan a los mensajes y acciones disponibles; verificar cada grupo antes de activar funciones.
- Datos privados y mensajes reportados requieren acceso mínimo, retención definida y revisión de la política de privacidad. No publicar conversaciones o denuncias en grupos.
- Ninguna sanción debe depender solo de ocultar botones: todas las operaciones se autorizan en el servidor y deben contemplar falsos positivos y apelaciones.
- Los mensajes programados necesitan recuperación tras fallos e idempotencia; no es realista prometer que jamás se repetirá un mensaje sin diseñar y probar el mecanismo completo. Monitorear bloqueos y tareas pendientes.
- Sin rotar claves, cambiar pagos o autenticación, borrar datos, crear proyectos o contratar servicios sin la autorización correspondiente.

## 8. Proyectos de Supabase y presupuesto

Se estudiará si hacen falta dos proyectos y cómo dividir las funciones sin depender de escrituras cruzadas frágiles. Dos proyectos gratuitos no garantizan automáticamente un total utilizable de 1 GB: hay que verificar límites actuales por organización/proyecto, posibilidad de creación, tamaño real de base, pausas y eventuales costos. Guardar solo metadatos necesarios, limitar retención y evitar duplicar archivos ayudará a reducir consumo. **Ninguna creación ni cambio de esquema antes de la aprobación del propietario.**

## 9. Orden recomendado

1. Completar y aprobar las reglas de cada grupo y las responsabilidades de los cuatro bots.
2. Revisar el código real de MenRut: búsqueda pública, planes, valoraciones, notificaciones, chats y despliegue; identificar qué existe y qué falta.
3. Diseñar la moderación, reportes, permisos y almacenamiento mínimo, con protección de datos y costos.
4. Tras las confirmaciones necesarias, construir primero guardián y soporte básicos en un entorno aislado; probar errores y casos falsos antes de activar reglas destructivas.
5. Integrar actualizaciones, vigilancia operativa, valoraciones y reportes progresivamente; registrar cada cambio y desplegar únicamente después de las pruebas correspondientes.

## 10. Preguntas para continuar

1. Para cada grupo y para el chat de MenRut: ¿cuál es el límite de caracteres, qué emojis son problemáticos y hay excepciones para el propietario o ciertos enlaces? El propietario pidió bloquear archivos, enlaces, textos excesivamente largos y ciertos emojis.
2. En Studio Lexair, ¿debe MenRut Agent moderar también o solo actuar como respaldo de los bots de Studio Lexair? ¿Qué funciones debe tener MenRut Soporte allí?
3. En las valoraciones: el propietario confirmó un bloqueo de publicar valoraciones y usar el chat, no de toda la cuenta. ¿Impide leer o solo escribir? ¿Cuándo empieza el plazo de edición? ¿Prefiere retirada reversible o borrado definitivo?
4. En los chats, ¿confirmas que el análisis ocurre solo tras un reporte y que la persona que reporta sabe qué fragmento se comparte?
5. ¿Los anuncios de nuevas versiones se publican automáticamente después de un despliegue exitoso o prefieres aprobarlos primero?


## 11. Decisiones adicionales: longitud, archivos, enlaces y emojis

El propietario indica que estas restricciones deben aplicarse en **ambos grupos y el chat de MenRut**: no permitir archivos ni enlaces, revisar mensajes largos y eliminar los demasiado largos, además de tratar emojis problemáticos. Decisión final: **desde 1.200 caracteres, eliminación o rechazo del mensaje completo**, sin etapa de revisión por longitud. Debe definirse cómo contar caracteres visibles. En el chat de la aplicación es preferible impedir el envío antes de guardarlo, con un mensaje claro; en Telegram solo se puede borrar tras recibir el contenido, con permisos y confirmación del resultado.

**Emojis:** la investigación indica que no son necesariamente maliciosos por sí solos y su interpretación depende del contexto. Se propone detectar 🖕 como señal de posible insulto y combinaciones de amenazas, acoso o símbolos usados para odio para revisión contextual; no bloquear automáticamente emojis comunes como animales, frutas o gestos por sí mismos. No existe una lista universal segura; acordar la lista y acciones antes de activar sanciones. Referencia: https://www.bluesquarealliance.org/command-center-insights/emojis-coded-hate-symbols-online/ .

**Caracteres invisibles:** algunos caracteres Unicode pueden usarse para ocultar contenido, pero otros sirven para idiomas o formar emojis; detectar patrones sospechosos para revisión, sin eliminar todos los caracteres invisibles indiscriminadamente. Referencia: https://attack.mitre.org/techniques/T1027/018/ .

**Privacidad:** el propietario aclaró que todos los mensajes pasan por el filtro automático; la investigación detallada del contenido se activa mediante reporte. No guardar contenido en auditoría rutinaria. Acordar excepciones y alcance antes de activar las reglas. No se han implementado estas medidas ni modificado datos.

## 12. Aclaración del propietario: filtro en todos los mensajes

El propietario aclaró que la regla de enlaces se aplica en los grupos de Telegram y que **dentro de la aplicación tampoco se permite enviar enlaces de ningún tipo**. Autorizó que todos los mensajes pasen por el filtro del agente. Esto actualiza la idea anterior de que el análisis solo ocurriría después de un reporte: el filtro automático puede revisar cada mensaje al enviarse; el reporte sigue siendo un mecanismo adicional de revisión de casos concretos.

**Diseño recomendado:** procesar automáticamente el contenido con el mínimo acceso necesario, comunicarlo claramente en la aplicación, no dar acceso humano general a conversaciones privadas y no conservar su contenido en registros rutinarios. Acceso humano o envío de fragmentos al administrador únicamente bajo la política de reportes y excepciones que se acuerde. Especificar retención, información al usuario y apelaciones antes de desarrollar.

- **Grupos Telegram:** ambos grupos aplicarán las restricciones de archivos, enlaces, longitud y emojis problemáticos, conservando cualquier otra regla específica de cada grupo. Eliminar contenido prohibido tras su recepción cuando el bot tenga permiso y verificar el resultado.
- **Chat de MenRut:** no permitir enlaces ni archivos; evaluar mensajes con el filtro de forma automática. Rechazar antes de publicar cuando sea técnicamente posible, explicando el motivo sin exponer el texto a terceros.
- **Longitud acordada:** a partir de 1.200 caracteres se elimina o rechaza el mensaje completo, sin revisión por longitud.
- **Emojis y ofensas:** un filtro puede examinar contexto, pero es falible. Acordar umbrales, lista y medidas antes de activar sanciones; evitar borrar contenido por un emoji cotidiano aislado.
- No se ha implementado ni activado el filtro. Antes de tocar base de datos, autenticación o permisos se acordarán los cambios necesarios y se solicitará confirmación según corresponda.

## 13. Corrección del límite de longitud

El propietario cambia la regla anterior: **a partir de 1.200 caracteres se elimina o rechaza el mensaje completo**, sin etapa de revisión de longitud ni umbral de 2.000. Telegram: eliminar después de recibirlo si hay permisos y comprobar el resultado; chat de la aplicación: rechazar el envío antes de publicarlo cuando sea posible. Esta decisión sustituye los umbrales anteriores de este documento. Se definirá el método exacto de cómputo de caracteres visibles durante el diseño.

## 14. Consulta: chat P2P

El propietario aclaró que con «pwp» quiere decir P2P: comunicación directa entre dispositivos. Es técnicamente posible, pero la revisión inicial del código de MenRut muestra un chat preparado con socket y respaldo HTTP e historial desde servidor, no P2P puro; no se ha auditado ni probado de extremo a extremo el despliegue actual.

Una conexión directa suele necesitar señalización y, si la red no permite conexión directa, puede requerir un servidor intermediario TURN, con costos de ancho de banda; sin mecanismos adicionales no entrega mensajes cuando un usuario está desconectado. P2P no es sinónimo de cifrado de extremo a extremo.

Un filtro solo instalado en las aplicaciones de los usuarios puede saltarse con un cliente modificado; por tanto, no garantiza la prohibición de enlaces, adjuntos o textos largos. Si el servidor o bot debe verificar todos los mensajes, necesita ver suficiente contenido para aplicar las reglas; eso es incompatible con cifrado de extremo a extremo estricto para todo el contenido, salvo que se relajen las reglas o se acepte un sistema de filtrado no fiable del lado cliente. La revisión de reportes debe diseñarse por separado.

Recomendación inicial, sujeta a decisión: conservar el envío validado por servidor para permitir moderación aplicable, mensajes con destinatario desconectado y operación simple, minimizar retención y estudiar P2P solo para funciones futuras que lo necesiten. No se ha decidido ni implementado un rediseño del chat.

## 15. Lectura de conversaciones reportadas

El propietario propone mantener chat con servidor y que el bot pueda leer la conversación cuando una persona la reporte. Se separan dos funciones: (1) el filtro automático procesa todos los mensajes para aplicar las reglas acordadas; (2) el acceso del bot para revisar el contenido de una conversación y el envío al administrador se activan por reporte. El procesamiento automático requiere acceso técnico al texto; no debe describirse como si nadie ni ningún sistema pudiera procesarlo antes de un reporte.

Cuando un participante reporte, la aplicación debe explicarle y permitirle confirmar qué se compartirá. El sistema remitirá al bot o administrador solo la conversación o fragmento autorizado para revisar el incidente, por un canal privado y con acceso limitado. Falta acordar si se envía toda la conversación o el mensaje denunciado con contexto, quién puede leerla y el plazo de conservación. Una vez se decidan los detalles habrá que estudiar los cambios necesarios y pedir confirmación de base de datos antes de implementarlos. No está implementado.

## 16. Reportes de mensajes y reputación

**Decisión del propietario:** una persona podrá reportar un mensaje específico o elegir reportar los últimos 10 mensajes. El usuario debe ver y confirmar qué contenido se compartirá; el material se enviará al bot o al administrador únicamente por un canal privado y con acceso restringido. Hay que definir el comportamiento si hay menos de 10 mensajes, los plazos de conservación y el acceso exacto antes de implementarlo.

El propietario propone que, al recibir **cinco reportes de cinco usuarios diferentes**, se genere un aviso, se coloque una insignia de mala reputación y se abra una investigación profunda del mensajero, usuario o negocio reportado. Varios reportes de la misma persona no cuentan como cinco usuarios; el sistema debe distinguir claramente a la persona o negocio denunciado, no a quien denuncia. Habrá que diseñar prevención de cuentas falsas, reportes coordinados, reportes duplicados y una revisión justa. Un reporte no es prueba de culpabilidad; se recomienda que una persona revise la evidencia y que exista apelación, con retirada de la insignia si se demuestra un error. No añadir bloqueo automático sin definirlo.

**Preguntas pendientes:** ¿se cuentan todos los reportes válidos o solo los confirmados tras revisión?, ¿quién revisa y cuándo desaparece la insignia? Se acordó una ventana de 30 días y visibilidad solo para el administrador y el afectado. Esta función requiere diseño y cambios de base, autenticación de reporteros y política de privacidad; solicitar confirmación específica de dichos cambios antes de implementarlos. Todavía no se ha implementado ni creado infraestructura.

## 17. Decisiones del propietario: plazo e insignia (vigentes)

El umbral es **cinco reportes de cinco usuarios diferentes en una ventana móvil de 30 días**. Al alcanzar el umbral, el sistema avisa, crea una insignia de mala reputación visible **solo para el administrador y la persona o negocio afectado** y abre una investigación. La insignia no es pública. Estas decisiones sustituyen las preguntas anteriores sobre plazo y visibilidad. No se decidió aún la duración de la insignia, las reglas de caducidad y apelación, ni si todos los reportes se cuentan antes o después de una revisión; concretarlos antes de implementar. La insignia no debe presentarse como una conclusión de culpabilidad, y un usuario no puede contar varias veces dentro de la ventana.

El propietario pide coordinar este plan con el agente que desarrolla la aplicación. El reparto concreto y los puntos de integración figuran en `docs/COORDINACION-BOTS-APP.md` del repositorio MenRut. Ninguna parte de este plan implica autorización automática para crear proyectos Supabase ni cambiar esquemas, autenticación o pagos sin confirmar esos cambios específicos.
