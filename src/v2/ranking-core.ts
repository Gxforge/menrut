// MENRUT v2 — Ranking de mensajeros: lógica pura (sin base de datos).
// Especificación: docs/ESPECIFICACION-RANKING-PREMIO.md. Solo cálculo, sin escritura.

export const RANK_WEIGHTS = { rating: 0.5, deliveries: 0.35, reviews: 0.15 } as const;
export const MIN_DELIVERIES = 10;
export const MIN_REVIEWS = 5;
export const MIN_VERIFIED_PER_MUNICIPALITY = 10;
/** Peso (en reseñas) de la media global en la valoración suavizada. */
export const BAYES_C = 5;
export const LIST_SIZE = 100;
export const PRIZE_PERCENTS = {
  national: [50],
  province: [35, 30, 25],
  municipality: [20, 15, 10],
} as const;

export type RankScope = 'national' | 'province' | 'municipality';

export interface CourierQuarterStat {
  courierId: string;
  name: string;
  slug: string;
  provinceId: string | null;
  municipalityId: string | null;
  /** Entregas verificadas (confirmadas y no canceladas) dentro del trimestre. */
  deliveries: number;
  /** Reseñas publicadas dentro del trimestre. */
  reviewCount: number;
  ratingSum: number;
  /** Momento (unix s) en que se aprobó la verificación; desempate por antigüedad. */
  verifiedSince: number;
}

export interface RankedCourier extends CourierQuarterStat {
  position: number;
  /** Índice combinado entre 0 y 1, redondeado a 4 decimales. */
  index: number;
  /** Media suavizada (escala 1–5). */
  bayesRating: number;
  /** Media real de estrellas (escala 1–5), redondeada a 2 decimales. */
  ratingAvg: number;
  prizePercent: number | null;
}

export interface QuarterBounds {
  code: string;
  startsAt: number;
  endsAt: number;
}

/** Desfase (segundos) de una zona horaria respecto a UTC en un instante dado. */
function offsetSeconds(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 1000);
}

/** Instante (unix s) de la medianoche local de una fecha dada en una zona horaria. */
function localMidnight(year: number, month0: number, timeZone: string): number {
  let guess = Date.UTC(year, month0, 1);
  for (let i = 0; i < 2; i++) guess = Date.UTC(year, month0, 1) - offsetSeconds(guess, timeZone) * 1000;
  return Math.floor(guess / 1000);
}

/** Límites de un trimestre natural («2026-Q4») en la zona horaria dada; endsAt es exclusivo. */
export function quarterBounds(code: string, timeZone = 'Europe/Madrid'): QuarterBounds | null {
  const m = /^(\d{4})-Q([1-4])$/.exec(code);
  if (!m) return null;
  const year = Number(m[1]);
  const startMonth = (Number(m[2]) - 1) * 3;
  const startsAt = localMidnight(year, startMonth, timeZone);
  const endsAt = localMidnight(year, startMonth + 3, timeZone);
  return { code, startsAt, endsAt };
}

/** Trimestre actual según la zona horaria dada, como «YYYY-Qn». */
export function currentQuarterCode(nowMs: number, timeZone = 'Europe/Madrid'): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(
    new Date(nowMs),
  );
  const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? 1);
  return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
}

/** Cumple todos los requisitos mínimos: entregas, reseñas y cuenta verificada (ya filtrada). */
export function isEligible(s: CourierQuarterStat): boolean {
  return s.deliveries >= MIN_DELIVERIES && s.reviewCount >= MIN_REVIEWS;
}

/** Media global de estrellas de un conjunto (prior para el suavizado bayesiano). */
export function priorMeanRating(stats: CourierQuarterStat[]): number {
  const reviews = stats.reduce((a, s) => a + s.reviewCount, 0);
  if (reviews === 0) return 0;
  return stats.reduce((a, s) => a + s.ratingSum, 0) / reviews;
}

