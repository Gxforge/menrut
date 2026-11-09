// /api/courier/me — GET dashboard del mensajero · PATCH perfil profesional (auth + courier).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  apiError,
  asInt,
  asString,
  CONTACT_PREFERENCES,
  COVERAGE_TYPES,
  HttpError,
  reconcileWallet,
  requireAuth,
  requireExactRole,
  SERVICE_TYPES,
} from '@/lib/auth-server'
import { activeMembershipWhere } from '@/lib/dto'
import type { CourierDashboardDto } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireExactRole(user, 'courier')

    let profile = await db.courierProfile.findUnique({ where: { userId: user.id } })
    if (!profile) {
      throw new HttpError(409, 'Tu perfil de mensajero no está creado. Cierra sesión y vuelve a entrar.')
    }

    // Reconciliación lazy de permanencia antes de exponer saldos.
    await reconcileWallet(profile.id)
    const fresh = await db.courierProfile.findUniqueOrThrow({
      where: { id: profile.id },
      include: { wallet: true },
    })

    const [activeRoutes, scheduledRoutes, pausedRoutes] = await Promise.all([
      db.route.count({ where: { courierId: profile.id, status: 'active' } }),
      db.route.count({ where: { courierId: profile.id, status: 'scheduled' } }),
      db.route.count({ where: { courierId: profile.id, status: 'paused' } }),
    ])
    const membership = await db.membership.findFirst({
      where: activeMembershipWhere(profile.id),
      orderBy: { expiresAt: 'desc' },
      include: { plan: true },
    })

    const dto: CourierDashboardDto = {
      isPublic: fresh.isPublic,
      verificationStatus: fresh.verificationStatus,
      coverageType: fresh.coverageType as CourierDashboardDto['coverageType'],
      ratingAvg: fresh.ratingAvg,
      ratingCount: fresh.ratingCount,
      verifiedDeliveries: fresh.verifiedDeliveries,
      activeRoutes,
      scheduledRoutes,
      pausedRoutes,
      wallet: {
        permanenceCredits: fresh.wallet?.permanenceCredits ?? 0,
        toolCredits: fresh.wallet?.toolCredits ?? 0,
        hasActiveMembership: !!membership,
        planName: membership?.plan.name ?? null,
        planExpiresAt: membership?.expiresAt.toISOString() ?? null,
      },
      courierId: fresh.id,
      hasUsedTrial: user.hasUsedTrial,
    }
    return NextResponse.json(dto)
  } catch (e) {
    return apiError(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireExactRole(user, 'courier')

    const profile = await db.courierProfile.findUnique({ where: { userId: user.id } })
    if (!profile) {
      throw new HttpError(409, 'Tu perfil de mensajero no está creado. Cierra sesión y vuelve a entrar.')
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const patch: Record<string, unknown> = {}

    if ('bio' in body) {
      const bio = asString(body.bio) ?? ''
      if (bio.length > 600) throw new HttpError(400, 'La biografía es demasiado larga (máx. 600).')
      patch.bio = bio.trim()
    }
    if ('yearsExperience' in body) {
      const years = asInt(body.yearsExperience)
      if (years === null || years < 0 || years > 60) {
        throw new HttpError(400, 'Los años de experiencia deben estar entre 0 y 60.')
      }
      patch.yearsExperience = years
    }
    if ('vehicleSummary' in body) {
      const v = asString(body.vehicleSummary) ?? ''
      if (v.length > 120) throw new HttpError(400, 'El resumen de vehículo es demasiado largo.')
      patch.vehicleSummary = v.trim()
    }
    if ('availabilityNote' in body) {
      const a = asString(body.availabilityNote) ?? ''
      if (a.length > 200) throw new HttpError(400, 'La nota de disponibilidad es demasiado larga.')
      patch.availabilityNote = a.trim()
    }
    if ('baseFeeCup' in body) {
      if (body.baseFeeCup === null) {
        patch.baseFeeCup = null
      } else {
        const fee = asInt(body.baseFeeCup)
        if (fee === null || fee < 0) throw new HttpError(400, 'La tarifa base debe ser un número positivo.')
        patch.baseFeeCup = fee
      }
    }
    if ('contactPreference' in body) {
      const c = asString(body.contactPreference) ?? ''
      if (!(CONTACT_PREFERENCES as readonly string[]).includes(c)) {
        throw new HttpError(400, 'Preferencia de contacto no válida.')
      }
      patch.contactPreference = c
    }
    // Tipo de mensajero: zone | municipal | provincial (corrección del propietario).
    if ('coverageType' in body) {
      const ct = asString(body.coverageType) ?? ''
      if (!(COVERAGE_TYPES as readonly string[]).includes(ct)) {
        throw new HttpError(400, 'Tipo de mensajero no válido (zona, municipal o provincial).')
      }
      patch.coverageType = ct
    }

    // Servicios: reemplazo completo (upsert de nuevos, borrado de quitados).
    if ('services' in body) {
      const raw = body.services
      if (!Array.isArray(raw)) throw new HttpError(400, 'Formato de servicios no válido.')
      const wanted = [
        ...new Set(raw.filter((s): s is string => typeof s === 'string' && (SERVICE_TYPES as readonly string[]).includes(s))),
      ]
      const existing = await db.courierService.findMany({ where: { courierId: profile.id } })
      const existingTypes = new Set(existing.map((s) => s.serviceType))
      for (const t of wanted) {
        if (!existingTypes.has(t)) {
          await db.courierService.create({ data: { courierId: profile.id, serviceType: t } })
        }
      }
      if (wanted.length > 0) {
        await db.courierService.deleteMany({
          where: { courierId: profile.id, serviceType: { notIn: wanted } },
        })
      } else {
        await db.courierService.deleteMany({ where: { courierId: profile.id } })
      }
    }

    if (Object.keys(patch).length > 0) {
      await db.courierProfile.update({ where: { id: profile.id }, data: patch })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
