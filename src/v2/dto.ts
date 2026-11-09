// MENRUT v2 — Mapeadores de DTOs (contrato del frontend, ver web/src/lib/types.ts).
import { iso, type DbUser } from './core';

// ─── Rutas (con nombres de territorio ya resueltos por SQL) ─────────────────
export interface RouteRow {
  id: string;
  courierId: string;
  originMunicipalityId: string | null;
  destinationMunicipalityId: string | null;
  originProvinceId: string | null;
  destinationProvinceId: string | null;
  scope: string;
  stops: string;
  frequency: string;
  daysNote: string;
  serviceType: string;
  vehicleType: string;
  feeCup: number | null;
  status: string;
  nextDepartureAt: number | null;
  notes: string;
  isDemo: number;
  createdAt: number;
  originMunName: string | null;
  destMunName: string | null;
  originProvName: string | null;
  destProvName: string | null;
}

export const ROUTE_SELECT = `SELECT r.id, r.courierId, r.originMunicipalityId, r.destinationMunicipalityId,
 r.originProvinceId, r.destinationProvinceId, r.scope, r.stops, r.frequency, r.daysNote,
 r.serviceType, r.vehicleType, r.feeCup, r.status, r.nextDepartureAt, r.notes, r.isDemo, r.createdAt,
 om.name AS originMunName, dm.name AS destMunName, op.name AS originProvName, dp.name AS destProvName
 FROM Route r
 LEFT JOIN Municipality om ON om.id = r.originMunicipalityId
 LEFT JOIN Municipality dm ON dm.id = r.destinationMunicipalityId
 LEFT JOIN Province op ON op.id = r.originProvinceId
 LEFT JOIN Province dp ON dp.id = r.destinationProvinceId`;

export function toRouteDto(
  r: RouteRow,
  courierName?: string,
  courierId?: string,
): Record<string, unknown> {
  return {
    id: r.id,
    origin: r.originMunName ?? r.originProvName ?? '',
    destination: r.destMunName ?? r.destProvName ?? '',
    originId: r.originMunicipalityId,
    destinationId: r.destinationMunicipalityId,
    originProvinceId: r.originProvinceId,
    destinationProvinceId: r.destinationProvinceId,
    scope: (r.scope as 'municipal' | 'provincial') ?? 'municipal',
    stops: r.stops,
    frequency: r.frequency,
    daysNote: r.daysNote,
    serviceType: r.serviceType,
    vehicleType: r.vehicleType,
    feeCup: r.feeCup,
    status: r.status,
    nextDepartureAt: iso(r.nextDepartureAt),
    notes: r.notes,
    ...(courierName !== undefined ? { courierName } : {}),
    ...(courierId !== undefined ? { courierId } : {}),
  };
}

// ─── Usuario de sesión ──────────────────────────────────────────────────────
export function toSessionUser(u: DbUser): Record<string, unknown> {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    avatarUrl: u.avatarUrl,
    phone: u.phone,
  };
}

// ─── Planes y herramientas ──────────────────────────────────────────────────
export interface PlanRow {
  id: string;
  code: string;
  name: string;
  description: string;
  durationDays: number;
  priceCup: number;
  permanenceCredits: number;
  toolCredits: number;
  isActive: number;
  isTrial: number;
  isProposal: number;
  sortOrder: number;
}

export function planTier(p: PlanRow): string {
  if (p.isTrial) return 'trial';
  if (p.code.startsWith('featured-')) return 'featured';
  if (p.code.startsWith('pro-')) return 'pro';
  if (p.code.startsWith('basic-')) return 'basic';
  return 'basic';
}

export function toPlanDto(p: PlanRow): Record<string, unknown> {
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
    isTrial: !!p.isTrial,
    isProposal: !!p.isProposal,
    isActive: !!p.isActive,
    sortOrder: p.sortOrder,
  };
}

export interface ToolRow {
  id: string;
  code: string;
  name: string;
  description: string;
  tag: string;
  minPlanCode: string | null;
  creditCost: number;
  requiresActiveMembership: number;
  isActive: number;
  blockedMessage: string;
  sortOrder: number;
}

export function toToolDto(t: ToolRow): Record<string, unknown> {
  return {
    id: t.id,
    code: t.code,
    name: t.name,
    description: t.description,
    tag: t.tag,
    minPlanCode: t.minPlanCode,
    creditCost: t.creditCost,
    requiresActiveMembership: !!t.requiresActiveMembership,
    isActive: !!t.isActive,
    blockedMessage: t.blockedMessage,
    sortOrder: t.sortOrder,
  };
}

// ─── Reseñas y mensajes ─────────────────────────────────────────────────────
export function toReviewDto(
  r: { id: string; rating: number; comment: string; isVerified: number; response: string | null; createdAt: number },
  authorName: string,
): Record<string, unknown> {
  return {
    id: r.id,
    authorName,
    rating: r.rating,
    comment: r.comment,
    isVerified: !!r.isVerified,
    response: r.response,
    createdAt: iso(r.createdAt),
  };
}

