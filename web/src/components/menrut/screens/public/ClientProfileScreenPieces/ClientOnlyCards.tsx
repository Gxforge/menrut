// MENRUT — ClientProfileScreen · tarjetas exclusivas de esta pantalla.
'use client'

import { useState } from 'react'
import { Bike, ChevronRight, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'

// ─── Pantalla: Perfil del cliente ───────────────────────────────────────────

function SwitchToCourierCard() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange/10 text-orange">
            <Bike className="h-4.5 w-4.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold leading-tight">Cambiar a cuenta de mensajero</span>
            <span className="block truncate text-[11.5px] text-muted-foreground">Publica rutas y recibe clientes</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </section>

      {/* Informativo y honesto: hoy no existe cambio de rol en la API. */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="mx-4 max-w-[360px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Cambiar a cuenta de mensajero</DialogTitle>
            <DialogDescription>
              El cambio de rol a mensajero estará disponible próximamente. Mientras tanto, puedes
              escribir a soporte@menrut.app y el equipo lo gestionará contigo.
            </DialogDescription>
          </DialogHeader>
          <Button className="h-11 rounded-full font-semibold" onClick={() => setOpen(false)}>
            Entendido
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}

function BusinessLinkCard() {
  const navigate = useAppStore((s) => s.navigate)
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-card">
      <button
        type="button"
        onClick={() => navigate('business-profile')}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 active:scale-[0.99]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
          <UserRound className="h-4.5 w-4.5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold leading-tight">Ver perfil del negocio</span>
          <span className="block truncate text-[11.5px] text-muted-foreground">Datos y entregas comerciales</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    </section>
  )
}

export { SwitchToCourierCard, BusinessLinkCard }
