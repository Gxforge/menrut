// MENRUT — SettingsScreen · Diálogos: contraseña, cierre de sesión, soporte,
// términos y privacidad. El estado de apertura vive en la pantalla principal.
'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Cambiar contraseña (Supabase Auth)
export function PasswordDialog({
  open,
  onClose,
  pwd,
  pwd2,
  onPwdChange,
  onPwd2Change,
  isPending,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  pwd: string
  pwd2: string
  onPwdChange: (v: string) => void
  onPwd2Change: (v: string) => void
  isPending: boolean
  onSubmit: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[400px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            Se aplica a tu cuenta MENRUT de inmediato. Usa al menos 6 caracteres.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pwd1">Nueva contraseña</Label>
            <Input
              id="pwd1"
              type="password"
              autoComplete="new-password"
              value={pwd}
              onChange={(e) => onPwdChange(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pwd2">Repite la contraseña</Label>
            <Input
              id="pwd2"
              type="password"
              autoComplete="new-password"
              value={pwd2}
              onChange={(e) => onPwd2Change(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full"
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-11 rounded-full"
            disabled={isPending || pwd.length < 6 || pwd !== pwd2}
            onClick={onSubmit}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Guardando…
              </>
            ) : (
              'Actualizar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Confirmar cierre de sesión
export function LogoutDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
          <AlertDialogDescription>
            Saldrás de tu cuenta en este dispositivo. Tus datos permanecen guardados y puedes volver
            a entrar cuando quieras.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Quedarme</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Cerrar sesión
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Soporte
export function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Soporte para mensajeros</DialogTitle>
          <DialogDescription>Cómo resolver lo más frecuente.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-3 text-[13px] leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">Pagos y membresía:</strong> el pago se hace por
            transferencia o efectivo y se activa cuando un administrador revisa tu comprobante.
          </li>
          <li>
            <strong className="text-foreground">Verificación:</strong> completa tu pasaporte desde
            «Editar pasaporte» y espera la revisión; el sello aparece solo si se aprueba.
          </li>
          <li>
            <strong className="text-foreground">Contenido inapropiado:</strong> usa la opción
            «Reportar» en la propia pantalla; la moderación lo revisará.
          </li>
          <li>
            <strong className="text-foreground">Perfil oculto:</strong> si tu permanencia venció,
            renueva desde Membresía. Nada se borra.
          </li>
        </ul>
        <DialogFooter>
          <Button type="button" className="h-11 w-full rounded-full" onClick={() => onOpenChange(false)}>
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Términos
export function TermsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Términos y condiciones</DialogTitle>
          <DialogDescription>Resumen de las reglas de la plataforma (versión 1.0.0-dev).</DialogDescription>
        </DialogHeader>
        <ul className="space-y-3 text-[13px] leading-relaxed text-muted-foreground">
          <li>MENRUT conecta mensajeros y clientes: publica únicamente información veraz sobre tus rutas y servicios.</li>
          <li>La tarifa y las condiciones finales se acuerdan entre las partes; la plataforma no interviene en el pago de los envíos.</li>
          <li>Los créditos no son dinero: no son transferibles ni se canjean por efectivo.</li>
          <li>Al vencer la permanencia tu perfil se oculta; nada se borra. La renovación es acumulativa.</li>
          <li>Las valoraciones se gestionan con moderación y no se pueden borrar por tu cuenta.</li>
        </ul>
        <DialogFooter>
          <Button type="button" className="h-11 w-full rounded-full" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Privacidad
export function PrivacyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Política de privacidad</DialogTitle>
          <DialogDescription>Qué datos usamos y para qué (versión 1.0.0-dev).</DialogDescription>
        </DialogHeader>
        <ul className="space-y-3 text-[13px] leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">Perfil público:</strong> nombre, foto, rutas y
            valoraciones. Se muestra en las búsquedas mientras tengas permanencia.
          </li>
          <li>
            <strong className="text-foreground">Mensajes:</strong> las conversaciones se usan para
            coordinar envíos entre las partes.
          </li>
          <li>
            <strong className="text-foreground">Comprobantes de pago:</strong> se guardan en un
            espacio privado y solo se usan para revisar tu solicitud de membresía.
          </li>
          <li>
            <strong className="text-foreground">Documentos de verificación:</strong> los revisa la
            administración; nunca se muestran en tu perfil público.
          </li>
          <li>No mostramos tu ubicación en vivo ni datos sensibles en las búsquedas.</li>
        </ul>
        <DialogFooter>
          <Button type="button" className="h-11 w-full rounded-full" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
