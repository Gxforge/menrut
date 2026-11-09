// MENRUT v2 — Cuenta y sociales: sync de identidad, perfil propio, reportes,
// favoritos, rutas guardadas, conversaciones/mensajes y notificaciones.
import {
  adminEmails,
  asBool,
  asString,
  checkRate,
  findUserByIdentity,
  HttpError,
  moderatorEmails,
  newId,
  nowMs,
  ownerEmails,
  requireAuth,
  verifySupabaseToken,
  type V2Env,
} from './core';
import { toMessageDto, toNotificationDto, toSessionUser } from './dto';
import { activateTrialPlan, reconcileWallet } from './wallet';

const VALID_BODY_ROLES = ['client', 'courier', 'business'];

// ─── POST /auth/sync ────────────────────────────────────────────────────────
// Sincroniza la identidad Supabase con el User operativo: lo crea si es la
// primera vez (rol del body; staff solo por listas de correos) y prepara el
// perfil de mensajero + cartera + prueba gratuita si corresponde.
export async function authSync(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const db = env.D1_CORE;
  const identity = await verifySupabaseToken(request, env);
  if (!identity) throw new HttpError(401, 'Sesión no válida. Inicia sesión de nuevo.');
  const email = identity.email;
  if (!email) throw new HttpError(400, 'La cuenta no tiene correo asociado.');
  await checkRate(env, `sync:${identity.sub}`, 30, 60_000);

  const bodyRole = asString(body?.role);
  // Respaldo de metadatos (igual que en desarrollo): si el body no trae un rol
  // válido se usa el guardado al registrarse (user_metadata.account_role,
  // firmado por Supabase dentro del JWT ya verificado). Solo se admiten
  // client/courier/business; el staff sigue viniendo de las listas de correos.
  const metaRole = identity.accountRole;
  const wantedRole = VALID_BODY_ROLES.includes(bodyRole ?? '')
    ? (bodyRole as string)
    : VALID_BODY_ROLES.includes(metaRole ?? '')
      ? (metaRole as string)
      : null;
  const fullName = identity.fullName ?? email;

  const isOwnerEmail = ownerEmails(env).includes(email);
  const isAdminEmail = !isOwnerEmail && adminEmails(env).includes(email);
  const isModeratorEmail = !isOwnerEmail && !isAdminEmail && moderatorEmails(env).includes(email);

  let user = await findUserByIdentity(env, identity);
  const now = nowMs();

  if (!user) {
    const id = newId();
    const role = isOwnerEmail ? 'owner' : isAdminEmail ? 'admin' : isModeratorEmail ? 'moderator' : wantedRole ?? 'client';
    await db
      .prepare(
        'INSERT INTO User(id,email,supabaseUserId,role,fullName,phone,avatarUrl,status,hasUsedTrial,isDemo,createdAt,updatedAt) VALUES(?,?,?,?,?,NULL,NULL,?,0,0,?,?)'
      )
      .bind(id, email, identity.sub, role, fullName, 'active', now, now)
      .run();
    user = (await db.prepare('SELECT * FROM User WHERE id=?').bind(id).first()) as unknown as NonNullable<typeof user>;
  } else {
    // Jerarquía: owner (nunca se degrada) > admin > moderador. Solo se sube por
    // listas de correos; PROHIBIDO otorgar owner/moderator/admin desde el body.
    const patch: string[] = [];
    const values: unknown[] = [];
    if (!user.supabaseUserId) {
      patch.push('supabaseUserId=?');
      values.push(identity.sub);
    }
    if (isOwnerEmail && user.role !== 'owner') {
      patch.push('role=?');
      values.push('owner');
    } else if (isAdminEmail && user.role !== 'admin' && user.role !== 'owner') {
      patch.push('role=?');
      values.push('admin');
    } else if (isModeratorEmail && (user.role === 'client' || user.role === 'business')) {
      patch.push('role=?');
      values.push('moderator');
    }
    if (patch.length > 0) {
      values.push(now, user.id);
      await db.prepare(`UPDATE User SET ${patch.join(',')}, updatedAt=? WHERE id=?`).bind(...values).run();
      user = (await db.prepare('SELECT * FROM User WHERE id=?').bind(user.id).first()) as unknown as NonNullable<typeof user>;
    }
  }

  // Regla de seguridad: el rol solo puede "subir" desde cliente/negocio.
  const isStaffEmail = isOwnerEmail || isAdminEmail || isModeratorEmail;
  if (!isStaffEmail && (user.role === 'client' || user.role === 'business') && wantedRole && user.role !== wantedRole) {
    await db.prepare('UPDATE User SET role=?, updatedAt=? WHERE id=?').bind(wantedRole, now, user.id).run();
    user = { ...user, role: wantedRole };
  }

  // Perfil de mensajero + cartera + prueba gratuita (si corresponde).
  if (user.role === 'courier') {
    const profile = await db.prepare('SELECT id FROM CourierProfile WHERE userId=? LIMIT 1').bind(user.id).first<{ id: string }>();
    if (!profile) {
      const pid = newId();
      await db.batch([
        db
          .prepare(
            'INSERT INTO CourierProfile(id,userId,bio,yearsExperience,verificationStatus,isPublic,ratingAvg,ratingCount,verifiedDeliveries,baseFeeCup,availabilityNote,vehicleSummary,contactPreference,coverageType,isDemo,createdAt,updatedAt) VALUES(?,?,?,0,?,1,0,0,0,NULL,?,?,?, ?,0,?,?)'
          )
          .bind(pid, user.id, 'unverified', 'chat', 'municipal', now, now),
        db
          .prepare('INSERT INTO Wallet(id,courierId,permanenceCredits,toolCredits,lastConsumedAt,updatedAt) VALUES(?,?,0,0,NULL,?)')
          .bind(newId(), pid, now),
      ]);
      if (!user.hasUsedTrial) {
        await activateTrialPlan(env, user.id, pid);
        user = { ...user, hasUsedTrial: 1 };
      }
    } else {
      // Reconciliación lazy de permanencia en cada sync.
      await reconcileWallet(env, profile.id);
    }
  }

  return { user: toSessionUser(user) };
}

