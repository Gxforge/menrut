# MenRut · Escalabilidad y cuotas

> Documento histórico de una entrega anterior. Para el frontend y conexión actuales, consultar [actualización React/Supabase](22-MIGRACION-REACT-Y-CONEXION.md).


Estado: entrega inicial parcial — 6 de noviembre de 2026.

D1 Free: 10 bases, 500 MB/base, 5 GB agregados, Time Travel 7 días y 50 consultas por invocación Worker. Fuente consultada: https://developers.cloudflare.com/d1/platform/limits/ . No son 5 GB extra por base.

Etapa 1 implementa CORE+2 shards. Etapa 2 añade 03–09 manteniendo directorio central sin fanout. Etapa 3 requiere autorización de gasto o rediseño antes de superar cuota; nunca se cambia a Paid automáticamente. Precios exactos de Paid pendientes de investigación formal.

Cloudflare limita además lecturas/escrituras diarias; Supabase limita MAU, disco, egress y Storage y puede pausar proyectos gratuitos. Sus cuotas exactas y viabilidad para Cuba requieren comprobación antes del lanzamiento. No se garantiza disponibilidad permanente. Alertas de ocupación y bloqueo general al 100 % están pendientes.
