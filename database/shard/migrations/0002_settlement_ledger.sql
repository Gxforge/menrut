-- Keep every temporal consumption as an immutable seconds-unit ledger movement.
CREATE TRIGGER IF NOT EXISTS ledger_permanence_settlement
AFTER UPDATE OF permanence_seconds ON credit_wallets
WHEN NEW.permanence_seconds<OLD.permanence_seconds
BEGIN
 INSERT INTO credit_ledger(id,user_id,wallet,delta,balance_after,operation_id)
 VALUES(lower(hex(randomblob(16))),NEW.user_id,'permanence',
 NEW.permanence_seconds-OLD.permanence_seconds,NEW.permanence_seconds,
 'settle:'||OLD.settled_at||':'||NEW.settled_at);
END;
