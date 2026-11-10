// MENRUT — Tipos del dominio de pagos (Transfermóvil): solicitud de plan del
// mensajero, instrucciones de pago y revisión por la administración.

// ─── Pagos (Transfermóvil) ─────────────────────────────────────────────────

export interface PaymentProofDto {
  id: string
  planId: string | null
  planName: string | null
  planCode: string | null
  amountCup: number
  confirmedAmountCup: number | null
  method: string
  reference: string
  proofUrl: string // ruta interna del comprobante (bucket privado)
  hasProof: boolean
  status: 'pending' | 'approved' | 'rejected'
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
}

// Instrucciones de pago leídas de PlatformConfig (nunca hardcodeadas).
export interface PaymentInstructionsDto {
  method: string
  card: string
  phone: string
  note: string
  amountCup: number
  planName: string
}

export interface RequestPlanResponseDto {
  proof: PaymentProofDto
  instructions: PaymentInstructionsDto
}

export interface DecidePaymentPayload {
  action: 'approve' | 'reject'
  confirmedAmountCup?: number
  reviewNote?: string
}

export interface AdminPaymentDto {
  id: string
  courierName: string
  courierEmail: string
  courierId: string
  planName: string | null
  planCode: string | null
  amountCup: number
  confirmedAmountCup: number | null
  method: string
  reference: string
  proofUrl: string
  proofSignedUrl: string | null // URL firmada (10 min) del comprobante
  hasProof: boolean
  status: string
  reviewNote: string | null
  createdAt: string
  reviewedAt: string | null
}
