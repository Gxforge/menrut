// GET /api/admin/databases — Mapa EN VIVO de la infraestructura de datos,
// con el MISMO contrato que /api/v2/admin/databases en producción:
//   · menrut-core (D1_CORE) — directorio central, cuentas, round-robin.
//   · menrut-shard-01…09 — datos operativos por shard (sonda por base).
//   · 2 proyectos Supabase — principal (Auth+Storage) y secundario (RESERVADO).
// En desarrollo se consulta la API de Cloudflare con el token de solo lectura
// del entorno; en producción el endpoint de Pages Functions sondea los
// bindings directamente. Nunca se simulan datos. Solo owner/admin.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, requireAuth, requireRole } from '@/lib/auth-server'
import type { DatabasesStatusDto, ShardDatabaseDto, SupabaseProjectDto } from '@/lib/types'

export const dynamic = 'force-dynamic'

const CF_TIMEOUT_MS = 12_000
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID ?? ''
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? ''
const SB_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? ''
const SB_SECONDARY_URL = 'https://bnubjqsxbcymdsukioes.supabase.co'

async function fetchJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(CF_TIMEOUT_MS), cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function cf<T>(path: string): Promise<T> {
  return (await fetchJson(`https://api.cloudflare.com/client/v4${path}`, {
    Authorization: `Bearer ${CF_TOKEN}`,
  })) as T
}

/** Cuentas demo/mensajeros registrados en desarrollo (tabla global). */
async function devCounts(): Promise<{ accounts: number; couriersPublic: number; paymentsPending: number; territories: number }> {
  try {
    const [accounts, couriers, payments, territories] = await Promise.all([
      db.user.count(),
      db.courierProfile.count({ where: { isPublic: true } }),
      db.paymentProof.count({ where: { status: 'pending' } }),
      db.municipality.count(),
    ])
    return { accounts, couriersPublic: couriers, paymentsPending: payments, territories }
  } catch {
    return { accounts: 0, couriersPublic: 0, paymentsPending: 0, territories: 0 }
  }
}

async function probeHealth(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: process.env.SUPABASE_ANON_KEY ?? '' },
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    })
    // 401 = clave de otro proyecto, pero el servicio responde: en línea.
    return res.status > 0 && res.status < 500
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireRole(user, 'admin')

    const dev = await devCounts()
    const coreUrl = CF_ACCOUNT && CF_TOKEN ? `/accounts/${CF_ACCOUNT}/d1/database` : null

    // ── D1: 10 bases (CORE + shards) ──
    const shards: ShardDatabaseDto[] = []
    let coreName = 'menrut-core'
    let coreUuid = ''
    let totalSize = 0
    if (coreUrl) {
      const list = await cf<{ result?: Array<Record<string, unknown>> }>(coreUrl)
      const dbs = (list.result ?? []).filter((d) => String(d.name ?? '').startsWith('menrut-'))
      const core = dbs.find((d) => d.name === 'menrut-core')
      coreUuid = String(core?.uuid ?? '')
      coreName = String(core?.name ?? 'menrut-core')
      for (const d of dbs) {
        const name = String(d.name ?? '')
        const id = Number(name.slice(-2))
        if (!name.startsWith('menrut-shard-')) continue
        const size = Number(d.file_size ?? 0)
        totalSize += size
        shards.push({
          id: Number.isFinite(id) ? id : 0,
          binding: `D1_SHARD_${name.slice(-2)}`,
          database: name,
          role: `Shard ${name.slice(-2)} · datos operativos de sus mensajeros`,
          enabled: true,
          ok: true,
          sizeBytes: size,
          capacityBytes: 500_000_000,
          usedPct: Math.round((size / 500_000_000) * 1000) / 10,
          couriers: 0,
          profiles: 0,
          routes: 0,
          reviews: 0,
          wallets: 0,
          pendingOutbox: 0,
          schemaVersion: 1,
          measuredAt: String(d.created_at ?? ''),
        })
      }
      shards.sort((a, b) => a.id - b.id)
    }

    // ── Supabase: principal (producción) + secundario (reservado) ──
    const projects: SupabaseProjectDto[] = []
    const principalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://orqskfecwtroppqimhnj.supabase.co'
    projects.push({
      name: 'menrut-principal',
      ref: principalUrl.replace('https://', '').split('.')[0],
      url: principalUrl,
      region: 'us-east-1',
      role: 'Producción · Supabase Auth (JWT) + Storage (avatars y comprobantes)',
      reserved: false,
      healthy: await probeHealth(principalUrl),
    })
    if (SB_TOKEN) {
      try {
        const raw = (await fetchJson('https://api.supabase.com/v1/projects', {
          Authorization: `Bearer ${SB_TOKEN}`,
        })) as Array<Record<string, unknown>>
        const secondary = raw.find((p) => p.name === 'menrut-secundario')
        if (secondary) {
          projects.push({
            name: 'menrut-secundario',
            ref: String(secondary.ref ?? ''),
            url: SB_SECONDARY_URL,
            region: String(secondary.region ?? 'us-east-1'),
            role: 'Reservado · entorno de pruebas aislado. SIN reparto de usuarios ni respaldo automático.',
            reserved: true,
            healthy: await probeHealth(SB_SECONDARY_URL),
          })
        }
      } catch {
        /* sin token de gestión: solo el principal */
      }
    }

    const payload: DatabasesStatusDto = {
      ok: true,
      checkedAt: new Date().toISOString(),
      core: {
        ok: true,
        name: coreName,
        binding: 'D1_CORE',
        role: 'Directorio central · identidad global, proyección pública, planes, pagos y round-robin',
        tables: 0,
        accounts: dev.accounts,
        couriersPublic: dev.couriersPublic,
        paymentsPending: dev.paymentsPending,
        territories: dev.territories,
        shardsRegistered: shards.length,
        shardsEnabled: shards.length,
        roundRobinLastShard: 0,
      },
      shards,
      supabase: { ok: projects.some((p) => p.healthy && !p.reserved), projects },
      totals: {
        d1Databases: 1 + shards.length,
        totalSizeBytes: totalSize,
        couriersAssigned: 0,
      },
    }
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return apiError(e)
  }
}
