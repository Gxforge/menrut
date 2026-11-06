import json,urllib.request,urllib.error
from pathlib import Path
root=Path('/home/user/menrut'); env=dict(x.split('=',1) for x in (root/'.env').read_text().splitlines())
a=json.loads((root/'.access.json').read_text());account=a['cloudflare']['data']['result'][0]['id']
def api(url,token,method='GET',body=None):
 req=urllib.request.Request(url,data=json.dumps(body).encode() if body is not None else None,headers={'Authorization':'Bearer '+token,'User-Agent':'MenRut','Content-Type':'application/json'},method=method)
 try:
  with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)
 except urllib.error.HTTPError as e:
  print('HTTP',e.code,url);return {}
gh=env['GITHUB_TOKEN']; cf=env['CLOUDFLARE_API_TOKEN']
repo=api('https://api.github.com/repos/Gxforge/menrut',gh)
if not repo.get('id'):repo=api('https://api.github.com/user/repos',gh,'POST',{'name':'menrut','private':True,'description':'MenRut · Plataforma de mensajeros de Cuba. Flutter, Cloudflare D1 y Supabase Auth/Storage.'})
print('Repositorio:',repo.get('html_url'))
base=f'https://api.cloudflare.com/client/v4/accounts/{account}'
existing=api(base+'/d1/database',cf).get('result',[])
dbs=[]
for name in ['menrut-core','menrut-shard-01','menrut-shard-02']:
 db=next((d for d in existing if d['name']==name),None)
 if db is None:db=api(base+'/d1/database',cf,'POST',{'name':name}).get('result')
 if db:dbs.append(db);print('D1:',db['name'],db['uuid'])
state={'repo':repo.get('html_url'),'account_id':account,'databases':dbs}
(root/'.infrastructure.json').write_text(json.dumps(state));(root/'.infrastructure.json').chmod(0o600)
