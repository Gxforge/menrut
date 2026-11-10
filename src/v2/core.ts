// MENRUT v2 — Núcleo del backend operativo (Cloudflare Pages Functions + D1).
// Verifica JWT de Supabase por JWKS (ES256/RS256), aplica jerarquía de roles,
// rate limiting por bucket D1, auditoría y acceso a Supabase Storage.
// v3: el entorno expone los 10 bindings D1 (CORE + 9 shards); la identidad
// operativa es global (global_accounts) y los datos del mensajero viven en su
// shard dueño (ver identity.ts y shard.ts).
import { createRemoteJWKSet } from 'jose';
import { verifyIdentity } from '../core/tokens';

// ─── Entorno v2 ─────────────────────────────────────────────────────────────
export interface V2Env {
  D1_CORE: D1Database;
  D1_SHARD_01: D1Database;
  D1_SHARD_02: D1Database;
  D1_SHARD_03: D1Database;
  D1_SHARD_04: D1Database;
  D1_SHARD_05: D1Database;
  D1_SHARD_06: D1Database;
  D1_SHARD_07: D1Database;
  D1_SHARD_08: D1Database;
  D1_SHARD_09: D1Database;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ALLOWED_ORIGIN: string;
  OWNER_EMAILS: string;
  ADMIN_EMAILS: string;
  MODERATOR_EMAILS: string;
  TRIAL_HMAC_SECRET: string;
  [key: `D1_SHARD_${string}`]: D1Database | undefined;
}

// ─── Errores HTTP ───────────────────────────────────────────────────────────
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ─── Utilidades básicas ─────────────────────────────────────────────────────
export function nowMs(): number {
  return Date.now();
}

export function iso(ms: number | null | undefined): string | null {
  return typeof ms === 'number' && ms !== null ? new Date(ms).toISOString() : null;
}

let idCounter = 0;
/** Identificador tipo cuid (colisiones despreciables, ordenable por tiempo). */
export function newId(): string {
  const t = Date.now().toString(36).padStart(9, '0');
  const rand = Math.random().toString(36).slice(2, 8);
  idCounter = (idCounter + 1) % 1296;
  return `c${t}${idCounter.toString(36).padStart(2, '0')}${rand}`;
}

export function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

export function asInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isInteger(v)) return v;
  if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) return Number.parseInt(v.trim(), 10);
  return null;
}

export function asBool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === '1' || v === 1) return true;
  if (v === 'false' || v === '0' || v === 0) return false;
  return null;
}

// ─── Listas de correos del equipo ───────────────────────────────────────────
function emailList(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
export function ownerEmails(env: V2Env): string[] {
  return emailList(env.OWNER_EMAILS);
}
export function adminEmails(env: V2Env): string[] {
  return emailList(env.ADMIN_EMAILS);
}
export function moderatorEmails(env: V2Env): string[] {
  return emailList(env.MODERATOR_EMAILS);
}

// ─── Jerarquía de roles ─────────────────────────────────────────────────────
export type StaffRole = 'owner' | 'admin' | 'moderator';

export function roleRank(role: string): number {
  switch (role) {
    case 'owner':
      return 3;
    case 'admin':
      return 2;
    case 'moderator':
      return 1;
    default:
      return 0;
  }
}

export function requireRole(role: string, minRole: StaffRole): void {
  if (roleRank(role) < roleRank(minRole)) {
    throw new HttpError(403, 'No tienes permisos para realizar esta acción.');
  }
}

export function requireExactRole(role: string, expected: string): void {
  if (role !== expected) {
    throw new HttpError(403, 'No tienes permisos para realizar esta acción.');
  }
}

// ─── Verificación de JWT (Supabase JWKS) ────────────────────────────────────
const keys = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export interface SupabaseIdentity {
  sub: string;
  email: string | null;
  fullName: string | null;
  accountRole: string | null;
}

export async function verifySupabaseToken(request: Request, env: V2Env): Promise<SupabaseIdentity | null> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  if (!env.SUPABASE_URL) throw new HttpError(503, 'Autenticación no configurada.');
  const issuer = `${env.SUPABASE_URL}/auth/v1`;
  let jwks = keys.get(issuer);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), { cacheMaxAge: 600000 });
    keys.set(issuer, jwks);
  }
  try {
    const payload = await verifyIdentity(token, jwks, issuer);
    const meta = (payload.user_metadata ?? {}) as Record<string, unknown>;
    const fullName =
      typeof meta.full_name === 'string' && meta.full_name.trim() ? meta.full_name.trim() : null;
    // Rol elegido al registrarse (client/courier/business), firmado por Supabase
    // dentro del JWT ya verificado. El staff NUNCA sale de metadatos de usuario:
    // solo de las listas de correos privadas del entorno.
    const accountRole =
      typeof meta.account_role === 'string' && meta.account_role.trim() ? meta.account_role.trim() : null;
    return {
      sub: payload.sub,
      email: typeof payload.email === 'string' ? payload.email.toLowerCase() : null,
      fullName,
      accountRole,
    };
  } catch {
    return null;
  }
}

