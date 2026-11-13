// MENRUT v2.2 — Código de entrega por chat y encargos.
// Flujo acordado (2026-10-13):
//   1. El cliente genera el código en la conversación (evento kind='delivery_code').
//      Lo ven ambos participantes; el mensajero lo ve en el chat.
//   2. El cliente confirma la recepción en la app (client-confirm). Paso obligatorio.
//   3. Solo después, el mensajero escribe el código y la entrega queda verificada.
//   · El cliente puede cancelar el código solo si el mensajero no está contratado
//     (conversations.hired_at) y antes de confirmar la recepción.
//   · «Contratado» = el mensajero crea un encargo desde el chat.
import { asString, checkRate, HttpError, newId, nowMs, requireExactRole, type V2Env } from './core';
import { requireAuth } from './identity';
import { assignedShard } from './shard';
import { DELIVERY_TTL_SEC, confirmVerification, hashCode, randomCode } from './deliveries';
import { toMessageDto } from './dto';

type Conv = { id: string; clientId: string; courierId: string; hiredAt: number | null };

export type CodePayload = {
  deliveryId: string;
  code: string;
  expiresAt: number; // ms
  status: 'pending' | 'client_confirmed' | 'confirmed' | 'cancelled' | 'expired';
};

const nowSec = () => Math.floor(nowMs() / 1000);

async function loadConv(env: V2Env, id: string): Promise<Conv> {
  const row = await env.D1_CORE
    .prepare('SELECT id, client_id AS clientId, courier_id AS courierId, hired_at AS hiredAt FROM conversations WHERE id=? LIMIT 1')
    .bind(id)
    .first<Conv>();
  if (!row) throw new HttpError(404, 'Conversación no encontrada.');
  return row;
}

async function insertEvent(
  env: V2Env,
  convId: string,
  senderId: string,
  kind: 'delivery_code' | 'encargo',
  text: string,
  refId: string | null,
  payload: unknown,
): Promise<string> {
  const id = newId();
  await env.D1_CORE.batch([
    env.D1_CORE
      .prepare('INSERT INTO messages(id,conversation_id,sender_id,body,kind,ref_id,payload) VALUES(?,?,?,?,?,?,?)')
      .bind(id, convId, senderId, text, kind, refId, JSON.stringify(payload)),
    env.D1_CORE.prepare('UPDATE conversations SET last_message_at=? WHERE id=?').bind(nowSec(), convId),
  ]);
  return id;
}

/** Actualiza el estado del evento de código (carga útil y texto visible). */
async function setCodeEvent(env: V2Env, deliveryId: string, status: CodePayload['status'], text: string): Promise<void> {
  const row = await env.D1_CORE
    .prepare("SELECT id, payload FROM messages WHERE ref_id=? AND kind='delivery_code' LIMIT 1")
    .bind(deliveryId)
    .first<{ id: string; payload: string }>();
  if (!row) return;
  const p = JSON.parse(row.payload || '{}') as CodePayload;
  p.status = status;
  await env.D1_CORE
    .prepare('UPDATE messages SET payload=?, body=? WHERE id=?')
    .bind(JSON.stringify(p), text, row.id)
    .run();
}

async function notify(env: V2Env, userId: string, title: string, body: string): Promise<void> {
  await env.D1_CORE
    .prepare("INSERT INTO notifications(id,user_id,category,title,body) VALUES(?,?,'entrega',?,?)")
    .bind(newId(), userId, title, body)
    .run();
}

/** DTO de un mensaje para la app. Los eventos llevan su carga útil; un código vencido se marca como tal. */
export function messageRow(r: Record<string, unknown>, myId: string): Record<string, unknown> {
  const kind = (r.kind as string | null) ?? 'text';
  let payload: Record<string, unknown> | null = null;
  if (kind !== 'text' && r.payload) {
    try {
      payload = JSON.parse(r.payload as string) as Record<string, unknown>;
    } catch {
      payload = null;
    }
  }
  if (kind === 'delivery_code' && payload) {
    const p = payload as unknown as CodePayload;
    if ((p.status === 'pending' || p.status === 'client_confirmed') && p.expiresAt <= nowMs()) {
      payload = { ...payload, status: 'expired' };
    }
  }
  return {
    ...toMessageDto(
      {
        id: r.id as string,
        conversationId: r.conversation_id as string,
        senderId: r.sender_id as string,
        body: r.body as string,
        readAt: (r.read_at as number | null) ?? null,
        createdAt: (r.created_at as number) * 1000,
      },
      myId,
    ),
    kind,
    refId: (r.ref_id as string | null) ?? null,
    payload,
  };
}

