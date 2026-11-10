// MENRUT — ReputationScreen · Diálogo para reportar abuso de una opinión.
'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

interface ReportDialogProps {
  open: boolean
  onClose: () => void
  razon: string
  onRazonChange: (v: string) => void
  isPending: boolean
  onSend: () => void
}

export function ReportDialog({ open, onClose, razon, onRazonChange, isPending, onSend }: ReportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[380px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Reportar esta opinión</DialogTitle>
          <DialogDescription>
            Cuéntanos qué ocurre. La moderación de MENRUT revisará el caso.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="razon-reporte">Razón del reporte</Label>
          <Textarea
            id="razon-reporte"
            value={razon}
            onChange={(e) => onRazonChange(e.target.value)}
            placeholder="Ej.: lenguaje ofensivo, contenido falso…"
            maxLength={500}
            className="min-h-24 rounded-xl"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-11 rounded-full"
            disabled={razon.trim().length < 5 || isPending}
            onClick={onSend}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Enviando…
              </>
            ) : (
              'Enviar reporte'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
