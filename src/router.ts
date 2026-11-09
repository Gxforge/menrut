import {ApiError,type Env,ownShard} from './core/env';
import {authenticate,permission} from './core/auth';
import {rateLimit} from './core/rate-limit';
import {onboarding} from './modules/onboarding';
import {directory,publicProfile} from './modules/directory';
import {wallets} from './modules/credits';
import {updateProfile} from './modules/profile';
import {syncDirectory} from './modules/sync';
import {updatePhoto} from './modules/photo';
import {paymentSettings,createRequest,attachProof,myRequests,cancelRequest,adminList,adminDecide} from './modules/payments';
export async function route(request:Request,env:Env):Promise<unknown> {
 const url=new URL(request.url), path=url.pathname.replace('/api/v1',''),method=request.method;
 if(method==='GET'&&path==='/health') return {service:'MenRut',status:'ok',scope:'foundation'};
 await rateLimit(env,request.headers.get('CF-Connecting-IP')||'local');
 if(method==='GET'&&path==='/directory') return directory(env,url);
 if(method==='GET'&&/^\/couriers\/[^/]+$/.test(path)) return publicProfile(env,decodeURIComponent(path.split('/')[2]));
 if(method==='GET'&&path==='/membership/plans') return (await env.D1_CORE.prepare('SELECT * FROM plans WHERE active=1').all()).results;
 if(method==='GET'&&path==='/locations/provinces') return (await env.D1_CORE.prepare('SELECT * FROM geographic_provinces ORDER BY name').all()).results;
 if(method==='GET'&&path==='/locations/municipalities') return (await env.D1_CORE.prepare('SELECT * FROM geographic_municipalities WHERE province_id=? ORDER BY name').bind(url.searchParams.get('province')||'').all()).results;
 const claims=await authenticate(request,env),uid=claims.sub;
 if(method==='GET'&&path==='/me') return {user_id:uid,account:await env.D1_CORE.prepare('SELECT status,created_at FROM global_accounts WHERE user_id=?').bind(uid).first()};
 if(method==='GET'&&path==='/me/roles') return (await env.D1_CORE.prepare('SELECT role FROM user_roles WHERE user_id=?').bind(uid).all()).results;
 if(method==='GET'&&path==='/me/permissions') return (await env.D1_CORE.prepare('SELECT permission FROM admin_permissions WHERE user_id=?').bind(uid).all()).results;
 if(method==='POST'&&path==='/onboarding/courier') return onboarding(env,claims);
 // Flujo de pago Transfermóvil: instrucciones, solicitud, captura y cancelación.
 if(method==='GET'&&path==='/payments/settings') return paymentSettings(env);
 if(method==='POST'&&path==='/payments/requests') return createRequest(env,uid,await request.json());
 if(method==='GET'&&path==='/me/payments') return myRequests(env,uid);
 const payAction=path.match(/^\/payments\/requests\/([A-Za-z0-9_-]+)\/(proof|cancel)$/);
 if(payAction&&method==='POST') return payAction[2]==='proof'
  ?attachProof(env,uid,payAction[1],await request.json())
  :cancelRequest(env,uid,payAction[1]);
 if(path.startsWith('/admin/')) {
  const action=path==='/admin/shards'?'shards.read':path.startsWith('/admin/payments')?'payments.review':'audit.read';
  await permission(env,uid,action);
  if(method==='GET'&&path==='/admin/shards') return (await env.D1_CORE.prepare('SELECT * FROM shard_registry').all()).results;
  if(method==='GET'&&path==='/admin/audit') return (await env.D1_CORE.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50').all()).results;
  if(method==='GET'&&path==='/admin/payments') return adminList(env,url);
  const decision=path.match(/^\/admin\/payments\/([A-Za-z0-9_-]+)\/decision$/);
  if(method==='POST'&&decision) return adminDecide(env,uid,decision[1],await request.json());
  throw new ApiError('NOT_FOUND',404);
 }
 const db=await ownShard(env,uid);
 if(method==='GET'&&path==='/courier/profile') return db.prepare('SELECT * FROM courier_profiles WHERE user_id=?').bind(uid).first();
 if(method==='PUT'&&path==='/courier/photo') return updatePhoto(env,db,uid,await request.json());
 if(method==='PUT'&&path==='/courier/profile') return updateProfile(env,db,uid,await request.json());
 if(method==='GET'&&path==='/credits/wallets') return wallets(db,uid);
 if(method==='GET'&&path==='/credits/ledger') return (await db.prepare('SELECT * FROM credit_ledger WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(uid).all()).results;
 if(method==='POST'&&path==='/courier/sync') {await syncDirectory(env,db,uid);return {synced:true};}
 throw new ApiError('NOT_FOUND',404);
}
