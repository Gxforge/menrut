# MenRut · Diccionario de datos

Estado: entrega inicial parcial — 6 de noviembre de 2026.

La definición ejecutable está en `database/core/migrations` y `database/shard/migrations`.

CORE: global_accounts (identidad/estado), user_roles, shard_registry (medición y binding), allocation_state (puntero único), courier_shard_map, trial_claims (HMAC único), admin_permissions, audit_logs, catálogos geográficos, rate_limit_buckets, public_courier_directory, sync_inbox, sync_failures, system_settings, plans, payment_requests y outbox_events.

Shard: courier_profiles, credit_wallets, credit_ledger, processed_events, shard_outbox, courier_services, courier_routes, delivery_verifications y reviews. Algunas tablas anticipan módulos todavía no implementados: no implican flujos disponibles.

Propietario de servicios, rutas y opiniones: shard del mensajero. Clientes se referencian por UUID, sin duplicar su perfil completo. D1 no contiene binarios. No hay FK entre bases independientes.
