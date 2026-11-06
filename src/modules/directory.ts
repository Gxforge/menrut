import {ApiError,type Env,shard} from '../core/env';
export async function directory(env:Env,url:URL) {
 const cursor=url.searchParams.get('cursor')||'';
 const province=url.searchParams.get('province')||null;
 const municipality=url.searchParams.get('municipality')||null;
 if(cursor.length>80) throw new ApiError('VALIDATION_ERROR');
 const n=Number(url.searchParams.get('limit')||20);
 if(!Number.isInteger(n)||n<1||n>40) throw new ApiError('VALIDATION_ERROR');
 const rows=await env.D1_CORE.prepare(`SELECT user_id,slug,name,description,province_id,
 municipality_id,photo_path,available,rating_sum,review_count FROM public_courier_directory
 WHERE visible=1 AND expires_at>unixepoch() AND user_id>?
 AND (? IS NULL OR province_id=?) AND (? IS NULL OR municipality_id=?)
 ORDER BY user_id LIMIT ?`).bind(cursor,province,province,municipality,municipality,n+1).all();
 const items=rows.results.slice(0,n);
 return {items,next_cursor:rows.results.length>n ? items[items.length-1].user_id : null};
}
export async function publicProfile(env:Env,slug:string) {
 const row=await env.D1_CORE.prepare(`SELECT d.user_id,m.shard_id FROM public_courier_directory d
 JOIN courier_shard_map m USING(user_id) WHERE d.slug=? AND d.visible=1 AND d.expires_at>unixepoch()`)
 .bind(slug).first<{user_id:string,shard_id:number}>();
 if(!row) throw new ApiError('NOT_FOUND',404);
 return shard(env,row.shard_id).prepare(`SELECT p.user_id,p.slug,p.name,p.description,p.province_id,
 p.municipality_id,p.photo_path,p.available,CASE WHEN p.public_phone=1 THEN p.contact_phone ELSE NULL END AS contact_phone
 FROM courier_profiles p JOIN credit_wallets w USING(user_id)
 WHERE p.user_id=? AND p.visible=1 AND w.expires_at>unixepoch()`)
 .bind(row.user_id).first();
}
