// MENRUT — PassportScreen · diálogo de reporte del perfil.
'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function ReportDialog({
  open,
  onOpenChange,
  fullName,
  reason,
  onReasonChange,
  pending,
  onSend,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  fullName: string
  reason: string
  onReasonChange: (v: string) => void
  pending: boolean
  onSend: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">Reportar perfil</DialogTitle>
          <DialogDescription>
            Cuéntanos qué ocurre con el perfil de {fullName}. Solo el equipo de moderación verá tu reporte.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={4}
          placeholder="Motivo del reporte (datos falsos, trato inadecuado, estafa…)"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          aria-label="Motivo del reporte"
          className="rounded-xl"
        />
        <DialogFooter className="flex-row gap-2">
          <Button
            variant="outline"
            className="h-11 flex-1 rounded-full font-semibold"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            className="h-11 flex-1 rounded-full font-bold"
            disabled={reason.trim().length < 5 || pending}
            onClick={onSend}
          >
            {pending && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />}
            Enviar reporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