// ─── PATCH /me ──────────────────────────────────────────────────────────────
export async function updateMe(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const db = env.D1_CORE;

  const patch: string[] = [];
  const values: unknown[] = [];
  if ('fullName' in body) {
    const fullName = asString(body.fullName)?.trim() ?? '';
    if (!fullName) throw new HttpError(400, 'El nombre no puede estar vacío.');
    if (fullName.length > 80) throw new HttpError(400, 'El nombre es demasiado largo.');
    patch.push('fullName=?');
    values.push(fullName);
  }
  if ('phone' in body) {
    const phone = body.phone;
    if (phone === null || phone === '') {
      patch.push('phone=NULL');
    } else {
      const p = asString(phone)?.trim() ?? '';
      if (p && !/^[+0-9\s()-]{5,25}$/.test(p)) throw new HttpError(400, 'El teléfono no tiene un formato válido.');
      patch.push('phone=?');
      values.push(p || null);
    }
  }
  if ('avatarUrl' in body) {
    const avatar = body.avatarUrl;
    if (avatar === null || avatar === '') {
      patch.push('avatarUrl=NULL');
    } else {
      const a = asString(avatar)?.trim() ?? '';
      if (a.length > 500) throw new HttpError(400, 'La URL del avatar es demasiado larga.');
      patch.push('avatarUrl=?');
      values.push(a || null);
    }
  }
  if (patch.length === 0) throw new HttpError(400, 'Nada que actualizar.');

  values.push(nowMs(), user.id);
  await db.prepare(`UPDATE User SET ${patch.join(',')}, updatedAt=? WHERE id=?`).bind(...values).run();
  const updated = await db.prepare('SELECT * FROM User WHERE id=?').bind(user.id).first();
  return { user: toSessionUser(updated as unknown as Parameters<typeof toSessionUser>[0]) };
}

