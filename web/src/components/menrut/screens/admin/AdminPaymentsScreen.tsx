// MENRUT — Administración · Pagos y comprobantes (Transfermóvil)
// Pantalla clave del propietario: revisa la captura del mensajero, pone la
// cantidad que realmente le llegó (cotejando el SMS) y decide. Aprobar activa
// el plan; rechazar exige motivo obligatorio.
'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BadgeCheck, CheckCircle2, Receipt } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { formatDateTime } from '@/lib/format'
import { AdminScreen } from '@/components/menrut/screens/admin/_AdminNav'
import { EmptyState, ListSkeleton } from '@/components/menrut/core/EmptyState'
import { PaymentCard } from '@/components/menrut/screens/admin/AdminPaymentsPieces/PaymentCard'
import { ProofZoomDialog } from '@/components/menrut/screens/admin/AdminPaymentsPieces/ProofZoomDialog'
import {
  PaymentDecision, ReviewDialog, ReviewStep,
} from '@/components/menrut/screens/admin/AdminPaymentsPieces/ReviewDialog'
import { cn } from '@/lib/utils'
import type { AdminPaymentDto, PlanDto } from '@/lib/types'

type PaymentFilter = 'pending' | 'approved' | 'rejected' | 'all'

const FILTERS: { id: PaymentFilter; label: string }[] = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'approved', label: 'Aprobadas' },
  { id: 'rejected', label: 'Rechazadas' },
  { id: 'all', label: 'Todas' },
]

export default function AdminPaymentsScreen() {
  const session = useAppStore((s) => s.session)
  const qc = useQueryClient()

  const [filter, setFilter] = useState<PaymentFilter>('pending')
  const [zoom, setZoom] = useState<AdminPaymentDto | null>(null)
  const [reviewing, setReviewing] = useState<AdminPaymentDto | null>(null)
  const [step, setStep] = useState<ReviewStep>('review')
  const [monto, setMonto] = useState('')
  const [motivo, setMotivo] = useState('')

  // Lista completa (una sola consulta): contadores por estado + filtro en cliente
  const paymentsQ = useQuery({
    queryKey: ['admin-payments', 'all'],
    queryFn: () => api.getAdminPayments('all'),
    enabled: !!session,
  })

  // Catálogo público de planes: días y créditos para el resumen de aprobación
  const plansQ = useQuery({ queryKey: ['plans'], queryFn: () => api.plans() })
  const planByCode = useMemo(() => {
    const map = new Map<string, PlanDto>()
    for (const p of plansQ.data?.plans ?? []) map.set(p.code, p)
    return map
  }, [plansQ.data])

  const payments = paymentsQ.data?.payments ?? []
  const counts = useMemo(() => {
    const c: Record<PaymentFilter, number> = {
      pending: 0, approved: 0, rejected: 0, all: payments.length,
    }
    for (const p of payments) {
      if (p.status === 'pending' || p.status === 'approved' || p.status === 'rejected') {
        c[p.status] += 1
      }
    }
    return c
  }, [payments])

  const visible =
    filter === 'all' ? payments : payments.filter((p) => p.status === filter)

  function openReview(p: AdminPaymentDto) {
    setReviewing(p)
    setStep('review')
    setMonto(String(p.amountCup))
    setMotivo('')
  }

  function closeReview() {
    setReviewing(null)
    setStep('review')
    setMonto('')
    setMotivo('')
  }

  const montoNum = Number(monto)
  const montoValido = monto.trim() !== '' && Number.isFinite(montoNum) && montoNum >= 0

  // Decisión del propietario/administrador (api.decidePayment)
  const decideQ = useMutation({
    mutationFn: (v: PaymentDecision) =>
      api.decidePayment(v.payment.id, {
        action: v.action,
        confirmedAmountCup: v.confirmedAmountCup,
        reviewNote: v.reviewNote,
      }),
    onSuccess: (res, v) => {
      if (v.action === 'approve') {
        toast.success(`Plan activado para ${v.payment.courierName}`, {
          description: res.expiresAt
            ? `Membresía activa hasta el ${formatDateTime(res.expiresAt)}.`
            : 'La membresía y los créditos del plan quedaron acreditados.',
        })
      } else {
        toast(`Solicitud de ${v.payment.courierName} rechazada`, {
          description: 'El motivo quedó registrado y el mensajero fue notificado.',
        })
      }
      closeReview()
      void qc.invalidateQueries({ queryKey: ['admin-payments'] })
      void qc.invalidateQueries({ queryKey: ['admin-overview'] })
    },
    onError: (err: Error) =>
      toast.error(err.message || 'No se pudo guardar la decisión. Inténtalo de nuevo.'),
  })

  const reviewPlan = reviewing ? planByCode.get(reviewing.planCode ?? '') ?? null : null

  return (
    <AdminScreen
      active="admin-payments"
      title="Pagos y comprobantes"
      subtitle="Solicitudes de plan pagadas por Transfermóvil: revisa la captura, confirma la cantidad recibida y activa el plan."
    >
      {/* Nota informativa del flujo de aprobación */}
      <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-line bg-secondary/60 p-3.5">
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Al aprobar se acreditan la membresía y los créditos del plan. Coteja la captura con el
          SMS de Transfermóvil y escribe la cantidad que realmente te llegó.
        </p>
      </div>

      {/* Filtros por estado con contadores */}
      <div
        className="nice-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
        role="group"
        aria-label="Filtrar por estado"
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-2 text-[12.5px] font-semibold whitespace-nowrap transition-all active:scale-95',
              filter === f.id
                ? 'border-navy bg-navy text-white'
                : 'border-line bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label} ({counts[f.id]})
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        {paymentsQ.isLoading ? (
          <ListSkeleton count={4} />
        ) : paymentsQ.isError ? (
          <EmptyState
            icon={<Receipt className="h-8 w-8" aria-hidden />}
            title="No se pudieron cargar las solicitudes"
            hint="Comprueba la conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={() => void paymentsQ.refetch()}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={
              filter === 'pending' ? (
                <CheckCircle2 className="h-8 w-8" aria-hidden />
              ) : (
                <Receipt className="h-8 w-8" aria-hidden />
              )
            }
            title={
              filter === 'pending'
                ? 'No hay solicitudes pendientes'
                : filter === 'approved'
                  ? 'No hay solicitudes aprobadas'
                  : filter === 'rejected'
                    ? 'No hay solicitudes rechazadas'
                    : 'Todavía no hay solicitudes de pago'
            }
            hint="Cuando un mensajero solicite un plan y suba su captura, aparecerá aquí para que lo confirmes."
          />
        ) : (
          visible.map((p) => (
            <PaymentCard
              key={p.id}
              payment={p}
              deciding={decideQ.isPending}
              onOpen={setZoom}
              onReview={openReview}
            />
          ))
        )}
      </div>

      {/* Comprobante a tamaño completo */}
      <ProofZoomDialog zoom={zoom} onClose={() => setZoom(null)} />

      {/* Revisión: captura + cantidad recibida + decisión */}
      <ReviewDialog
        reviewing={reviewing}
        step={step}
        onStep={setStep}
        monto={monto}
        onMontoChange={setMonto}
        motivo={motivo}
        onMotivoChange={setMotivo}
        reviewPlan={reviewPlan}
        montoNum={montoNum}
        montoValido={montoValido}
        deciding={decideQ.isPending}
        onZoom={setZoom}
        onDecide={(v) => decideQ.mutate(v)}
        onClose={closeReview}
      />
    </AdminScreen>
  )
}
