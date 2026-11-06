"""Explicit smoke test: ephemeral Auth identity + local D1, never production D1.
The temporary Supabase user and test avatar are removed in finally.
"""
import json,secrets,urllib.request,urllib.error,uuid,io,subprocess
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
CONFIG=dict(line.split('=',1) for line in (ROOT/'web/.env.local').read_text().splitlines() if '=' in line)
KEYS=json.loads((ROOT/'.supabase-keys.json').read_text())
SERVICE=next(k['api_key'] for k in KEYS if k['name']=='service_role')
PUBLIC=CONFIG['VITE_SUPABASE_PUBLISHABLE_KEY'];URL=CONFIG['VITE_SUPABASE_URL']
def request(url,method='GET',body=None,token=None,key=PUBLIC,mime='application/json'):
 headers={'apikey':key,'Content-Type':mime}
 if token:headers['Authorization']='Bearer '+token
 data=body if isinstance(body,bytes) else json.dumps(body).encode() if body is not None else None
 try:
  with urllib.request.urlopen(urllib.request.Request(url,method=method,data=data,headers=headers),timeout=30) as r:
   raw=r.read()
   try:return r.status,json.loads(raw)
   except:return r.status,{}
 except urllib.error.HTTPError as e:
  try:data=json.load(e)
  except:data={}
  return e.code,data
uid=None;path=None;token=None
try:
 email=f'menrut-smoke-{uuid.uuid4().hex}@example.com';password=secrets.token_urlsafe(28)
 status,user=request(URL+'/auth/v1/admin/users','POST',{'email':email,'password':password,'email_confirm':True,'app_metadata':{'menrut_smoke_test':True}},SERVICE,SERVICE)
 assert status in (200,201),('create-user',status)
 uid=user['id']
 status,session=request(URL+'/auth/v1/token?grant_type=password','POST',{'email':email,'password':password})
 assert status==200,('login',status);token=session['access_token']
 def local(path,method='GET',body=None):return request('http://127.0.0.1:8788/api/v1'+path,method,body,token)
 status,result=local('/me');assert status==200 and result['data']['user_id']==uid,('JWT JWKS',status)
 print('PASS: Auth real → JWT ES256 → backend local verificado')
 response=subprocess.run(['curl','--silent','--show-error','--config','-','--url','https://menrut.pages.dev/api/v1/me'],input='header = "Authorization: Bearer '+token+'"\n',text=True,capture_output=True,check=True)
 cloud=json.loads(response.stdout)
 assert cloud.get('data',{}).get('user_id')==uid,('Cloudflare JWT identity rejected',cloud.get('error'))
 print('PASS: JWT real validado en Pages desplegado (solo lectura de /me; sin datos D1 de producción)')
 for _ in range(2):
  status,result=local('/onboarding/courier','POST',{})
  assert status==200,('onboarding',status,result)
 status,result=local('/credits/wallets');assert status==200 and result['data']['tool_credits']==0 and result['data']['permanence_seconds']==0
 print('PASS: onboarding repetido, sin duplicación ni prueba no verificada')
 status,result=local('/courier/profile','PUT',{'name':'Prueba técnica temporal','description':'Cuenta de prueba local, no publicada.','province_id':None,'municipality_id':None,'available':True,'public_phone':False,'contact_phone':'+5355555555'})
 assert status==200,('profile',status,result)
 print('PASS: edición de perfil con sesión real')
 img=Image.new('RGB',(8,8),(25,100,100));buf=io.BytesIO();img.save(buf,format='WEBP');image=buf.getvalue()
 path=f'{uid}/avatar/{uuid.uuid4()}.webp'
 status,_=request(URL+'/storage/v1/object/courier-public/'+path,'POST',image,token,mime='image/webp')
 assert status in (200,201),('storage upload',status)
 status,result=local('/courier/photo','PUT',{'path':path,'consent':True})
 assert status==200,('photo metadata',status,result)
 print('PASS: avatar público optimizado, propiedad validada y enlace en D1 local')
 other=f'{uuid.uuid4()}/avatar/{uuid.uuid4()}.webp'
 status,_=request(URL+'/storage/v1/object/courier-public/'+other,'POST',image,token,mime='image/webp')
 assert status>=400,('cross-owner upload should fail',status)
 status,_=request(URL+'/storage/v1/object/payment-proofs-private/'+f'{uid}/test.webp','POST',image,token,mime='image/webp')
 assert status>=400,('private proof unauthorized upload should fail',status)
 status,_=local('/courier/photo','PUT',{'path':other,'consent':True});assert status==403
 status,_=local('/admin/shards');assert status==403
 print('PASS: upload ajeno, comprobante sin autorización y privilegios admin rechazados')
finally:
 if path and token:
  status,_=request(URL+'/storage/v1/object/courier-public','DELETE',{'prefixes':[path]},token)
  print('Limpieza avatar temporal:',status)
 if uid:
  status,_=request(URL+'/auth/v1/admin/users/'+uid,'DELETE',None,SERVICE,SERVICE)
  print('Limpieza usuario temporal:',status)
