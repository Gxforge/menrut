// MENRUT v2 — Ranking de mensajeros (solo lectura, panel admin).
// Lee entregas y reseñas de los nueve shards y el directorio del núcleo.
// No escribe nada: la publicación y los premios vienen en fases posteriores.
import { HttpError, nowMs, requireRole, type V2Env } from './core';
import { requireAuth } from './identity';
import {
  buildRanking,
  currentQuarterCode,
  LIST_SIZE,
  municipalityPublished,
  quarterBounds,
  type CourierQuarterStat,
  type QuarterBounds,
  type RankedCourier,
} from './ranking-core';

type Row = Record<string, unknown>;

/** Como fanoutCounts, pero sin omitir shards: un shard caído dejaría el ranking incompleto. */
async function fanoutStrict(env: V2Env, sql: string): Promise<Row[]> {
  const registry = await env.D1_CORE.prepare('SELECT shard_id FROM shard_registry WHERE enabled=1').all();
  const rows: Row[] = [];
  for (const r of (registry.results ?? []) as Array<{ shard_id: number }>) {
    const binding = `D1_SHARD_${String(r.shard_id).padStart(2, '0')}` as const;
    const db = env[binding];
    if (!db) throw new HttpError(503, `El shard ${r.shard_id} no está disponible. El ranking no se puede calcular.`);
    try {
      const res = await db.prepare(sql).all();
      rows.push(...((res.results ?? []) as Row[]));
    } catch {
      throw new HttpError(503, `El shard ${r.shard_id} no responde. El ranking no se puede calcular.`);
    }
  }
  return rows;
}

interface Names {
  provinces: Map<string, string>;
  municipalities: Map<string, string>;
}

