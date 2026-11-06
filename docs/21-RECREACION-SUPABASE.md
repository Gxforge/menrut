# Recreación de Supabase — 6 de noviembre de 2026

> Documento histórico de una entrega anterior. Para el frontend y conexión actuales, consultar [actualización React/Supabase](22-MIGRACION-REACT-Y-CONEXION.md).


Esta actualización sustituye el estado anterior de Supabase descrito en el informe inicial.

## Autorización y acciones ejecutadas
Después de aclarar las cuotas y el carácter destructivo, el propietario seleccionó expresamente «Borrar y crear dos».

Se eliminaron por API los proyectos antiguos:
- `nexolink-core-app` (`qzajijyrgfzvlbnkpkhk`).
- `nexolink-core-db` (`evxvyarlmkhecwzbdqdb`).

Se crearon y verificaron por GET /v1/projects:

| Proyecto | Referencia | Estado observado |
|---|---|---|
| menrut-principal | orqskfecwtroppqimhnj | ACTIVE_HEALTHY |
| menrut-secundario | bnubjqsxbcymdsukioes | ACTIVE_HEALTHY |

Región: us-east-1. Organización existente: dmycptgxrjjffbtawkwr. Plan Free comprobado antes de la creación. Sin cambio de plan ni activación de complementos comerciales. Contraseñas aleatorias independientes guardadas en `.env` local, nunca en Git ni en este documento.

## Nombre de organización: pendiente por limitación de API
El nombre verificado sigue siendo **NexoLink Core**. El OpenAPI oficial disponible en https://api.supabase.com/api/v1-json ofrece GET para /v1/organizations/{slug}, pero no PATCH/PUT documentado para renombrar. No se ha simulado ese cambio ni se han invocado rutas internas no documentadas.

El propietario puede cambiar el nombre visible a **MenRut** desde la configuración general de organización en el panel de Supabase. No es necesario crear otra organización ni cambiar de plan.

## Cuotas: no se suman como pretendía la solicitud inicial
Dentro de la misma organización Free: 50.000 usuarios activos mensuales compartidos; 1 GB de Storage compartido; 500 MB de PostgreSQL por proyecto. Las dos bases son independientes, no una base única de 1 GB. Usuarios activos mensuales no equivale al total de cuentas registradas.

Fuente: https://supabase.com/docs/guides/platform/billing-on-supabase ; https://supabase.com/pricing .

## Integración pendiente
Crear ambos proyectos no integra dos identidades Auth en MenRut. El código actual admite un emisor Supabase. Antes de usar dos Auth será necesario diseñar la identidad global, la asignación de proyecto, validación de dos emisores y aislamiento de Storage; no se habilitará silenciosamente. Por ahora los proyectos están creados y activos, pero no conectados a Flutter/Pages. D1 sigue siendo la base operativa. No se han aplicado políticas Storage ni configurado buckets.
