// MENRUT — MembershipScreen · Secciones informativas: aviso de perfil
// oculto, qué pasa al vencer y cartera de créditos de herramientas.
'use client'

import { ChevronRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Aviso de perfil oculto
export function HiddenProfileNotice({ onRenew }: { onRenew: () => void }) {
  return (
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
        onClick={onRenew}
      >
        Renovar permanencia
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Button>
    </section>
  )
}

// Qué pasa al vencer
export function ExpiryInfoSection() {
  return (
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
  )
}

// Créditos de herramientas (cartera separada)
export function ToolCreditsCard({ toolCredits }: { toolCredits: number }) {
  return (
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
        <span className="font-display text-[24px] font-bold leading-none">{toolCredits}</span>
      </div>
      <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
        Tus créditos de herramientas se conservan, pero algunas funciones requieren una membresía activa.
      </p>
    </section>
  )
}