// ─── POST /reports ──────────────────────────────────────────────────────────
export async function createReport(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  await checkRate(env, `report:${user.id}`, 10, 60 * 60_000);

  const TARGET_TYPES = ['profile', 'review', 'conversation'];
  const targetType = asString(body.targetType)?.trim() ?? 'profile';
  const targetId = asString(body.targetId)?.trim() ?? '';
  const reason = asString(body.reason)?.trim() ?? '';
  if (!TARGET_TYPES.includes(targetType)) throw new HttpError(400, 'Tipo de reporte no válido.');
  if (!targetId) throw new HttpError(400, 'Falta el elemento a reportar.');
  if (reason.length < 5 || reason.length > 500) {
    throw new HttpError(400, 'Describe el motivo del reporte (entre 5 y 500 caracteres).');
  }
  await env.D1_CORE
    .prepare('INSERT INTO ReportFlag(id,reporterId,targetType,targetId,reason,status,createdAt) VALUES(?,?,?,?,?,?,?)')
    .bind(newId(), user.id, targetType, targetId, reason, 'open', nowMs())
    .run();
  return { ok: true };
}

// ─── /favorites ─────────────────────────────────────────────────────────────
export async function listFavorites(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const db = env.D1_CORE;
  const favs = await db
    .prepare(
      `SELECT f.createdAt, p.id, p.userId, p.verificationStatus, p.ratingAvg, p.ratingCount,
       p.verifiedDeliveries, p.baseFeeCup, p.availabilityNote, p.vehicleSummary, p.coverageType, p.isDemo,
       u.fullName, u.avatarUrl
       FROM Favorite f
       JOIN CourierProfile p ON p.id = f.courierId
       JOIN User u ON u.id = p.userId
       WHERE f.userId=? ORDER BY f.createdAt DESC`
    )
    .bind(user.id)
    .all();

  const couriers: Array<Record<string, unknown>> = [];
  for (const f of (favs.results ?? []) as Array<Record<string, unknown>>) {
    const routes = await db
      .prepare(
        `SELECT status, nextDepartureAt FROM Route WHERE courierId=? AND status IN ('active','scheduled')`
      )
      .bind(f.id as string)
      .all();
    let nextDeparture: number | null = null;
    for (const r of (routes.results ?? []) as Array<{ nextDepartureAt: number | null }>) {
      if (r.nextDepartureAt && r.nextDepartureAt > nowMs() && (!nextDeparture || r.nextDepartureAt < nextDeparture)) {
        nextDeparture = r.nextDepartureAt;
      }
    }
    const coverage = await db
      .prepare('SELECT m.name FROM CourierCoverage cc JOIN Municipality m ON m.id=cc.municipalityId WHERE cc.courierId=?')
      .bind(f.id as string)
      .all();
    couriers.push({
      courierId: f.id,
      userId: f.userId,
      fullName: f.fullName,
      avatarUrl: f.avatarUrl,
      isVerified: f.verificationStatus === 'verified',
      isFavorite: true,
      ratingAvg: f.ratingAvg,
      ratingCount: f.ratingCount,
      verifiedDeliveries: f.verifiedDeliveries,
      vehicleSummary: f.vehicleSummary,
      availabilityNote: f.availabilityNote,
      feeCup: f.baseFeeCup,
      isDemo: !!f.isDemo,
      coverageType: f.coverageType,
      matchReasons: ['Guardado por ti'],
      coverage: ((coverage.results ?? []) as Array<{ name: string }>).map((c) => c.name),
      nextDepartureAt: nextDeparture ? new Date(nextDeparture).toISOString() : null,
    });
  }
  return { couriers };
}

export async function toggleFavorite(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const db = env.D1_CORE;
  const courierId = asString(body.courierId)?.trim() ?? '';
  if (!courierId) throw new HttpError(400, 'Falta el mensajero.');
  const profile = await db.prepare('SELECT id FROM CourierProfile WHERE id=? LIMIT 1').bind(courierId).first();
  if (!profile) throw new HttpError(404, 'Mensajero no encontrado.');

  const existing = await db
    .prepare('SELECT id FROM Favorite WHERE userId=? AND courierId=? LIMIT 1')
    .bind(user.id, courierId)
    .first<{ id: string }>();
  if (existing) {
    await db.prepare('DELETE FROM Favorite WHERE id=?').bind(existing.id).run();
    return { favorite: false };
  }
  await db
    .prepare('INSERT INTO Favorite(id,userId,courierId,createdAt) VALUES(?,?,?,?)')
    .bind(newId(), user.id, courierId, nowMs())
    .run();
  return { favorite: true };
}

// ─── /saved-routes ──────────────────────────────────────────────────────────
interface SavedRouteRow {
  id: string;
  originMunicipalityId: string;
  destinationMunicipalityId: string;
  label: string;
  alertsEnabled: number;
  createdAt: number;
}

