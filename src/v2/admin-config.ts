// MENRUT v2 — Panel de administración (3/4): planes, herramientas, moderación
// (denuncias en shards + auditoría global), resumen del sistema y configuración.
import {
  asBool,
  asInt,
  asString,
  audit,
  HttpError,
  newId,
  requireRole,
  type V2Env,
} from './core';
import { requireAuth } from './identity';
import { fanoutCounts } from './admin';
import { toPlanDto, toToolDto, type PlanRow, type ToolRow } from './dto';

// ─── POST /admin/plans y /admin/tools (catálogos globales de CORE) ──────────
export async function adminSavePlan(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user.role, 'admin');
  const db = env.D1_CORE;

  const code = asString(body.code)?.trim() ?? '';
  const name = asString(body.name)?.trim() ?? '';
  if (!code) throw new HttpError(400, 'El plan necesita un código.');
  if (!name) throw new HttpError(400, 'El plan necesita un nombre.');

  const description = asString(body.description)?.trim() ?? '';
  const durationDays = asInt(body.durationDays);
  if (durationDays === null || durationDays <= 0) throw new HttpError(400, 'La duración debe ser un número de días mayor que cero.');
  const priceCup = asInt(body.priceCup);
  if (priceCup === null || priceCup < 0) throw new HttpError(400, 'Importe no válido.');
  const permanenceCredits = asInt(body.permanenceCredits);
  if (permanenceCredits === null || permanenceCredits < 0) throw new HttpError(400, 'Créditos de permanencia no válidos.');
  const toolCredits = asInt(body.toolCredits);
  if (toolCredits === null || toolCredits < 0) throw new HttpError(400, 'Créditos de herramientas no válidos.');
  const isActive = asBool(body.isActive) ?? true;
  const isProposal = asBool(body.isProposal) ?? true;
  const sortOrder = asInt(body.sortOrder) ?? 99;

  const existing = await db.prepare('SELECT id FROM MembershipPlan WHERE code=? LIMIT 1').bind(code).first<{ id: string }>();
  let planId = existing?.id;
  if (existing) {
    await db
      .prepare(
        'UPDATE MembershipPlan SET name=?, description=?, durationDays=?, priceCup=?, permanenceCredits=?, toolCredits=?, isActive=?, isTrial=0, isProposal=?, sortOrder=? WHERE id=?'
      )
      .bind(name, description, durationDays, priceCup, permanenceCredits, toolCredits, isActive ? 1 : 0, isProposal ? 1 : 0, sortOrder, existing.id)
      .run();
  } else {
    planId = newId();
    await db
      .prepare(
        "INSERT INTO MembershipPlan(id,code,name,description,durationDays,priceCup,permanenceCredits,toolCredits,isActive,isTrial,isProposal,sortOrder,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,0,?,?,strftime('%s','now'),strftime('%s','now'))"
      )
      .bind(planId, code, name, description, durationDays, priceCup, permanenceCredits, toolCredits, isActive ? 1 : 0, isProposal ? 1 : 0, sortOrder)
      .run();
  }

  await audit(env, user.id, 'plan.upsert', 'MembershipPlan', planId as string, `Plan ${code} (${name}) guardado.`);
  const plan = (await db.prepare('SELECT * FROM MembershipPlan WHERE id=? LIMIT 1').bind(planId).first()) as unknown as PlanRow;
  return { plan: toPlanDto(plan) };
}

export async function adminSaveTool(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user.role, 'admin');
  const db = env.D1_CORE;

  const code = asString(body.code)?.trim() ?? '';
  const name = asString(body.name)?.trim() ?? '';
  if (!code) throw new HttpError(400, 'La herramienta necesita un código.');
  if (!name) throw new HttpError(400, 'La herramienta necesita un nombre.');

  const description = asString(body.description)?.trim() ?? '';
  const tag = asString(body.tag)?.trim() || 'BÁSICO';
  const minPlanCodeRaw = body.minPlanCode;
  const minPlanCode =
    minPlanCodeRaw === null || minPlanCodeRaw === undefined || minPlanCodeRaw === ''
      ? null
      : asString(minPlanCodeRaw)?.trim() ?? null;
  const creditCost = asInt(body.creditCost);
  if (creditCost === null || creditCost < 0) throw new HttpError(400, 'El coste en créditos no es válido.');
  const requiresActiveMembership = asBool(body.requiresActiveMembership) ?? true;
  const isActive = asBool(body.isActive) ?? true;
  const blockedMessage = asString(body.blockedMessage)?.trim() ?? '';
  const sortOrder = asInt(body.sortOrder) ?? 99;

  const existing = await db.prepare('SELECT id FROM Tool WHERE code=? LIMIT 1').bind(code).first<{ id: string }>();
  let toolId = existing?.id;
  if (existing) {
    await db
      .prepare('UPDATE Tool SET name=?, description=?, tag=?, minPlanCode=?, creditCost=?, requiresActiveMembership=?, isActive=?, blockedMessage=?, sortOrder=? WHERE id=?')
      .bind(name, description, tag, minPlanCode, creditCost, requiresActiveMembership ? 1 : 0, isActive ? 1 : 0, blockedMessage, sortOrder, existing.id)
      .run();
  } else {
    toolId = newId();
    await db
      .prepare('INSERT INTO Tool(id,code,name,description,tag,minPlanCode,creditCost,requiresActiveMembership,isActive,blockedMessage,sortOrder) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
      .bind(toolId, code, name, description, tag, minPlanCode, creditCost, requiresActiveMembership ? 1 : 0, isActive ? 1 : 0, blockedMessage, sortOrder)
      .run();
  }

  await audit(env, user.id, 'tool.upsert', 'Tool', toolId as string, `Herramienta ${code} (${name}) guardada.`);
  const tool = (await db.prepare('SELECT * FROM Tool WHERE id=? LIMIT 1').bind(toolId).first()) as unknown as ToolRow;
  return { tool: toToolDto(tool) };
}

