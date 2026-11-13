"""Configure the single primary Auth project and Storage; never logs keys."""
import json,secrets,urllib.request,urllib.error
from pathlib import Path
root=Path(__file__).resolve().parents[1]
env=dict(l.split('=',1) for l in (root/'.env').read_text().splitlines() if '=' in l)
ref='rblwyhtjfqvdymetgyya'
def api(path,method='GET',body=None):
 req=urllib.request.Request('https://api.supabase.com/v1/'+path,method=method,headers={'Authorization':'Bearer '+env['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json'},data=json.dumps(body).encode() if body is not None else None)
 try:
  with urllib.request.urlopen(req,timeout=60) as r:return json.load(r)
 except urllib.error.HTTPError as e:raise RuntimeError('Supabase HTTP '+str(e.code)) from None
api(f'projects/{ref}/config/auth','PATCH',{'site_url':'https://menrut.pages.dev','uri_allow_list':'https://menrut.pages.dev/cuenta','mailer_autoconfirm':False})
print('Auth: URL de producción y retorno configurados; confirmación de correo conservada.')
result=api(f'projects/{ref}/database/query','POST',{'query':(root/'supabase/storage-policies.sql').read_text()})
print('Storage: buckets y políticas aplicadas.')
if not env.get('TRIAL_HMAC_SECRET'):
 with (root/'.env').open('a') as f:f.write('TRIAL_HMAC_SECRET='+secrets.token_urlsafe(48)+'\n')
(root/'.env').chmod(0o600)
print('Secreto HMAC privado preparado, sin publicar.')
