// MENRUT v2 — Identidad global: resuelve el JWT de Supabase contra las tablas
// globales (global_accounts + user_roles + account_profiles). El id operativo
// de toda cuenta es su `sub` de Supabase (identidad global única). El staff
// (owner/admin/moderator) SOLO proviene de las listas de correos del entorno,
// jamás de metadatos de usuario.
import {
  adminEmails,
  asString,
  HttpError,
  moderatorEmails,
  nowMs,
  ownerEmails,
  verifySupabaseToken,
  type SupabaseIdentity,
  type V2Env,
} from './core';

/** Usuario operativo (contrato de sesión del frontend, ver lib/types.ts). */
export interface DbUser {
  id: string; // = sub de Supabase (identidad global)
  email: string;
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

export interface AuthContext {
  user: DbUser;
  supabaseUserId: string;
  supabaseEmail: string | null;
}

export const PUBLIC_ROLES = ['client', 'courier', 'business'] as const;
export type PublicRole = (typeof PUBLIC_ROLES)[number];

/** Rol de staff por listas de correos (owner > admin > moderador). */
export function staffRoleFor(env: V2Env, email: string | null): 'owner' | 'admin' | 'moderator' | null {
  if (!email) return null;
  const e = email.toLowerCase();
  if (ownerEmails(env).includes(e)) return 'owner';
  if (adminEmails(env).includes(e)) return 'admin';
  if (moderatorEmails(env).includes(e)) return 'moderator';
  return null;
}

interface AccountRow {
  user_id: string;
  status: string;
  created_at: number;
  role: string | null;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_path: string | null;
  has_trial: number;
}

function rowToUser(r: AccountRow): DbUser {
  return {
    id: r.user_id,
    email: r.email,
    role: r.role ?? 'client',
    fullName: r.full_name,
    phone: r.phone,
    avatarUrl: r.avatar_path,
    status: r.status,
    hasUsedTrial: r.has_trial,
    isDemo: 0,
    createdAt: r.created_at * 1000,
    updatedAt: r.created_at * 1000,
  };
}

const ACCOUNT_SQL = `SELECT a.user_id, a.status, a.created_at,
  (SELECT role FROM user_roles WHERE user_id = a.user_id
     ORDER BY CASE role WHEN 'courier' THEN 0 WHEN 'business' THEN 1 ELSE 2 END LIMIT 1) AS role,
  COALESCE(p.email,'') AS email, COALESCE(p.full_name,'Mi cuenta MENRUT') AS full_name,
  p.phone, p.avatar_path,
  EXISTS(SELECT 1 FROM trial_claims WHERE user_id = a.user_id) AS has_trial
  FROM global_accounts a LEFT JOIN account_profiles p ON p.user_id = a.user_id`;

/** Carga la cuenta global sin crear nada. null si no existe. */
export async function loadAccount(env: V2Env, sub: string): Promise<DbUser | null> {
  const row = await env.D1_CORE.prepare(`${ACCOUNT_SQL} WHERE a.user_id=? LIMIT 1`)
    .bind(sub)
    .first<AccountRow>();
  if (!row) return null;
  const user = rowToUser(row);
  // El staff (owner/admin/moderador) SIEMPRE proviene de las listas de correos
  // del entorno, en cada petición: jamás de metadatos ni del cuerpo.
  const staff = staffRoleFor(env, user.email || null);
  return staff ? { ...user, role: staff } : user;
}

/** Sesión obligatoria: JWT válido + cuenta global activa. */
export async function requireAuth(request: Request, env: V2Env): Promise<AuthContext> {
  const identity = await verifySupabaseToken(request, env);
  if (!identity) throw new HttpError(401, 'Sesión no válida. Inicia sesión de nuevo.');
  const user = await loadAccount(env, identity.sub);
  if (!user || user.status !== 'active') {
    throw new HttpError(401, 'Sesión no válida. Inicia sesión de nuevo.');
  }
  return { user, supabaseUserId: identity.sub, supabaseEmail: identity.email };
}

/**
 * Sincroniza la identidad Supabase con la cuenta global: la crea si es la
 * primera vez (rol público del body/metadatos firmados), actualiza el perfil
 * de visualización y devuelve el usuario de sesión. El staff solo sube por
 * listas de correos; el rol público puede cambiarse entre client/business/
 * courier en solicitudes posteriores (el asignador de shard es idempotente).
 */
export async function resolveAccount(
  env: V2Env,
  identity: SupabaseIdentity,
  bodyRole: string | null,
): Promise<DbUser> {
  const db = env.D1_CORE;
  const email = identity.email ?? '';
  const wantedRole = PUBLIC_ROLES.includes((bodyRole ?? '') as PublicRole)
    ? (bodyRole as PublicRole)
    : PUBLIC_ROLES.includes((identity.accountRole ?? '') as PublicRole)
      ? (identity.accountRole as PublicRole)
      : null;
  const staff = staffRoleFor(env, email);
  const now = Math.floor(nowMs() / 1000);

  // 1) Cuenta global + perfil de visualización (idempotentes).
  await db.batch([
    db.prepare('INSERT OR IGNORE INTO global_accounts(user_id) VALUES(?)').bind(identity.sub),
    db
      .prepare(
        `INSERT INTO account_profiles(user_id,email,full_name,updated_at) VALUES(?,?,?,?)
         ON CONFLICT(user_id) DO UPDATE SET email=excluded.email, updated_at=excluded.updated_at`
      )
      .bind(identity.sub, email, identity.fullName ?? email, now),
  ]);

  // 2) Rol público en user_roles. Cambio explícito: se sustituye el conjunto.
  const existing = await db.prepare('SELECT role FROM user_roles WHERE user_id=?').bind(identity.sub).all();
  const currentRoles = ((existing.results ?? []) as Array<{ role: string }>).map((r) => r.role);
  if (wantedRole && !currentRoles.includes(wantedRole)) {
    const stmts = [db.prepare('DELETE FROM user_roles WHERE user_id=?').bind(identity.sub)];
    if (wantedRole !== 'client') {
      stmts.push(db.prepare('INSERT INTO user_roles(user_id,role) VALUES(?,?)').bind(identity.sub, wantedRole));
    }
    await db.batch(stmts);
  } else if (currentRoles.length === 0 && !staff) {
    // Sin rol previo y sin elección: cliente.
    // (los courier crean su rol en el onboarding del sync)
  }

  // 3) Estado: la cuenta queda activa (los courier provisionan su shard aparte).
  await db
    .prepare("UPDATE global_accounts SET status='active' WHERE user_id=? AND status IN ('pending','provisioning')")
    .bind(identity.sub)
    .run();

  const user = await loadAccount(env, identity.sub);
  if (!user) throw new HttpError(500, 'No se pudo preparar la cuenta.');
  // El rol de sesión del staff prevalece (nunca se degrada por el body).
  if (staff) return { ...user, role: staff };
  return user;
}
