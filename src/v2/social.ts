// MENRUT v2 — Social: conversaciones y mensajes entre identidades globales
// (tablas globales de CORE) y notificaciones por cuenta.
import {
  asString,
  checkRate,
  HttpError,
  newId,
  nowMs,
  type V2Env,
} from './core';
import { loadAccount, requireAuth } from './identity';
import { toMessageDto, toNotificationDto } from './dto';

// ─── /conversations ─────────────────────────────────────────────────────────
const CONV_SELECT = `SELECT c.id, c.client_id AS clientId, c.courier_id AS courierId, c.last_message_at AS lastMessageAt,
 cp.full_name AS courierName, cp.avatar_path AS courierAvatar,
 cl.full_name AS clientName, cl.avatar_path AS clientAvatar
 FROM conversations c
 LEFT JOIN account_profiles cp ON cp.user_id = c.courier_id
 LEFT JOIN account_profiles cl ON cl.user_id = c.client_id`;

async function conversationDto(env: V2Env, conversationId: string, myUserId: string): Promise<Record<string, unknown>> {
  const db = env.D1_CORE;
  const c = await db.prepare(`${CONV_SELECT} WHERE c.id=? LIMIT 1`).bind(conversationId).first<Record<string, unknown>>();
  if (!c) throw new HttpError(404, 'Conversación no encontrada.');
  const last = await db
    .prepare('SELECT body FROM messages WHERE conversation_id=? ORDER BY created_at DESC LIMIT 1')
    .bind(conversationId)
    .first<{ body: string }>();
  const unread = await db
    .prepare('SELECT COUNT(*) AS n FROM messages WHERE conversation_id=? AND sender_id<>? AND read_at IS NULL')
    .bind(conversationId, myUserId)
    .first<{ n: number }>();
  const mineAsClient = c.clientId === myUserId;
  const other = mineAsClient
    ? { id: c.courierId, name: c.courierName, avatar: c.courierAvatar }
    : { id: c.clientId, name: c.clientName, avatar: c.clientAvatar };
  const otherAccount = await loadAccount(env, other.id as string);
  return {
    id: c.id,
    otherId: other.id,
    otherName: other.name ?? otherAccount?.fullName ?? 'Usuario MENRUT',
    otherAvatar: other.avatar,
    otherRole: otherAccount?.role ?? 'client',
    lastMessage: last?.body ?? '',
    lastMessageAt: new Date((c.lastMessageAt as number) * 1000).toISOString(),
    unread: unread?.n ?? 0,
  };
}

export async function listConversations(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const convs = await env.D1_CORE
    .prepare(`${CONV_SELECT} WHERE c.client_id=? OR c.courier_id=? ORDER BY c.last_message_at DESC`)
    .bind(user.id, user.id)
    .all();
  const conversations: Array<Record<string, unknown>> = [];
  for (const c of (convs.results ?? []) as Array<Record<string, unknown>>) {
    conversations.push(await conversationDto(env, c.id as string, user.id));
  }
  return { conversations };
}

export async function startConversation(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  await checkRate(env, `conv:${user.id}`, 20, 60_000);
  const db = env.D1_CORE;

  const courierUserId = asString(body.courierUserId)?.trim() ?? '';
  if (!courierUserId) throw new HttpError(400, 'Falta el destinatario.');
  if (courierUserId === user.id) throw new HttpError(400, 'No puedes iniciar una conversación contigo mismo.');
  const target = await db
    .prepare('SELECT user_id, status FROM global_accounts WHERE user_id=? LIMIT 1')
    .bind(courierUserId)
    .first<{ user_id: string; status: string }>();
  if (!target || target.status !== 'active') throw new HttpError(404, 'Usuario no encontrado.');

  // La conversación enlaza cliente ↔ mensajero: si inicia el mensajero, se
  // intercambian los papeles (mismo comportamiento que v2 legacy).
  const targetIsCourier = await db
    .prepare("SELECT 1 AS ok FROM user_roles WHERE user_id=? AND role='courier'")
    .bind(courierUserId)
    .first();
  const isMeCourier = user.role === 'courier' && !targetIsCourier;
  const clientId = isMeCourier ? target.user_id : user.id;
  const courierId = isMeCourier ? user.id : target.user_id;

  const existing = await db
    .prepare('SELECT id FROM conversations WHERE client_id=? AND courier_id=? LIMIT 1')
    .bind(clientId, courierId)
    .first<{ id: string }>();
  if (existing) return { conversation: await conversationDto(env, existing.id, user.id) };

  const id = newId();
  const nowSec = Math.floor(nowMs() / 1000);
  await db.batch([
    db
      .prepare('INSERT INTO conversations(id,client_id,courier_id,last_message_at) VALUES(?,?,?,?)')
      .bind(id, clientId, courierId, nowSec),
    db
      .prepare(
        "INSERT INTO notifications(id,user_id,category,title,body) VALUES(?,?,'mensaje','Nueva conversación',?)"
      )
      .bind(newId(), courierUserId, `${user.fullName} quiere coordinar contigo por MENRUT.`),
  ]);
  return { conversation: await conversationDto(env, id, user.id) };
}

