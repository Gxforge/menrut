# MenRut · Autenticación y seguridad

Estado: entrega inicial parcial — 6 de noviembre de 2026.

Verificador jose: ES256/RS256, firma JWKS, issuer, audience authenticated, sub, exp e iat. Cache JWKS 10 minutos. HS256 se rechaza: activar firma asimétrica en Supabase antes de integrar. Falta prueba end-to-end con JWT real.

RBAC administrativo usa D1, no user_metadata. Endpoints privados derivan UUID del JWT. CORS con origen configurado, consultas preparadas, límite de cuerpo 16 KiB y rate limit de 90/min. El rate limit escribe en CORE, por lo que debe medirse su impacto de cuota.

Credenciales locales en `.env` modo 0600, excluido de Git. Nunca exponer PAT, token Cloudflare, token de gestión Supabase ni service_role en Dart. Antes de producción hacer revisión independiente y completar la batería de seguridad.
