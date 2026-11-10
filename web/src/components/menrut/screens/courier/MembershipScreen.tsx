// MENRUT — Membresía y permanencia del mensajero
// Estado de la membresía y las carteras + «Mis solicitudes de pago»
// (historial Transfermóvil con estado y subida de captura si falta).
// (Las secciones viven en MembershipScreenPieces/.)
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Crown } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { TopBar } from '@/components/menrut/core/TopBar'
import { Button } from '@/components/ui/button'
import {
  PaymentInstructionsDialog,
  loadPaymentInstructions,
  type PaymentDialogState,
} from '@/components/menrut/screens/courier/PaymentInstructionsDialog'
import { MembershipError, MembershipLoading } from './MembershipScreenPieces/MembershipGuards'
import { MembershipStatusCard } from './MembershipScreenPieces/MembershipStatusCard'
import {
  ExpiryInfoSection, HiddenProfileNotice, ToolCreditsCard,
} from './MembershipScreenPieces/InfoSections'
import { PaymentRequestsSection } from './MembershipScreenPieces/PaymentRequestsSection'
import { RecentTransactions } from './MembershipScreenPieces/RecentTransactions'
import type { PaymentProofDto, WalletTransactionDto } from '@/lib/types'

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
    return <MembershipLoading onBack={back} />
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (walletQ.isError || !wallet) {
    return <MembershipError onBack={back} onRetry={() => void walletQ.refetch()} />
  }

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
        <MembershipStatusCard wallet={wallet} />

        {/* Aviso de perfil oculto */}
        {!wallet.isPublic && (
          <HiddenProfileNotice onRenew={() => navigate('plan-options')} />
        )}

        {/* Qué pasa al vencer */}
        <ExpiryInfoSection />

        {/* Créditos de herramientas (cartera separada) */}
        <ToolCreditsCard toolCredits={wallet.toolCredits} />

        {/* Mis solicitudes de pago (Transfermóvil) */}
        <PaymentRequestsSection
          isLoading={paymentsQ.isLoading}
          isError={paymentsQ.isError}
          pagos={pagos}
          onRetry={() => void paymentsQ.refetch()}
          onUpload={abrirSubida}
        />

        {/* CTA principal */}
        <Button
          className="mt-5 h-12 w-full rounded-full text-[15px]"
          onClick={() => navigate('plan-options')}
        >
          <Crown className="h-5 w-5" aria-hidden />
          Ver planes {planes.length > 0 ? `(${planes.filter((p) => p.isActive).length})` : ''}
        </Button>

        {/* Movimientos recientes */}
        <RecentTransactions movimientos={movimientos} />
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
