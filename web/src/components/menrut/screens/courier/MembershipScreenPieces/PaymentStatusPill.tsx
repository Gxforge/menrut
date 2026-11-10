// MENRUT — MembershipScreen · Píldora de estado de una solicitud de pago.
'use client'

import type { PaymentProofDto } from '@/lib/types'

export function PaymentStatusPill({ status }: { status: PaymentProofDto['status'] }) {
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
