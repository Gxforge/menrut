// MENRUT v2 — Panel de administración (4/4): VISOR DE BASES DE DATOS EN VIVO.
// Muestra el sistema completo conectado, con sondas reales en cada petición:
//   · D1_CORE (menrut-core) + su registro de shards y puntero round-robin.
//   · Los 9 shards (menrut-shard-01…09) sondeados por su binding D1 real.
//   · Los 2 proyectos Supabase: principal (producción, Auth+Storage) y
//     secundario (RESERVADO — entorno de pruebas, sin reparto de usuarios).
// No usa tokens de gestión: los sondeos van por bindings y endpoints públicos.
import { nowMs, requireRole, type V2Env } from './core';
import { requireAuth } from './identity';

const SECONDARY_SUPABASE_URL = 'https://apbmvyuyoiqwtpelxjck.supabase.co'; // menrut-secundario (reservado)
const SECONDARY_REF = 'apbmvyuyoiqwtpelxjck';

interface ShardRegistryRow {
  shard_id: number;
  binding: string;
  enabled: number;
  size_bytes: number;
  capacity_bytes: number;
  measured_at: number | null;
  schema_version: number;
}

async function countOn(db: D1Database, sql: string): Promise<number> {
  try {
    const row = await db.prepare(sql).first<{ n: number }>();
    return row?.n ?? 0;
  } catch {
    return -1; // -1 = shard no respondió
  }
}

async function probeSupabase(url: string, apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: apiKey },
      signal: AbortSignal.timeout(5000),
    });
    // Cualquier respuesta del servicio (200 o 401 por clave de otro proyecto)
    // demuestra que está en línea; solo 5xx o fallo de red cuentan como caído.
    return res.status > 0 && res.status < 500;
  } catch {
    return false;
  }
}

// ─── GET /admin/databases ───────────────────────────────────────────────────
export async function adminDatabases(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user.role, 'admin');
  const db = env.D1_CORE;

  // ── CORE: identidad, proyección y registro del sistema ──
  const scalar = async (sql: string): Promise<number> => (await db.prepare(sql).first<{ n: number }>())?.n ?? 0;
  const [
    accounts,
    couriersPublic,
    paymentsPending,
    territories,
  ] = await Promise.all([
    scalar('SELECT COUNT(*) AS n FROM global_accounts'),
    scalar('SELECT COUNT(*) AS n FROM public_courier_directory WHERE visible=1'),
    scalar("SELECT COUNT(*) AS n FROM payment_proofs WHERE status='pending'"),
    scalar('SELECT COUNT(*) AS n FROM Municipality'),
  ]);
  const tables = await db
    .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'")
    .first<{ n: number }>();

  // ── Shards: registro + sonda en vivo por binding ──
  const registry = (
    (await db.prepare('SELECT * FROM shard_registry ORDER BY shard_id').all())
      .results ?? []
  ) as unknown as ShardRegistryRow[];
  const allocation = await db.prepare('SELECT last_shard FROM allocation_state WHERE id=1').first<{ last_shard: number }>();
  const assigned = (
    (await db.prepare('SELECT shard_id, COUNT(*) AS n FROM courier_shard_map GROUP BY shard_id').all())
      .results ?? []
  ) as Array<{ shard_id: number; n: number }>;
  const assignedBy = new Map(assigned.map((a) => [a.shard_id, a.n]));

  const shards: Array<Record<string, unknown>> = [];
  let totalSize = 0;
  let totalCouriers = 0;
  for (const reg of registry) {
    const binding = reg.binding as `D1_SHARD_${string}`;
    const shardDb = env[binding];
    let ok = false;
    let couriers = -1;
    let routes = -1;
    let reviews = -1;
    let wallets = -1;
    let pendingOutbox = -1;
    if (shardDb && reg.enabled === 1) {
      [couriers, routes, reviews, wallets, pendingOutbox] = await Promise.all([
        countOn(shardDb, 'SELECT COUNT(*) AS n FROM courier_profiles'),
        countOn(shardDb, 'SELECT COUNT(*) AS n FROM courier_routes'),
        countOn(shardDb, 'SELECT COUNT(*) AS n FROM reviews'),
        countOn(shardDb, 'SELECT COUNT(*) AS n FROM credit_wallets'),
        countOn(shardDb, 'SELECT COUNT(*) AS n FROM shard_outbox WHERE processed_at IS NULL'),
      ]);
      ok = couriers >= 0;
    }
    totalSize += reg.size_bytes ?? 0;
    totalCouriers += assignedBy.get(reg.shard_id) ?? 0;
    shards.push({
      id: reg.shard_id,
      binding: reg.binding,
      database: `menrut-shard-${String(reg.shard_id).padStart(2, '0')}`,
      role: `Shard ${String(reg.shard_id).padStart(2, '0')} · datos operativos de sus mensajeros`,
      enabled: reg.enabled === 1,
      ok,
      sizeBytes: reg.size_bytes ?? 0,
      capacityBytes: reg.capacity_bytes ?? 500000000,
      usedPct: reg.capacity_bytes ? Math.round(((reg.size_bytes ?? 0) / reg.capacity_bytes) * 1000) / 10 : 0,
      couriers: assignedBy.get(reg.shard_id) ?? 0,
      profiles: couriers,
      routes,
      reviews,
      wallets,
      pendingOutbox,
      schemaVersion: reg.schema_version,
      measuredAt: reg.measured_at ? new Date(reg.measured_at * 1000).toISOString() : null,
    });
  }

  // ── Supabase: principal (producción) + secundario (reservado) ──
  const [primaryHealthy, secondaryHealthy] = await Promise.all([
    probeSupabase(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY),
    probeSupabase(SECONDARY_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY),
  ]);
  const principalRef = env.SUPABASE_URL.replace('https://', '').split('.')[0];

  return {
    ok: true,
    checkedAt: new Date(nowMs()).toISOString(),
    core: {
      ok: true,
      name: 'menrut-core',
      binding: 'D1_CORE',
      role: 'Directorio central · identidad global, proyección pública, planes, pagos y round-robin',
      tables: tables?.n ?? 0,
      accounts,
      couriersPublic,
      paymentsPending,
      territories,
      shardsRegistered: registry.length,
      shardsEnabled: registry.filter((r) => r.enabled === 1).length,
      roundRobinLastShard: allocation?.last_shard ?? 0,
    },
    shards,
    supabase: {
      ok: primaryHealthy,
      projects: [
        {
          name: 'menrut-principal',
          ref: principalRef,
          url: env.SUPABASE_URL,
          region: 'us-east-1',
          role: 'Producción · Supabase Auth (JWT) + Storage (avatars y comprobantes)',
          reserved: false,
          healthy: primaryHealthy,
        },
        {
          name: 'menrut-secundario',
          ref: SECONDARY_REF,
          url: SECONDARY_SUPABASE_URL,
          region: 'us-east-1',
          role: 'Reservado · entorno de pruebas aislado. SIN reparto de usuarios ni respaldo automático.',
          reserved: true,
          healthy: secondaryHealthy,
        },
      ],
    },
    totals: {
      d1Databases: 1 + registry.length,
      totalSizeBytes: totalSize,
      couriersAssigned: totalCouriers,
    },
  };
}
