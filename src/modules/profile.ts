import {z} from 'zod';
import {ApiError,type Env} from '../core/env';
import {syncDirectory} from './sync';
const schema=z.object({name:z.string().trim().min(2).max(80),description:z.string().max(1200),
 province_id:z.string().max(30).nullable(),municipality_id:z.string().max(30).nullable(),
 available:z.boolean(),public_phone:z.boolean(),contact_phone:z.string().max(24).nullable()}).strict();
export async function updateProfile(env:Env,db:D1Database,uid:string,body:unknown) {
 const parsed=schema.safeParse(body);
 if(!parsed.success) throw new ApiError('VALIDATION_ERROR');
 const p=parsed.data;
 if(p.province_id && !await env.D1_CORE.prepare('SELECT 1 FROM geographic_provinces WHERE id=?').bind(p.province_id).first()) throw new ApiError('VALIDATION_ERROR');
 if(p.municipality_id && !await env.D1_CORE.prepare('SELECT 1 FROM geographic_municipalities WHERE id=? AND province_id=?').bind(p.municipality_id,p.province_id).first()) throw new ApiError('VALIDATION_ERROR');
 await db.batch([
 db.prepare(`UPDATE courier_profiles SET name=?,description=?,province_id=?,municipality_id=?,
 available=?,public_phone=?,contact_phone=?,version=version+1,updated_at=unixepoch() WHERE user_id=?`)
 .bind(p.name,p.description,p.province_id,p.municipality_id,Number(p.available),Number(p.public_phone),p.contact_phone,uid),
 db.prepare(`INSERT INTO shard_outbox(id,user_id,version) SELECT user_id||':'||version,user_id,version
 FROM courier_profiles WHERE user_id=?`).bind(uid)
 ]);
 try {await syncDirectory(env,db,uid);return {saved:true,sync:'completed'};}
 catch {return {saved:true,sync:'pending'};}
}