// ─── Rate limiting (bucket D1 atómico) ──────────────────────────────────────
export async function checkRate(env: V2Env, key: string, limit: number, windowMs: number): Promise<void> {
  const now = nowMs();
  const bucket = `v2:${key}:${Math.floor(now / windowMs)}`;
  const resetAt = Math.floor(now / windowMs) * windowMs + windowMs;
  const row = await env.D1_CORE.prepare(
    `INSERT INTO rate_limit_buckets(bucket,hits,reset_at) VALUES(?,1,?)
     ON CONFLICT(bucket) DO UPDATE SET hits=rate_limit_buckets.hits+1 RETURNING hits`
  )
    .bind(bucket, Math.floor(resetAt / 1000))
    .first<{ hits: number }>();
  if (!row || row.hits > limit) {
    throw new HttpError(429, 'Demasiadas peticiones. Espera un momento e inténtalo de nuevo.');
  }
  if (row.hits === 1) {
    // Retención acotada (igual que v1): nunca se usa para asentar créditos.
    await env.D1_CORE.prepare(
      'DELETE FROM rate_limit_buckets WHERE bucket IN (SELECT bucket FROM rate_limit_buckets WHERE reset_at < ? LIMIT 100)'
    )
      .bind(Math.floor(now / 1000) - 3600)
      .run();
  }
}

// ─── Auditoría ──────────────────────────────────────────────────────────────
export async function audit(
  env: V2Env,
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  detail: string,
): Promise<void> {
  await env.D1_CORE.prepare(
    'INSERT INTO audit_events(id,actor_id,action,entity_type,entity_id,detail,created_at) VALUES(?,?,?,?,?,?,?)'
  )
    .bind(newId(), actorId, action, entityType, entityId, detail, Math.floor(nowMs() / 1000))
    .run();
}

// ─── Cliente REST de Supabase con service_role (solo servidor) ──────────────
function supabaseHeaders(env: V2Env): Record<string, string> {
  return {
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

/** Sube bytes a un bucket de Storage con service_role. Lanza HttpError(500) si falla. */
export async function supabaseUpload(
  env: V2Env,
  bucket: string,
  path: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const res = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURI(path)}`, {
    method: 'POST',
    headers: {
      ...supabaseHeaders(env),
      'Content-Type': contentType,
      'x-upsert': 'false',
      'Cache-Control': '3600',
    },
    body: bytes,
  });
  if (!res.ok) {
    throw new HttpError(500, 'No se pudo subir el archivo. Inténtalo de nuevo.');
  }
}

/** Elimina rutas de un bucket (best-effort, para reemplazos). */
export async function supabaseRemove(env: V2Env, bucket: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    await fetch(`${env.SUPABASE_URL}/storage/v1/object/${bucket}`, {
      method: 'DELETE',
      headers: { ...supabaseHeaders(env), 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: paths }),
    });
  } catch {
    /* best-effort */
  }
}

/** URL firmada (createSignedUrls en lote) para rutas internas de un bucket privado. */
export async function supabaseSignedUrls(
  env: V2Env,
  bucket: string,
  paths: string[],
  ttlSeconds: number,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const res = await fetch(`${env.SUPABASE_URL}/storage/v1/object/sign/${bucket}`, {
    method: 'POST',
    headers: { ...supabaseHeaders(env), 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: ttlSeconds, paths }),
  });
  if (!res.ok) return map;
  const data = (await res.json()) as Array<{ path?: string; signedURL?: string; signedUrl?: string }>;
  for (const item of data ?? []) {
    const signed = item.signedURL ?? item.signedUrl;
    if (item?.path && signed) {
      map.set(item.path, signed.startsWith('http') ? signed : `${env.SUPABASE_URL}/storage/v1${signed}`);
    }
  }
  return map;
}

// ─── Constantes de dominio ──────────────────────────────────────────────────
export const SERVICE_TYPES = ['paquetes', 'encargos', 'entregas_comerciales', 'otros'] as const;
export const VEHICLE_TYPES = ['motor', 'auto', 'panel', 'camion', 'bicielectrica'] as const;
export const ROUTE_STATUSES = ['active', 'scheduled', 'paused', 'closed'] as const;
export const FREQUENCIES = ['diaria', 'semanal', 'personalizada', 'programada'] as const;
export const CONTACT_PREFERENCES = ['chat', 'whatsapp', 'telefono'] as const;
export const COVERAGE_TYPES = ['zone', 'municipal', 'provincial'] as const;
export const ROUTE_SCOPES = ['municipal', 'provincial'] as const;
export const PAYMENT_METHODS = ['transfermovil', 'transferencia', 'efectivo', 'otro'] as const;