async function savedRouteDto(env: V2Env, r: SavedRouteRow): Promise<Record<string, unknown>> {
  const muns = await env.D1_CORE
    .prepare('SELECT id, name FROM Municipality WHERE id IN (?,?)')
    .bind(r.originMunicipalityId, r.destinationMunicipalityId)
    .all();
  const byId = new Map(((muns.results ?? []) as Array<{ id: string; name: string }>).map((m) => [m.id, m.name]));
  return {
    id: r.id,
    originId: r.originMunicipalityId,
    destinationId: r.destinationMunicipalityId,
    origin: byId.get(r.originMunicipalityId) ?? '',
    destination: byId.get(r.destinationMunicipalityId) ?? '',
    label: r.label,
    alertsEnabled: !!r.alertsEnabled,
    createdAt: new Date(r.createdAt).toISOString(),
  };
}

export async function listSavedRoutes(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const rows = await env.D1_CORE
    .prepare('SELECT * FROM SavedRoute WHERE userId=? ORDER BY createdAt DESC')
    .bind(user.id)
    .all();
  const routes: Array<Record<string, unknown>> = [];
  for (const r of (rows.results ?? []) as unknown as SavedRouteRow[]) {
    routes.push(await savedRouteDto(env, r));
  }
  return { routes };
}

export async function createSavedRoute(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const db = env.D1_CORE;
  const originId = asString(body.originId)?.trim() ?? '';
  const destinationId = asString(body.destinationId)?.trim() ?? '';
  const label = (asString(body.label) ?? '').trim().slice(0, 60);
  const alertsEnabled = asBool(body.alertsEnabled) ?? true;

  if (!originId || !destinationId) throw new HttpError(400, 'Selecciona origen y destino.');
  if (originId === destinationId) {
    throw new HttpError(400, 'El origen y el destino deben ser municipios distintos.');
  }
  const muns = await db.prepare('SELECT id FROM Municipality WHERE id IN (?,?)').bind(originId, destinationId).all();
  if ((muns.results ?? []).length !== 2) throw new HttpError(400, 'Municipio no válido.');

  const id = newId();
  await db
    .prepare(
      'INSERT INTO SavedRoute(id,userId,originMunicipalityId,destinationMunicipalityId,label,alertsEnabled,createdAt) VALUES(?,?,?,?,?,?,?)'
    )
    .bind(id, user.id, originId, destinationId, label, alertsEnabled ? 1 : 0, nowMs())
    .run();
  const created = await db.prepare('SELECT * FROM SavedRoute WHERE id=?').bind(id).first() as unknown as SavedRouteRow;
  return { route: await savedRouteDto(env, created) };
}

export async function deleteSavedRoute(request: Request, env: V2Env, id: string): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const route = await env.D1_CORE.prepare('SELECT id, userId FROM SavedRoute WHERE id=? LIMIT 1').bind(id).first<{ id: string; userId: string }>();
  if (!route || route.userId !== user.id) throw new HttpError(404, 'Ruta guardada no encontrada.');
  await env.D1_CORE.prepare('DELETE FROM SavedRoute WHERE id=?').bind(id).run();
  return { ok: true };
}

// ─── /conversations ─────────────────────────────────────────────────────────
async function conversationDto(env: V2Env, conversationId: string, myUserId: string): Promise<Record<string, unknown>> {
  const db = env.D1_CORE;
  const c = await db
    .prepare(
      `SELECT c.id, c.clientId, c.courierId, c.lastMessageAt,
       cu.fullName AS courierName, cu.avatarUrl AS courierAvatar, cu.role AS courierRole,
       cl.fullName AS clientName, cl.avatarUrl AS clientAvatar, cl.role AS clientRole
       FROM Conversation c
       JOIN User cu ON cu.id = c.courierId
       JOIN User cl ON cl.id = c.clientId
       WHERE c.id = ? LIMIT 1`
    )
    .bind(conversationId)
    .first<Record<string, unknown>>();
  if (!c) throw new HttpError(404, 'Conversación no encontrada.');
  const last = await db
    .prepare('SELECT body FROM Message WHERE conversationId=? ORDER BY createdAt DESC LIMIT 1')
    .bind(conversationId)
    .first<{ body: string }>();
  const unread = await db
    .prepare('SELECT COUNT(*) AS n FROM Message WHERE conversationId=? AND senderId<>? AND readAt IS NULL')
    .bind(conversationId, myUserId)
    .first<{ n: number }>();
  const mineAsClient = c.clientId === myUserId;
  const other = mineAsClient
    ? { id: c.courierId, name: c.courierName, avatar: c.courierAvatar, role: c.courierRole }
    : { id: c.clientId, name: c.clientName, avatar: c.clientAvatar, role: c.clientRole };
  return {
    id: c.id,
    otherId: other.id,
    otherName: other.name,
    otherAvatar: other.avatar,
    otherRole: other.role,
    lastMessage: last?.body ?? '',
    lastMessageAt: new Date(c.lastMessageAt as number).toISOString(),
    unread: unread?.n ?? 0,
  };
}

