import {z} from 'zod';
import {ApiError,type Env,ownShard} from '../core/env';
import {syncDirectory} from './sync';
import {settle,SECONDS_PER_CREDIT} from './credits';

interface PlanRow {id:string;name:string;level:number;duration_days:number;permanence_credits:number;tool_credits:number;price_minor:number;active:number;}
interface RequestRow {id:string;user_id:string;plan_id:string;status:string;price_minor:number;permanence_credits:number;tool_credits:number;proof_path:string|null;created_at:number;}

// Instrucciones de pago (requiere sesión; no se publican sin autenticar).
export async function paymentSettings(env:Env) {
 const rows=(await env.D1_CORE.prepare(`SELECT key,value FROM system_settings
  WHERE key IN ('payment_method','payment_card','payment_phone','payment_note')`).all()).results as {key:string;value:string}[];
 const map=Object.fromEntries(rows.map(r=>[r.key,r.value]));
 return {method:map.payment_method??'Transfermóvil',card:map.payment_card??'',phone:map.payment_phone??'',note:map.payment_note??''};
}

// El mensajero elige un plan y abre una solicitud en borrador (aún sin captura).
export async function createRequest(env:Env,uid:string,body:unknown) {
 const parsed=z.object({plan_id:z.string().min(1).max(40)}).strict().safeParse(body);
 if(!parsed.success)throw new ApiError('VALIDATION_ERROR');
 const plan=await env.D1_CORE.prepare('SELECT * FROM plans WHERE id=? AND active=1').bind(parsed.data.plan_id).first<PlanRow>();
 if(!plan)throw new ApiError('NOT_FOUND',404);
 await ownShard(env,uid); // solo perfiles de mensajero activos pueden pagar
 const open=await env.D1_CORE.prepare(`SELECT 1 FROM payment_requests
  WHERE user_id=? AND status IN ('draft','pending','under_review')`).bind(uid).first();
 if(open)throw new ApiError('PAYMENT_REQUEST_EXISTS',409);
 const id=`pay_${crypto.randomUUID().replace(/-/g,'').slice(0,20)}`;
 await env.D1_CORE.prepare(`INSERT INTO payment_requests
  (id,user_id,plan_id,status,price_minor,permanence_credits,tool_credits)
  VALUES(?,?,?,'draft',?,?,?)`).bind(id,uid,plan.id,plan.price_minor,plan.permanence_credits,plan.tool_credits).run();
 return {id,plan_id:plan.id,plan_name:plan.name,price_minor:plan.price_minor,status:'draft'};
}

// Sube la captura del pago: valida la ruta del objeto en Storage y pasa a pending.
export async function attachProof(env:Env,uid:string,id:string,body:unknown) {
 const parsed=z.object({proof_path:z.string().max(160),consent:z.literal(true)}).strict().safeParse(body);
 if(!parsed.success)throw new ApiError('VALIDATION_ERROR');
 const req=await env.D1_CORE.prepare('SELECT id,status FROM payment_requests WHERE id=? AND user_id=?').bind(id,uid).first<{id:string;status:string}>();
 if(!req)throw new ApiError('NOT_FOUND',404);
 if(!['draft','pending'].includes(req.status))throw new ApiError('VALIDATION_ERROR');
 const path=parsed.data.proof_path,name=path.split('/');
 if(name.length!==3||name[0]!==uid||name[1]!=='payments'||!/^[-0-9a-f]{36}\.webp$/.test(name[2]))throw new ApiError('FORBIDDEN',403);
 const object=await fetch(`${env.SUPABASE_URL}/storage/v1/object/public/courier-public/${path}`,{method:'HEAD',signal:AbortSignal.timeout(10000)});
 const length=Number(object.headers.get('Content-Length'));
 if(!object.ok||!object.headers.get('Content-Type')?.startsWith('image/webp')||!Number.isFinite(length)||length<=0||length>768000)throw new ApiError('VALIDATION_ERROR');
 await env.D1_CORE.prepare(`UPDATE payment_requests SET proof_path=?,status='pending' WHERE id=? AND user_id=?`).bind(path,id,uid).run();
 return {status:'pending'};
}

