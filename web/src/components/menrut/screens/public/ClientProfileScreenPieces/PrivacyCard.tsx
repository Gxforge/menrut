// MENRUT — ClientProfileScreen · tarjeta Privacidad.
'use client'

import { useState } from 'react'
import { ChevronRight, ShieldCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// ─── Tarjeta Privacidad ─────────────────────────────────────────────────────

export function PrivacyCard() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
            <ShieldCheck className="h-4.5 w-4.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold leading-tight">Privacidad</span>
            <span className="block truncate text-[11.5px] text-muted-foreground">Qué datos son públicos</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="mx-4 max-w-[360px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Tus datos</DialogTitle>
            <DialogDescription>Un resumen claro de qué se comparte.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2.5 text-[13px] leading-relaxed text-foreground">
            <li>· Tu nombre y tu foto de perfil son visibles para las personas con quienes conversas.</li>
            <li>· Tu correo y tu teléfono no se muestran en búsquedas ni en perfiles públicos.</li>
            <li>· Las conversaciones son privadas entre las partes y puedes reportar cualquier comportamiento inadecuado.</li>
            <li>· Puedes cerrar sesión en cualquier momento; tu cuenta se conserva.</li>
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}
