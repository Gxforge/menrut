// MENRUT — Planes disponibles · Matriz comercial (3 niveles × 4 duraciones)
// Nivel (Básico / Profesional / Destacado) + duración (1/3/6/12 meses) con el
// ahorro calculado en cliente frente a pagar mes a mes. La compra abre una
// solicitud de pago manual por Transfermóvil (api.requestPlan → instrucciones
// del backend → subida de captura → el propietario confirma).
'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Clock3, Crown, EyeOff, Hourglass, Loader2, ShieldCheck, Sparkles, Ticket, Zap,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { formatCup } from '@/lib/format'
import { TopBar } from '@/components/menrut/core/TopBar'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  PaymentInstructionsDialog,
  loadPaymentInstructions,
  savePaymentInstructions,
  type PaymentDialogState,
} from '@/components/menrut/screens/courier/PaymentInstructionsDialog'
import type { PaymentProofDto, PlanDto } from '@/lib/types'

// Niveles comerciales (la prueba gratuita queda fuera de la matriz de compra)
type TierId = 'basic' | 'pro' | 'featured'

const TIERS: { id: TierId; label: string; icon: typeof Crown }[] = [
  { id: 'basic', label: 'Básico', icon: ShieldCheck },
  { id: 'pro', label: 'Profesional', icon: Zap },
  { id: 'featured', label: 'Destacado', icon: Crown },
]

// Meses equivalentes de cada duración (30 → 1, 90 → 3, 180 → 6, 365 → 12)
function monthsOf(p: PlanDto): number {
  return Math.max(1, Math.round(p.durationDays / 30))
}

