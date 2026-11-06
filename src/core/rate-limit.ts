import {ApiError,type Env} from './env';
export async function rateLimit(env:Env,identity:string,now=Math.floor(Date.now()/1000)) {
 const window=Math.floor(now/60),bucket=`${window}:${identity}`;
 const row=await env.D1_CORE.prepare(`INSERT INTO rate_limit_buckets(bucket,hits,reset_at) VALUES(?,1,?)
 ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 RETURNING hits`).bind(bucket,(window+1)*60).first<{hits:number}>();
 if(!row||row.hits>90) throw new ApiError('RATE_LIMITED',429);
 // Bounded retention cleanup; never used to settle financial credits.
 if(row.hits===1) await env.D1_CORE.prepare('DELETE FROM rate_limit_buckets WHERE bucket IN (SELECT bucket FROM rate_limit_buckets WHERE reset_at<? LIMIT 100)').bind(now-3600).run();
}
