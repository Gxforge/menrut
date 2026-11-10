// MENRUT — CourierRoutesScreen · Confirmación de borrado de una ruta.
'use client'

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { RouteDto } from '@/lib/types'

interface DeleteRouteDialogProps {
  deleteTarget: RouteDto | null
  onClose: () => void
  onConfirm: (id: string) => void
}

export function DeleteRouteDialog({ deleteTarget, onClose, onConfirm }: DeleteRouteDialogProps) {
  return (
    <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar esta ruta?</AlertDialogTitle>
          <AlertDialogDescription>
            «{deleteTarget?.origin} → {deleteTarget?.destination}» se quitará de tu perfil y de las
            búsquedas. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Conservar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => deleteTarget && onConfirm(deleteTarget.id)}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
