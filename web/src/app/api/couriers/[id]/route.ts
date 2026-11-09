// GET /api/couriers/[id] — Pasaporte público del mensajero (PassportDto).
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, verifyRequest } from '@/lib/auth-server'
import { toReviewDto, toRouteDto } from '@/lib/dto'
import type { PassportDto } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const profile = await db.courierProfile.findUnique({
      where: { id },
      include: {
        user: true,
        services: true,
        coverage: { include: { municipality: true } },
        routes: {
          include: {
            originMunicipality: true,
            destinationMunicipality: true,
            originProvince: true,
            destinationProvince: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          where: { status: 'visible' },
          include: { author: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })
    if (!profile) {
      return NextResponse.json({ error: 'Mensajero no encontrado.' }, { status: 404 })
    }

    // Perfil oculto: solo el dueño (o admin) puede verlo.
    const auth = await verifyRequest(req)
    const isOwner = auth?.user.id === profile.userId
    const isAdmin = auth?.user.role === 'admin' || auth?.user.role === 'owner'
    if (!profile.isPublic && !isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Este pasaporte no está disponible públicamente.' },
        { status: 404 },
      )
    }

    const routes = isOwner
      ? profile.routes
      : profile.routes.filter((r) => r.status === 'active' || r.status === 'scheduled')

    const dto: PassportDto = {
      courierId: profile.id,
      userId: profile.user.id,
      fullName: profile.user.fullName,
      avatarUrl: profile.user.avatarUrl,
      isVerified: profile.verificationStatus === 'verified',
      verificationStatus: profile.verificationStatus,
      ratingAvg: profile.ratingAvg,
      ratingCount: profile.ratingCount,
      verifiedDeliveries: profile.verifiedDeliveries,
      bio: profile.bio,
      yearsExperience: profile.yearsExperience,
      vehicleSummary: profile.vehicleSummary,
      availabilityNote: profile.availabilityNote,
      feeCup: profile.baseFeeCup,
      contactPreference: profile.contactPreference,
      coverageType: profile.coverageType as PassportDto['coverageType'],
      services: profile.services.map((s) => s.serviceType),
      coverage: profile.coverage.map((c) => c.municipality.name),
      routes: routes.map((r) => toRouteDto(r)),
      reviews: profile.reviews.map(toReviewDto),
      isDemo: profile.isDemo,
    }
    return NextResponse.json(dto)
  } catch (e) {
    return apiError(e)
  }
}
