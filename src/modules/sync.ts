import type {Env} from '../core/env';
export async function syncDirectory(env:Env,db:D1Database,uid:string) {
 const p=await db.prepare(`SELECT p.*,w.expires_at FROM courier_profiles p
 JOIN credit_wallets w USING(user_id) WHERE p.user_id=?`).bind(uid).first<Record<string,string|number|null>>();
 if (!p) return;
 const event=`profile:${uid}:${p.version}`;
 // Version guard prevents an older request from reverting the public projection.
 await env.D1_CORE.batch([
 env.D1_CORE.prepare(`INSERT INTO public_courier_directory
 (user_id,slug,name,description,province_id,municipality_id,photo_path,available,visible,expires_at,version,updated_at)
 VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET
 name=excluded.name,description=excluded.description,province_id=excluded.province_id,
 municipality_id=excluded.municipality_id,photo_path=excluded.photo_path,
 available=excluded.available,visible=excluded.visible,expires_at=excluded.expires_at,
 version=excluded.version,updated_at=excluded.updated_at
 WHERE excluded.version>public_courier_directory.version`)
 .bind(uid,p.slug,p.name,p.description,p.province_id,p.municipality_id,p.photo_path,p.available,p.visible,p.expires_at,p.version,p.updated_at),
 env.D1_CORE.prepare('INSERT OR IGNORE INTO sync_inbox(event_id) VALUES(?)').bind(event)
 ]);
 await db.prepare('UPDATE shard_outbox SET processed_at=unixepoch() WHERE user_id=? AND version<=? AND processed_at IS NULL').bind(uid,p.version).run();
}
