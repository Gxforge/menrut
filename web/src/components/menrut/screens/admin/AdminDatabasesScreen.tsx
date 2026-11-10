// MENRUT — Administración · Bases de datos (infraestructura EN VIVO).
// Muestra el sistema de datos completo conectado, sondeado en cada consulta:
//   · menrut-core (D1_CORE) — directorio central + round-robin.
//   · menrut-shard-01…09 — datos operativos de mensajeros (round-robin).
//   · 2 proyectos Supabase — principal (Auth+Storage) y secundario (reservado).
// Los sondeos los hace el backend por bindings reales: nada se inventa.
'use client'

import { useQuery } from '@tanstack/react-query'
import { Boxes, Database, RefreshCw, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { AdminScreen } from '@/components/menrut/screens/admin/_AdminNav'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { CoreCard, ShardCard, SupabaseCard, SectionHeader, fmtBytes } from './AdminDatabasesPieces/cards'

function DatabasesSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando bases de datos">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    </div>
  )
}

export default function AdminDatabasesScreen() {
  const session = useAppStore((s) => s.session)
  const isStaff = session?.role === 'owner' || session?.role === 'admin'

  const { data, isPending, isError, refetch, isRefetching } = useQuery({
    queryKey: ['admin-databases'],
    queryFn: api.adminDatabases,
    enabled: isStaff,
    staleTime: 30_000,
  })

  if (!isStaff) {
    return (
      <AdminScreen active="admin-databases" title="Bases de datos">
        <EmptyState
          icon={<ShieldCheck className="h-8 w-8 text-soft" />}
          title="Acceso restringido"
          hint="Solo el propietario y administradores pueden ver la infraestructura."
        />
      </AdminScreen>
    )
  }

  const shards = data?.shards ?? []
  const onlineShards = shards.filter((s) => s.enabled && s.ok).length
  const projects = data?.supabase?.projects ?? []

  return (
    <AdminScreen active="admin-databases" title="Bases de datos">
      <section aria-label="Estado del sistema de datos" className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-primary">Sistema conectado</h1>
            <p className="text-xs text-soft">
              {data
                ? `Sondeado ${new Date(data.checkedAt).toLocaleTimeString('es-CU', { hour: '2-digit', minute: '2-digit' })} · ${data.totals.d1Databases} bases D1 · ${fmtBytes(data.totals.totalSizeBytes)}`
                : 'Consultando infraestructura en vivo…'}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={isRefetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden />
            Actualizar
          </Button>
        </div>

        {isPending ? (
          <DatabasesSkeleton />
        ) : isError || !data?.ok ? (
          <EmptyState
            icon={<Database className="h-8 w-8 text-soft" />}
            title="No se pudo sondear la infraestructura"
            hint="Verifica tu conexión e inténtalo de nuevo. Los datos nunca se simulan."
          />
        ) : (
          <>
            <CoreCard core={data.core} />

            <div className="space-y-3">
              <SectionHeader
                icon={<Database className="h-4.5 w-4.5" />}
                title="Cloudflare D1 · Shards"
                count={`${onlineShards}/${shards.length} en línea`}
                note="Datos operativos de mensajeros · asignación round-robin persistente"
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {shards.map((shard) => (
                  <ShardCard key={shard.id} shard={shard} />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <SectionHeader
                icon={<Boxes className="h-4.5 w-4.5" />}
                title="Supabase · Identidad y archivos"
                count={`${projects.filter((p) => p.healthy).length}/${projects.length} en línea`}
                note="Principal: Auth (JWT) + Storage · Secundario: reservado, sin reparto de usuarios"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {projects.map((project) => (
                  <SupabaseCard key={project.ref} project={project} />
                ))}
              </div>
            </div>

            <p className="rounded-2xl border border-line bg-surface/60 p-3 text-[11px] leading-relaxed text-soft">
              Round-robin: cada mensajero pertenece a UN shard; el puntero persistente
              (ahora → {data.core.roundRobinLastShard + 1}) avanza en CORE con asignación transaccional.
              La búsqueda nacional consulta solo la proyección pública de <strong>menrut-core</strong>, sin fanout.
              El proyecto secundario de Supabase queda reservado como entorno de pruebas aislado: nunca recibe
              usuarios de producción.
            </p>
          </>
        )}
      </section>
    </AdminScreen>
  )
}
