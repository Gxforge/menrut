// MENRUT — PassportScreen · tarjeta «¿Recibiste un paquete?» (cliente con
// sesión): abre el diálogo del código de entrega (OTP).
'use client'

import { PackageCheck } from 'lucide-react'

export function DeliveryCodeCard({
  courierName, onOpen, visible,
}: {
  courierName: string
  onOpen: () => void
  visible: boolean
}) {
  if (!visible) return null
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-blue/25 bg-blue/5 px-4 py-3.5 text-left transition-colors hover:bg-blue/10 active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
        <PackageCheck className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold leading-tight text-navy">
          ¿Recibiste un paquete de {courierName.split(' ')[0]}?
        </span>
        <span className="block text-[12px] leading-tight text-muted-foreground">
          Genera un código de entrega y dáselo al recibirlo: acredita la entrega verificada.
        </span>
      </span>
    </button>
  )
}
