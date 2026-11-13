-- v2.3.2 · Índices para rendimiento y retención (2026-11-13).
-- messages(created_at): la retención horaria (DELETE ... WHERE created_at < ?) recorría la tabla entera.
-- conversations(client_id|courier_id): listados y comprobaciones por usuario sin recorrido completo.
-- Idempotente: IF NOT EXISTS.
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_client ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_courier ON conversations(courier_id);
