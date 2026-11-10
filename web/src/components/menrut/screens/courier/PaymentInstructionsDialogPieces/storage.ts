// MENRUT — PaymentInstructionsDialog · Persistencia local de los datos de
// cobro (método/tarjeta/teléfono/nota) y validación de la captura.
import type { PaymentInstructionsDto } from '@/lib/types'

// ── Persistencia local de los datos de cobro (config de plataforma) ─────────

const LS_KEY = 'menrut-payment-instructions'

export interface StoredInstructions {
  method: string
  card: string
  phone: string
  note: string
}

export function savePaymentInstructions(i: PaymentInstructionsDto): void {
  try {
    const keep: StoredInstructions = {
      method: i.method, card: i.card, phone: i.phone, note: i.note,
    }
    localStorage.setItem(LS_KEY, JSON.stringify(keep))
  } catch {
    // Sin localStorage la recuperación mostrará solo el resumen de la solicitud.
  }
}

export function loadPaymentInstructions(): StoredInstructions | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredInstructions>
    if (typeof parsed.card !== 'string' || !parsed.card) return null
    return {
      method: typeof parsed.method === 'string' && parsed.method ? parsed.method : '',
      card: parsed.card,
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
      note: typeof parsed.note === 'string' ? parsed.note : '',
    }
  } catch {
    return null
  }
}

// ── Validación de la captura (imagen jpg/png/webp de hasta 5 MB) ────────────

const MAX_BYTES = 5 * 1024 * 1024
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function validateFile(f: File): string | null {
  if (!OK_TYPES.includes(f.type)) return 'La captura debe ser una imagen JPG, PNG o WebP.'
  if (f.size > MAX_BYTES) return 'La imagen supera los 5 MB. Comprime la captura e inténtalo de nuevo.'
  return null
}
