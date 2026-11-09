// MENRUT — Membresía y permanencia del mensajero
// Estado de la membresía y las carteras + «Mis solicitudes de pago»
// (historial Transfermóvil con estado y subida de captura si falta).
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Crown, Sparkles, ShieldCheck, EyeOff, ChevronRight, Hourglass, Receipt, Coins, ImageUp,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { daysUntil, formatCup, formatDateTime } from '@/lib/format'
import { TopBar } from '@/components/menrut/core/TopBar'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  PaymentInstructionsDialog,
  loadPaymentInstructions,
  type PaymentDialogState,
} from '@/components/menrut/screens/courier/PaymentInstructionsDialog'
import type { PaymentProofDto, WalletTransactionDto } from '@/lib/types'

function PaymentStatusPill({ status }: { status: PaymentProofDto['status'] }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
        Aprobada
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-semibold text-danger">
        Rechazada
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-orange/10 px-2.5 py-1 text-[11px] font-semibold text-orange">
      Pendiente
    </span>
  )
}

export default function MembershipScreen() {
  const session = useAppStore((s) => s.session)
  const navigate = useAppStore((s) => s.navigate)
  const back = useAppStore((s) => s.back)

  const walletQ = useQuery({
    queryKey: ['courier-wallet'],
    queryFn: () => api.courierWallet(),
    enabled: !!session,
  })
  const plansQ = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.plans(),
  })
  const paymentsQ = useQuery({
    queryKey: ['courier-payments'],
    queryFn: () => api.getMyPayments(),
    enabled: !!session && session.role === 'courier',
  })

  const [dialog, setDialog] = useState<PaymentDialogState | null>(null)

  const wallet = walletQ.data
  const planes = plansQ.data?.plans ?? []
  const pagos = paymentsQ.data?.payments ?? []

  // ── Carga ─────────────────────────────────────────────────────────────
  if (walletQ.isLoading) {
    return (
      <div>
        <TopBar title="Membresía" subtitle="Tu permanencia y tus créditos" onBack={back} />
        <div className="px-4 pt-4 pb-8">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <div className="mt-4 grid grid-cols-1 gap-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (walletQ.isError || !wallet) {
    return (
      <div>
        <TopBar title="Membresía" subtitle="Tu permanencia y tus créditos" onBack={back} />
        <div className="px-4 pt-6 pb-8">
          <EmptyState
            icon={<EyeOff className="h-8 w-8" aria-hidden />}
            title="No se pudo cargar tu membresía"
            hint="Revisa tu conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={() => void walletQ.refetch()}
          />
        </div>
      </div>
    )
  }

  const restantes = daysUntil(wallet.planExpiresAt)
  const diasRestantesTexto =
    restantes === null ? null :
    restantes <= 0 ? 'Vence hoy' :
    `Tiempo restante: ${restantes} ${restantes === 1 ? 'día' : 'días'}`

  const movimientos: WalletTransactionDto[] = [...wallet.transactions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  // Duración (en meses) de una solicitud, buscando el plan por id/código
  function monthsForProof(p: PaymentProofDto): number | null {
    const plan = planes.find((x) => x.id === p.planId || x.code === p.planCode)
    return plan ? Math.max(1, Math.round(plan.durationDays / 30)) : null
  }

  // Abre el diálogo de instrucciones para completar una solicitud pendiente
  function abrirSubida(p: PaymentProofDto) {
    const ls = loadPaymentInstructions()
    setDialog({
      proof: p,
      instructions: ls
        ? { ...ls, amountCup: p.amountCup, planName: p.planName ?? '' }
        : null,
      months: monthsForProof(p),
    })
  }

  return (
    <div>
      <TopBar title="Membresía" subtitle="Tu permanencia y tus créditos" onBack={back} />

      <div className="px-4 pt-4 pb-8">
        {/* Estado actual */}
        <section aria-label="Estado de tu membresía" className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue/10 text-blue">
              <Crown className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Plan actual
              </p>
              <p className="truncate font-display text-[17px] font-bold leading-tight">
                {wallet.planName ?? 'Sin membresía activa'}
              </p>
            </div>
          </div>

          <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
            Tu pasaporte es visible mientras tengas permanencia.
          </p>

          {/* Créditos de permanencia */}
          <div className="mt-4 rounded-xl bg-secondary/70 px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-blue" aria-hidden />
                Créditos de permanencia
              </span>
              <span className="font-display text-[24px] font-bold leading-none text-foreground">
                {wallet.permanenceCredits}
              </span>
            </div>
            <p className="mt-2 text-[11.5px] text-muted-foreground">
              {wallet.permanenceDaysLeft > 0
                ? `Aproximadamente ${wallet.permanenceDaysLeft} ${wallet.permanenceDaysLeft === 1 ? 'día' : 'días'} de visibilidad estimados.`
                : 'Ahora mismo no sostienen visibilidad. Renueva para volver a las búsquedas.'}
            </p>
          </div>

          {/* Vencimiento del plan */}
          {wallet.planExpiresAt && wallet.hasActiveMembership && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-blue/5 px-4 py-3">
              <Hourglass className="h-4 w-4 shrink-0 text-blue" aria-hidden />
              <p className="text-[12px] leading-relaxed text-foreground">
                Vence el {formatDateTime(wallet.planExpiresAt)}.
                {diasRestantesTexto && (
                  <>
                    <br />
                    <span className="font-semibold text-blue">{diasRestantesTexto}.</span>
                  </>
                )}
              </p>
            </div>
          )}
        </section>

        {/* Aviso de perfil oculto */}
        {!wallet.isPublic && (
          <section
            aria-label="Perfil oculto"
            className="mt-4 rounded-2xl border border-orange/30 bg-orange/10 p-4"
          >
            <p className="font-display text-[14.5px] font-bold leading-snug text-foreground">
              Tu perfil no está visible en las búsquedas
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              Puedes seguir entrando para gestionar tu cuenta o renovar la permanencia.
            </p>
            <Button
              size="sm"
              className="mt-3 h-10 rounded-full px-5"
              onClick={() => navigate('plan-options')}
            >
              Renovar permanencia
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </section>
        )}

        {/* Qué pasa al vencer */}
        <section aria-label="Qué pasa al vencer" className="mt-4 rounded-2xl border border-line bg-card p-4">
          <h2 className="section-title">¿Qué pasa al vencer?</h2>
          <ul className="mt-2.5 space-y-2 text-[12.5px] leading-relaxed text-muted-foreground">
            <li className="flex gap-2">
              <span aria-hidden>·</span>
              Tu perfil pasa a oculto en las búsquedas (nada se elimina).
            </li>
            <li className="flex gap-2">
              <span aria-hidden>·</span>
              Nada se borra: tus rutas, fotos y reputación se conservan.
            </li>
            <li className="flex gap-2">
              <span aria-hidden>·</span>
              Puedes seguir entrando para gestionar tu cuenta o renovar.
            </li>
          </ul>
        </section>

        {/* Créditos de herramientas (cartera separada) */}
        <section
          aria-label="Créditos de herramientas"
          className="mt-4 rounded-2xl border border-line bg-card p-4"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan/10 text-cyan">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Cartera independiente
              </p>
              <p className="font-display text-[17px] font-bold leading-tight">Créditos de herramientas</p>
            </div>
            <span className="font-display text-[24px] font-bold leading-none">{wallet.toolCredits}</span>
          </div>
          <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
            Tus créditos de herramientas se conservan, pero algunas funciones requieren una membresía activa.
          </p>
        </section>

        {/* Mis solicitudes de pago (Transfermóvil) */}
        <section className="mt-4" aria-label="Mis solicitudes de pago">
          <h2 className="section-title mb-2.5 flex items-center gap-1.5">
            <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden />
            Mis solicitudes de pago
          </h2>
          {paymentsQ.isLoading ? (
            <Skeleton className="h-28 w-full rounded-2xl" />
          ) : paymentsQ.isError ? (
            <div className="rounded-2xl border border-dashed border-line bg-card px-4 py-6 text-center">
              <p className="text-[13px] text-muted-foreground">
                No se pudo cargar tus solicitudes de pago.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-9 rounded-full"
                onClick={() => void paymentsQ.refetch()}
              >
                Reintentar
              </Button>
            </div>
          ) : pagos.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-card px-4 py-8 text-center text-[13px] leading-relaxed text-muted-foreground">
              Todavía no has solicitado un plan de pago. Cuando lo hagas, seguirás aquí su estado.
            </p>
          ) : (
            <div className="max-h-96 divide-y divide-line overflow-y-auto nice-scroll rounded-2xl border border-line bg-card">
              {pagos.map((p) => (
                <div key={p.id} className="px-4 py-3.5">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        p.status === 'approved'
                          ? 'bg-success/10 text-success'
                          : p.status === 'rejected'
                            ? 'bg-danger/10 text-danger'
                            : 'bg-orange/10 text-orange',
                      )}
                      aria-hidden
                    >
                      <Coins className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold leading-tight">
                        {p.planName ?? 'Plan'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatCup(p.amountCup)} · {formatDateTime(p.createdAt)}
                      </p>
                    </div>
                    <PaymentStatusPill status={p.status} />
                  </div>

                  {p.status === 'approved' && p.confirmedAmountCup !== null ? (
                    <p className="mt-1.5 text-[11.5px] font-medium text-success">
                      Cantidad confirmada: {formatCup(p.confirmedAmountCup)}
                    </p>
                  ) : null}
                  {p.status === 'rejected' && p.reviewNote ? (
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-danger">
                      Motivo: {p.reviewNote}
                    </p>
                  ) : null}
                  {p.status === 'pending' ? (
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                      {p.hasProof
                        ? 'Captura enviada. El propietario confirmará tu transferencia y activará tu plan.'
                        : 'Falta subir la captura de la transferencia para que el propietario la revise.'}
                    </p>
                  ) : null}

                  {p.status === 'pending' && !p.hasProof ? (
                    <Button
                      size="sm"
                      className="mt-2 h-9 rounded-full px-4"
                      onClick={() => abrirSubida(p)}
                    >
                      <ImageUp className="h-4 w-4" aria-hidden />
                      Subir captura
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* CTA principal */}
        <Button
          className="mt-5 h-12 w-full rounded-full text-[15px]"
          onClick={() => navigate('plan-options')}
        >
          <Crown className="h-5 w-5" aria-hidden />
          Ver planes {planes.length > 0 ? `(${planes.filter((p) => p.isActive).length})` : ''}
        </Button>

        {/* Movimientos recientes */}
        <section className="mt-6" aria-label="Movimientos recientes">
          <h2 className="section-title mb-2.5 flex items-center gap-1.5">
            <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden />
            Movimientos recientes
          </h2>
          {movimientos.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
              Todavía no hay movimientos en tus carteras.
            </p>
          ) : (
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
              {movimientos.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                      t.walletType === 'permanence' ? 'bg-blue/10 text-blue' : 'bg-cyan/10 text-cyan',
                    )}
                    aria-hidden
                  >
                    <Coins className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold leading-tight">{t.reason}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.walletType === 'permanence' ? 'Permanencia' : 'Herramientas'} ·{' '}
                      {formatDateTime(t.createdAt)}
                    </p>
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
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Los precios de los planes son una propuesta comercial pendiente de confirmar. Los importes
            definitivos se administran desde el panel de MENRUT.
          </p>
        </section>
      </div>

      {/* Instrucciones de pago (subida de captura de una solicitud pendiente) */}
      <PaymentInstructionsDialog
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        state={dialog}
      />
    </div>
  )
}
