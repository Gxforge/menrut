// MENRUT v2 — Núcleo del backend operativo (Cloudflare Pages Functions + D1).
// Verifica JWT de Supabase por JWKS (ES256/RS256), resuelve el User operativo,
// aplica jerarquía de roles, rate limiting por bucket D1 y auditoría.
import { createRemoteJWKSet } from 'jose';
import { verifyIdentity } from '../core/tokens';

// ─── Entorno v2 ─────────────────────────────────────────────────────────────
export interface V2Env {
  D1_CORE: D1Database;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ALLOWED_ORIGIN: string;
  OWNER_EMAILS: string;
  ADMIN_EMAILS: string;
  MODERATOR_EMAILS: string;
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

export function requireRole(user: DbUser, minRole: StaffRole): void {
  if (roleRank(user.role) < roleRank(minRole)) {
    throw new HttpError(403, 'No tienes permisos para realizar esta acción.');
  }
}

export function requireExactRole(user: DbUser, role: string): void {
  if (user.role !== role) {
    throw new HttpError(403, 'No tienes permisos para realizar esta acción.');
  }
}

// ─── Usuario operativo (fila de la tabla User) ──────────────────────────────
export interface DbUser {
  id: string;
  email: string;
  supabaseUserId: string | null;
  role: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  hasUsedTrial: number;
  isDemo: number;
  createdAt: number;
  updatedAt: number;
}

function rowToUser(r: Record<string, unknown>): DbUser {
  return {
    id: r.id as string,
    email: r.email as string,
    supabaseUserId: (r.supabaseUserId as string | null) ?? null,
    role: r.role as string,
    fullName: r.fullName as string,
    phone: (r.phone as string | null) ?? null,
    avatarUrl: (r.avatarUrl as string | null) ?? null,
    status: r.status as string,
    hasUsedTrial: (r.hasUsedTrial as number) ?? 0,
    isDemo: (r.isDemo as number) ?? 0,
    createdAt: r.createdAt as number,
    updatedAt: r.updatedAt as number,
  };
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
    // dentro del JWT verificado: respaldo para sync cuando el body no lo trae.
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

export interface AuthContext {
  user: DbUser;
  token: string;
  supabaseUserId: string;
  supabaseEmail: string | null;
}

export async function requireAuth(request: Request, env: V2Env): Promise<AuthContext> {
  const identity = await verifySupabaseToken(request, env);
  if (!identity) throw new HttpError(401, 'Sesión no válida. Inicia sesión de nuevo.');
  const user = await findUserByIdentity(env, identity);
  if (!user || user.status !== 'active') throw new HttpError(401, 'Sesión no válida. Inicia sesión de nuevo.');
  const header = request.headers.get('authorization') ?? '';
  return {
    user,
    token: header.slice(7).trim(),
    supabaseUserId: identity.sub,
    supabaseEmail: identity.email,
  };
}

/** Busca el User operativo por supabaseUserId o email (mismo orden que sync). */
export async function findUserByIdentity(env: V2Env, identity: SupabaseIdentity): Promise<DbUser | null> {
  const db = env.D1_CORE;
  const bySub = await db
    .prepare('SELECT * FROM User WHERE supabaseUserId=? LIMIT 1')
    .bind(identity.sub)
    .first();
  if (bySub) return rowToUser(bySub);
  if (identity.email) {
    const byEmail = await db
      .prepare('SELECT * FROM User WHERE email=? LIMIT 1')
      .bind(identity.email)
      .first();
    if (byEmail) return rowToUser(byEmail);
  }
  return null;
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
    'INSERT INTO AuditLog(id,actorId,action,entityType,entityId,detail,createdAt) VALUES(?,?,?,?,?,?,?)'
  )
    .bind(newId(), actorId, action, entityType, entityId, detail, nowMs())
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