/**
 * Ordena un ámbito y asigna posición e índice.
 * El índice normaliza entregas y reseñas frente al máximo del propio ámbito.
 */
export function rankScope(stats: CourierQuarterStat[], priorMean: number): RankedCourier[] {
  if (stats.length === 0) return [];
  const maxDeliveries = Math.max(...stats.map((s) => s.deliveries));
  const maxReviews = Math.max(...stats.map((s) => s.reviewCount));
  const scored = stats.map((s) => {
    const bayesRating = (s.ratingSum + BAYES_C * priorMean) / (s.reviewCount + BAYES_C);
    const index =
      RANK_WEIGHTS.rating * (bayesRating / 5) +
      RANK_WEIGHTS.deliveries * (s.deliveries / maxDeliveries) +
      RANK_WEIGHTS.reviews * (s.reviewCount / maxReviews);
    return { s, bayesRating, index };
  });
  scored.sort(
    (a, b) =>
      b.index - a.index ||
      b.s.deliveries - a.s.deliveries ||
      a.s.verifiedSince - b.s.verifiedSince ||
      (a.s.courierId < b.s.courierId ? -1 : a.s.courierId > b.s.courierId ? 1 : 0),
  );
  return scored.map((x, i) => ({
    ...x.s,
    position: i + 1,
    index: Math.round(x.index * 10000) / 10000,
    bayesRating: Math.round(x.bayesRating * 100) / 100,
    ratingAvg: x.s.reviewCount > 0 ? Math.round((x.s.ratingSum / x.s.reviewCount) * 100) / 100 : 0,
    prizePercent: null,
  }));
}

/** Porcentaje de premio para una posición dentro de un ámbito, o null si no hay premio. */
export function prizeFor(scope: RankScope, position: number): number | null {
  const tiers: readonly number[] = PRIZE_PERCENTS[scope];
  return position >= 1 && position <= tiers.length ? tiers[position - 1] : null;
}

export interface RankingResult {
  national: RankedCourier[];
  byProvince: Map<string, RankedCourier[]>;
  byMunicipality: Map<string, RankedCourier[]>;
  /** Mensajeros verificados y activos por municipio (no solo los elegibles). */
  verifiedByMunicipality: Map<string, number>;
  eligibleCount: number;
}

/**
 * Calcula todos los ámbitos. `stats` ya contiene solo cuentas activas, verificadas y no demo.
 * Solo entran en las listas los elegibles; el conteo de verificados sirve para publicar municipios.
 */
export function buildRanking(
  stats: CourierQuarterStat[],
  verifiedByMunicipality: Map<string, number>,
): RankingResult {
  const eligible = stats.filter(isEligible);
  const prior = priorMeanRating(eligible);
  const national = withPrizes(rankScope(eligible, prior), 'national');

  const byProvince = new Map<string, RankedCourier[]>();
  const byMunicipality = new Map<string, RankedCourier[]>();
  for (const [key, map] of [
    ['provinceId', byProvince],
    ['municipalityId', byMunicipality],
  ] as const) {
    const groups = new Map<string, CourierQuarterStat[]>();
    for (const s of eligible) {
      const id = s[key];
      if (!id) continue;
      groups.set(id, [...(groups.get(id) ?? []), s]);
    }
    for (const [id, list] of groups) {
      map.set(id, withPrizes(rankScope(list, prior), key === 'provinceId' ? 'province' : 'municipality'));
    }
  }
  return { national, byProvince, byMunicipality, verifiedByMunicipality, eligibleCount: eligible.length };
}

function withPrizes(list: RankedCourier[], scope: RankScope): RankedCourier[] {
  return list.map((c) => ({ ...c, prizePercent: prizeFor(scope, c.position) }));
}

/** Una lista municipal se publica solo con suficientes mensajeros verificados. */
export function municipalityPublished(verifiedCount: number): boolean {
  return verifiedCount >= MIN_VERIFIED_PER_MUNICIPALITY;
}
