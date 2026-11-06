import type {Env} from '../core/env';
export const SECONDS_PER_CREDIT=8640;
export function remaining(seconds:number,settled:number,now:number) {
 return Math.max(0,seconds-Math.max(0,now-settled));
}
export async function settle(db:D1Database,uid:string,now:number) {
 // One write statement: concurrent requests cannot charge an interval twice.
 await db.prepare(`UPDATE credit_wallets SET
 permanence_seconds=MAX(0,permanence_seconds-MAX(0,?-settled_at)),
 settled_at=MAX(settled_at,?) WHERE user_id=?`).bind(now,now,uid).run();
 return db.prepare('SELECT * FROM credit_wallets WHERE user_id=?').bind(uid).first();
}
export async function wallets(db:D1Database,uid:string) {
 return settle(db,uid,Math.floor(Date.now()/1000));
}
