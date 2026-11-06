"""Refresh measured Cloudflare D1 file sizes; stale metrics fail allocation closed."""
import os,json,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[1]
env=dict(line.split('=',1) for line in (root/'.env').read_text().splitlines() if '=' in line)
state=json.loads((root/'.infrastructure.json').read_text())
base=f"https://api.cloudflare.com/client/v4/accounts/{state['account_id']}/d1/database"
def api(url,body=None):
 req=urllib.request.Request(url,data=json.dumps(body).encode() if body else None,headers={'Authorization':'Bearer '+env['CLOUDFLARE_API_TOKEN'],'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=30) as r:data=json.load(r)
 if not data.get('success'):raise RuntimeError('Cloudflare API failure')
 return data['result']
for i,d in enumerate(state['databases'][1:],1):
 info=api(base+'/'+d['uuid'])
 size=info.get('file_size')
 if not isinstance(size,int):raise RuntimeError('No real file_size metric returned')
 api(base+'/'+state['databases'][0]['uuid']+'/query',{'sql':'''INSERT INTO shard_registry(shard_id,binding,enabled,size_bytes,measured_at)
 VALUES(?,?,1,?,unixepoch()) ON CONFLICT(shard_id) DO UPDATE SET size_bytes=excluded.size_bytes,measured_at=excluded.measured_at''','params':[i,f'D1_SHARD_{i:02}',size]})
 print(d['name'],size,'bytes')
