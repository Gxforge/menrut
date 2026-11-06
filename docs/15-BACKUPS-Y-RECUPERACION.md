# MenRut · Backup y recuperación

Estado: entrega inicial parcial — 6 de noviembre de 2026.

`bash scripts/backup.sh` exporta tres bases remotas mediante Wrangler d1 export --remote --output y produce SHA256SUMS en backups/ (ignorado por Git, permisos restrictivos). Sintaxis contrastada con ayuda oficial del CLI instalado. No se ha ejecutado un backup ni ensayo de restauración.

Retención propuesta: 7 diarios y 4 semanales cifrados fuera de esta cuenta. Descargar manualmente: snapshots del workspace excluyen directorios voluminosos y no son una garantía de backup. Conservar migraciones y configuración no secreta en Git.

Restaurar primero en bases nuevas aisladas con d1 execute --remote --file, validar integridad, recuentos, UUID→shard y eventos, luego cambiar bindings con autorización y rollback a bases previas. Exportación de referencias Storage y ensayo de recuperación siguen pendientes. Time Travel siete días no sustituye una copia externa.
