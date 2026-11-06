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
if __name__=='__main__':unittest.main()
