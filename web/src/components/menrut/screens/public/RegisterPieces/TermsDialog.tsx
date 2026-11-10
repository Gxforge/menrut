// MENRUT — Piezas de RegisterScreen: diálogo de Términos y Política de
// privacidad.
'use client'

import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

export function TermsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80dvh] max-w-[380px] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">Términos y Política de privacidad</DialogTitle>
          <DialogDescription className="sr-only">Resumen de las condiciones de uso de MENRUT</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-[13px] leading-relaxed text-muted-foreground">
          <p>
            <strong className="text-foreground">Qué es MENRUT.</strong> MENRUT es una plataforma que
            conecta mensajeros, clientes y negocios en Cuba. No presta el servicio de mensajería ni
            transporta paquetes: facilita el encuentro y la comunicación entre las partes.
          </p>
          <p>
            <strong className="text-foreground">Tus datos.</strong> Solo pedimos la información
            necesaria para que la plataforma funcione: nombre, correo y los datos profesionales que
            decidas publicar. Los documentos de verificación se guardan de forma privada y nunca se
            muestran en tu pasaporte público.
          </p>
          <p>
            <strong className="text-foreground">Verificaciones.</strong> El sello «Identidad
            verificada» solo aparece cuando el equipo de MENRUT comprueba la identidad del mensajero.
            El resto de la información del perfil es declarada por su titular.
          </p>
          <p>
            <strong className="text-foreground">Opiniones.</strong> Las valoraciones provienen de
            usuarios con cuenta. El equipo de MENRUT modera los comentarios y puede ocultar los que
            incumplan las normas de respeto.
          </p>
          <p>
            <strong className="text-foreground">Pagos.</strong> Las membresías de mensajero se pagan
            por Transfermóvil y se confirman manualmente por el equipo con el comprobante enviado.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
