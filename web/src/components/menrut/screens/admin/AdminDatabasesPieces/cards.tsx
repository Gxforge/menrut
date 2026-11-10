// MENRUT — Administración · Bases de datos: piezas de presentación del visor.
// Cada tarjeta consume el DTO en vivo que devuelve /admin/databases (sondas
// reales por binding D1 + salud de los proyectos Supabase).
'use client'

import { Boxes, Database, HardDrive, Route, Server, Star, Table2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CoreDatabaseDto, ShardDatabaseDto, SupabaseProjectDto } from '@/lib/types'

export function fmtBytes(n: number): string {
  if (!n) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

/** Semáforo de estado (pulso). */
export function Pulse({ ok }: { ok: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
      <span
        className={cn('absolute inline-flex h-full w-full rounded-full opacity-60', ok ? 'animate-ping bg-success' : 'bg-danger')}
      />
      <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', ok ? 'bg-success' : 'bg-danger')} />
    </span>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-soft">{label}</span>
      <span className="text-sm font-bold text-primary">{value}</span>
    </div>
  )
}

/** Tarjeta del directorio central (menrut-core · D1_CORE). */
export function CoreCard({ core }: { core: CoreDatabaseDto }) {
  return (
    <article className="rounded-2xl border border-line bg-card p-4">
      <header className="mb-3 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground" aria-hidden>
          <Database className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-bold text-primary">{core.name}</h3>
            <Pulse ok={core.ok} />
          </div>
          <p className="truncate text-xs text-soft">{core.binding} · {core.role}</p>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-blue">CENTRAL</span>
      </header>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        <Stat label="Tablas" value={core.tables} />
        <Stat label="Cuentas" value={core.accounts} />
        <Stat label="En directorio" value={core.couriersPublic} />
        <Stat label="Territorios" value={core.territories} />
        <Stat label="Pagos pend." value={core.paymentsPending} />
        <Stat label="Shards" value={`${core.shardsEnabled}/${core.shardsRegistered}`} />
        <Stat label="Round-robin" value={`→ ${core.roundRobinLastShard + 1}`} />
        <Stat label="Estado" value={core.ok ? 'En línea' : 'Error'} />
      </div>
    </article>
  )
}

/** Tarjeta de un shard (datos operativos de sus mensajeros). */
export function ShardCard({ shard }: { shard: ShardDatabaseDto }) {
  const online = shard.enabled && shard.ok
  return (
    <article className="rounded-2xl border border-line bg-card p-4">
      <header className="mb-3 flex items-center gap-2.5">
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black',
            online ? 'bg-secondary text-blue' : 'bg-surface text-soft',
          )}
          aria-hidden
        >
          {String(shard.id).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-bold text-primary">{shard.database}</h3>
            <Pulse ok={online} />
          </div>
          <p className="truncate text-[11px] text-soft">{shard.binding}</p>
        </div>
        {!shard.enabled && (
          <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-soft">Inactivo</span>
        )}
      </header>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <span className="flex items-center gap-1.5 text-soft">
          <Users className="h-3.5 w-3.5 text-blue" aria-hidden /> {shard.couriers} mensajero{shard.couriers === 1 ? '' : 's'}
        </span>
        <span className="flex items-center gap-1.5 text-soft">
          <Route className="h-3.5 w-3.5 text-blue" aria-hidden /> {shard.routes} ruta{shard.routes === 1 ? '' : 's'}
        </span>
        <span className="flex items-center gap-1.5 text-soft">
          <Star className="h-3.5 w-3.5 text-blue" aria-hidden /> {shard.reviews} opinión{shard.reviews === 1 ? '' : 'es'}
        </span>
        <span className="flex items-center gap-1.5 text-soft">
          <Table2 className="h-3.5 w-3.5 text-blue" aria-hidden /> Outbox: {shard.pendingOutbox}
        </span>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] text-soft">
          <span className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" aria-hidden /> {fmtBytes(shard.sizeBytes)} / {fmtBytes(shard.capacityBytes)}
          </span>
          <span>{shard.usedPct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuenow={shard.usedPct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-blue" style={{ width: `${Math.min(100, Math.max(1.5, shard.usedPct))}%` }} />
        </div>
      </div>
    </article>
  )
}

/** Tarjeta de un proyecto Supabase. */
export function SupabaseCard({ project }: { project: SupabaseProjectDto }) {
  return (
    <article className="rounded-2xl border border-line bg-card p-4">
      <header className="mb-2 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-blue" aria-hidden>
          <Boxes className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-bold text-primary">{project.name}</h3>
            <Pulse ok={project.healthy} />
          </div>
          <p className="truncate font-mono text-[10px] text-soft">{project.ref}</p>
        </div>
      </header>
      <p className="text-[11px] leading-snug text-soft">{project.role}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-soft">{project.region}</span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-bold',
            project.reserved ? 'bg-warn/15 text-warn' : 'bg-success/15 text-success',
          )}
        >
          {project.reserved ? 'RESERVADO' : 'PRODUCCIÓN'}
        </span>
      </div>
    </article>
  )
}

/** Cabecera de sección. */
export function SectionHeader({
  icon,
  title,
  count,
  note,
}: {
  icon: React.ReactNode
  title: string
  count: string
  note: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-blue" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-bold text-primary">
          {title} <span className="font-normal text-soft">· {count}</span>
        </h2>
        <p className="truncate text-xs text-soft">{note}</p>
      </div>
      <Server className="h-4 w-4 shrink-0 text-soft" aria-hidden />
    </div>
  )
}
