import sqlite3,unittest,concurrent.futures,tempfile,re
from contextlib import closing
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SQL=re.search(r'allocationSQL=`(.*?)`;', (ROOT/'src/modules/allocation.ts').read_text(), re.S)[1]
def setup(path):
 c=sqlite3.connect(path,timeout=30)
 for p in sorted((ROOT/'database/core/migrations').glob('*.sql')):c.executescript(p.read_text())
 c.execute("INSERT INTO shard_registry(shard_id,binding,enabled,measured_at) VALUES(1,'D1_SHARD_01',1,unixepoch()),(2,'D1_SHARD_02',1,unixepoch())")
 c.commit();return c
class DatabaseTests(unittest.TestCase):
 def test_parallel_and_retry(self):
  with tempfile.TemporaryDirectory() as d:
   p=d+'/db';c=setup(p)
   def allocate(i):
    with closing(sqlite3.connect(p,timeout=30)) as db, db:
     uid=str(i);db.execute('INSERT OR IGNORE INTO global_accounts(user_id) VALUES(?)',(uid,))
     db.execute(SQL,(uid,uid))
   with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:list(pool.map(allocate,list(range(100))*2))
   self.assertEqual(c.execute('SELECT count(*) FROM courier_shard_map').fetchone()[0],100)
   self.assertEqual(c.execute('SELECT count(*) FROM courier_shard_map WHERE shard_id=1').fetchone()[0],50)
   self.assertEqual(c.execute('SELECT last_shard FROM allocation_state').fetchone()[0],2)
   c.close()
 def test_disabled_capacity_and_stale(self):
  c=setup(':memory:');c.execute('UPDATE shard_registry SET enabled=0 WHERE shard_id=1')
  c.execute("INSERT INTO global_accounts(user_id) VALUES('a'),('b')")
  c.execute(SQL,('a','a'));self.assertEqual(c.execute('SELECT shard_id FROM courier_shard_map').fetchone()[0],2)
  c.execute('UPDATE shard_registry SET size_bytes=capacity_bytes*0.95 WHERE shard_id=2')
  c.execute(SQL,('b','b'));self.assertEqual(c.execute('SELECT count(*) FROM courier_shard_map').fetchone()[0],1)
  c.close()
 def test_shard_migration_and_wallet_constraint(self):
  c=sqlite3.connect(':memory:')
  for p in sorted((ROOT/'database/shard/migrations').glob('*.sql')):c.executescript(p.read_text())
  c.execute("INSERT INTO courier_profiles(user_id,slug) VALUES('a','a')")
  with self.assertRaises(sqlite3.IntegrityError):c.execute("INSERT INTO credit_wallets(user_id,tool_credits,settled_at,expires_at) VALUES('a',-1,0,0)")
  c.close()
 def test_atomic_settlement_ledger_and_partial_seconds(self):
  c=sqlite3.connect(':memory:')
  for p in sorted((ROOT/'database/shard/migrations').glob('*.sql')):c.executescript(p.read_text())
  c.execute("INSERT INTO courier_profiles(user_id,slug) VALUES('a','a')")
  c.execute("INSERT INTO credit_wallets(user_id,permanence_seconds,tool_credits,settled_at,expires_at) VALUES('a',604800,50,0,604800)")
  query=re.search(r'settleSQL=`(.*?)`;', (ROOT/'src/modules/credits.ts').read_text(),re.S)[1]
  for now in [1,1,43200,43200]:c.execute(query,(now,now,'a'))
  self.assertEqual(c.execute('SELECT permanence_seconds,tool_credits FROM credit_wallets').fetchone(),(561600,50))
  self.assertEqual(c.execute('SELECT sum(delta),count(*) FROM credit_ledger').fetchone(),(-43200,2))
  c.execute(query,(999999,999999,'a'))
  self.assertEqual(c.execute('SELECT permanence_seconds,tool_credits FROM credit_wallets').fetchone(),(0,50))
  c.close()
 def test_tool_reservation_lifecycle(self):
  c=sqlite3.connect(':memory:')
  for p in sorted((ROOT/'database/shard/migrations').glob('*.sql')):c.executescript(p.read_text())
  c.execute("INSERT INTO courier_profiles(user_id,slug) VALUES('a','a')")
  c.execute("INSERT INTO credit_wallets(user_id,permanence_seconds,tool_credits,settled_at,expires_at) VALUES('a',0,5,0,0)")
  # Reserva: descuento condicional (una sola sentencia, sin doble cargo).
  self.assertEqual(c.execute("UPDATE credit_wallets SET tool_credits=tool_credits-3 WHERE user_id='a' AND tool_credits>=3").rowcount,1)
  self.assertEqual(c.execute("UPDATE credit_wallets SET tool_credits=tool_credits-3 WHERE user_id='a' AND tool_credits>=3").rowcount,0)  # sin fondos ya
  c.execute("INSERT INTO tool_reservations(id,user_id,tool_id,tool_code,credit_cost,status,operation_id,expires_at) VALUES('r1','a','t1','destacar-perfil',3,'reserved','tool:r1',unixepoch()+86400)")
  c.execute("INSERT INTO credit_ledger(id,user_id,wallet,delta,balance_after,operation_id) VALUES('l1','a','tools',-3,2,'tool:r1')")
  self.assertEqual(c.execute("SELECT tool_credits FROM credit_wallets").fetchone()[0],2)
  # Confirmar: consume la reserva (sin reembolso) y no se puede repetir.
  self.assertEqual(c.execute("UPDATE tool_reservations SET status='confirmed',confirmed_at=unixepoch() WHERE id='r1' AND status='reserved'").rowcount,1)
  self.assertEqual(c.execute("UPDATE tool_reservations SET status='confirmed',confirmed_at=unixepoch() WHERE id='r1' AND status='reserved'").rowcount,0)
  self.assertEqual(c.execute("SELECT tool_credits FROM credit_wallets").fetchone()[0],2)
  # Liberación manual de OTRA reserva: devuelve el crédito una sola vez.
  c.execute("INSERT INTO tool_reservations(id,user_id,tool_id,tool_code,credit_cost,status,operation_id,expires_at) VALUES('r2','a','t2','anuncio-recorrido',2,'reserved','tool:r2',unixepoch()+86400)")
  self.assertEqual(c.execute("UPDATE tool_reservations SET status='released',released_at=unixepoch() WHERE id='r2' AND status='reserved'").rowcount,1)
  self.assertEqual(c.execute("UPDATE tool_reservations SET status='released',released_at=unixepoch() WHERE id='r2' AND status='reserved'").rowcount,0)
  c.execute("INSERT INTO credit_ledger(id,user_id,wallet,delta,balance_after,operation_id) VALUES('l2','a','tools',2,4,'tool-release:tool:r2')")
  c.execute("UPDATE credit_wallets SET tool_credits=tool_credits+2 WHERE user_id='a'")
  self.assertEqual(c.execute("SELECT tool_credits FROM credit_wallets").fetchone()[0],4)
  # El ledger cuadra: -3 (reserva) +2 (liberación) = -1 neto; 5-3+2=4.
  self.assertEqual(c.execute("SELECT sum(delta) FROM credit_ledger WHERE wallet='tools'").fetchone()[0],-1)
  # Estado inválido y operación duplicada rechazados por el esquema.
  with self.assertRaises(sqlite3.IntegrityError):c.execute("INSERT INTO tool_reservations(id,user_id,tool_id,tool_code,credit_cost,status,operation_id,expires_at) VALUES('r3','a','t1','x',3,'otro','tool:r3',0)")
  with self.assertRaises(sqlite3.IntegrityError):c.execute("INSERT INTO tool_reservations(id,user_id,tool_id,tool_code,credit_cost,status,operation_id,expires_at) VALUES('r4','a','t1','x',3,'reserved','tool:r1',0)")
  c.close()
 def test_delivery_otp_constraints(self):
  c=sqlite3.connect(':memory:')
  for p in sorted((ROOT/'database/shard/migrations').glob('*.sql')):c.executescript(p.read_text())
  c.execute("INSERT INTO courier_profiles(user_id,slug) VALUES('k','k')")
  c.execute("INSERT INTO delivery_verifications(id,courier_id,client_id,code_hash,expires_at,attempts) VALUES('d1','k','cli','abc',unixepoch()+86400,0)")
  self.assertEqual(c.execute("SELECT count(*) FROM delivery_verifications WHERE client_id='cli'").fetchone()[0],1)
  # Reemplazo del código pendiente previo (misma pareja mensajero·cliente).
  c.execute("DELETE FROM delivery_verifications WHERE courier_id='k' AND client_id='cli' AND confirmed_at IS NULL")
  c.execute("INSERT INTO delivery_verifications(id,courier_id,client_id,code_hash,expires_at,attempts) VALUES('d2','k','cli','def',unixepoch()+86400,0)")
  self.assertEqual(c.execute("SELECT count(*) FROM delivery_verifications").fetchone()[0],1)
  c.close()
 def test_geographic_consolidation_views(self):
  d=tempfile.TemporaryDirectory();p=d.name+'/db';c=setup(p)
  # Tras 0006, geographic_* son vistas sobre el catálogo oficial único.
  self.assertEqual(c.execute("SELECT type FROM sqlite_master WHERE name='geographic_provinces'").fetchone()[0],'view')
  self.assertEqual(c.execute("SELECT type FROM sqlite_master WHERE name='geographic_municipalities'").fetchone()[0],'view')
  self.assertEqual(c.execute("SELECT count(*) FROM Province").fetchone()[0],16)
  self.assertEqual(c.execute("SELECT count(*) FROM Municipality").fetchone()[0],168)
  self.assertEqual(c.execute("SELECT count(*) FROM geographic_municipalities").fetchone()[0],168)
  prov=c.execute("SELECT id FROM Province LIMIT 1").fetchone()[0]
  self.assertEqual(c.execute("SELECT count(*) FROM geographic_municipalities WHERE province_id=?",(prov,)).fetchone()[0],
                   c.execute("SELECT count(*) FROM Municipality WHERE provinceId=?",(prov,)).fetchone()[0])
  c.close();d.cleanup()
if __name__=='__main__':unittest.main()
