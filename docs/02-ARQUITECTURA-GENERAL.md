# MenRut · Arquitectura implementada

Estado: entrega inicial parcial — 6 de noviembre de 2026.

Flutter Web → Pages Functions TypeScript → D1 CORE y dos shards. Auth se ha programado con Supabase JWKS, pero no se ha conectado a un proyecto activo. No hay datos operativos en PostgreSQL ni R2.

```mermaid
flowchart TD
 F[Flutter Web] --> P[Pages Functions]
 P --> C[D1 CORE: directorio y asignación]
 P --> S1[D1 SHARD 01]
 P --> S2[D1 SHARD 02]
 P -. pendiente conexión .-> A[Supabase Auth]
 F -. pendiente políticas .-> ST[Supabase Storage]
```

Código: `app/lib`, `src/core`, `src/modules`, `functions/api/v1`, `database`, `tests`, `scripts`. Android solo tiene estructura generada, no compilación validada.
