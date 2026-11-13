// MENRUT — ChatScreen · diálogo para que el mensajero cree un encargo (contrata).
'use client'

import { useState } from 'react'
import { Loader2, PackagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

export function EncargoDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (description: string) => void
  pending: boolean
}) {
  const [description, setDescription] = useState('')
  const trimmed = description.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-4 max-w-[360px] rounded-3xl">
        <DialogHeader>
          <DialogTitle>Generar encargo</DialogTitle>
          <DialogDescription>
            Registra el encargo acordado con el cliente. El acuerdo puede seguir por WhatsApp; aquí solo queda registrado.
            Después de crearlo ya no se puede cancelar el código de entrega.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder="Describe el encargo (opcional)"
          aria-label="Descripción del encargo"
          className="rounded-2xl"
        />
        <DialogFooter>
          <Button variant="secondary" className="h-11 flex-1 rounded-full" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            className="h-11 flex-1 rounded-full font-semibold"
            disabled={pending}
            onClick={() => {
              onSubmit(trimmed)
              setDescription('')
            }}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <PackagePlus className="h-4 w-4" aria-hidden />}
            Crear encargo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
