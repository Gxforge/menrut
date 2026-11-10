// MENRUT — Privacidad y términos (política definitiva).
// Qué datos tratamos, dónde viven, cuánto tiempo se conservan, derechos del
// titular (acceso, rectificación, supresión) y eliminación de la cuenta
// (DELETE /me: anonimiza identidad, borra datos personales, oculta el
// pasaporte si es mensajero y elimina la cuenta de autenticación).
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
      <TopBar title="Privacidad y datos" subtitle="Cómo tratamos tu información" onBack={back} />

      <main className="flex-1 space-y-4 px-4 pb-8 pt-4">
        <Section
          icon={<ShieldCheck className="h-5 w-5" aria-hidden />}
          title="Qué datos tratamos"
          items={[
            'Cuenta: nombre, correo y (opcional) teléfono y foto. El correo nunca se muestra públicamente.',
            'Mensajeros: perfil profesional (bio, vehículos, tarifas, rutas y cobertura) publicado en el directorio.',
            'Actividad: favoritos, rutas guardadas, conversaciones, opiniones y entregas verificadas.',
            'Pagos Transfermóvil: comprobante y estado de aprobación, visibles solo para el equipo de MENRUT.',
          ]}
        />
        <Section
          icon={<Database className="h-5 w-5" aria-hidden />}
          title="Dónde viven tus datos"
          items={[
            'Identidad y autenticación: Supabase (menrut-principal, único entorno de producción).',
            'Directorio y datos operativos: bases D1 de Cloudflare (1 núcleo + 9 particiones).',
            'Fotos: almacenamiento privado con enlaces firmados temporales; nunca datos binarios en las bases.',
            'Ningún dato se vende ni se comparte con terceros con fines publicitarios.',
          ]}
        />
        <Section
          icon={<Clock className="h-5 w-5" aria-hidden />}
          title="Cuánto tiempo se conservan"
          items={[
            'Cuenta y actividad: mientras la cuenta esté activa.',
            'Conversaciones: hasta que elimines tu cuenta (o borres la conversación).',
            'Asientos contables (créditos y pagos): se conservan anonimizados por obligación contable, sin datos personales.',
            'Registros de seguridad (auditoría y denuncias): hasta 12 meses, solo para moderación.',
          ]}
        />
        <Section
          icon={<UserCheck className="h-5 w-5" aria-hidden />}
          title="Tus derechos"
          items={[
            'Acceso y rectificación: edita tu perfil desde la app en cualquier momento.',
            'Supresión: botón «Eliminar mi cuenta» abajo; es inmediato e irreversible.',
            'Portabilidad: solicita una copia de tus datos escribiendo al soporte desde Mensajes.',
            'Reclamación: puedes denunciar conductas o datos indebidos desde cualquier perfil o conversación.',
          ]}
        />

        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="flex items-center gap-2 text-[14px] font-bold">
            <MessageSquare className="h-4.5 w-4.5 text-blue" aria-hidden />
            Términos de uso (resumen)
          </h2>
          <ul className="mt-2.5 space-y-2 text-[12.5px] leading-relaxed text-muted-foreground">
            <li>· MENRUT es un directorio: conecta clientes y mensajeros; no gestiona pagos entre partes ni es responsable de los acuerdos entre usuarios.</li>
            <li>· Los mensajeros de demostración se muestran con insignia visible y nunca se presentan como reales.</li>
            <li>· Contenido ofensivo o fraudulento se modera con las denuncias de la comunidad.</li>
          </ul>
        </section>

        {session && (
          <section className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
            <h2 className="flex items-center gap-2 text-[14px] font-bold text-danger">
              <AlertTriangle className="h-4.5 w-4.5" aria-hidden />
              Zona sensible
            </h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
              Eliminar tu cuenta borra tus datos personales (perfil, favoritos, rutas
              guardadas, conversaciones y notificaciones), oculta tu pasaporte si eres
              mensajero y cierra tu acceso. Es irreversible.
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
