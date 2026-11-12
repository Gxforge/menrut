// MENRUT v2 — Privacidad definitiva: eliminación de la propia cuenta.
// DELETE /me {confirm:'BORRAR'} (requiere sesión):
//   · La identidad global queda «deleted» y el perfil de visualización se
//     anonimiza (nombre, correo, teléfono, avatar).
//   · Se eliminan sus datos personales: favoritos, rutas guardadas,
//     notificaciones y sus conversaciones (con sus mensajes).
//   · Si es mensajero: su pasaporte se oculta del directorio (visible=0 en
//     shard y proyección). Cartera y ledger se CONSERVAN (obligación
//     contable; sin datos personales: el user_id es un identificador opaco).
//   · La cuenta de autenticación (Supabase) se elimina con service_role
//     (best-effort: si falla, la cuenta ya está inactiva localmente).
// Todo queda registrado en audit_events.
// Las cuentas de personal (owner/admin/moderator) NO se pueden eliminar: 403 antes de cualquier cambio.
import { asString, audit, HttpError, nowMs, type V2Env } from './core';
import { requireAuth, staffRoleFor } from './identity';
import { assignedShard, syncProjection } from './shard';

/** ─── DELETE /me — eliminar mi cuenta ──────────────────────────────────── */
export async function deleteMe(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const confirm = asString(body.confirm) ?? '';
  if (confirm !== 'BORRAR') {
    throw new HttpError(400, 'Confirmación requerida: escribe BORRAR para eliminar tu cuenta.');
  }
  // Cuentas de personal (propietario, administración, moderación): no se pueden eliminar.
  // La comprobación va antes de cualquier cambio. Se aplica por rol de la base y por las listas del entorno.
  if (staffRoleFor(env, user.email) || ['owner', 'admin', 'moderator'].includes(user.role)) {
    throw new HttpError(403, 'Las cuentas de propietario, administración y moderación no se pueden eliminar.');
  }
  const db = env.D1_CORE;
  const nowSec = Math.floor(nowMs() / 1000);

  // 1) Si es mensajero: ocultar pasaporte del directorio (shard + proyección).
  if (user.role === 'courier') {
    const shard = await assignedShard(env, user.id);
    if (shard) {
      await shard.db
        .prepare("UPDATE courier_profiles SET visible=0, highlighted_until=0, updated_at=unixepoch() WHERE user_id=?")
        .bind(user.id)
        .run();
      await syncProjection(env, user.id).catch(() => null);
    }
  }
  // La proyección también se oculta directamente (versión guardada puede
  // impedir la actualización si el perfil del shard no versionó).
  await db.prepare('UPDATE public_courier_directory SET visible=0, highlighted_until=0 WHERE user_id=?').bind(user.id).run();

  // 2) Anonimizar identidad + borrar datos personales (transacción CORE).
  await db.batch([
    db.prepare("UPDATE global_accounts SET status='deleted' WHERE user_id=?").bind(user.id),
    db
      .prepare("UPDATE account_profiles SET full_name='Cuenta eliminada', email='', phone=NULL, avatar_path=NULL, updated_at=? WHERE user_id=?")
      .bind(nowSec, user.id),
    db.prepare('DELETE FROM favorites WHERE user_id=?').bind(user.id),
    db.prepare('DELETE FROM saved_routes WHERE user_id=?').bind(user.id),
    db.prepare('DELETE FROM notifications WHERE user_id=?').bind(user.id),
    db.prepare('DELETE FROM conversations WHERE client_id=? OR courier_id=?').bind(user.id, user.id),
  ]);

  // 3) Eliminar la cuenta de autenticación (best-effort con service_role).
  let authRemoved = false;
  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
    });
    authRemoved = res.ok;
  } catch {
    authRemoved = false;
  }

  await audit(env, user.id, 'account.delete', 'global_accounts', user.id, 'Eliminación de cuenta solicitada por el titular.');
  return { ok: true, authRemoved };
}