export async function myRequests(env:Env,uid:string) {
 return (await env.D1_CORE.prepare(`SELECT r.id,r.plan_id,r.status,r.price_minor,r.permanence_credits,r.tool_credits,
  r.proof_path,r.created_at,r.confirmed_amount_minor,r.decided_at,r.decision_note,
  p.name AS plan_name,p.level AS plan_level,p.duration_days
  FROM payment_requests r JOIN plans p ON p.id=r.plan_id
  WHERE r.user_id=? ORDER BY r.created_at DESC LIMIT 50`).bind(uid).all()).results;
}

export async function cancelRequest(env:Env,uid:string,id:string) {
 const res=await env.D1_CORE.prepare(`UPDATE payment_requests SET status='cancelled'
  WHERE id=? AND user_id=? AND status IN ('draft','pending')`).bind(id,uid).run();
 if(!res.meta.changes)throw new ApiError('NOT_FOUND',404);
 return {status:'cancelled'};
}

// Cola del propietario/moderadores: solicitudes con plan y nombre público del mensajero.
export async function adminList(env:Env,url:URL) {
 const status=url.searchParams.get('status')||'pending';
 if(!['draft','pending','under_review','approved','rejected','cancelled','credited','all'].includes(status))throw new ApiError('VALIDATION_ERROR');
 const stmt=status==='all'
  ?`SELECT r.id,r.user_id,r.plan_id,r.status,r.price_minor,r.permanence_credits,r.tool_credits,r.proof_path,
    r.created_at,r.confirmed_amount_minor,r.decided_at,r.decided_by,r.decision_note,
    p.name AS plan_name,p.level AS plan_level,p.duration_days,d.slug,d.name AS courier_name
    FROM payment_requests r JOIN plans p ON p.id=r.plan_id
    LEFT JOIN public_courier_directory d ON d.user_id=r.user_id
    ORDER BY r.created_at DESC LIMIT 100`
  :`SELECT r.id,r.user_id,r.plan_id,r.status,r.price_minor,r.permanence_credits,r.tool_credits,r.proof_path,
    r.created_at,r.confirmed_amount_minor,r.decided_at,r.decided_by,r.decision_note,
    p.name AS plan_name,p.level AS plan_level,p.duration_days,d.slug,d.name AS courier_name
    FROM payment_requests r JOIN plans p ON p.id=r.plan_id
    LEFT JOIN public_courier_directory d ON d.user_id=r.user_id
    WHERE r.status=? ORDER BY r.created_at DESC LIMIT 100`;
 const bound=status==='all'?env.D1_CORE.prepare(stmt):env.D1_CORE.prepare(stmt).bind(status);
 const rows=(await bound.all()).results as (Record<string,unknown> & {proof_path:string|null})[];
 for(const row of rows) row.proof_url=row.proof_path?`${env.SUPABASE_URL}/storage/v1/object/public/courier-public/${row.proof_path}`:null;
 return rows;
}

