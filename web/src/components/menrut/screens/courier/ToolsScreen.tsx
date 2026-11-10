// MENRUT — Créditos y herramientas del mensajero (flujo completo:
// reserva → confirmación → liberación; el vencimiento devuelve el crédito).
// Las reservas activas y su historial viven en ./ToolsScreenPieces/.
'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ShieldCheck, Sparkles, EyeOff, Wrench, Lock, CircleCheckBig, Star, Loader2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { apiMore } from '@/lib/api-more'
import { useAppStore } from '@/lib/store'
import { formatDateTime } from '@/lib/format'
import { TopBar } from '@/components/menrut/core/TopBar'
import { ToolTag } from '@/components/menrut/core/StatusBadge'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ReservationsCard } from './ToolsScreenPieces/ReservationsCard'
import type { ToolWithEligibilityDto } from '@/lib/types'

export default function ToolsScreen() {
  const session = useAppStore((s) => s.session)
  const back = useAppStore((s) => s.back)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const walletQ = useQuery({
    queryKey: ['courier-wallet'],
    queryFn: () => api.courierWallet(),
    enabled: !!session,
  })
  const toolsQ = useQuery({
    queryKey: ['courier-tools'],
    queryFn: () => apiMore.courierTools(),
    enabled: !!session,
  })

  const wallet = walletQ.data
  const data = toolsQ.data
  const tools = data?.tools ?? []
  const reservations = data?.reservations ?? []
  const destacadoHasta = data?.highlightedUntil ?? null

  const refrescar = () => {
    void toolsQ.refetch()
    void walletQ.refetch()
  }

  const reserveMut = useMutation({
    mutationFn: (toolId: string) => apiMore.reserveTool(toolId),
    onSuccess: () => {
      toast.success('Herramienta reservada. Confírmala cuando la uses; si no, se libera sola en 24 h.')
      refrescar()
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo reservar.'),
  })

  const confirmMut = useMutation({
    mutationFn: (p: { toolId: string; reservationId: string }) => apiMore.confirmTool(p.toolId, p.reservationId),
    onSuccess: (d) => {
      if (d.effect.type === 'highlight') {
        toast.success(`Perfil destacado ${d.effect.days ? `${d.effect.days} días` : ''}. Apareces primero en búsquedas.`)
      } else if (d.effect.type === 'route-alert') {
        toast.success(`Recorrido anunciado a ${d.effect.notified ?? 0} clientes con rutas coincidentes.`)
      } else {
        toast.success('Uso confirmado.')
      }
      refrescar()
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo confirmar.'),
  })

  const releaseMut = useMutation({
    mutationFn: (p: { toolId: string; reservationId: string }) => apiMore.releaseTool(p.toolId, p.reservationId),
    onSuccess: (d) => {
      toast.success(`Crédito devuelto. Tienes ${d.toolCredits} créditos de herramientas.`)
      refrescar()
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo liberar.'),
  })

  function accion(
    p: { toolId: string; reservationId: string },
    run: (vars: { toolId: string; reservationId: string }, opts: { onSettled: () => void }) => void,
  ) {
    setPendingAction(p.reservationId)
    run(p, { onSettled: () => setPendingAction(null) })
  }

  // ── Carga ─────────────────────────────────────────────────────────────
  if (walletQ.isLoading || toolsQ.isLoading) {
    return (
      <div>
        <TopBar title="Créditos y herramientas" subtitle="Tus dos carteras, separadas" onBack={back} />
        <div className="px-4 pt-4 pb-8">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (walletQ.isError || toolsQ.isError || !wallet || !data) {
    return (
      <div>
        <TopBar title="Créditos y herramientas" subtitle="Tus dos carteras, separadas" onBack={back} />
        <div className="px-4 pt-6 pb-8">
          <EmptyState
            icon={<EyeOff className="h-8 w-8" aria-hidden />}
            title="No se pudo cargar esta sección"
            hint="Revisa tu conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={refrescar}
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar title="Créditos y herramientas" subtitle="Tus dos carteras, separadas" onBack={back} />

      <div className="px-4 pt-4 pb-8">
        {/* Las dos carteras */}
        <section aria-label="Tus carteras" className="grid grid-cols-2 gap-3">
          <article className="rounded-2xl border border-line bg-card p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue/10 text-blue">
              <ShieldCheck className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <p className="mt-2 font-display text-[26px] font-bold leading-none">
              {wallet.permanenceCredits}
            </p>
            <p className="mt-1 text-[11.5px] leading-tight text-muted-foreground">
              créditos de permanencia
            </p>
            <p className="mt-2 text-[11px] leading-tight text-blue">
              ≈ {wallet.permanenceDaysLeft} {wallet.permanenceDaysLeft === 1 ? 'día' : 'días'} de visibilidad
            </p>
          </article>
          <article className="rounded-2xl border border-line bg-card p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan/10 text-cyan">
              <Sparkles className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <p className="mt-2 font-display text-[26px] font-bold leading-none">{data.toolCredits}</p>
            <p className="mt-1 text-[11.5px] leading-tight text-muted-foreground">
              créditos de herramientas
            </p>
            <p className="mt-2 text-[11px] leading-tight text-muted-foreground">Se conservan al vencer.</p>
          </article>
        </section>

        {destacadoHasta && (
          <p className="mt-3 flex items-center gap-2 rounded-2xl border border-orange/30 bg-orange/5 px-4 py-3 text-[12.5px] font-semibold text-orange">
            <Star className="h-4 w-4 shrink-0" aria-hidden />
            Perfil destacado hasta {formatDateTime(new Date(destacadoHasta).toISOString())}
          </p>
        )}

        {/* Reservas activas + historial */}
        <section className="mt-6" aria-labelledby="tools-reservas">
          <h2 id="tools-reservas" className="section-title mb-2.5">Tus reservas</h2>
          <ReservationsCard
            reservations={reservations}
            pendingAction={pendingAction}
            onConfirm={(toolId, reservationId) => accion({ toolId, reservationId }, (vars, opts) => confirmMut.mutate(vars, opts))}
            onRelease={(toolId, reservationId) => accion({ toolId, reservationId }, (vars, opts) => releaseMut.mutate(vars, opts))}
          />
        </section>

        {/* Catálogo de herramientas */}
        <section className="mt-6" aria-label="Herramientas disponibles">
          <h2 className="section-title mb-2.5 flex items-center gap-1.5">
            <Wrench className="h-4 w-4 text-muted-foreground" aria-hidden />
            Herramientas
          </h2>

          {tools.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
              El catálogo de herramientas se administra desde el panel de MENRUT.
            </p>
          ) : (
            <div className="space-y-3">
              {tools.map((tool) => (
                <ToolRow
                  key={tool.id}
                  tool={tool}
                  credits={data.toolCredits}
                  pending={reserveMut.isPending && reserveMut.variables === tool.id}
                  onReserve={() => reserveMut.mutate(tool.id)}
                />
              ))}
            </div>
          )}
        </section>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
          Las reservas vencen a las 24 horas y el crédito vuelve solo a tu cartera. Las
          dos carteras son independientes y no se pueden mezclar.
        </p>
      </div>
    </div>
  )
}

function ToolRow({
  tool, credits, pending, onReserve,
}: {
  tool: ToolWithEligibilityDto
  credits: number
  pending: boolean
  onReserve: () => void
}) {
  const elegible = tool.eligible && tool.creditCost > 0
  const sinCreditos = elegible && credits < tool.creditCost
  return (
    <article aria-label={tool.name} className={cn('rounded-2xl border bg-card p-4', tool.eligible ? 'border-line' : 'border-line opacity-90')}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <ToolTag tag={tool.tag} />
          {!tool.eligible && <ToolTag tag="BLOQUEADA" blocked />}
        </div>
        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold', tool.creditCost > 0 ? 'bg-cyan/10 text-cyan' : 'bg-success/10 text-success')}>
          {tool.creditCost > 0 ? `${tool.creditCost} ${tool.creditCost === 1 ? 'crédito' : 'créditos'}` : 'GRATUITA'}
        </span>
      </div>

      <h3 className="mt-2 text-[14.5px] font-bold leading-tight">{tool.name}</h3>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{tool.description}</p>

      {!tool.eligible ? (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-xl bg-muted px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {tool.blockedReason}
        </p>
      ) : tool.creditCost === 0 ? (
        <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-success">
          <CircleCheckBig className="h-4 w-4" aria-hidden />
          Activa
        </p>
      ) : (
        <div className="mt-3 flex items-center gap-3">
          <Button
            variant="outline"
            className="h-10 rounded-full px-5 font-semibold"
            disabled={pending || sinCreditos}
            onClick={onReserve}
          >
            {pending && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />}
            Reservar
          </Button>
          {sinCreditos && (
            <span className="text-[11.5px] leading-tight text-muted-foreground">
              Necesitas {tool.creditCost - credits} crédito(s) más.
            </span>
          )}
        </div>
      )}
    </article>
  )
}
