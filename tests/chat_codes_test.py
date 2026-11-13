"""Pruebas de la migración y de la paginación del chat (v2.2): core 0009 y shard 0006.

Usa SQLite en memoria con las migraciones del repositorio, como database_test.py.
"""
import re
import sqlite3
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def core_db():
    c = sqlite3.connect(":memory:")
    c.execute("PRAGMA foreign_keys=ON")
    for p in sorted((ROOT / "database/core/migrations").glob("*.sql")):
        c.executescript(p.read_text(encoding="utf-8"))
    return c


def shard_db():
    c = sqlite3.connect(":memory:")
    for p in sorted((ROOT / "database/shard/migrations").glob("*.sql")):
        c.executescript(p.read_text(encoding="utf-8"))
    return c


def cols(c, table):
    return {r[1] for r in c.execute(f"PRAGMA table_info({table})")}


class ChatCodesSchemaTests(unittest.TestCase):
    def test_core_columns_exist(self):
        c = core_db()
        self.assertTrue({"kind", "ref_id", "payload"} <= cols(c, "messages"))
        self.assertIn("hired_at", cols(c, "conversations"))
        c.close()

    def test_shard_columns_exist(self):
        c = shard_db()
        self.assertTrue({"conversation_id", "client_confirmed_at", "cancelled_at"} <= cols(c, "delivery_verifications"))
        c.close()

    def test_kind_rejects_unknown_value(self):
        c = core_db()
        c.execute("INSERT INTO conversations(id,client_id,courier_id,last_message_at) VALUES('c1','a','b',0)")
        with self.assertRaises(sqlite3.IntegrityError):
            c.execute("INSERT INTO messages(id,conversation_id,sender_id,body,kind) VALUES('m1','c1','a','x','raro')")
        c.close()

    def test_legacy_messages_default_to_text(self):
        c = core_db()
        c.execute("INSERT INTO conversations(id,client_id,courier_id,last_message_at) VALUES('c1','a','b',0)")
        c.execute("INSERT INTO messages(id,conversation_id,sender_id,body) VALUES('m1','c1','a','hola')")
        kind = c.execute("SELECT kind FROM messages WHERE id='m1'").fetchone()[0]
        self.assertEqual(kind, "text")
        c.close()

    def test_migrations_are_idempotent_for_indexes(self):
        # Re-ejecutar solo los índices no debe fallar (IF NOT EXISTS).
        c = core_db()
        sql = (ROOT / "database/core/migrations/0009_chat_codes.sql").read_text(encoding="utf-8")
        for stmt in re.findall(r"CREATE INDEX IF NOT EXISTS[^;]*;", sql):
            c.execute(stmt)
        c.close()


class ChatRetentionTests(unittest.TestCase):
    """Mismo DELETE que purgeChatRetention: se borra lo anterior a 24 h y se conserva lo reciente."""

    def test_purge_removes_only_older_than_24h(self):
        c = core_db()
        c.execute("INSERT INTO conversations(id,client_id,courier_id,last_message_at) VALUES('c1','a','b',0)")
        now = 2_000_000_000
        c.execute("INSERT INTO messages(id,conversation_id,sender_id,body,created_at) VALUES('viejo','c1','a','x',?)", (now - 90_000,))
        c.execute("INSERT INTO messages(id,conversation_id,sender_id,body,created_at) VALUES('reciente','c1','a','y',?)", (now - 3_600,))
        cur = c.execute("DELETE FROM messages WHERE created_at < ?", (now - 86_400,))
        self.assertEqual(cur.rowcount, 1)
        left = [r[0] for r in c.execute("SELECT id FROM messages")]
        self.assertEqual(left, ["reciente"])
        c.close()


class ChatPagingTests(unittest.TestCase):
    """Mismo SQL que listMessages: últimos N por rowid, luego páginas anteriores."""

    QUERY = (
        "SELECT rowid AS rid, id FROM messages WHERE conversation_id=? AND (?=0 OR rowid<?) "
        "ORDER BY rowid DESC LIMIT ?"
    )

    def setUp(self):
        self.c = core_db()
        self.c.execute("INSERT INTO conversations(id,client_id,courier_id,last_message_at) VALUES('c1','a','b',0)")
        self.c.executemany(
            "INSERT INTO messages(id,conversation_id,sender_id,body) VALUES(?,?,?,?)",
            [(f"m{i:03d}", "c1", "a", f"msg {i}") for i in range(75)],
        )

    def tearDown(self):
        self.c.close()

    def page(self, before, limit=30):
        rows = self.c.execute(self.QUERY, ("c1", before, before, limit + 1)).fetchall()
        has_more = len(rows) > limit
        page = list(reversed(rows[:limit]))
        next_before = page[0][0] if has_more and page else None
        return [r[1] for r in page], has_more, next_before

    def test_first_page_is_latest_thirty_in_order(self):
        ids, has_more, _ = self.page(0)
        self.assertEqual(len(ids), 30)
        self.assertTrue(has_more)
        self.assertEqual(ids[0], "m045")
        self.assertEqual(ids[-1], "m074")

    def test_paging_walks_all_messages_without_duplicates(self):
        seen, before = [], 0
        while True:
            ids, has_more, nxt = self.page(before)
            seen = ids + seen
            if not has_more:
                break
            before = nxt
        self.assertEqual(seen, [f"m{i:03d}" for i in range(75)])

    def test_short_conversation_has_no_more(self):
        self.c.execute("DELETE FROM messages WHERE rowid > 10")
        ids, has_more, nxt = self.page(0)
        self.assertEqual(len(ids), 10)
        self.assertFalse(has_more)
        self.assertIsNone(nxt)


if __name__ == "__main__":
    unittest.main()
