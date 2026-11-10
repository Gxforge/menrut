// MENRUT — ChatScreen · diálogo de reporte de la conversación.
'use client'

import { Flag, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

export function ReportDialog({
  open,
  onOpenChange,
  reason,
  onReasonChange,
  onSubmit,
  pending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  reason: string
  onReasonChange: (v: string) => void
  onSubmit: () => void
  pending: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-4 max-w-[360px] rounded-3xl">
        <DialogHeader>
          <DialogTitle>Reportar conversación</DialogTitle>
          <DialogDescription>
            Cuéntanos qué ocurrió. El equipo revisará el reporte con confidencialidad.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Motivo del reporte (mínimo 10 caracteres)"
          aria-label="Motivo del reporte"
          className="rounded-2xl"
        />
        <DialogFooter>
          <Button variant="secondary" className="h-11 flex-1 rounded-full" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button className="h-11 flex-1 rounded-full font-semibold" onClick={onSubmit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Flag className="h-4 w-4" aria-hidden />}
            Enviar reporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