// ─── /conversations/:id/messages ────────────────────────────────────────────
async function loadConversationFor(env: V2Env, id: string, userId: string): Promise<{ id: string; clientId: string; courierId: string } | null> {
  const conv = await env.D1_CORE
    .prepare('SELECT id, client_id AS clientId, courier_id AS courierId FROM conversations WHERE id=? LIMIT 1')
    .bind(id)
    .first<{ id: string; clientId: string; courierId: string }>();
  if (!conv) return null;
  if (conv.clientId !== userId && conv.courierId !== userId) return null;
  return conv;
}

export async function listMessages(request: Request, env: V2Env, conversationId: string): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const conv = await loadConversationFor(env, conversationId, user.id);
  if (!conv) throw new HttpError(404, 'Conversación no encontrada.');

  // Marcar como leídos los mensajes del otro participante.
  await env.D1_CORE
    .prepare('UPDATE messages SET read_at=? WHERE conversation_id=? AND sender_id<>? AND read_at IS NULL')
    .bind(Math.floor(nowMs() / 1000), conversationId, user.id)
    .run();

  const rows = await env.D1_CORE
    .prepare('SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at ASC LIMIT 200')
    .bind(conversationId)
    .all();
  return {
    messages: ((rows.results ?? []) as Array<Record<string, unknown>>).map((m) =>
      toMessageDto(
        {
          id: m.id as string,
          conversationId: m.conversation_id as string,
          senderId: m.sender_id as string,
          body: m.body as string,
          readAt: (m.read_at as number | null) ?? null,
          createdAt: (m.created_at as number) * 1000,
        },
        user.id,
      ),
    ),
  };
}

export async function sendMessage(request: Request, env: V2Env, conversationId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  await checkRate(env, `msg:${user.id}`, 60, 60_000);
  const db = env.D1_CORE;

  const conv = await loadConversationFor(env, conversationId, user.id);
  if (!conv) throw new HttpError(404, 'Conversación no encontrada.');

  const text = asString(body.body)?.trim() ?? '';
  if (!text) throw new HttpError(400, 'El mensaje no puede estar vacío.');
  if (text.length > 2000) throw new HttpError(400, 'El mensaje es demasiado largo (máx. 2000).');

  const nowSec = Math.floor(nowMs() / 1000);
  const id = newId();
  await db.batch([
    db
      .prepare('INSERT INTO messages(id,conversation_id,sender_id,body) VALUES(?,?,?,?)')
      .bind(id, conversationId, user.id, text),
    db.prepare('UPDATE conversations SET last_message_at=? WHERE id=?').bind(nowSec, conversationId),
  ]);

  // Notifica al otro solo si no tenía mensajes míos sin leer (evita spam).
  const otherId = conv.clientId === user.id ? conv.courierId : conv.clientId;
  const unreadFromMe = await db
    .prepare('SELECT COUNT(*) AS n FROM messages WHERE conversation_id=? AND sender_id=? AND read_at IS NULL')
    .bind(conversationId, user.id)
    .first<{ n: number }>();
  if ((unreadFromMe?.n ?? 0) <= 1) {
    await db
      .prepare("INSERT INTO notifications(id,user_id,category,title,body) VALUES(?,?,'mensaje','Nuevo mensaje',?)")
      .bind(newId(), otherId, `${user.fullName}: ${text.slice(0, 90)}${text.length > 90 ? '…' : ''}`)
      .run();
  }

  return {
    message: toMessageDto(
      { id, conversationId, senderId: user.id, body: text, readAt: null, createdAt: nowSec * 1000 },
      user.id,
    ),
  };
}

// ─── /notifications ─────────────────────────────────────────────────────────
export async function listNotifications(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const rows = await env.D1_CORE
    .prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50')
    .bind(user.id)
    .all();
  return {
    notifications: ((rows.results ?? []) as Array<Record<string, unknown>>).map((n) =>
      toNotificationDto({
        id: n.id as string,
        category: n.category as string,
        title: n.title as string,
        body: n.body as string,
        readAt: (n.read_at as number | null) ?? null,
        createdAt: (n.created_at as number) * 1000,
      }),
    ),
  };
}

export async function markNotificationRead(request: Request, env: V2Env, id: string): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const notification = await env.D1_CORE
    .prepare('SELECT id, user_id, read_at FROM notifications WHERE id=? LIMIT 1')
    .bind(id)
    .first<{ id: string; user_id: string; read_at: number | null }>();
  if (!notification || notification.user_id !== user.id) throw new HttpError(404, 'Notificación no encontrada.');
  if (!notification.read_at) {
    await env.D1_CORE.prepare('UPDATE notifications SET read_at=? WHERE id=?').bind(Math.floor(nowMs() / 1000), id).run();
  }
  return { ok: true };
}