export async function listConversations(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const db = env.D1_CORE;
  const convs = await db
    .prepare(
      `SELECT c.id, c.clientId, c.courierId, c.lastMessageAt,
       cu.fullName AS courierName, cu.avatarUrl AS courierAvatar, cu.role AS courierRole,
       cl.fullName AS clientName, cl.avatarUrl AS clientAvatar, cl.role AS clientRole
       FROM Conversation c
       JOIN User cu ON cu.id = c.courierId
       JOIN User cl ON cl.id = c.clientId
       WHERE c.clientId=? OR c.courierId=?
       ORDER BY c.lastMessageAt DESC`
    )
    .bind(user.id, user.id)
    .all();

  const conversations: Array<Record<string, unknown>> = [];
  for (const c of (convs.results ?? []) as Array<Record<string, unknown>>) {
    const last = await db
      .prepare('SELECT body FROM Message WHERE conversationId=? ORDER BY createdAt DESC LIMIT 1')
      .bind(c.id as string)
      .first<{ body: string }>();
    const unread = await db
      .prepare("SELECT COUNT(*) AS n FROM Message WHERE conversationId=? AND senderId<>? AND readAt IS NULL")
      .bind(c.id as string, user.id)
      .first<{ n: number }>();
    const mineAsClient = c.clientId === user.id;
    const other = mineAsClient
      ? { id: c.courierId, name: c.courierName, avatar: c.courierAvatar, role: c.courierRole }
      : { id: c.clientId, name: c.clientName, avatar: c.clientAvatar, role: c.clientRole };
    conversations.push({
      id: c.id,
      otherId: other.id,
      otherName: other.name,
      otherAvatar: other.avatar,
      otherRole: other.role,
      lastMessage: last?.body ?? '',
      lastMessageAt: new Date(c.lastMessageAt as number).toISOString(),
      unread: unread?.n ?? 0,
    });
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
  const target = await db.prepare('SELECT id, role, status FROM User WHERE id=? LIMIT 1').bind(courierUserId).first<{ id: string; role: string; status: string }>();
  if (!target || target.status !== 'active') throw new HttpError(404, 'Usuario no encontrado.');

  // La conversación enlaza cliente ↔ mensajero: si el que inicia es el
  // mensajero, se intercambian los papeles.
  const isMeCourier = user.role === 'courier' && target.role !== 'courier';
  const clientId = isMeCourier ? target.id : user.id;
  const courierId = isMeCourier ? user.id : target.id;

  const existing = await db
    .prepare('SELECT id FROM Conversation WHERE clientId=? AND courierId=? LIMIT 1')
    .bind(clientId, courierId)
    .first<{ id: string }>();
  if (existing) {
    return { conversation: await conversationDto(env, existing.id, user.id) };
  }

  const id = newId();
  const now = nowMs();
  await db.batch([
    db
      .prepare('INSERT INTO Conversation(id,clientId,courierId,lastMessageAt,createdAt) VALUES(?,?,?,?,?)')
      .bind(id, clientId, courierId, now, now),
    db
      .prepare(
        "INSERT INTO Notification(id,userId,category,title,body,readAt,createdAt) VALUES(?,?,?,'Nueva conversación',?,NULL,?)"
      )
      .bind(newId(), courierUserId, 'mensaje', `${user.fullName} quiere coordinar contigo por MENRUT.`, now),
  ]);
  return { conversation: await conversationDto(env, id, user.id) };
}

// ─── /conversations/:id/messages ────────────────────────────────────────────
async function loadConversationFor(env: V2Env, id: string, userId: string): Promise<{ id: string; clientId: string; courierId: string } | null> {
  const conv = await env.D1_CORE
    .prepare('SELECT id, clientId, courierId FROM Conversation WHERE id=? LIMIT 1')
    .bind(id)
    .first<{ id: string; clientId: string; courierId: string }>();
  if (!conv) return null;
  if (conv.clientId !== userId && conv.courierId !== userId) return null;
  return conv;
}

export async function listMessages(request: Request, env: V2Env, conversationId: string): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const db = env.D1_CORE;
  const conv = await loadConversationFor(env, conversationId, user.id);
  if (!conv) throw new HttpError(404, 'Conversación no encontrada.');

  // Marcar como leídos los mensajes del otro participante.
  await db
    .prepare('UPDATE Message SET readAt=? WHERE conversationId=? AND senderId<>? AND readAt IS NULL')
    .bind(nowMs(), conversationId, user.id)
    .run();

  const rows = await db
    .prepare('SELECT * FROM Message WHERE conversationId=? ORDER BY createdAt ASC LIMIT 200')
    .bind(conversationId)
    .all();
  return {
    messages: ((rows.results ?? []) as Array<Record<string, unknown>>).map((m) =>
      toMessageDto(
        {
          id: m.id as string,
          conversationId: m.conversationId as string,
          senderId: m.senderId as string,
          body: m.body as string,
          readAt: (m.readAt as number | null) ?? null,
          createdAt: m.createdAt as number,
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

  const now = nowMs();
  const id = newId();
  await db.batch([
    db
      .prepare('INSERT INTO Message(id,conversationId,senderId,body,readAt,createdAt) VALUES(?,?,?,?,NULL,?)')
      .bind(id, conversationId, user.id, text, now),
    db.prepare('UPDATE Conversation SET lastMessageAt=? WHERE id=?').bind(now, conversationId),
  ]);

  // Notifica al otro solo si no tenía mensajes míos sin leer (evita spam).
  const otherId = conv.clientId === user.id ? conv.courierId : conv.clientId;
  const unreadFromMe = await db
    .prepare('SELECT COUNT(*) AS n FROM Message WHERE conversationId=? AND senderId=? AND readAt IS NULL')
    .bind(conversationId, user.id)
    .first<{ n: number }>();
  if ((unreadFromMe?.n ?? 0) <= 1) {
    await db
      .prepare(
        "INSERT INTO Notification(id,userId,category,title,body,readAt,createdAt) VALUES(?,?,?,'Nuevo mensaje',?,NULL,?)"
      )
      .bind(newId(), otherId, 'mensaje', `${user.fullName}: ${text.slice(0, 90)}${text.length > 90 ? '…' : ''}`, now)
      .run();
  }

  return {
    message: toMessageDto(
      { id, conversationId, senderId: user.id, body: text, readAt: null, createdAt: now },
      user.id,
    ),
  };
}

// ─── /notifications ─────────────────────────────────────────────────────────
export async function listNotifications(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const rows = await env.D1_CORE
    .prepare('SELECT * FROM Notification WHERE userId=? ORDER BY createdAt DESC LIMIT 50')
    .bind(user.id)
    .all();
  return { notifications: ((rows.results ?? []) as Array<Record<string, unknown>>).map((n) => toNotificationDto({
    id: n.id as string,
    category: n.category as string,
    title: n.title as string,
    body: n.body as string,
    readAt: (n.readAt as number | null) ?? null,
    createdAt: n.createdAt as number,
  })) };
}

export async function markNotificationRead(request: Request, env: V2Env, id: string): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const db = env.D1_CORE;
  const notification = await db.prepare('SELECT id, userId, readAt FROM Notification WHERE id=? LIMIT 1').bind(id).first<{ id: string; userId: string; readAt: number | null }>();
  if (!notification || notification.userId !== user.id) throw new HttpError(404, 'Notificación no encontrada.');
  if (!notification.readAt) {
    await db.prepare('UPDATE Notification SET readAt=? WHERE id=?').bind(nowMs(), id).run();
  }
  return { ok: true };
}
