# MenRut · Privacidad y retención

> Documento histórico de una entrega anterior. Para el frontend y conexión actuales, consultar [actualización React/Supabase](22-MIGRACION-REACT-Y-CONEXION.md).


Estado: entrega inicial parcial — 6 de noviembre de 2026.

La proyección publica únicamente campos seleccionados explícitamente; teléfono solo se devuelve desde perfil si public_phone=1. No se registran tokens en logs de aplicación. Cuenta, UUID y HMAC son datos personales o seudónimos, no anónimos.

trial_claims conserva HMAC de teléfono para impedir repetición de prueba. Antes de activar producción redactar política, base jurídica, plazo y proceso de supresión/anonimización. No existe todavía endpoint de borrado; no anunciar cumplimiento legal completo. No usar fingerprinting invasivo. Comprobantes y documentos privados requieren políticas que aún no se han aplicado.