// ─── GET /admin/moderation (denuncias de los shards + auditoría global) ─────
export async function adminModeration(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user.role, 'moderator');
  const db = env.D1_CORE;

  const flagRows = await fanoutCounts(
    env,
    'SELECT id, courier_id, reporter_id, target_type, reason, status, created_at FROM report_flags ORDER BY created_at DESC LIMIT 100',
  );
  const reporterIds = [...new Set(flagRows.map((r) => r.reporter_id as string))];
  const names = new Map<string, string>();
  if (reporterIds.length > 0) {
    const accs = await db
      .prepare(`SELECT user_id, full_name FROM account_profiles WHERE user_id IN (${reporterIds.map(() => '?').join(',')})`)
      .bind(...reporterIds)
      .all();
    for (const a of (accs.results ?? []) as Array<{ user_id: string; full_name: string }>) names.set(a.user_id, a.full_name);
  }
  const reports = flagRows
    .sort((a, b) => (b.created_at as number) - (a.created_at as number))
    .map((r) => ({
      id: r.id,
      reporterName: names.get(r.reporter_id as string) ?? 'Usuario',
      targetType: r.target_type,
      targetId: r.target_id,
      reason: r.reason,
      status: r.status,
      createdAt: new Date((r.created_at as number) * 1000).toISOString(),
      shardId: r.shardId,
    }));

  const auditLogs = await db
    .prepare(
      `SELECT a.id, a.action, a.entity_type, a.entityId_alias, a.detail, a.created_at,
       p.full_name AS actorName
       FROM (SELECT id, action, entity_type, entity_id AS entityId_alias, detail, created_at, actor_id FROM audit_events) a
       LEFT JOIN account_profiles p ON p.user_id = a.actor_id
       ORDER BY a.created_at DESC LIMIT 50`
    )
    .all();

  return {
    reports,
    audit: ((auditLogs.results ?? []) as Array<Record<string, unknown>>).map((a) => ({
      id: a.id,
      actorName: (a.actorName as string | null) ?? 'Sistema',
      action: a.action,
      entityType: a.entityId_alias,
      entityId: a.entityId_alias,
      detail: a.detail,
      createdAt: new Date((a.created_at as number) * 1000).toISOString(),
    })),
  };
}

// ─── PATCH /admin/reports/:id (resolver denuncia en su shard) ───────────────
export async function adminResolveReport(
  request: Request,
  env: V2Env,
  id: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user.role, 'moderator');

  const status = asString(body.status) ?? '';
  if (status !== 'reviewed' && status !== 'dismissed') throw new HttpError(400, 'Estado no válido.');

  // La denuncia vive en el shard del mensajero implicado: se localiza y
  // actualiza allí (una sola escritura efectiva; el resto no cambia nada).
  const registry = await env.D1_CORE.prepare('SELECT shard_id FROM shard_registry WHERE enabled=1').all();
  let updated = false;
  for (const r of ((registry.results ?? []) as Array<{ shard_id: number }>)) {
    const binding = `D1_SHARD_${String(r.shard_id).padStart(2, '0')}` as const;
    const db = env[binding];
    if (!db) continue;
    const res = await db.prepare('UPDATE report_flags SET status=? WHERE id=? AND status=?').bind(status, id, 'open').run();
    if ((res.meta?.changes ?? 0) > 0) {
      updated = true;
      break;
    }
  }
  if (!updated) throw new HttpError(404, 'Reporte no encontrado o ya resuelto.');

  await audit(env, user.id, 'report.resolved', 'report_flags', id, `Reporte marcado como ${status}.`);
  return { ok: true };
}

// ─── /admin/config (PlatformConfig; claves de pago solo el propietario) ──────
const OWNER_ONLY_KEYS = ['payment_method', 'payment_card', 'payment_phone', 'payment_note'];

export async function adminGetConfig(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user.role, 'admin');
  const rows = await env.D1_CORE.prepare('SELECT key, value FROM PlatformConfig').all();
  const config: Record<string, string> = {};
  for (const r of (rows.results ?? []) as Array<{ key: string; value: string }>) config[r.key] = r.value;
  return { config };
}

export async function adminSaveConfig(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user.role, 'admin');
  const db = env.D1_CORE;

  const config = body.config;
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new HttpError(400, 'Formato de configuración no válido.');
  }
  const entries = Object.entries(config as Record<string, unknown>).filter(
    ([k, v]) => typeof k === 'string' && k.trim().length > 0 && typeof v === 'string',
  ) as [string, string][];
  if (entries.length === 0) throw new HttpError(400, 'No hay claves válidas que guardar.');

  if (entries.some(([k]) => OWNER_ONLY_KEYS.includes(k))) {
    requireRole(user.role, 'owner');
  }

  const stmts: D1PreparedStatement[] = [];
  for (const [key, value] of entries) {
    stmts.push(
      db
        .prepare('INSERT INTO PlatformConfig(key,value,updatedAt) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=excluded.updatedAt')
        .bind(key, value, nowSec()),
    );
  }
  await db.batch(stmts);

  await audit(env, user.id, 'config.update', 'PlatformConfig', 'global', `Claves actualizadas: ${entries.map(([k]) => k).join(', ')}.`);
  return { ok: true };
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}
