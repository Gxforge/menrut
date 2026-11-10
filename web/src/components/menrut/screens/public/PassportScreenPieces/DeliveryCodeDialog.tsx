// MENRUT — PassportScreen · diálogo «Código de entrega» (OTP).
// El CLIENTE genera un código de 6 dígitos; cuando recibe su paquete se lo
// dicta al mensajero, quien lo verifica en su panel → entrega verificada
// (+1 en el pasaporte y reseñas verificables).
'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, Copy, KeyRound, Loader2, PackageCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

interface DeliveryCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courierUserId: string
  courierName: string
  onCreate: (courierUserId: string) => Promise<{ code: string; expiresInSec: number }>
}

export function DeliveryCodeDialog({ open, onOpenChange, courierUserId, courierName, onCreate }: DeliveryCodeDialogProps) {
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createMut = useMutation({
    mutationFn: () => onCreate(courierUserId),
    onSuccess: (data) => {
      setCode(data.code)
      setCopied(false)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'No se pudo generar el código.'),
  })

  function copy() {
    if (!code) return
    navigator.clipboard?.writeText(code).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      () => toast.info(`Tu código: ${code}`),
    )
  }

  function close() {
    onOpenChange(false)
    setCode(null)
    createMut.reset()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="mx-4 max-w-[380px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <PackageCheck className="h-5 w-5 text-blue" aria-hidden />
            Código de entrega
          </DialogTitle>
          <DialogDescription>
            Genera un código de 6 dígitos y dáselo a {courierName.split(' ')[0]} cuando
            recibas tu paquete. Al verificarlo, la entrega queda acreditada en su pasaporte.
          </DialogDescription>
        </DialogHeader>

        {code ? (
          <div className="space-y-3 text-center">
            <p className="text-[12px] text-muted-foreground">Tu código (válido 24 horas):</p>
            <button
              type="button"
              onClick={copy}
              aria-label="Copiar código"
              className="mx-auto flex items-center gap-3 rounded-2xl border-2 border-dashed border-blue/40 bg-blue/5 px-6 py-4 font-display text-[34px] font-bold tracking-[0.35em] text-navy transition-colors active:bg-blue/10"
            >
              {code}
              {copied ? (
                <Check className="h-5 w-5 text-success" aria-hidden />
              ) : (
                <Copy className="h-5 w-5 text-muted-foreground" aria-hidden />
              )}
            </button>
            <p className="rounded-xl bg-muted px-3 py-2 text-left text-[11.5px] leading-relaxed text-muted-foreground">
              No lo compartes con nadie más: solo sirve para confirmar esta entrega contigo.
              Si vence, puedes generar uno nuevo.
            </p>
          </div>
        ) : createMut.isPending ? (
          <div className="flex items-center justify-center gap-2 py-6 text-[13px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Generando código…
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue/10 text-blue">
              <KeyRound className="h-6 w-6" aria-hidden />
            </span>
            <p className="text-center text-[12.5px] leading-relaxed text-muted-foreground">
              Úsalo cuando el mensajero te entregue algo en mano. La entrega verificada
              suma confianza a su reputación.
            </p>
          </div>
        )}

        <DialogFooter className="flex-row gap-2">
          <Button variant="outline" className="h-11 flex-1 rounded-full font-semibold" onClick={close}>
            {code ? 'Listo' : 'Cancelar'}
          </Button>
          {!code && (
            <Button
              className="h-11 flex-1 rounded-full font-bold"
              disabled={createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              Generar código
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
