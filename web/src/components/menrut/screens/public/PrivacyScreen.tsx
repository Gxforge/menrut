// MENRUT — Privacidad y datos (texto en lenguaje sencillo, sin detalles técnicos).
// Debe coincidir con la página pública /privacidad/.
'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ShieldCheck, Database, Clock, Trash2, UserCheck, AlertTriangle, Loader2, MessageSquare,
} from 'lucide-react'
import { apiMore } from '@/lib/api-more'
import { useAppStore } from '@/lib/store'
import { TopBar } from '@/components/menrut/core/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const SUPPORT_EMAIL = 'studio.lexair@gmail.com'

export default function PrivacyScreen() {
  const session = useAppStore((s) => s.session)
  const back = useAppStore((s) => s.back)
  const logout = useAppStore((s) => s.logout)
  const navigate = useAppStore((s) => s.navigate)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const deleteMut = useMutation({
    mutationFn: () => apiMore.deleteAccount(),
    onSuccess: (d) => {
      toast.success(
        d.authRemoved
          ? 'Cuenta eliminada. Todos tus datos personales fueron borrados.'
          : 'Cuenta eliminada de MENRUT. Tu acceso quedó cerrado.',
      )
      setDeleteOpen(false)
      logout()
      navigate('home')
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo eliminar la cuenta.'),
  })

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Privacidad y datos" subtitle="Qué datos usamos y cómo los cuidamos" onBack={back} />

      <main className="flex-1 space-y-4 px-4 pb-8 pt-4">
        <Section
          icon={<ShieldCheck className="h-5 w-5" aria-hidden />}
          title="Qué datos usamos"
          items={[
            'Tu cuenta: nombre, correo y, si quieres, teléfono y foto. Tu correo nunca se muestra a otros usuarios.',
            'Si eres mensajero: tu perfil (descripción, vehículo, tarifas, zona y rutas) que ven los clientes.',
            'Tu actividad: favoritos, rutas guardadas, mensajes, valoraciones y entregas confirmadas.',
            'Pagos: el comprobante y si ya fue aprobado. Solo los ve el equipo de MENRUT.',
          ]}
        />
        <Section
          icon={<Database className="h-5 w-5" aria-hidden />}
          title="Cómo los protegemos"
          items={[
            'Las fotos de verificación son privadas y solo se abren con enlaces temporales.',
            'MENRUT no usa tu ubicación del teléfono: el municipio lo eliges tú.',
            'No usamos herramientas de publicidad ni de rastreo de terceros.',
            'Ningún dato se vende ni se comparte con fines publicitarios.',
          ]}
        />
        <Section
          icon={<Clock className="h-5 w-5" aria-hidden />}
          title="Cuánto tiempo los guardamos"
          items={[
            'Tu cuenta y tu actividad: mientras la cuenta esté activa.',
            'Mensajes: hasta que elimines tu cuenta o borres la conversación.',
            'Registros de pagos: sin datos personales, por obligación contable.',
            'Registros de seguridad (denuncias y moderación): hasta 12 meses.',
          ]}
        />
        <Section
          icon={<UserCheck className="h-5 w-5" aria-hidden />}
          title="Tus derechos"
          items={[
            'Ver y cambiar tus datos: desde tu perfil, en cualquier momento.',
            'Eliminar tu cuenta: con el botón de abajo. Es inmediato e irreversible.',
            `Pedir una copia de tus datos: escribe a ${SUPPORT_EMAIL}.`,
            'Denunciar: desde cualquier perfil u opinión.',
          ]}
        />

        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="flex items-center gap-2 text-[14px] font-bold">
            <MessageSquare className="h-4.5 w-4.5 text-blue" aria-hidden />
            Términos de uso (resumen)
          </h2>
          <ul className="mt-2.5 space-y-2 text-[12.5px] leading-relaxed text-muted-foreground">
            <li>· MENRUT conecta a clientes con mensajeros. No cobra ni gestiona los pagos entre ustedes y no responde por los acuerdos entre usuarios.</li>
            <li>· Las cuentas de demostración llevan una insignia visible y nunca se presentan como reales.</li>
            <li>· El contenido ofensivo o fraudulento se revisa con las denuncias de la comunidad.</li>
          </ul>
        </section>

        {session && (
          <section className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
            <h2 className="flex items-center gap-2 text-[14px] font-bold text-danger">
              <AlertTriangle className="h-4.5 w-4.5" aria-hidden />
              Zona sensible
            </h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
              Al eliminar tu cuenta se borran tus datos personales, tus favoritos, tus
              rutas guardadas, tus mensajes y tus avisos. Si eres mensajero, tu perfil
              deja de aparecer. Es irreversible.
            </p>
            <Button
              variant="outline"
              className="mt-3 h-11 rounded-full font-bold text-danger hover:text-danger"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Eliminar mi cuenta
            </Button>
          </section>
        )}

        <p className="pt-1 text-center text-[10.5px] tracking-wide text-muted-foreground">
          MENRUT · Conectamos caminos.
        </p>
      </main>

      {/* Confirmación de borrado (escribe BORRAR) */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="mx-4 max-w-[360px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-danger">Eliminar mi cuenta</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Escribe <strong>BORRAR</strong> para confirmar.
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label="Escribe BORRAR para confirmar"
            placeholder="BORRAR"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            className="h-11 rounded-full text-center font-bold tracking-widest"
          />
          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-full font-semibold"
              disabled={deleteMut.isPending}
              onClick={() => setDeleteOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="h-11 flex-1 rounded-full font-bold"
              disabled={confirmText !== 'BORRAR' || deleteMut.isPending}
              onClick={() => deleteMut.mutate()}
            >
              {deleteMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Section({
  icon, title, items,
}: {
  icon: React.ReactNode
  title: string
  items: string[]
}) {
  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="flex items-center gap-2 text-[14px] font-bold">
        <span className="text-blue">{icon}</span>
        {title}
      </h2>
      <ul className="mt-2.5 space-y-2 text-[12.5px] leading-relaxed text-muted-foreground">
        {items.map((it) => (
          <li key={it.slice(0, 24)}>· {it}</li>
        ))}
      </ul>
    </section>
  )
}
