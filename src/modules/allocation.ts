import {ApiError,type Env,shard} from '../core/env';
export const allocationSQL=`INSERT INTO courier_shard_map(user_id,shard_id)
 SELECT ?,s.shard_id FROM shard_registry s,allocation_state a
 WHERE a.id=1 AND s.enabled=1 AND s.measured_at IS NOT NULL
 -- Ventana de frescura de 30 días: sin mediciones recientes NO se cierra el alta
 -- completa (un mensajero no puede quedarse sin registrarse porque falte una
 -- medición manual); con 500 MB de cuota y tamaños reales de KB es seguro.
 AND s.measured_at>=unixepoch()-2592000 AND s.size_bytes<s.capacity_bytes*0.95
 AND NOT EXISTS(SELECT 1 FROM courier_shard_map WHERE user_id=?)
 ORDER BY CASE WHEN s.shard_id>a.last_shard THEN 0 ELSE 1 END,s.shard_id
 LIMIT 1 ON CONFLICT(user_id) DO NOTHING`;
export async function allocate(env:Env,uid:string) {
 await env.D1_CORE.prepare(allocationSQL).bind(uid,uid).run();
 const row=await env.D1_CORE.prepare('SELECT shard_id FROM courier_shard_map WHERE user_id=?').bind(uid).first<{shard_id:number}>();
 if(!row) throw new ApiError('SHARD_CAPACITY_REACHED',503);
 return shard(env,row.shard_id);
}
