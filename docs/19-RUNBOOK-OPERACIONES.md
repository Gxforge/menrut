# MenRut · Operaciones

Estado: entrega inicial parcial — 6 de noviembre de 2026.

Comprobar GET /api/v1/health; GET /directory debe responder sin fanout. Si no aparecen perfiles: revisar visible, expires_at, estado de cuenta y evento de shard; ejecutar courier/sync con sesión propietaria. Si asignación devuelve capacidad, revisar enabled, medida <24h y ocupación <95 %. Actualizar medidas con script seguro.

No abrir escrituras financieras aún: módulos pendientes. Ante fuga de credenciales revocar los tres tokens en sus proveedores, regenerar .env fuera de Git y verificar historial. No publicar backups ni capturas de comprobantes.

El alias Pages tuvo un 522 transitorio inmediatamente después del despliegue; comprobación posterior devolvió 200. urllib recibió 403 mientras curl obtuvo respuestas válidas. Se verificaron los endpoints con curl y el URL de despliegue. No equivale a prueba visual completa en navegador.
