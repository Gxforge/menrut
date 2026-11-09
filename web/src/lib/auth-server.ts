// MENRUT — Autenticación y helpers server-side (NUNCA importar desde el cliente).
// Verifica JWT de Supabase con SERVICE_ROLE (secreto de servidor), resuelve el
// User de la BD operativa y expone utilidades de créditos/auditoría/errores.
import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import type { User } from '@prisma/client'

// ─── Cliente admin de Supabase (singleton, server-only) ─────────────────────
let supabaseAdmin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Faltan credenciales de Supabase en el entorno.')
    supabaseAdmin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return supabaseAdmin
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

// Propietario: autoridad total (uno solo por diseño; puede listar varios correos).
export function ownerEmails(): string[] {
  return (process.env.OWNER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

// Moderadores: solo moderación (puede estar vacía).
export function moderatorEmails(): string[] {
  return (process.env.MODERATOR_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

// ─── Errores HTTP tipados ────────────────────────────────────────────────────
export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

export function apiError(e: unknown): NextResponse {
  if (e instanceof HttpError) return jsonError(e.status, e.message)
  console.error('[api]', e)
  return jsonError(500, 'Error interno del servidor. Inténtalo de nuevo.')
}

// ─── Jerarquía de roles de administración ───────────────────────────────────
// propietario (owner) > admin > moderador. El resto de roles (client, courier,
// business) quedan fuera de la jerarquía y se comprueban con rol exacto.
export type StaffRole = 'owner' | 'admin' | 'moderator'

export function roleRank(role: string): number {
  switch (role) {
    case 'owner':
      return 3
    case 'admin':
      return 2
    case 'moderator':
      return 1
    default:
      return 0
  }
}

// Exige un rol mínimo de la jerarquía de administración (owner > admin >
// moderador). El propietario pasa cualquier comprobación de admin/moderador.
export function requireRole(user: User, minRole: StaffRole): void {
  if (roleRank(user.role) < roleRank(minRole)) {
    throw new HttpError(403, 'No tienes permisos para realizar esta acción.')
  }
}

// Rol exacto para endpoints funcionales (p. ej. solo mensajeros).
export function requireExactRole(user: User, role: string): void {
  if (user.role !== role) {
    throw new HttpError(403, 'No tienes permisos para realizar esta acción.')
  }
}

// ─── Verificación de sesión ──────────────────────────────────────────────────
export interface AuthContext {
  user: User
  token: string
  supabaseUserId: string
  supabaseEmail: string | null
}

// Extrae el Bearer token, lo valida contra Supabase y devuelve el User de BD.
// Devuelve null si no hay token, es inválido o el usuario no está activo.
export async function verifyRequest(req: Request): Promise<AuthContext | null> {
  const header = req.headers.get('authorization') ?? ''
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  try {
    const { data, error } = await getSupabaseAdmin().auth.getUser(token)
    if (error || !data.user) return null
    const email = (data.user.email ?? '').toLowerCase()
    const user =
      (await db.user.findUnique({ where: { supabaseUserId: data.user.id } })) ??
      (email ? await db.user.findUnique({ where: { email } }) : null)
    if (!user || user.status !== 'active') return null
    return { user, token, supabaseUserId: data.user.id, supabaseEmail: email || null }
  } catch {
    return null
  }
}

// Variante estricta: exige sesión válida o responde 401.
export async function requireAuth(req: Request): Promise<AuthContext> {
  const auth = await verifyRequest(req)
  if (!auth) throw new HttpError(401, 'Sesión no válida. Inicia sesión de nuevo.')
  return auth
}

// ─── Rate limiting en memoria (operaciones sensibles) ────────────────────────
const rateBuckets = new Map<string, { count: number; resetAt: number }>()

export function checkRate(key: string, limit: number, windowMs: number): void {
  const now = Date.now()
  const bucket = rateBuckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }
  bucket.count += 1
  if (bucket.count > limit) {
    throw new HttpError(429, 'Demasiadas peticiones. Espera un momento e inténtalo de nuevo.')
  }
}

// ─── Validación de entradas (nunca confiar en el body) ──────────────────────
export function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null
}

export function asInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isInteger(v)) return v
  if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) return Number.parseInt(v.trim(), 10)
  return null
}

export function asBool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  return null
}

// ─── Auditoría ───────────────────────────────────────────────────────────────
export async function audit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  detail: string,
): Promise<void> {
  await db.auditLog.create({
    data: { actorId, action, entityType, entityId, detail },
  })
}

