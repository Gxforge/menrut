import {z} from 'zod';
import {ApiError,type Env} from '../core/env';
import {syncDirectory} from './sync';
const schema=z.object({path:z.string().max(160),consent:z.literal(true)}).strict();
export async function updatePhoto(env:Env,db:D1Database,uid:string,body:unknown){
 const parsed=schema.safeParse(body);
 if(!parsed.success)throw new ApiError('VALIDATION_ERROR');
 const path=parsed.data.path;
 const filename=path.split('/');
 if(filename.length!==3||filename[0]!==uid||filename[1]!=='avatar'||!/^[-0-9a-f]{36}\.webp$/.test(filename[2]))throw new ApiError('FORBIDDEN',403);
 const url=`${env.SUPABASE_URL}/storage/v1/object/public/courier-public/${path}`;
 const object=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(10000)});
 const length=Number(object.headers.get('Content-Length'));
 if(!object.ok||!object.headers.get('Content-Type')?.startsWith('image/webp')||!Number.isFinite(length)||length<=0||length>512000)throw new ApiError('VALIDATION_ERROR');
 await db.batch([
 db.prepare('UPDATE courier_profiles SET photo_path=?,version=version+1,updated_at=unixepoch() WHERE user_id=?').bind(path,uid),
 db.prepare(`INSERT INTO shard_outbox(id,user_id,version) SELECT user_id||':'||version,user_id,version FROM courier_profiles WHERE user_id=?`).bind(uid)
 ]);
 try{await syncDirectory(env,db,uid);return {saved:true,sync:'completed'};}
 catch{return {saved:true,sync:'pending'};}
}
