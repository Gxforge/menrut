# MenRut · Pruebas y calidad

> Documento histórico de una entrega anterior. Para el frontend y conexión actuales, consultar [actualización React/Supabase](22-MIGRACION-REACT-Y-CONEXION.md).


Estado: entrega inicial parcial — 6 de noviembre de 2026.

Ejecutadas: tsc; 7 pruebas TypeScript de tiempo/créditos; 3 pruebas Python SQLite de migraciones, restricciones y round robin (100 usuarios, 200 solicitudes con 16 hilos); 8 pruebas HTTP contra Wrangler local; flutter analyze sin incidencias; 1 widget test; flutter build web satisfactorio; npm audit: 0 vulnerabilidades tras actualizar herramientas.

Control <=300 líneas en fuentes Dart, TS, SQL y Python. CI de calidad configurada; no se afirma que haya terminado una ejecución remota.

Faltan JWT real/rotación, pagos, reservas, abuso, Storage, recuperación, outbox financiero, PWA instalada, interacción completa y pruebas Android. Esquemas aplicados a D1 local y remoto sin pruebas destructivas en producción.