/** ─── POST /conversations/:id/delivery-code — el cliente genera (o reutiliza) su código ─── */
export async function requestDeliveryCode(request: Request, env: V2Env, convId: string): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  await checkRate(env, `code:${user.id}`, 20, 60 * 60_000);
  const conv = await loadConv(env, convId);
  if (conv.clientId !== user.id) throw new HttpError(403, 'Solo el cliente de esta conversación puede pedir el código.');

  const shard = await assignedShard(env, conv.courierId);
  if (!shard) throw new HttpError(404, 'Mensajero no encontrado.');

  // Si ya hay un código vigente en esta conversación, se reutiliza en lugar de crear otro.
  const live = await shard.db
    .prepare(
      `SELECT id FROM delivery_verifications
       WHERE conversation_id=? AND client_id=? AND confirmed_at IS NULL AND cancelled_at IS NULL AND expires_at>?
       ORDER BY expires_at DESC LIMIT 1`,
    )
    .bind(convId, user.id, nowSec())
    .first<{ id: string }>();
  if (live) {
    const ev = await env.D1_CORE
      .prepare("SELECT rowid AS rid, * FROM messages WHERE ref_id=? AND kind='delivery_code' LIMIT 1")
      .bind(live.id)
      .first<Record<string, unknown>>();
    if (ev) return { message: messageRow(ev, user.id), reused: true };
  }

  const id = newId();
  const code = randomCode();
  const expiresSec = nowSec() + DELIVERY_TTL_SEC;
  const codeHash = await hashCode(id, code);
  await shard.db
    .prepare(
      'INSERT INTO delivery_verifications(id,courier_id,client_id,code_hash,expires_at,attempts,conversation_id) VALUES(?,?,?,?,?,0,?)',
    )
    .bind(id, conv.courierId, user.id, codeHash, expiresSec, convId)
    .run();

  const payload: CodePayload = { deliveryId: id, code, expiresAt: expiresSec * 1000, status: 'pending' };
  const msgId = await insertEvent(env, convId, user.id, 'delivery_code', 'Código de entrega', id, payload);
  await notify(env, conv.courierId, 'Código de entrega', `${user.fullName} generó un código de entrega en el chat.`);

  const ev = await env.D1_CORE
    .prepare('SELECT rowid AS rid, * FROM messages WHERE id=? LIMIT 1')
    .bind(msgId)
    .first<Record<string, unknown>>();
  return { message: messageRow(ev ?? {}, user.id), reused: false };
}

/** ─── POST /conversations/:id/delivery-code/client-confirm — el cliente confirma la recepción (paso 2) ─── */
export async function clientConfirmReceipt(request: Request, env: V2Env, convId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  await checkRate(env, `cconf:${user.id}`, 20, 60 * 60_000);
  const deliveryId = asString(body.deliveryId)?.trim() ?? '';
  if (!deliveryId) throw new HttpError(400, 'Falta el código.');
  const conv = await loadConv(env, convId);
  if (conv.clientId !== user.id) throw new HttpError(403, 'Solo el cliente de esta conversación puede confirmar la recepción.');

  const shard = await assignedShard(env, conv.courierId);
  if (!shard) throw new HttpError(404, 'Mensajero no encontrado.');
  const row = await shard.db
    .prepare('SELECT * FROM delivery_verifications WHERE id=? AND conversation_id=? AND client_id=? LIMIT 1')
    .bind(deliveryId, convId, user.id)
    .first<Record<string, unknown>>();
  if (!row) throw new HttpError(404, 'Código no encontrado.');
  if (row.confirmed_at) throw new HttpError(409, 'Esta entrega ya está verificada.');
  if (row.cancelled_at) throw new HttpError(409, 'El código está cancelado.');
  if (row.client_confirmed_at) throw new HttpError(409, 'Ya confirmaste la recepción.');
  if ((row.expires_at as number) <= nowSec()) throw new HttpError(409, 'El código ya venció.');

  await shard.db
    .prepare('UPDATE delivery_verifications SET client_confirmed_at=? WHERE id=?')
    .bind(nowSec(), deliveryId)
    .run();
  await setCodeEvent(env, deliveryId, 'client_confirmed', 'Recepción confirmada por el cliente');
  await notify(env, conv.courierId, 'Recepción confirmada', `${user.fullName} confirmó la recepción. Ya puedes escribir el código para verificar la entrega.`);
  return { ok: true };
}