// Decisión del propietario: confirmar monto y acreditar, o rechazar con nota.
export async function adminDecide(env:Env,uid:string,id:string,body:unknown) {
 const parsed=z.object({decision:z.enum(['approved','rejected']),
  confirmed_amount_minor:z.number().int().min(0).max(100000000).optional(),
  note:z.string().max(500).optional()}).strict().safeParse(body);
 if(!parsed.success)throw new ApiError('VALIDATION_ERROR');
 const {decision}=parsed.data;
 if(decision==='approved'&&!parsed.data.confirmed_amount_minor)throw new ApiError('VALIDATION_ERROR');
 if(decision==='rejected'&&!parsed.data.note?.trim())throw new ApiError('VALIDATION_ERROR');
 const req=await env.D1_CORE.prepare('SELECT * FROM payment_requests WHERE id=?').bind(id).first<RequestRow>();
 if(!req)throw new ApiError('NOT_FOUND',404);
 if(req.status!=='pending')throw new ApiError('VALIDATION_ERROR');
 const plan=await env.D1_CORE.prepare('SELECT * FROM plans WHERE id=?').bind(req.plan_id).first<PlanRow>();
 if(!plan)throw new ApiError('NOT_FOUND',404);
 const now=Math.floor(Date.now()/1000);
 if(decision==='rejected') {
  const note=parsed.data.note!.trim();
  const res=await env.D1_CORE.prepare(`UPDATE payment_requests SET status='rejected',decided_by=?,decided_at=?,decision_note=?
   WHERE id=? AND status='pending'`).bind(uid,now,note,id).run();
  if(!res.meta.changes)throw new ApiError('VALIDATION_ERROR');
  await audit(env,uid,'payment.rejected',id,`Plan ${plan.name} ${plan.duration_days}d rechazado: ${note}`);
  return {status:'rejected'};
 }
 // Aprobado: el propietario confirmó la captura y el SMS recibido con este monto.
 const amount=parsed.data.confirmed_amount_minor!;
 const db=await ownShard(env,req.user_id);
 const wallet=await settle(db,req.user_id,now) as {permanence_seconds:number;tool_credits:number}|null; // consume el tiempo transcurrido primero (ledger automático)
 if(!wallet)throw new ApiError('NOT_FOUND',404);
 const planSeconds=req.permanence_credits*SECONDS_PER_CREDIT;
 const durationSeconds=plan.duration_days*86400;
 // Suma sin decremento: el trigger de settlement no dispara; el abono se registra a mano.
 // Carry implícito: expires_at=MAX(vigencia_actual,ahora)+duración — renovar antes de vencer acumula.
 await db.batch([
  db.prepare(`UPDATE credit_wallets SET permanence_seconds=permanence_seconds+?,tool_credits=tool_credits+?,
   plan_id=?,expires_at=MAX(expires_at,?)+? WHERE user_id=?`)
   .bind(planSeconds,req.tool_credits,plan.id,now,durationSeconds,req.user_id),
  db.prepare(`INSERT INTO credit_ledger(id,user_id,wallet,delta,balance_after,operation_id) VALUES(?,?,?,?,?,'payment:'||?)`)
   .bind(ledgerId(),req.user_id,'permanence',planSeconds,(wallet.permanence_seconds??0)+planSeconds,id),
  db.prepare(`INSERT INTO credit_ledger(id,user_id,wallet,delta,balance_after,operation_id) VALUES(?,?,?,?,?,'payment:'||?)`)
   .bind(ledgerId(),req.user_id,'tools',req.tool_credits,(wallet.tool_credits??0)+req.tool_credits,id),
  db.prepare('UPDATE courier_profiles SET version=version+1,updated_at=unixepoch() WHERE user_id=?').bind(req.user_id),
  db.prepare(`INSERT OR IGNORE INTO shard_outbox(id,user_id,version) SELECT user_id||':'||version,user_id,version FROM courier_profiles WHERE user_id=?`).bind(req.user_id)
 ]);
 const res=await env.D1_CORE.prepare(`UPDATE payment_requests SET status='credited',confirmed_amount_minor=?,decided_by=?,decided_at=?
  WHERE id=? AND status='pending'`).bind(amount,uid,now,id).run();
 if(!res.meta.changes)throw new ApiError('VALIDATION_ERROR');
 await audit(env,uid,'payment.credited',id,`Plan ${plan.name} ${plan.duration_days}d acreditado; monto confirmado ${(amount/100).toFixed(2)} CUP`);
 try{await syncDirectory(env,db,req.user_id);}catch{/* la sincronización queda pendiente en el outbox */}
 return {status:'credited',plan_id:plan.id,plan_name:plan.name,duration_days:plan.duration_days};
}

async function audit(env:Env,actor:string,action:string,entity:string,reason:string) {
 await env.D1_CORE.prepare(`INSERT INTO audit_logs(id,actor_id,action,entity_id,reason,request_id)
  VALUES(?,?,?,?,?,?)`).bind(`log_${crypto.randomUUID().replace(/-/g,'').slice(0,20)}`,actor,action,entity,reason,crypto.randomUUID()).run();
}
function ledgerId(){return crypto.randomUUID().replace(/-/g,'');}
