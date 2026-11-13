-- MENRUT v2.2 — Códigos de entrega ligados a una conversación (aditiva).
-- conversation_id: conversación donde se generó el código.
-- client_confirmed_at: el cliente confirmó la recepción en la app (paso previo obligatorio).
-- cancelled_at: el cliente lo canceló antes de que el mensajero fuera contratado.
ALTER TABLE delivery_verifications ADD COLUMN conversation_id TEXT;
ALTER TABLE delivery_verifications ADD COLUMN client_confirmed_at INTEGER;
ALTER TABLE delivery_verifications ADD COLUMN cancelled_at INTEGER;
CREATE INDEX IF NOT EXISTS idx_dv_conversation ON delivery_verifications(conversation_id, client_id);
