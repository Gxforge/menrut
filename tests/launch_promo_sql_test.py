"""Comprueba la migración 0008 y la asignación de cupos con las mismas sentencias
que src/v2/launch-promo.ts. Usa SQLite en memoria (no toca D1)."""
import sqlite3, pathlib, sys

MIG = pathlib.Path(__file__).resolve().parents[1] / "database/core/migrations/0008_launch_promo.sql"

def db_with(municipios):
    c = sqlite3.connect(":memory:")
    c.execute("CREATE TABLE Municipality (id TEXT PRIMARY KEY, provinceId TEXT, name TEXT)")
    c.executemany("INSERT INTO Municipality VALUES (?,?,?)", [(m, "P1", m) for m in municipios])
    c.executescript(MIG.read_text(encoding="utf-8"))
    return c

def claim(c, uid, mun):
    """Réplica de claimLaunchPromo: UPDATE condicional y registro de la reclamación."""
    for _ in range(5):
        row = c.execute(
            "SELECT seq, kind FROM launch_promo_slots WHERE municipality_id=? AND claimed_by IS NULL ORDER BY seq ASC LIMIT 1",
            (mun,)).fetchone()
        if not row:
            return None
        cur = c.execute(
            "UPDATE launch_promo_slots SET claimed_by=?, claimed_at=1 WHERE municipality_id=? AND seq=? AND claimed_by IS NULL",
            (uid, mun, row[0]))
        if cur.rowcount == 1:
            c.execute("INSERT INTO launch_promo_claims(user_id, municipality_id, seq, kind, claimed_at) VALUES(?,?,?,?,1)",
                      (uid, mun, row[0], row[1]))
            return row
    return None

fails = []
def check(name, cond):
    print(("OK  " if cond else "FAIL"), name)
    if not cond: fails.append(name)

c = db_with(["A", "B"])
check("10 cupos por municipio", c.execute("SELECT COUNT(*) FROM launch_promo_slots WHERE municipality_id='A'").fetchone()[0] == 10)
kinds = [r[0] for r in c.execute("SELECT kind FROM launch_promo_slots WHERE municipality_id='A' ORDER BY seq")]
check("orden 1m,2m,2m,2m,1m x6", kinds == ["free_1m"] + ["free_2m"] * 3 + ["free_1m"] * 6)

# 10 reclamaciones en A: el 11.º debe fallar.
got = [claim(c, f"u{i}", "A") for i in range(11)]
check("las 10 primeras reclamaciones ganan", all(g is not None for g in got[:10]))
check("la 11.ª se rechaza (agotado)", got[10] is None)
seqs = [g[0] for g in got[:10]]
check("cada cupo se asigna una sola vez", sorted(seqs) == list(range(1, 11)))
check("el orden de reclamación sigue el número de cupo", seqs == list(range(1, 11)))
check("municipio B intacto", c.execute("SELECT COUNT(*) FROM launch_promo_slots WHERE municipality_id='B' AND claimed_by IS NULL").fetchone()[0] == 10)

# Carrera: el mismo cupo no puede ganarlo dos veces aunque se lea antes.
c2 = db_with(["X"])
first = c2.execute("SELECT seq FROM launch_promo_slots WHERE municipality_id='X' AND claimed_by IS NULL ORDER BY seq LIMIT 1").fetchone()[0]
a = c2.execute("UPDATE launch_promo_slots SET claimed_by='a' WHERE municipality_id='X' AND seq=? AND claimed_by IS NULL", (first,)).rowcount
b = c2.execute("UPDATE launch_promo_slots SET claimed_by='b' WHERE municipality_id='X' AND seq=? AND claimed_by IS NULL", (first,)).rowcount
check("dos clics sobre el mismo cupo: solo gana uno", (a, b) == (1, 0))

# Un usuario no reclama dos veces (user_id es clave primaria).
c3 = db_with(["Y"])
claim(c3, "dup", "Y")
dup_err = False
try:
    c3.execute("INSERT INTO launch_promo_claims(user_id, municipality_id, seq, kind, claimed_at) VALUES('dup','Y',2,'free_2m',1)")
except sqlite3.IntegrityError:
    dup_err = True
check("un usuario no puede tener dos reclamaciones", dup_err)

# La migración es idempotente.
c.executescript(MIG.read_text(encoding="utf-8"))
check("re-ejecutar la migración no duplica cupos", c.execute("SELECT COUNT(*) FROM launch_promo_slots").fetchone()[0] == 20)

print("\nFALLOS:", fails if fails else "ninguno")
sys.exit(1 if fails else 0)
