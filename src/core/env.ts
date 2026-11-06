export interface Env {
 D1_CORE: D1Database;
 D1_SHARD_01: D1Database;
 D1_SHARD_02: D1Database;
 SUPABASE_URL: string;
 ALLOWED_ORIGIN: string;
 TRIAL_HMAC_SECRET: string;
 [key: `D1_SHARD_${string}`]: D1Database | undefined;
}
export class ApiError extends Error {
 constructor(public code: string, public status = 400) { super(code); }
}
export function shard(env: Env, id: number): D1Database {
 const db = env[`D1_SHARD_${String(id).padStart(2,'0')}`];
 if (!db) throw new ApiError('SHARD_UNAVAILABLE',503);
 return db;
}
export async function ownShard(env: Env, uid: string) {
 const map = await env.D1_CORE.prepare('SELECT shard_id FROM courier_shard_map WHERE user_id=?')
 .bind(uid).first<{shard_id:number}>();
 if (!map) throw new ApiError('NOT_FOUND',404);
 return shard(env,map.shard_id);
}
