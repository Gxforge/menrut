// MENRUT — ClientProfileScreen · tarjeta Ayuda y soporte.
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ChevronRight, Copy, LifeBuoy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// ─── Tarjeta Ayuda y soporte ────────────────────────────────────────────────

export function SupportCard() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText('soporte@menrut.app')
      setCopied(true)
      toast.success('Correo copiado')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('No se pudo copiar. Escribe a soporte@menrut.app')
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
            <LifeBuoy className="h-4.5 w-4.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold leading-tight">Ayuda y soporte</span>
            <span className="block truncate text-[11.5px] text-muted-foreground">Resuelve tus dudas con el equipo</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="mx-4 max-w-[360px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Ayuda y soporte</DialogTitle>
            <DialogDescription>
              Escríbenos describiendo tu duda o problema. Respondemos en un máximo de 48 horas.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-secondary/70 px-4 py-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Correo de soporte</p>
            <p className="mt-1 font-display text-[15px] font-bold text-navy">soporte@menrut.app</p>
          </div>
          <Button className="h-11 rounded-full font-semibold" variant={copied ? 'secondary' : 'default'} onClick={copyEmail}>
            <Copy className="h-4 w-4" aria-hidden />
            {copied ? 'Copiado' : 'Copiar correo'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
