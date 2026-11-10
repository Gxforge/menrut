// MENRUT v2 — Mapeadores de DTOs (contrato del frontend, ver web/src/lib/types.ts).
// v3: las rutas viven en el shard; el SELECT usa alias para mantener RouteRow.
import { iso } from './core';
import type { ShardWallet } from './wallet';

// ─── Rutas (nombres de territorio resueltos contra el catálogo de CORE) ─────
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

export const SHARD_ROUTE_SELECT = `SELECT r.id, r.user_id AS courierId,
 r.origin_id AS originMunicipalityId, r.destination_id AS destinationMunicipalityId,
 r.origin_province_id AS originProvinceId, r.destination_province_id AS destinationProvinceId,
 r.scope, r.stops, r.frequency, r.days_note AS daysNote, r.service_type AS serviceType,
 r.vehicle_type AS vehicleType, r.fee_cup AS feeCup, r.status,
 r.next_departure_at AS nextDepartureAt, r.notes, r.is_demo AS isDemo, r.created_at AS createdAt
 FROM courier_routes r`;

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
export function toSessionUser(u: {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
  phone: string | null;
}): Record<string, unknown> {
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

// ─── Carteras (permanencia en segundos → créditos legibles) ─────────────────
export function toWalletDto(
  wallet: ShardWallet | null,
  membership: { planName: string; expiresAtMs: number } | null,
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
  const remainingSeconds = wallet?.permanence_seconds ?? 0;
  return {
    permanenceCredits: Math.round(remainingSeconds / 8640),
    toolCredits: wallet?.tool_credits ?? 0,
    permanenceSeconds: remainingSeconds,
    permanenceDaysLeft: Math.floor(remainingSeconds / 86400),
    hasActiveMembership: !!membership,
    planName: membership?.planName ?? null,
    planExpiresAt: membership ? iso(membership.expiresAtMs) : null,
    isPublic,
    transactions,
  };
}

// ─── Comprobantes de pago (payment_proofs) ──────────────────────────────────
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

export const PAYMENT_PROOF_SELECT = `SELECT pp.id, pp.courier_id AS courierId, pp.submitted_by AS submittedBy,
 pp.plan_id AS planId, pp.amount_cup AS amountCup, pp.confirmed_amount_cup AS confirmedAmountCup,
 pp.method, pp.reference, pp.proof_url AS proofUrl, pp.status, pp.review_note AS reviewNote,
 pp.reviewed_by AS reviewedBy, pp.reviewed_at AS reviewedAt, pp.created_at AS createdAt,
 mp.name AS planName, mp.code AS planCode
 FROM payment_proofs pp LEFT JOIN MembershipPlan mp ON mp.id = pp.plan_id`;

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
    reviewedAt: iso(p.reviewedAt ? p.reviewedAt * 1000 : null),
    createdAt: iso(p.createdAt * 1000),
  };
}