/** Carga las estadísticas del trimestre y el ranking completo. */
async function loadRanking(env: V2Env, b: QuarterBounds) {
  const [deliveries, reviews, directory, approvals, provinces, municipalities] = await Promise.all([
    fanoutStrict(
      env,
      `SELECT courier_id AS courierId, COUNT(*) AS n FROM delivery_verifications
       WHERE confirmed_at >= ${b.startsAt} AND confirmed_at < ${b.endsAt} AND cancelled_at IS NULL
       GROUP BY courier_id`,
    ),
    fanoutStrict(
      env,
      `SELECT courier_id AS courierId, COUNT(*) AS n, COALESCE(SUM(rating), 0) AS s FROM reviews
       WHERE status = 'published' AND created_at >= ${b.startsAt} AND created_at < ${b.endsAt}
       GROUP BY courier_id`,
    ),
    env.D1_CORE.prepare(
      `SELECT d.user_id AS courierId, d.name, d.slug, d.province_id AS provinceId,
              d.municipality_id AS municipalityId
       FROM public_courier_directory d JOIN global_accounts a ON a.user_id = d.user_id
       WHERE a.status = 'active' AND d.is_demo = 0 AND d.is_verified = 1`,
    ).all(),
    env.D1_CORE.prepare(
      `SELECT courier_id AS courierId, MIN(reviewed_at) AS t FROM courier_verifications
       WHERE status = 'approved' GROUP BY courier_id`,
    ).all(),
    env.D1_CORE.prepare('SELECT id, name FROM Province').all(),
    env.D1_CORE.prepare('SELECT id, name FROM Municipality').all(),
  ]);

  const dMap = new Map(deliveries.map((r) => [String(r.courierId), Number(r.n)]));
  const rMap = new Map(reviews.map((r) => [String(r.courierId), { n: Number(r.n), s: Number(r.s) }]));
  const tMap = new Map(((approvals.results ?? []) as Row[]).map((r) => [String(r.courierId), Number(r.t)]));
  const now = Math.floor(nowMs() / 1000);

  const stats: CourierQuarterStat[] = ((directory.results ?? []) as Row[]).map((d) => {
    const id = String(d.courierId);
    const rv = rMap.get(id);
    return {
      courierId: id,
      name: String(d.name),
      slug: String(d.slug),
      provinceId: d.provinceId ? String(d.provinceId) : null,
      municipalityId: d.municipalityId ? String(d.municipalityId) : null,
      deliveries: dMap.get(id) ?? 0,
      reviewCount: rv?.n ?? 0,
      ratingSum: rv?.s ?? 0,
      verifiedSince: tMap.get(id) ?? now,
    };
  });

  const verifiedByMunicipality = new Map<string, number>();
  for (const s of stats) {
    if (s.municipalityId) verifiedByMunicipality.set(s.municipalityId, (verifiedByMunicipality.get(s.municipalityId) ?? 0) + 1);
  }
  const names: Names = {
    provinces: new Map(((provinces.results ?? []) as Row[]).map((r) => [String(r.id), String(r.name)])),
    municipalities: new Map(((municipalities.results ?? []) as Row[]).map((r) => [String(r.id), String(r.name)])),
  };
  return { ranking: buildRanking(stats, verifiedByMunicipality), names };
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = raw === null ? NaN : Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function publicItem(c: RankedCourier) {
  return {
    position: c.position,
    courierId: c.courierId,
    name: c.name,
    slug: c.slug,
    provinceId: c.provinceId,
    municipalityId: c.municipalityId,
    deliveries: c.deliveries,
    reviewCount: c.reviewCount,
    ratingAvg: c.ratingAvg,
    index: c.index,
    prizePercent: c.prizePercent,
  };
}

// ─── GET /admin/ranking?quarter=2026-Q4&scope=national|province|municipality&area=ID&offset=0&limit=20 ───
export async function adminRanking(request: Request, env: V2Env, url: URL): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user.role, 'admin');

  const quarter = url.searchParams.get('quarter') ?? currentQuarterCode(nowMs());
  const bounds = quarterBounds(quarter);
  if (!bounds) throw new HttpError(400, 'Trimestre no válido. Usa el formato 2026-Q4.');

  const scope = url.searchParams.get('scope') ?? 'national';
  if (scope !== 'national' && scope !== 'province' && scope !== 'municipality') {
    throw new HttpError(400, 'Ámbito no válido.');
  }
  const area = url.searchParams.get('area');
  if (scope !== 'national' && !area) throw new HttpError(400, 'Falta el área (provincia o municipio).');

  const offset = clampInt(url.searchParams.get('offset'), 0, 0, LIST_SIZE - 1);
  const limit = clampInt(url.searchParams.get('limit'), 20, 1, 20);

  const { ranking, names } = await loadRanking(env, bounds);
  let list: RankedCourier[] = [];
  let areaInfo: { id: string; name: string } | null = null;
  let published = true;
  let verifiedCount = 0;

  if (scope === 'national') {
    list = ranking.national;
  } else if (scope === 'province') {
    const name = area ? names.provinces.get(area) : undefined;
    if (!area || !name) throw new HttpError(404, 'Provincia no encontrada.');
    areaInfo = { id: area, name };
    list = ranking.byProvince.get(area) ?? [];
  } else {
    const name = area ? names.municipalities.get(area) : undefined;
    if (!area || !name) throw new HttpError(404, 'Municipio no encontrado.');
    areaInfo = { id: area, name };
    verifiedCount = ranking.verifiedByMunicipality.get(area) ?? 0;
    published = municipalityPublished(verifiedCount);
    list = published ? (ranking.byMunicipality.get(area) ?? []) : [];
  }

  const top = list.slice(0, LIST_SIZE);
  const items = top.slice(offset, offset + limit).map(publicItem);
  return {
    quarter: { code: bounds.code, startsAt: bounds.startsAt, endsAt: bounds.endsAt },
    scope,
    area: areaInfo,
    published,
    verifiedCount: scope === 'municipality' ? verifiedCount : null,
    eligibleCount: ranking.eligibleCount,
    total: top.length,
    offset,
    limit,
    hasMore: offset + limit < top.length,
    items,
    computedAt: Math.floor(nowMs() / 1000),
  };
}
