// MENRUT — Créditos y herramientas del mensajero
'use client'

import { useQuery } from '@tanstack/react-query'
import {
  ShieldCheck, Sparkles, EyeOff, Wrench, Coins, Lock, CircleCheckBig, Receipt,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { formatDateTime } from '@/lib/format'
import { TopBar } from '@/components/menrut/core/TopBar'
import { ToolTag } from '@/components/menrut/core/StatusBadge'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ToolDto, WalletTransactionDto } from '@/lib/types'

export default function ToolsScreen() {
  const session = useAppStore((s) => s.session)
  const back = useAppStore((s) => s.back)

  const walletQ = useQuery({
    queryKey: ['courier-wallet'],
    queryFn: () => api.courierWallet(),
    enabled: !!session,
  })
  const toolsQ = useQuery({ queryKey: ['tools'], queryFn: () => api.tools() })
  const plansQ = useQuery({ queryKey: ['plans'], queryFn: () => api.plans() })

  const wallet = walletQ.data
  const tools = toolsQ.data?.tools ?? []
  const planes = plansQ.data?.plans ?? []

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
  if (walletQ.isError || toolsQ.isError || !wallet || !toolsQ.data) {
    return (
      <div>
        <TopBar title="Créditos y herramientas" subtitle="Tus dos carteras, separadas" onBack={back} />
        <div className="px-4 pt-6 pb-8">
          <EmptyState
            icon={<EyeOff className="h-8 w-8" aria-hidden />}
            title="No se pudo cargar esta sección"
            hint="Revisa tu conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={() => {
              void walletQ.refetch()
              void toolsQ.refetch()
              void plansQ.refetch()
            }}
          />
        </div>
      </div>
    )
  }

  // Niveles de plan (sortOrder) para comparar requisitos
  const nivelPlanActual = wallet.hasActiveMembership
    ? (planes.find((p) => p.name === wallet.planName)?.sortOrder ?? -1)
    : -1

  const estadoTool = (tool: ToolDto): { bloqueada: boolean; motivo: string } => {
    if (!tool.isActive) return { bloqueada: true, motivo: 'No disponible temporalmente.' }
    if (tool.requiresActiveMembership && !wallet.hasActiveMembership) {
      return { bloqueada: true, motivo: tool.blockedMessage || 'Requiere una membresía activa.' }
    }
    if (tool.minPlanCode) {
      const minPlan = planes.find((p) => p.code === tool.minPlanCode)
      const nivelRequerido = minPlan?.sortOrder ?? -1
      if (nivelPlanActual < nivelRequerido) {
        return {
          bloqueada: true,
          motivo: tool.blockedMessage || `Requiere plan ${minPlan?.name ?? 'superior'} o superior.`,
        }
      }
    }
    return { bloqueada: false, motivo: '' }
  }

  const movimientosTools: WalletTransactionDto[] = [...wallet.transactions]
    .filter((t) => t.walletType === 'tools')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

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
            <p className="mt-2 font-display text-[26px] font-bold leading-none">{wallet.toolCredits}</p>
            <p className="mt-1 text-[11.5px] leading-tight text-muted-foreground">
              créditos de herramientas
            </p>
            <p className="mt-2 text-[11px] leading-tight text-muted-foreground">Se conservan al vencer.</p>
          </article>
        </section>

        <p className="mt-3 text-center text-[12px] text-muted-foreground">
          Créditos disponibles: <strong className="text-foreground">{wallet.toolCredits}</strong> · Las dos
          carteras son independientes y no se pueden mezclar.
        </p>

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
              {tools.map((tool) => {
                const { bloqueada, motivo } = estadoTool(tool)
                return (
                  <article
                    key={tool.id}
                    aria-label={tool.name}
                    className={cn(
                      'rounded-2xl border bg-card p-4',
                      bloqueada ? 'border-line opacity-90' : 'border-line',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ToolTag tag={tool.tag} />
                        {bloqueada && <ToolTag tag="BLOQUEADA" blocked />}
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold',
                          tool.creditCost > 0 ? 'bg-cyan/10 text-cyan' : 'bg-success/10 text-success',
                        )}
                      >
                        {tool.creditCost > 0
                          ? `${tool.creditCost} ${tool.creditCost === 1 ? 'crédito' : 'créditos'}`
                          : 'GRATUITA'}
                      </span>
                    </div>

                    <h3 className="mt-2 text-[14.5px] font-bold leading-tight">{tool.name}</h3>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                      {tool.description}
                    </p>

                    {bloqueada ? (
                      <p className="mt-2.5 flex items-start gap-1.5 rounded-xl bg-muted px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
                        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                        {motivo}
                      </p>
                    ) : tool.creditCost === 0 ? (
                      <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-success">
                        <CircleCheckBig className="h-4 w-4" aria-hidden />
                        Activa
                      </p>
                    ) : (
                      <div className="mt-3">
                        <Button variant="outline" className="h-10 rounded-full px-5" disabled>
                          Activar
                        </Button>
                        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                          Activación disponible al confirmar los importes comerciales.
                        </p>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}

          <p className="mt-4 text-[11.5px] leading-relaxed text-muted-foreground">
            Las herramientas bloqueadas indican qué plan las habilita.
          </p>
        </section>

        {/* Movimientos de herramientas */}
        <section className="mt-6" aria-label="Movimientos de herramientas">
          <h2 className="section-title mb-2.5 flex items-center gap-1.5">
            <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden />
            Movimientos de herramientas
          </h2>
          {movimientosTools.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
              Todavía no hay movimientos en esta cartera.
            </p>
          ) : (
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
              {movimientosTools.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan/10 text-cyan"
                    aria-hidden
                  >
                    <Coins className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold leading-tight">{t.reason}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDateTime(t.createdAt)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        'text-[14px] font-bold leading-tight',
                        t.delta >= 0 ? 'text-success' : 'text-danger',
                      )}
                    >
                      {t.delta >= 0 ? '+' : '−'}
                      {Math.abs(t.delta)}
                    </p>
                    <p className="text-[10.5px] text-muted-foreground">Saldo: {t.balanceAfter}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
