import {verifyIdentity} from './tokens';
import {createRemoteJWKSet,type JWTPayload} from 'jose';
import {ApiError,type Env} from './env';
const keys = new Map<string,ReturnType<typeof createRemoteJWKSet>>();
export async function authenticate(request: Request,env: Env): Promise<JWTPayload & {sub:string}> {
 const token = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1];
 if (!token) throw new ApiError('UNAUTHENTICATED',401);
 if (!env.SUPABASE_URL) throw new ApiError('AUTH_NOT_CONFIGURED',503);
 const issuer = `${env.SUPABASE_URL}/auth/v1`;
 let jwks = keys.get(issuer);
 if (!jwks) {jwks=createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`),{cacheMaxAge:600000});keys.set(issuer,jwks);}
 try {
  const payload=await verifyIdentity(token,jwks,issuer);
  const account=await env.D1_CORE.prepare('SELECT status FROM global_accounts WHERE user_id=?').bind(payload.sub).first<{status:string}>();
  if (account && ['suspended','deleted'].includes(account.status)) throw new ApiError('FORBIDDEN',403);
  return payload as JWTPayload & {sub:string};
 } catch(e) {if(e instanceof ApiError) throw e;throw new ApiError('UNAUTHENTICATED',401);}
}
export async function permission(env:Env,uid:string,action:string) {
 // 'owner' = propietario único con autoridad total; '*' = comodín; los moderadores
 // solo reciben permisos específicos (p.ej. 'payments.review') sin acceso a configuración.
 const row=await env.D1_CORE.prepare("SELECT 1 FROM admin_permissions WHERE user_id=? AND (permission='owner' OR permission='*' OR permission=?)").bind(uid,action).first();
 if (!row) throw new ApiError('FORBIDDEN',403);
}
export async function hmac(secret:string,value:string) {
 const enc=new TextEncoder();
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
}
