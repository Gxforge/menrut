import json,re,urllib.request,urllib.error,os
from pathlib import Path
lines=[x.strip() for x in Path('/home/user/uploads/tokens.txt').read_text().splitlines() if x.strip()]
tokens={'GITHUB_TOKEN':next(x for x in lines if x.startswith(('ghp_','github_pat_'))),'SUPABASE_ACCESS_TOKEN':next(x for x in lines if x.startswith('sbp_'))}
other=next(x for x in lines if not x.startswith(('ghp_','github_pat_','sbp_')))
tokens['CLOUDFLARE_API_TOKEN']=other.split('=',1)[-1].strip().strip('"\'') if '=' in other else other
p=Path('/home/user/menrut/.env'); p.write_text('\n'.join(k+'='+v for k,v in tokens.items())+'\n'); p.chmod(0o600)
def req(url,token):
 try:
  r=urllib.request.urlopen(urllib.request.Request(url,headers={'Authorization':'Bearer '+token,'User-Agent':'MenRut-Setup','Accept':'application/json'}),timeout=25)
  return r.status,json.load(r)
 except urllib.error.HTTPError as e:return e.code,{}
checks=[('github','https://api.github.com/user','GITHUB_TOKEN'),('supabase','https://api.supabase.com/v1/projects','SUPABASE_ACCESS_TOKEN'),('cloudflare','https://api.cloudflare.com/client/v4/accounts','CLOUDFLARE_API_TOKEN')]
results={}
for name,url,key in checks:
 status,data=req(url,tokens[key]);results[name]={'status':status,'data':data};print(name,status)
 if status==200:
  if name=='github':print('usuario:',data.get('login'))
  elif name=='supabase':print('proyectos:',[{k:x.get(k) for k in ['id','name','organization_id','status']} for x in data])
  else:print('cuentas:',[{k:x.get(k) for k in ['id','name']} for x in data.get('result',[])])
Path('/home/user/menrut/.access.json').write_text(json.dumps(results));Path('/home/user/menrut/.access.json').chmod(0o600)