/** ─── POST /conversations/:id/delivery-code/cancel — el cliente cancela (sin contratación ni confirmación) ─── */
export async function cancelDeliveryCode(request: Request, env: V2Env, convId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const deliveryId = asString(body.deliveryId)?.trim() ?? '';
  if (!deliveryId) throw new HttpError(400, 'Falta el código a cancelar.');
  const conv = await loadConv(env, convId);
  if (conv.clientId !== user.id) throw new HttpError(403, 'Solo el cliente de esta conversación puede cancelar el código.');
  if (conv.hiredAt) throw new HttpError(409, 'El mensajero ya fue contratado. El código ya no se puede cancelar.');

  const shard = await assignedShard(env, conv.courierId);
  if (!shard) throw new HttpError(404, 'Mensajero no encontrado.');
  const row = await shard.db
    .prepare('SELECT * FROM delivery_verifications WHERE id=? AND conversation_id=? AND client_id=? LIMIT 1')
    .bind(deliveryId, convId, user.id)
    .first<Record<string, unknown>>();
  if (!row) throw new HttpError(404, 'Código no encontrado.');
  if (row.confirmed_at) throw new HttpError(409, 'Esta entrega ya está verificada.');
  if (row.cancelled_at) throw new HttpError(409, 'El código ya está cancelado.');
  if (row.client_confirmed_at) throw new HttpError(409, 'Ya confirmaste la recepción; el código no se puede cancelar.');
  if ((row.expires_at as number) <= nowSec()) throw new HttpError(409, 'El código ya venció.');

  await shard.db
    .prepare('UPDATE delivery_verifications SET cancelled_at=? WHERE id=?')
    .bind(nowSec(), deliveryId)
    .run();
  await setCodeEvent(env, deliveryId, 'cancelled', 'Código cancelado');
  return { ok: true };
}

/** ─── POST /conversations/:id/delivery-code/confirm — el mensajero escribe el código (paso 3) ─── */
export async function confirmDeliveryCode(request: Request, env: V2Env, convId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user.role, 'courier');
  await checkRate(env, `verify:${user.id}`, 30, 60_000);
  const conv = await loadConv(env, convId);
  if (conv.courierId !== user.id) throw new HttpError(403, 'Solo el mensajero de esta conversación puede confirmar el código.');

  const deliveryId = asString(body.deliveryId)?.trim() ?? '';
  const code = (asString(body.code) ?? '').trim();
  if (!deliveryId) throw new HttpError(400, 'Falta el código a confirmar.');
  if (!/^\d{6}$/.test(code)) throw new HttpError(400, 'El código tiene 6 dígitos.');

  const shard = await assignedShard(env, user.id);
  if (!shard) throw new HttpError(409, 'Tu perfil de mensajero no está creado.');
  const row = await shard.db
    .prepare('SELECT * FROM delivery_verifications WHERE id=? AND courier_id=? AND conversation_id=? LIMIT 1')
    .bind(deliveryId, user.id, convId)
    .first<Record<string, unknown>>();
  if (!row) throw new HttpError(404, 'Código no encontrado en esta conversación.');
  if (!row.client_confirmed_at) {
    throw new HttpError(409, 'El cliente aún no ha confirmado la recepción. El código se activa cuando lo confirme.');
  }

  const verifiedDeliveries = await confirmVerification(env, user, shard.db, row, code);
  await setCodeEvent(env, deliveryId, 'confirmed', 'Entrega verificada');
  return { ok: true, verifiedDeliveries };
}

/** ─── POST /conversations/:id/encargos — el mensajero crea un encargo (contrata) ─── */
export async function createEncargo(request: Request, env: V2Env, convId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user.role, 'courier');
  await checkRate(env, `encargo:${user.id}`, 30, 60 * 60_000);
  const conv = await loadConv(env, convId);
  if (conv.courierId !== user.id) throw new HttpError(403, 'Solo el mensajero de esta conversación puede crear encargos.');

  const description = (asString(body.description) ?? '').trim().slice(0, 300);
  const msgId = await insertEvent(env, convId, user.id, 'encargo', description || 'Encargo creado', null, { description });
  await env.D1_CORE
    .prepare('UPDATE conversations SET hired_at=? WHERE id=? AND hired_at IS NULL')
    .bind(nowSec(), convId)
    .run();
  await notify(env, conv.clientId, 'Nuevo encargo', `${user.fullName} creó un encargo en tu chat.`);

  const ev = await env.D1_CORE
    .prepare('SELECT rowid AS rid, * FROM messages WHERE id=? LIMIT 1')
    .bind(msgId)
    .first<Record<string, unknown>>();
  return { message: messageRow(ev ?? {}, user.id), hired: true };
}

/** Retención del chat en servidor: los mensajes se borran a las 24 h (decisión 2026-11-12). */
export const CHAT_SERVER_RETENTION_SEC = 86400;

export async function purgeChatRetention(env: V2Env): Promise<Record<string, unknown>> {
  const cutoff = nowSec() - CHAT_SERVER_RETENTION_SEC;
  const r = await env.D1_CORE.prepare('DELETE FROM messages WHERE created_at < ?').bind(cutoff).run();
  return { ok: true, deletedMessages: r.meta?.changes ?? 0, cutoff };
}

/** ─── POST /cron/chat-retention — lo llama pg_cron o un cron externo con x-cron-secret ─── */
export async function cronChatRetention(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const secret = request.headers.get('x-cron-secret') ?? '';
  if (!env.CRON_SECRET || secret.length !== env.CRON_SECRET.length || secret !== env.CRON_SECRET) {
    throw new HttpError(401, 'No autorizado.');
  }
  return purgeChatRetention(env);
}
