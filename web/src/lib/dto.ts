// MENRUT — Mapeadores de DTOs (contrato de src/lib/types.ts).
import type {
  Conversation,
  CourierProfile,
  Membership,
  MembershipPlan,
  Message,
  Municipality,
  PaymentProof,
  Province,
  Review,
  Route,
  Tool,
  User,
  Wallet,
  WalletTransaction,
} from '@prisma/client'
import type {
  ConversationDto,
  MessageDto,
  NotificationDto,
  PaymentProofDto,
  PlanDto,
  PlanTier,
  ReviewDto,
  Role,
  RouteDto,
  SessionUser,
  ToolDto,
  WalletDto,
  WalletTransactionDto,
} from '@/lib/types'

// Ruta con territorios incluidos: municipal (municipios) o provincial (provincias).
export type RouteWithTerritories = Route & {
  originMunicipality: Municipality | null
  destinationMunicipality: Municipality | null
  originProvince: Province | null
  destinationProvince: Province | null
}

export function toRouteDto(
  r: RouteWithTerritories,
  courierName?: string,
  courierId?: string,
): RouteDto {
  const scope = (r.scope as 'municipal' | 'provincial') ?? 'municipal'
  return {
    id: r.id,
    origin: r.originMunicipality?.name ?? r.originProvince?.name ?? '',
    destination: r.destinationMunicipality?.name ?? r.destinationProvince?.name ?? '',
    originId: r.originMunicipalityId,
    destinationId: r.destinationMunicipalityId,
    originProvinceId: r.originProvinceId,
    destinationProvinceId: r.destinationProvinceId,
    scope,
    stops: r.stops,
    frequency: r.frequency,
    daysNote: r.daysNote,
    serviceType: r.serviceType,
    vehicleType: r.vehicleType,
    feeCup: r.feeCup,
    status: r.status,
    nextDepartureAt: r.nextDepartureAt ? r.nextDepartureAt.toISOString() : null,
    notes: r.notes,
    ...(courierName !== undefined ? { courierName } : {}),
    ...(courierId !== undefined ? { courierId } : {}),
  }
}

export function toSessionUser(u: User): SessionUser {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role as Role,
    avatarUrl: u.avatarUrl,
    phone: u.phone,
  }
}

// Nivel comercial calculado del código del plan (basic-* | pro-* | featured-*).
export function planTier(p: MembershipPlan): PlanTier {
  if (p.isTrial) return 'trial'
  if (p.code.startsWith('featured-')) return 'featured'
  if (p.code.startsWith('pro-')) return 'pro'
  if (p.code.startsWith('basic-')) return 'basic'
  return 'basic'
}

export function toPlanDto(p: MembershipPlan): PlanDto {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    tier: planTier(p),
    durationDays: p.durationDays,
    priceCup: p.priceCup,
    permanenceCredits: p.permanenceCredits,
    toolCredits: p.toolCredits,
    isTrial: p.isTrial,
    isProposal: p.isProposal,
    isActive: p.isActive,
    sortOrder: p.sortOrder,
  }
}

export function toToolDto(t: Tool): ToolDto {
  return {
    id: t.id,
    code: t.code,
    name: t.name,
    description: t.description,
    tag: t.tag,
    minPlanCode: t.minPlanCode,
    creditCost: t.creditCost,
    requiresActiveMembership: t.requiresActiveMembership,
    isActive: t.isActive,
    blockedMessage: t.blockedMessage,
    sortOrder: t.sortOrder,
  }
}

export function toReviewDto(r: Review & { author: User }): ReviewDto {
  return {
    id: r.id,
    authorName: r.author.fullName,
    rating: r.rating,
    comment: r.comment,
    isVerified: r.isVerified,
    response: r.response,
    createdAt: r.createdAt.toISOString(),
  }
}

export function toMessageDto(m: Message, myUserId: string): MessageDto {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    mine: m.senderId === myUserId,
    body: m.body,
    readAt: m.readAt ? m.readAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
  }
}

export function toConversationDto(
  c: Conversation & { client: User; courier: User },
  myUserId: string,
  lastMessage: Pick<Message, 'body'> | null,
  unread: number,
): ConversationDto {
  const other = c.clientId === myUserId ? c.courier : c.client
  return {
    id: c.id,
    otherId: other.id,
    otherName: other.fullName,
    otherAvatar: other.avatarUrl,
    otherRole: other.role as Role,
    lastMessage: lastMessage?.body ?? '',
    lastMessageAt: c.lastMessageAt.toISOString(),
    unread,
  }
}

type NotificationLike = {
  id: string
  category: string
  title: string
  body: string
  readAt: Date | null
  createdAt: Date
}

export function toNotificationDto(n: NotificationLike): NotificationDto {
  return {
    id: n.id,
    category: n.category,
    title: n.title,
    body: n.body,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }
}

export function toWalletTransactionDto(t: WalletTransaction): WalletTransactionDto {
  return {
    id: t.id,
    walletType: t.walletType as 'permanence' | 'tools',
    reason: t.reason,
    reference: t.reference,
    delta: t.delta,
    balanceAfter: t.balanceAfter,
    createdAt: t.createdAt.toISOString(),
  }
}

// Membresía activa no expirada más reciente (si existe).
export function activeMembershipWhere(courierId: string) {
  return { courierId, status: 'active', expiresAt: { gt: new Date() } }
}

export type MembershipWithPlan = Membership & { plan: MembershipPlan }

export function toWalletDto(
  wallet: Wallet | null,
  membership: MembershipWithPlan | null,
  isPublic: boolean,
  transactions: WalletTransaction[],
): WalletDto {
  return {
    permanenceCredits: wallet?.permanenceCredits ?? 0,
    toolCredits: wallet?.toolCredits ?? 0,
    permanenceDaysLeft: Math.floor((wallet?.permanenceCredits ?? 0) / 10),
    hasActiveMembership: !!membership,
    planName: membership?.plan.name ?? null,
    planExpiresAt: membership?.expiresAt.toISOString() ?? null,
    isPublic,
    transactions: transactions.map(toWalletTransactionDto),
  }
}

export type CourierProfileWithUser = CourierProfile & { user: User }

// Comprobante de pago del mensajero (sin datos privados de revisión).
export type PaymentProofWithPlan = PaymentProof & { plan: MembershipPlan | null }

export function toPaymentProofDto(p: PaymentProofWithPlan): PaymentProofDto {
  return {
    id: p.id,
    planId: p.planId,
    planName: p.plan?.name ?? null,
    planCode: p.plan?.code ?? null,
    amountCup: p.amountCup,
    confirmedAmountCup: p.confirmedAmountCup,
    method: p.method,
    reference: p.reference,
    proofUrl: p.proofUrl,
    hasProof: !!p.proofUrl,
    status: p.status as PaymentProofDto['status'],
    reviewNote: p.reviewNote,
    reviewedAt: p.reviewedAt ? p.reviewedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  }
}
