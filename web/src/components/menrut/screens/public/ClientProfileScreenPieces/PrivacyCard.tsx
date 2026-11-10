// MENRUT — ClientProfileScreen · tarjeta Privacidad: abre la política
// completa (pantalla «privacy»: datos, retención, derechos y borrado de cuenta).
'use client'

import { ChevronRight, ShieldCheck } from 'lucide-react'
import { useAppStore } from '@/lib/store'

// ─── Tarjeta Privacidad ─────────────────────────────────────────────────────

export function PrivacyCard() {
  const navigate = useAppStore((s) => s.navigate)
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-card">
      <button
        type="button"
        onClick={() => navigate('privacy')}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 active:scale-[0.99]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
          <ShieldCheck className="h-4.5 w-4.5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold leading-tight">Privacidad y datos</span>
          <span className="block truncate text-[11.5px] text-muted-foreground">
            Qué datos usamos, derechos y borrado de cuenta
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    </section>
  )
}
