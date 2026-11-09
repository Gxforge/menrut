// MENRUT — Configuración del mensajero
'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Eye, EyeOff, ChevronRight, IdCard, MessageSquare, Route as RouteIcon, Star,
  Lock, LogOut, LifeBuoy, Info, FileText, ShieldCheck, Loader2, UserRound,
} from 'lucide-react'
import { api } from '@/lib/api'
import { getSupabase } from '@/lib/supabase'
import { signOutSupabase } from '@/lib/auth'
import { useAppStore } from '@/lib/store'
import { initials } from '@/lib/format'
import { TopBar } from '@/components/menrut/core/TopBar'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Avisos {
  mensajes: boolean
  rutas: boolean
  valoraciones: boolean
}

const AVISOS_INICIALES: Avisos = { mensajes: true, rutas: true, valoraciones: true }
const AVISOS_KEY = 'menrut-avisos'

export default function SettingsScreen() {
  const session = useAppStore((s) => s.session)
  const navigate = useAppStore((s) => s.navigate)
  const back = useAppStore((s) => s.back)
  const logout = useAppStore((s) => s.logout)

  // Visibilidad real (no hay interruptor: se gestiona con la permanencia)
  const dashQ = useQuery({
    queryKey: ['courier-dashboard'],
    queryFn: () => api.courierDashboard(),
    enabled: !!session,
  })

  // Preferencias de avisos (solo en este dispositivo)
  const [avisos, setAvisos] = useState<Avisos | null>(null)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [ayudaOpen, setAyudaOpen] = useState(false)
  const [terminosOpen, setTerminosOpen] = useState(false)
  const [privacidadOpen, setPrivacidadOpen] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AVISOS_KEY)
      if (!raw) {
        setAvisos(AVISOS_INICIALES)
        return
      }
      const p = JSON.parse(raw) as Partial<Avisos>
      setAvisos({
        mensajes: typeof p.mensajes === 'boolean' ? p.mensajes : true,
        rutas: typeof p.rutas === 'boolean' ? p.rutas : true,
        valoraciones: typeof p.valoraciones === 'boolean' ? p.valoraciones : true,
      })
    } catch {
      setAvisos(AVISOS_INICIALES)
    }
  }, [])

  const toggleAviso = (k: keyof Avisos, v: boolean) => {
    const base = avisos ?? AVISOS_INICIALES
    const next = { ...base, [k]: v }
    setAvisos(next)
    try {
      localStorage.setItem(AVISOS_KEY, JSON.stringify(next))
    } catch {
      toast.error('No se pudo guardar la preferencia en este dispositivo.')
    }
  }

  // Cambio de contraseña real (Supabase Auth)
  const pwdQ = useMutation({
    mutationFn: async () => {
      if (pwd.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.')
      if (pwd !== pwd2) throw new Error('Las contraseñas no coinciden.')
      const { error } = await getSupabase().auth.updateUser({ password: pwd })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Contraseña actualizada.')
      setPwdOpen(false)
      setPwd('')
      setPwd2('')
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo actualizar la contraseña.'),
  })

  const cerrarSesion = async () => {
    try {
      await signOutSupabase()
    } finally {
      setLogoutOpen(false)
      logout()
    }
  }

  const nombre = session?.fullName ?? 'Mensajero'
  const email = session?.email ?? ''
  const dash = dashQ.data

  return (
    <div>
      <TopBar title="Configuración" subtitle="Cuenta, avisos y seguridad" onBack={back} />

      <div className="px-4 pt-4 pb-8">
        {/* Cabecera de identidad */}
        <section aria-label="Tu cuenta" className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4">
          <Avatar className="h-14 w-14 border border-line">
            {session?.avatarUrl ? (
              <img src={session.avatarUrl} alt={`Avatar de ${nombre}`} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-blue/10 text-[16px] font-bold text-blue">
                {initials(nombre)}
              </span>
            )}
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[16px] font-bold leading-tight">{nombre}</p>
            <p className="truncate text-[12px] text-muted-foreground">{email}</p>
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-blue/10 px-2.5 py-0.5 text-[10.5px] font-semibold text-blue">
              <UserRound className="h-3 w-3" aria-hidden />
              Mensajero
            </span>
          </div>
        </section>

        {/* 1 · Datos del pasaporte */}
        <section className="mt-5" aria-label="Datos del pasaporte">
          <h2 className="section-title mb-2.5">Datos del pasaporte</h2>
          <nav className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            <button
              type="button"
              onClick={() => navigate('complete-profile')}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
                <IdCard className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold leading-tight">Editar pasaporte</span>
                <span className="block text-[11.5px] text-muted-foreground">
                  Presentación, experiencia y verificación
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </nav>
        </section>

        {/* 2 · Visibilidad y disponibilidad */}
        <section className="mt-5" aria-label="Visibilidad y disponibilidad">
          <h2 className="section-title mb-2.5">Visibilidad y disponibilidad</h2>
          <div className="rounded-2xl border border-line bg-card p-4">
            {dashQ.isLoading ? (
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            ) : dashQ.isError || !dash ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12.5px] text-muted-foreground">No se pudo cargar el estado.</p>
                <Button variant="outline" size="sm" className="h-9 rounded-full" onClick={() => void dashQ.refetch()}>
                  Reintentar
                </Button>
              </div>
            ) : dash.isPublic ? (
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                  <Eye className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold leading-tight text-success">
                    Visible en las búsquedas
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                    Tu pasaporte es visible mientras tengas permanencia.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange/10 text-orange">
                  <EyeOff className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold leading-tight text-orange">
                    Oculto en las búsquedas
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                    Tu perfil no está visible. Puedes seguir entrando para gestionar tu cuenta o renovar la permanencia.
                  </p>
                </div>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-10 rounded-full px-4"
              onClick={() => navigate('membership')}
            >
              Gestionar permanencia
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </section>

        {/* 3 · Avisos (preferencias locales) */}
        <section className="mt-5" aria-label="Avisos">
          <h2 className="section-title mb-2.5">Avisos</h2>
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {(
              [
                { k: 'mensajes', icon: MessageSquare, label: 'Nuevos mensajes', hint: 'Cuando alguien te escriba' },
                { k: 'rutas', icon: RouteIcon, label: 'Rutas coincidentes', hint: 'Clientes que buscan tu trayecto' },
                { k: 'valoraciones', icon: Star, label: 'Valoraciones', hint: 'Nuevas opiniones de clientes' },
              ] as { k: keyof Avisos; icon: React.ComponentType<{ className?: string }>; label: string; hint: string }[]
            ).map((item) => {
              const Icon = item.icon
              return (
                <div key={item.k} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold leading-tight">{item.label}</p>
                    <p className="text-[11.5px] text-muted-foreground">{item.hint}</p>
                  </div>
                  <Switch
                    checked={avisos ? avisos[item.k] : true}
                    onCheckedChange={(v) => toggleAviso(item.k, v)}
                    aria-label={item.label}
                    disabled={!avisos}
                  />
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Preferencias guardadas solo en este dispositivo.
          </p>
        </section>

        {/* 4 · Seguridad */}
        <section className="mt-5" aria-label="Seguridad">
          <h2 className="section-title mb-2.5">Seguridad</h2>
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            <button
              type="button"
              onClick={() => setPwdOpen(true)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
                <Lock className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold leading-tight">Cambiar contraseña</span>
                <span className="block text-[11.5px] text-muted-foreground">Actualiza tu clave de acceso</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
                <LogOut className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold leading-tight text-destructive">
                  Cerrar sesión
                </span>
                <span className="block text-[11.5px] text-muted-foreground">Salir de tu cuenta en este dispositivo</span>
              </span>
            </button>
          </div>
        </section>

        {/* 5 · Ayuda */}
        <section className="mt-5" aria-label="Ayuda">
          <h2 className="section-title mb-2.5">Ayuda</h2>
          <nav className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            <button
              type="button"
              onClick={() => setAyudaOpen(true)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
                <LifeBuoy className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold leading-tight">Soporte</span>
                <span className="block text-[11.5px] text-muted-foreground">Dudas frecuentes de mensajeros</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </nav>
        </section>

        {/* 6 · Acerca de */}
        <section className="mt-5" aria-label="Acerca de">
          <h2 className="section-title mb-2.5">Acerca de</h2>
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
                <Info className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold leading-tight">MENRUT</p>
                <p className="text-[11.5px] text-muted-foreground">Conectamos caminos. · Versión 1.0.0-dev</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTerminosOpen(true)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
                <FileText className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold leading-tight">Términos y condiciones</span>
                <span className="block text-[11.5px] text-muted-foreground">Resumen de las reglas de uso</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setPrivacidadOpen(true)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
                <ShieldCheck className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold leading-tight">Política de privacidad</span>
                <span className="block text-[11.5px] text-muted-foreground">Qué datos usamos y para qué</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </div>
        </section>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          MENRUT · Conectamos caminos.
        </p>
      </div>

      {/* Cambiar contraseña */}
      <Dialog open={pwdOpen} onOpenChange={(o) => !o && setPwdOpen(false)}>
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
                onChange={(e) => setPwd(e.target.value)}
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
                onChange={(e) => setPwd2(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full"
              onClick={() => setPwdOpen(false)}
              disabled={pwdQ.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-11 rounded-full"
              disabled={pwdQ.isPending || pwd.length < 6 || pwd !== pwd2}
              onClick={() => pwdQ.mutate()}
            >
              {pwdQ.isPending ? (
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

      {/* Confirmar cierre de sesión */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
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
              onClick={() => void cerrarSesion()}
            >
              Cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Soporte */}
      <Dialog open={ayudaOpen} onOpenChange={setAyudaOpen}>
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
            <Button type="button" className="h-11 w-full rounded-full" onClick={() => setAyudaOpen(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Términos */}
      <Dialog open={terminosOpen} onOpenChange={setTerminosOpen}>
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
            <Button type="button" className="h-11 w-full rounded-full" onClick={() => setTerminosOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Privacidad */}
      <Dialog open={privacidadOpen} onOpenChange={setPrivacidadOpen}>
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
            <Button type="button" className="h-11 w-full rounded-full" onClick={() => setPrivacidadOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
