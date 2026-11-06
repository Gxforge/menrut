import type {JWTPayload} from 'jose';
import {ApiError,type Env} from '../core/env';
import {hmac} from '../core/auth';
import {allocate} from './allocation';
import {syncDirectory} from './sync';
export async function onboarding(env:Env,claims:JWTPayload & {sub:string}) {
 const uid=claims.sub;
 if (!env.TRIAL_HMAC_SECRET) throw new ApiError('TRIAL_NOT_CONFIGURED',503);
 // Only a verified phone or an administrator-approved stable identity enables trial.
 const phone=typeof claims.phone==='string' && claims.phone ? claims.phone : null;
 await env.D1_CORE.batch([
 env.D1_CORE.prepare('INSERT OR IGNORE INTO global_accounts(user_id) VALUES(?)').bind(uid),
 env.D1_CORE.prepare("INSERT OR IGNORE INTO user_roles VALUES(?,'courier')").bind(uid),
 env.D1_CORE.prepare("UPDATE global_accounts SET status='provisioning' WHERE user_id=? AND status='pending'").bind(uid)
 ]);
 const db=await allocate(env,uid);
 if(phone) {
  const identity=await hmac(env.TRIAL_HMAC_SECRET,`phone:${phone}`);
  await env.D1_CORE.prepare('INSERT OR IGNORE INTO trial_claims(identity_hash,user_id) VALUES(?,?)').bind(identity,uid).run();
 }
 const trial=await env.D1_CORE.prepare('SELECT 1 FROM trial_claims WHERE user_id=?').bind(uid).first();
 const now=Math.floor(Date.now()/1000), seconds=trial ? 604800 : 0;
 await db.batch([
 db.prepare('INSERT OR IGNORE INTO courier_profiles(user_id,slug) VALUES(?,?)').bind(uid,uid),
 db.prepare(`INSERT OR IGNORE INTO credit_wallets(user_id,permanence_seconds,settled_at,expires_at)
 VALUES(?,?,?,?)`).bind(uid,seconds,now,now+seconds),
 db.prepare(`INSERT OR IGNORE INTO credit_ledger(id,user_id,wallet,delta,balance_after,operation_id)
 SELECT ?,?,'permanence',permanence_seconds,permanence_seconds,'initial' FROM credit_wallets WHERE user_id=?`)
 .bind(`initial:${uid}`,uid,uid),
 db.prepare('INSERT OR IGNORE INTO shard_outbox(id,user_id,version) VALUES(?,?,1)').bind(`profile:${uid}:1`,uid)
 ]);
 // If sync fails, onboarding remains recoverable and the outbox remains pending.
 await syncDirectory(env,db,uid);
 await env.D1_CORE.batch([
 env.D1_CORE.prepare("UPDATE global_accounts SET status='active' WHERE user_id=?").bind(uid),
 env.D1_CORE.prepare("UPDATE courier_shard_map SET status='active' WHERE user_id=?").bind(uid)
 ]);
 return {status:'active',trial:!!trial,trial_requires_verification:!trial};
}