export function toMessageDto(
  m: { id: string; conversationId: string; senderId: string; body: string; readAt: number | null; createdAt: number },
  myUserId: string,
): Record<string, unknown> {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    mine: m.senderId === myUserId,
    body: m.body,
    readAt: iso(m.readAt),
    createdAt: iso(m.createdAt),
  };
}

export function toNotificationDto(n: {
  id: string;
  category: string;
  title: string;
  body: string;
  readAt: number | null;
  createdAt: number;
}): Record<string, unknown> {
  return {
    id: n.id,
    category: n.category,
    title: n.title,
    body: n.body,
    readAt: iso(n.readAt),
    createdAt: iso(n.createdAt),
  };
}

// ─── Carteras ───────────────────────────────────────────────────────────────
export interface WalletRow {
  id: string;
  courierId: string;
  permanenceCredits: number;
  toolCredits: number;
  lastConsumedAt: number | null;
}

export interface MembershipWithPlanRow {
  id: string;
  courierId: string;
  planId: string;
  startedAt: number;
  expiresAt: number;
  status: string;
  planName: string;
  planCode: string;
}

export function toWalletTransactionDto(t: {
  id: string;
  walletType: string;
  reason: string;
  reference: string | null;
  delta: number;
  balanceAfter: number;
  createdAt: number;
}): Record<string, unknown> {
  return {
    id: t.id,
    walletType: t.walletType,
    reason: t.reason,
    reference: t.reference,
    delta: t.delta,
    balanceAfter: t.balanceAfter,
    createdAt: iso(t.createdAt),
  };
}

export function toWalletDto(
  wallet: WalletRow | null,
  membership: MembershipWithPlanRow | null,
  isPublic: boolean,
  transactions: Array<{
    id: string;
    walletType: string;
    reason: string;
    reference: string | null;
    delta: number;
    balanceAfter: number;
    createdAt: number;
  }>,
): Record<string, unknown> {
  return {
    permanenceCredits: wallet?.permanenceCredits ?? 0,
    toolCredits: wallet?.toolCredits ?? 0,
    permanenceDaysLeft: Math.floor((wallet?.permanenceCredits ?? 0) / 10),
    hasActiveMembership: !!membership,
    planName: membership?.planName ?? null,
    planExpiresAt: membership ? iso(membership.expiresAt) : null,
    isPublic,
    transactions: transactions.map(toWalletTransactionDto),
  };
}

// ─── Comprobantes de pago ───────────────────────────────────────────────────
export interface PaymentProofRow {
  id: string;
  courierId: string;
  submittedBy: string;
  planId: string | null;
  amountCup: number;
  confirmedAmountCup: number | null;
  method: string;
  reference: string;
  proofUrl: string;
  status: string;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: number | null;
  createdAt: number;
  planName: string | null;
  planCode: string | null;
}

export const PAYMENT_PROOF_SELECT = `SELECT pp.id, pp.courierId, pp.submittedBy, pp.planId, pp.amountCup,
 pp.confirmedAmountCup, pp.method, pp.reference, pp.proofUrl, pp.status, pp.reviewNote,
 pp.reviewedBy, pp.reviewedAt, pp.createdAt, mp.name AS planName, mp.code AS planCode
 FROM PaymentProof pp LEFT JOIN MembershipPlan mp ON mp.id = pp.planId`;

/** Variante admin: añade datos del mensajero (usuario, nombre, correo, visibilidad). */
export const ADMIN_PAYMENT_PROOF_SELECT = `SELECT pp.id, pp.courierId, pp.submittedBy, pp.planId, pp.amountCup,
 pp.confirmedAmountCup, pp.method, pp.reference, pp.proofUrl, pp.status, pp.reviewNote,
 pp.reviewedBy, pp.reviewedAt, pp.createdAt, mp.name AS planName, mp.code AS planCode,
 cp.userId AS courierUserId, cp.isPublic AS courierIsPublic,
 cu.fullName AS courierName, cu.email AS courierEmail
 FROM PaymentProof pp
 LEFT JOIN MembershipPlan mp ON mp.id = pp.planId
 JOIN CourierProfile cp ON cp.id = pp.courierId
 JOIN User cu ON cu.id = cp.userId`;

export function toPaymentProofDto(p: PaymentProofRow): Record<string, unknown> {
  return {
    id: p.id,
    planId: p.planId,
    planName: p.planName ?? null,
    planCode: p.planCode ?? null,
    amountCup: p.amountCup,
    confirmedAmountCup: p.confirmedAmountCup,
    method: p.method,
    reference: p.reference,
    proofUrl: p.proofUrl,
    hasProof: !!p.proofUrl,
    status: p.status,
    reviewNote: p.reviewNote,
    reviewedAt: iso(p.reviewedAt),
    createdAt: iso(p.createdAt),
  };
}
