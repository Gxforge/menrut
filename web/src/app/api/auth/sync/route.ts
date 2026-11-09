// POST /api/auth/sync — Sincroniza la identidad Supabase con la BD operativa.
// Verifica el JWT con Supabase, busca el User por supabaseUserId o email y lo
// crea si no existe (con rol del body validado; admin por ADMIN_EMAILS).
// Para rol courier crea perfil + cartera + prueba gratuita (una sola vez) y
// reconcilia la permanencia con el reloj del servidor.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  activateTrialPlan,
  adminEmails,
  apiError,
  asString,
  checkRate,
  getSupabaseAdmin,
  moderatorEmails,
  ownerEmails,
  reconcileWallet,
} from '@/lib/auth-server'
import { toSessionUser } from '@/lib/dto'
import type { User } from '@prisma/client'

export const dynamic = 'force-dynamic'

const VALID_BODY_ROLES = ['client', 'courier', 'business']

export async function POST(req: NextRequest) {
  try {
    const header = req.headers.get('authorization') ?? ''
    const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
    if (!token) {
      return NextResponse.json({ error: 'Falta el token de sesión.' }, { status: 401 })
    }
    const { data, error } = await getSupabaseAdmin().auth.getUser(token)
    if (error || !data.user) {
      return NextResponse.json({ error: 'Sesión no válida. Inicia sesión de nuevo.' }, { status: 401 })
    }
    const su = data.user
    const email = (su.email ?? '').toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'La cuenta no tiene correo asociado.' }, { status: 400 })
    }
    checkRate(`sync:${su.id}`, 30, 60_000)

    const body: unknown = await req.json().catch(() => ({}))
    const bodyRole = asString((body as Record<string, unknown> | null)?.role)
    const wantedRole = VALID_BODY_ROLES.includes(bodyRole ?? '') ? bodyRole : null

    const metadata = (su.user_metadata ?? {}) as Record<string, unknown>
    const metaName =
      typeof metadata.full_name === 'string' && metadata.full_name.trim()
        ? metadata.full_name.trim()
        : null
    const fullName = metaName ?? email
    // Rol elegido al registrarse, guardado en user_metadata: sobrevive a la
    // confirmación por correo (el flujo de registro se corta y el rol se
    // aplica en el primer login). Solo se admite para cuentas nuevas.
    const metaRole = asString(metadata.account_role)
    const signupRole = VALID_BODY_ROLES.includes(metaRole ?? '') ? metaRole : null
    const isOwnerEmail = ownerEmails().includes(email)
    const isAdminEmail = !isOwnerEmail && adminEmails().includes(email)
    const isModeratorEmail =
      !isOwnerEmail && !isAdminEmail && moderatorEmails().includes(email)

    // Buscar por supabaseUserId o email; crear si no existe.
    let user: User | null =
      (await db.user.findUnique({ where: { supabaseUserId: su.id } })) ??
      (await db.user.findUnique({ where: { email } }))

    if (!user) {
      user = await db.user.create({
        data: {
          email,
          supabaseUserId: su.id,
          fullName,
          role: isOwnerEmail
            ? 'owner'
            : isAdminEmail
              ? 'admin'
              : isModeratorEmail
                ? 'moderator'
                : wantedRole ?? signupRole ?? 'client',
        },
      })
    } else {
      // Jerarquía: owner (nunca se degrada) > admin > moderador. Solo se sube
      // por listas de correos; PROHIBIDO otorgar owner/moderator/admin desde el body.
      const patch: Partial<User> = {}
      if (!user.supabaseUserId) patch.supabaseUserId = su.id
      if (isOwnerEmail && user.role !== 'owner') {
        patch.role = 'owner'
      } else if (isAdminEmail && user.role !== 'admin' && user.role !== 'owner') {
        patch.role = 'admin'
      } else if (
        isModeratorEmail &&
        (user.role === 'client' || user.role === 'business')
      ) {
        patch.role = 'moderator'
      }
      if (Object.keys(patch).length > 0) {
        user = await db.user.update({ where: { id: user.id }, data: patch })
      }
    }

    // Regla de seguridad (sección 7): el rol solo puede "subir" desde
    // cliente/negocio (flujo de registro). Nunca se otorga owner/moderator/
    // admin desde el body (solo listas de correos) ni se degrada un
    // mensajero, moderador o admin.
    const isStaffEmail = isOwnerEmail || isAdminEmail || isModeratorEmail
    const upgradeRole = wantedRole ?? signupRole
    if (
      !isStaffEmail &&
      (user.role === 'client' || user.role === 'business') &&
      upgradeRole &&
      user.role !== upgradeRole
    ) {
      user = await db.user.update({ where: { id: user.id }, data: { role: upgradeRole } })
    }

    // Perfil de mensajero + cartera + prueba gratuita (si corresponde).
    if (user.role === 'courier') {
      const profile = await db.courierProfile.findUnique({ where: { userId: user.id } })
      if (!profile) {
        const created = await db.courierProfile.create({ data: { userId: user.id } })
        await db.wallet.create({
          data: { courierId: created.id, permanenceCredits: 0, toolCredits: 0 },
        })
        if (!user.hasUsedTrial) {
          await activateTrialPlan(user.id, created.id)
          user = await db.user.findUniqueOrThrow({ where: { id: user.id } })
        }
      } else {
        // Reconciliación lazy de permanencia (regla 8.3) en cada sync.
        await reconcileWallet(profile.id)
      }
    }

    return NextResponse.json({ user: toSessionUser(user) })
  } catch (e) {
    return apiError(e)
  }
}