export default function PlanOptionsScreen() {
  const session = useAppStore((s) => s.session)
  const back = useAppStore((s) => s.back)
  const qc = useQueryClient()

  const plansQ = useQuery({ queryKey: ['plans'], queryFn: () => api.plans() })
  const walletQ = useQuery({
    queryKey: ['courier-wallet'],
    queryFn: () => api.courierWallet(),
    enabled: !!session,
  })
  const dashQ = useQuery({
    queryKey: ['courier-dashboard'],
    queryFn: () => api.courierDashboard(),
    enabled: !!session,
  })
  const paymentsQ = useQuery({
    queryKey: ['courier-payments'],
    queryFn: () => api.getMyPayments(),
    enabled: !!session && session.role === 'courier',
  })

  const [tier, setTier] = useState<TierId>('basic')
  const [monthsSel, setMonthsSel] = useState<number>(1)
  const [dialog, setDialog] = useState<PaymentDialogState | null>(null)

  const planes = useMemo(
    () => (plansQ.data?.plans ?? []).filter((p) => p.isActive),
    [plansQ.data],
  )
  const trial = planes.find((p) => p.isTrial) ?? null

  // Matriz por nivel, ordenada de menor a mayor duración
  const byTier = useMemo(() => {
    const map = new Map<TierId, PlanDto[]>()
    for (const p of planes) {
      if (p.isTrial) continue
      const t = p.tier as TierId
      if (t !== 'basic' && t !== 'pro' && t !== 'featured') continue
      const arr = map.get(t) ?? []
      arr.push(p)
      map.set(t, arr)
    }
    for (const arr of map.values()) arr.sort((a, b) => a.durationDays - b.durationDays)
    return map
  }, [planes])

  const tierPlans = byTier.get(tier) ?? []
  const monthly = tierPlans.find((p) => monthsOf(p) === 1) ?? tierPlans[0] ?? null
  const selectedPlan =
    tierPlans.find((p) => monthsOf(p) === monthsSel) ?? monthly
  const ahorro =
    monthly && selectedPlan && monthsSel > 1
      ? monthsSel * monthly.priceCup - selectedPlan.priceCup
      : 0

  const pendingPayment =
    paymentsQ.data?.payments.find((p) => p.status === 'pending') ?? null
  const nombrePlanActual = walletQ.data?.planName ?? null
  const hasUsedTrial = dashQ.data?.hasUsedTrial ?? true

  // Duración (en meses) de una solicitud existente, buscando el plan por id/código
  function monthsForProof(p: PaymentProofDto): number | null {
    const plan = planes.find((x) => x.id === p.planId || x.code === p.planCode)
    return plan ? monthsOf(plan) : null
  }

  // Abre el diálogo con una solicitud pendiente ya existente (409 del backend
  // o recuperación desde el aviso de esta pantalla). Los datos de cobro se
  // recuperan del dispositivo; el importe y el plan son los de la solicitud.
  function abrirPendiente(p: PaymentProofDto) {
    const ls = loadPaymentInstructions()
    setDialog({
      proof: p,
      instructions: ls
        ? { ...ls, amountCup: p.amountCup, planName: p.planName ?? '' }
        : null,
      months: monthsForProof(p),
    })
  }

  // Prueba gratuita: el backend la activa directamente si no fue usada
  const trialQ = useMutation({
    mutationFn: (plan: PlanDto) =>
      api.requestMembership(plan.code, {
        amountCup: 0, method: 'otro', reference: 'prueba gratuita',
      }),
    onSuccess: () => {
      toast.success('Prueba gratuita activada. Tu pasaporte vuelve a las búsquedas.')
      void qc.invalidateQueries({ queryKey: ['courier-wallet'] })
      void qc.invalidateQueries({ queryKey: ['courier-dashboard'] })
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo activar la prueba.'),
  })

  // Abrir la solicitud de pago del plan elegido (o recuperar la pendiente)
  const requestQ = useMutation({
    mutationFn: async (plan: PlanDto): Promise<'fresh' | 'pending'> => {
      try {
        const res = await api.requestPlan(plan.id)
        savePaymentInstructions(res.instructions)
        setDialog({
          proof: res.proof,
          instructions: res.instructions,
          months: monthsOf(plan),
        })
        return 'fresh'
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('solicitud en revisión')) {
          const mine = await api.getMyPayments().catch(() => null)
          const pending = mine?.payments.find((p) => p.status === 'pending')
          if (pending) {
            abrirPendiente(pending)
            return 'pending'
          }
        }
        throw err
      }
    },
    onSuccess: (kind) => {
      void qc.invalidateQueries({ queryKey: ['courier-payments'] })
      if (kind === 'pending') {
        toast.info('Ya tienes una solicitud en revisión. Te mostramos su estado.')
      }
    },
    onError: (e: Error) =>
      toast.error(e.message || 'No se pudo abrir la solicitud. Inténtalo de nuevo.'),
  })

  // ── Carga ─────────────────────────────────────────────────────────────
  if (plansQ.isLoading) {
    return (
      <div>
        <TopBar title="Planes disponibles" subtitle="Compara y elige" onBack={back} />
        <div className="px-4 pt-4 pb-8">
          <Skeleton className="h-14 rounded-2xl" />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
          <Skeleton className="mt-3 h-56 rounded-2xl" />
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (plansQ.isError || !plansQ.data) {
    return (
      <div>
        <TopBar title="Planes disponibles" subtitle="Compara y elige" onBack={back} />
        <div className="px-4 pt-6 pb-8">
          <EmptyState
            icon={<EyeOff className="h-8 w-8" aria-hidden />}
            title="No se pudieron cargar los planes"
            hint="Los planes y precios se administran desde el panel de MENRUT. Inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={() => void plansQ.refetch()}
          />
        </div>
      </div>
    )
  }

  const diasPermanencia = selectedPlan ? Math.round(selectedPlan.permanenceCredits / 10) : 0
  const esPlanActual = !!selectedPlan && nombrePlanActual === selectedPlan.name

  return (
    <div>
      <TopBar title="Planes disponibles" subtitle="Compara y elige" onBack={back} />

      <div className="px-4 pt-4 pb-8">
        {/* Aviso: ya hay una solicitud pendiente en revisión */}
        {pendingPayment ? (
          <section
            aria-label="Solicitud en revisión"
            className="mb-4 rounded-2xl border border-orange/30 bg-orange/10 p-4"
          >
            <div className="flex items-start gap-2.5">
              <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-orange" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-display text-[14px] font-bold leading-snug">
                  Tienes una solicitud en revisión
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                  {pendingPayment.planName ?? 'Plan'} · {formatCup(pendingPayment.amountCup)}
                  {pendingPayment.hasProof
                    ? ' · captura enviada'
                    : ' · falta subir la captura'}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-9 shrink-0 rounded-full"
                onClick={() => abrirPendiente(pendingPayment)}
              >
                Ver
              </Button>
            </div>
          </section>
        ) : null}

        {/* Prueba gratuita (una sola vez por cuenta; fuera de la matriz de compra) */}
        {trial && !hasUsedTrial ? (
          <section
            aria-label="Prueba gratuita"
            className="mb-4 rounded-2xl border border-line bg-card p-4"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan/10 text-cyan">
                <Ticket className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[14.5px] font-bold leading-tight">
                  Prueba gratuita
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                  {trial.description}
                </p>
                <Button
                  size="sm"
                  className="mt-2.5 h-10 rounded-full px-5"
                  disabled={trialQ.isPending}
                  onClick={() => trialQ.mutate(trial)}
                >
                  {trialQ.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Activando…
                    </>
                  ) : (
                    'Activar prueba gratuita'
                  )}
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        {tierPlans.length === 0 ? (
          <EmptyState
            icon={<Crown className="h-8 w-8" aria-hidden />}
            title="No hay planes disponibles ahora"
            hint="La configuración comercial se administra desde el panel de MENRUT."
          />
        ) : (
          <>
            {/* Nivel del plan */}
            <div
              className="grid grid-cols-3 gap-2"
              role="group"
              aria-label="Nivel del plan"
            >
              {TIERS.map(({ id, label, icon: Icon }) => {
                const plans = byTier.get(id) ?? []
                const mes = plans.find((p) => monthsOf(p) === 1) ?? plans[0] ?? null
                const activo = tier === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setTier(id)
                      setMonthsSel(1)
                    }}
                    aria-pressed={activo}
                    className={cn(
                      'rounded-2xl border p-3 text-left transition-all active:scale-95',
                      activo
                        ? 'border-blue bg-blue/5 ring-1 ring-blue/30'
                        : 'border-line bg-card hover:border-blue/40',
                    )}
                  >
                    <Icon
                      className={cn('h-4 w-4', activo ? 'text-blue' : 'text-muted-foreground')}
                      aria-hidden
                    />
                    <p className="mt-1.5 font-display text-[13.5px] font-bold leading-tight">
                      {label}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold leading-tight text-foreground/80">
                      {mes ? `${formatCup(mes.priceCup)}/mes` : '—'}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                      {mes ? `${mes.toolCredits} cr. de herramientas` : ''}
                    </p>
                  </button>
                )
              })}
            </div>

            {/* Duración */}
            <div
              className="mt-4 grid grid-cols-2 gap-2"
              role="group"
              aria-label="Duración del plan"
            >
              {tierPlans.map((p) => {
                const m = monthsOf(p)
                const ahorroDur = monthly && m > 1 ? m * monthly.priceCup - p.priceCup : 0
                const activo = monthsSel === m
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setMonthsSel(m)}
                    aria-pressed={activo}
                    className={cn(
                      'rounded-2xl border p-3 text-left transition-all active:scale-95',
                      activo
                        ? 'border-navy bg-navy text-white'
                        : 'border-line bg-card hover:border-blue/40',
                    )}
                  >
                    <p className="text-[12.5px] font-bold leading-tight">
                      {m} {m === 1 ? 'mes' : 'meses'}
                    </p>
                    <p
                      className={cn(
                        'mt-1 font-display text-[15px] font-bold leading-none',
                        activo ? 'text-white' : 'text-foreground',
                      )}
                    >
                      {formatCup(p.priceCup)}
                    </p>
                    {ahorroDur > 0 ? (
                      <p
                        className={cn(
                          'mt-1 text-[10.5px] font-semibold leading-tight',
                          activo ? 'text-cyan' : 'text-success',
                        )}
                      >
                        Ahorras {ahorroDur.toLocaleString('es-CU')} CUP
                      </p>
                    ) : (
                      <p
                        className={cn(
                          'mt-1 text-[10.5px] leading-tight',
                          activo ? 'text-white/70' : 'text-muted-foreground',
                        )}
                      >
                        Pago único
                      </p>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Tarjeta del plan elegido */}
            {selectedPlan ? (
              <article
                aria-label={`Plan ${selectedPlan.name}`}
                className={cn(
                  'mt-4 rounded-2xl border bg-card p-5',
                  esPlanActual ? 'border-blue/50 bg-blue/5' : 'border-line',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-display text-[18px] font-bold leading-tight">
                      {selectedPlan.name}
                    </h2>
                    {selectedPlan.description ? (
                      <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                        {selectedPlan.description}
                      </p>
                    ) : null}
                  </div>
                  {esPlanActual ? (
                    <span className="shrink-0 rounded-full bg-blue px-2.5 py-1 text-[10.5px] font-bold text-white">
                      Tu plan
                    </span>
                  ) : null}
                </div>

                <div className="mt-3.5 flex items-baseline gap-2">
                  <p className="font-display text-[26px] font-bold leading-none">
                    {formatCup(selectedPlan.priceCup)}
                  </p>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-navy">
                    {monthsSel} {monthsSel === 1 ? 'mes' : 'meses'}
                  </span>
                </div>
                {ahorro > 0 ? (
                  <p className="mt-1.5 text-[12px] font-semibold text-success">
                    Ahorras {ahorro.toLocaleString('es-CU')} CUP frente a pagar mes a mes.
                  </p>
                ) : null}

                <ul className="mt-3 space-y-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  <li className="flex items-start gap-1.5">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue" aria-hidden />
                    {selectedPlan.permanenceCredits} créditos de permanencia
                    {diasPermanencia > 0 && (
                      <>
                        {' '}(≈ {diasPermanencia} {diasPermanencia === 1 ? 'día' : 'días'})
                      </>
                    )}
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan" aria-hidden />
                    {selectedPlan.toolCredits > 0
                      ? `${selectedPlan.toolCredits} créditos de herramientas`
                      : 'Sin créditos de herramientas'}
                  </li>
                </ul>

                <Button
                  className="mt-4 h-12 w-full rounded-full text-[15px] font-bold"
                  disabled={requestQ.isPending}
                  onClick={() => requestQ.mutate(selectedPlan)}
                >
                  {requestQ.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Abriendo solicitud…
                    </>
                  ) : (
                    <>
                      <Crown className="h-5 w-5" aria-hidden />
                      Solicitar este plan
                    </>
                  )}
                </Button>
                <p className="mt-2 flex items-center justify-center gap-1 text-center text-[11px] leading-relaxed text-muted-foreground">
                  <Clock3 className="h-3 w-3 shrink-0" aria-hidden />
                  Pagas por Transfermóvil y el propietario confirma tu transferencia.
                </p>
              </article>
            ) : null}
          </>
        )}

        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
          MENRUT no procesa pagos en línea: la activación la confirma el propietario al
          verificar tu transferencia.
        </p>
      </div>

      {/* Instrucciones de pago + subida de captura */}
      <PaymentInstructionsDialog
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        state={dialog}
      />
    </div>
  )
}
