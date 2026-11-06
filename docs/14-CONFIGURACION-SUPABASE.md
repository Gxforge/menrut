# MenRut · Supabase pendiente

> Documento histórico de una entrega anterior. Para el frontend y conexión actuales, consultar [actualización React/Supabase](22-MIGRACION-REACT-Y-CONEXION.md).


Estado: entrega inicial parcial — 6 de noviembre de 2026.

El token de gestión se verificó por API, no es la clave pública de Flutter. Dos proyectos INACTIVE: nexolink-core-app y nexolink-core-db. No se renombraron, reactivaron ni modificaron datos existentes.

El propietario debe elegir uno para MenRut. Usar un solo proyecto para Auth y Storage. Reactivarlo en Free si la plataforma lo permite; si exige tarjeta, detenerse. Activar email, URLs de retorno y firma asimétrica. Configurar SUPABASE_URL en Pages; SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY mediante dart-define en Flutter. Guardar TRIAL_HMAC_SECRET mediante secrets de Pages.

Buckets previstos: courier-public, payment-proofs-private y private-documents. Políticas aún no escritas ni aplicadas: denegar uploads hasta establecer propietario auth.uid() en la primera carpeta, tamaño/MIME y lectura privada de comprobantes. Las galerías optativas privadas no deben ir en buckets públicos. La base comercial sigue en D1.

Prueba gratuita automática solo con teléfono presente en JWT emitido por Auth; la alternativa administrada para usuarios sin SMS aún está pendiente. Sin identidad verificable no se promete impedir abuso por persona. Un usuario sin señal verificable obtiene perfil sin prueba.
