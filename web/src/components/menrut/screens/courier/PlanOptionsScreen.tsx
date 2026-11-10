// MENRUT — Planes disponibles · Matriz comercial (3 niveles × 4 duraciones)
// Nivel (Básico / Profesional / Destacado) + duración (1/3/6/12 meses) con el
// ahorro calculado en cliente frente a pagar mes a mes. La compra abre una
// solicitud de pago manual por Transfermóvil (api.requestPlan → instrucciones
// del backend → subida de captura → el propietario confirma).
// (Las secciones viven en PlanOptionsScreenPieces/.)
'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Crown } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { TopBar } from '@/components/menrut/core/TopBar'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import {
  PaymentInstructionsDialog,
  loadPaymentInstructions,
  savePaymentInstructions,
  type PaymentDialogState,
} from '@/components/menrut/screens/courier/PaymentInstructionsDialog'
import { PlansError, PlansLoading } from './PlanOptionsScreenPieces/PlanGuards'
import { PendingNotice } from './PlanOptionsScreenPieces/PendingNotice'
import { TrialBanner } from './PlanOptionsScreenPieces/TrialBanner'
import { TierSelector } from './PlanOptionsScreenPieces/TierSelector'
import { DurationSelector } from './PlanOptionsScreenPieces/DurationSelector'
import { PlanSummaryCard } from './PlanOptionsScreenPieces/PlanSummaryCard'
import { monthsOf, type TierId } from './PlanOptionsScreenPieces/helpers'
import type { PaymentProofDto, PlanDto } from '@/lib/types'

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
    return <PlansLoading onBack={back} />
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (plansQ.isError || !plansQ.data) {
    return <PlansError onBack={back} onRetry={() => void plansQ.refetch()} />
  }

  const esPlanActual = !!selectedPlan && nombrePlanActual === selectedPlan.name

  return (
    <div>
      <TopBar title="Planes disponibles" subtitle="Compara y elige" onBack={back} />

      <div className="px-4 pt-4 pb-8">
        {/* Aviso: ya hay una solicitud pendiente en revisión */}
        {pendingPayment ? <PendingNotice pendingPayment={pendingPayment} onOpen={abrirPendiente} /> : null}

        {/* Prueba gratuita (una sola vez por cuenta; fuera de la matriz de compra) */}
        {trial && !hasUsedTrial ? (
          <TrialBanner
            trial={trial}
            isPending={trialQ.isPending}
            onActivate={(plan) => trialQ.mutate(plan)}
          />
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
            <TierSelector
              tier={tier}
              byTier={byTier}
              onSelect={(id) => {
                setTier(id)
                setMonthsSel(1)
              }}
            />

            {/* Duración */}
            <DurationSelector
              tierPlans={tierPlans}
              monthsSel={monthsSel}
              monthly={monthly}
              onSelect={setMonthsSel}
            />

            {/* Tarjeta del plan elegido */}
            {selectedPlan ? (
              <PlanSummaryCard
                selectedPlan={selectedPlan}
                monthsSel={monthsSel}
                ahorro={ahorro}
                esPlanActual={esPlanActual}
                isPending={requestQ.isPending}
                onRequest={(plan) => requestQ.mutate(plan)}
              />
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
