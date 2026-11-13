-- MENRUT v2.2 — Código de entrega por chat y encargos (aditiva).
-- messages: tipo de evento (texto, código de entrega, encargo), referencia al
-- objeto (id de la entrega) y carga útil JSON.
-- conversations: fecha en que el mensajero creó su primer encargo («contratado»).
ALTER TABLE messages ADD COLUMN kind TEXT NOT NULL DEFAULT 'text' CHECK(kind IN ('text','delivery_code','encargo'));
ALTER TABLE messages ADD COLUMN ref_id TEXT;
ALTER TABLE messages ADD COLUMN payload TEXT;
ALTER TABLE conversations ADD COLUMN hired_at INTEGER;
CREATE INDEX IF NOT EXISTS idx_messages_ref ON messages(ref_id) WHERE ref_id IS NOT NULL;