// ─── Créditos: reconciliación lazy de permanencia (regla 8.3) ───────────────
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000
const BLOCK_COST = 5 // 12h reales = 5 créditos

// Reconcilia la cartera de permanencia de un mensajero con el reloj del
// servidor. Debe llamarse al sincronizar, abrir el dashboard o leer la cartera.
export async function reconcileWallet(courierProfileId: string) {
  const wallet = await db.wallet.findUnique({ where: { courierId: courierProfileId } })
  if (!wallet) return null

  const now = new Date()

  if (wallet.permanenceCredits > 0 && wallet.lastConsumedAt) {
    const elapsed = now.getTime() - wallet.lastConsumedAt.getTime()
    const blocks = Math.floor(elapsed / TWELVE_HOURS_MS)
    if (blocks > 0) {
      const deduct = Math.min(wallet.permanenceCredits, blocks * BLOCK_COST)
      const remaining = wallet.permanenceCredits - deduct
      await db.wallet.update({
        where: { id: wallet.id },
        data: { permanenceCredits: remaining, lastConsumedAt: now },
      })
      await db.walletTransaction.create({
        data: {
          walletId: wallet.id,
          walletType: 'permanence',
          actorId: null,
          reason: 'Consumo de permanencia',
          reference: null,
          balanceBefore: wallet.permanenceCredits,
          delta: -deduct,
          balanceAfter: remaining,
        },
      })
      if (remaining === 0) {
        // Permanencia agotada: perfil oculto (NO se borra nada) y membresía activa vence.
        await db.courierProfile.update({
          where: { id: courierProfileId },
          data: { isPublic: false },
        })
        await db.membership.updateMany({
          where: { courierId: courierProfileId, status: 'active' },
          data: { status: 'expired' },
        })
      }
      return db.wallet.findUnique({ where: { id: wallet.id } })
    }
    return wallet
  }

  if (wallet.permanenceCredits > 0 && !wallet.lastConsumedAt) {
    // Primer acceso con saldo: arranca el consumo.
    return db.wallet.update({ where: { id: wallet.id }, data: { lastConsumedAt: now } })
  }

  return wallet
}

// ─── Activación del plan de prueba (una sola vez por cuenta) ─────────────────
// Crea Membership real + acredita créditos + transacción + notificación.
export async function activateTrialPlan(userId: string, courierProfileId: string) {
  const plan = await db.membershipPlan.findFirst({ where: { isTrial: true }, orderBy: { sortOrder: 'asc' } })
  if (!plan) return null

  const now = new Date()
  const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000)
  await db.membership.create({
    data: {
      courierId: courierProfileId,
      planId: plan.id,
      startedAt: now,
      expiresAt,
      status: 'active',
    },
  })
  await db.user.update({ where: { id: userId }, data: { hasUsedTrial: true } })

  const wallet = await db.wallet.findUnique({ where: { courierId: courierProfileId } })
  if (wallet && plan.permanenceCredits > 0) {
    const after = wallet.permanenceCredits + plan.permanenceCredits
    await db.wallet.update({ where: { id: wallet.id }, data: { permanenceCredits: after } })
    await db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        walletType: 'permanence',
        actorId: null,
        reason: `Prueba gratuita (${plan.durationDays} días)`,
        reference: plan.code,
        balanceBefore: wallet.permanenceCredits,
        delta: plan.permanenceCredits,
        balanceAfter: after,
      },
    })
  }

  await db.notification.create({
    data: {
      userId,
      category: 'membresia',
      title: 'Bienvenido a MENRUT',
      body: `Tu prueba gratuita de ${plan.durationDays} días está activa: ${plan.permanenceCredits} créditos de permanencia.`,
    },
  })
  return plan
}

// ─── Constantes de dominio ───────────────────────────────────────────────────
export const SERVICE_TYPES = ['paquetes', 'encargos', 'entregas_comerciales', 'otros'] as const
export const VEHICLE_TYPES = ['motor', 'auto', 'panel', 'camion', 'bicielectrica'] as const
export const ROUTE_STATUSES = ['active', 'scheduled', 'paused', 'closed'] as const
export const FREQUENCIES = ['diaria', 'semanal', 'personalizada', 'programada'] as const
export const CONTACT_PREFERENCES = ['chat', 'whatsapp', 'telefono'] as const
export const COVERAGE_TYPES = ['zone', 'municipal', 'provincial'] as const
export const ROUTE_SCOPES = ['municipal', 'provincial'] as const
export const PAYMENT_METHODS = ['transfermovil', 'transferencia', 'efectivo', 'otro'] as const

