// MENRUT — Perfil del cliente
// Cabecera con avatar (subida real a Supabase, WebP), datos de cuenta, actividad,
// soporte, privacidad y cierre de sesión.
// Exporta bloques compartidos (TabHeader, ProfileHeader, AccountCard…) que
// reutilizan el resto de pantallas secundarias de cliente y BusinessProfileScreen.
'use client'

import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Bike, Bell, Camera, ChevronRight, Copy, Heart, LifeBuoy, Loader2,
  LogOut, MessageSquare, ShieldCheck, UserRound,
} from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { RoleBadge } from '@/components/menrut/screens/admin/_AdminNav'
import { api } from '@/lib/api'
import { signOutSupabase } from '@/lib/auth'
import { uploadToBucket } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Role, SessionUser } from '@/lib/types'

// ─── Encabezado de pestaña (sin volver: sección raíz de la barra inferior) ───

export function TabHeader({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-background/85 px-4 py-3.5 pt-safe backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="screen-title truncate">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </header>
  )
}

// ─── Estado sin sesión (las guardas de AppShell ya redirigen; esto es respaldo) ───

export function SessionGate({ feature }: { feature: string }) {
  const navigate = useAppStore((s) => s.navigate)
  return (
    <div className="px-4 pt-10">
      <EmptyState
        icon={<UserRound className="h-8 w-8" aria-hidden />}
        title="Inicia sesión para continuar"
        hint={`${feature} requiere una cuenta. Entra para gestionar tus datos y tu actividad en MENRUT.`}
        actionLabel="Iniciar sesión"
        onAction={() => navigate('login')}
      />
    </div>
  )
}

// ─── Conversión a WebP (el bucket courier-public solo acepta WebP) ───────────

async function toWebp(file: File, maxSide = 512): Promise<File> {
  if (file.type === 'image/webp') return file
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen en este dispositivo.')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/webp', 0.85)
  )
  if (!blob) throw new Error('El formato de la imagen no es compatible. Prueba con JPG o PNG.')
  return new File([blob], 'avatar.webp', { type: 'image/webp' })
}

const ROLE_LABELS: Record<Role, string> = {
  client: 'Cuenta de cliente',
  business: 'Cuenta de negocio',
  courier: 'Cuenta de mensajero',
  admin: 'Equipo MENRUT',
  owner: 'Propietario',
  moderator: 'Moderación',
}

// ─── Cabecera: avatar con cambio de foto + nombre + correo ───────────────────

export function ProfileHeader({ session }: { session: SessionUser }) {
  const setSession = useAppStore((s) => s.setSession)
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen (JPG, PNG o WebP).')
      }
      // El bucket courier-public solo acepta WebP: convertimos antes de subir.
      const webp = await toWebp(file)
      const url = await uploadToBucket('courier-public', webp, 'avatars')
      const { user } = await api.updateProfile({ avatarUrl: url })
      setSession(user)
      toast.success('Foto de perfil actualizada')
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('row-level security') || msg.includes('Bucket not found')) {
        // El bucket existe pero las políticas RLS de Supabase Storage rechazan
        // la subida: problema de infraestructura, no del archivo del usuario.
        toast.error('El almacenamiento de fotos no está disponible ahora. Inténtalo más tarde.')
      } else {
        toast.error(msg || 'No se pudo subir la foto. Intenta con una imagen más ligera.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-3xl border border-line bg-card p-5">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <Avatar className="h-16 w-16 border border-line">
            {session.avatarUrl ? <AvatarImage src={session.avatarUrl} alt={`Foto de ${session.fullName}`} /> : null}
            <AvatarFallback className="bg-navy font-display text-lg font-bold text-white">
              {initials(session.fullName)}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            aria-label="Cambiar foto de perfil"
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue text-white shadow-md transition-transform active:scale-95 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
            aria-label="Seleccionar nueva foto de perfil"
          />
        </div>
        <div className="min-w-0">
          <h2 className="truncate font-display text-[17px] font-bold leading-tight">{session.fullName}</h2>
          <p className="truncate text-[12.5px] text-muted-foreground">{session.email}</p>
          {session.role === 'owner' || session.role === 'admin' || session.role === 'moderator' ? (
            <span className="mt-1.5 inline-flex">
              <RoleBadge role={session.role} />
            </span>
          ) : (
            <span className="mt-1.5 inline-flex items-center rounded-full bg-blue/10 px-2 py-0.5 text-[10.5px] font-semibold text-blue">
              {ROLE_LABELS[session.role]}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Tarjeta Cuenta: editar nombre y teléfono ───────────────────────────────

export function AccountCard({ session }: { session: SessionUser }) {
  const setSession = useAppStore((s) => s.setSession)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(session.fullName)
  const [phone, setPhone] = useState(session.phone ?? '')
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setName(session.fullName)
    setPhone(session.phone ?? '')
    setEditing(true)
  }

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('El nombre no puede estar vacío.')
      return
    }
    setSaving(true)
    try {
      const payload: { fullName: string; phone?: string } = { fullName: trimmed }
      const p = phone.trim()
      if (p) payload.phone = p
      const { user } = await api.updateProfile(payload)
      setSession(user)
      setEditing(false)
      toast.success('Datos actualizados')
    } catch {
      toast.error('No se pudieron guardar los datos. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="section-title">Cuenta</h3>
        {!editing && (
          <Button variant="ghost" size="sm" className="rounded-full text-blue" onClick={startEdit}>
            Editar
          </Button>
        )}
      </div>

      {!editing ? (
        <dl className="mt-2 space-y-2.5">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Nombre</dt>
            <dd className="mt-0.5 text-[14px] font-medium">{session.fullName}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Teléfono</dt>
            <dd className="mt-0.5 text-[14px] font-medium">{session.phone || 'Sin teléfono'}</dd>
          </div>
        </dl>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">Nombre</Label>
            <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-phone">Teléfono</Label>
            <Input
              id="acc-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              placeholder="Ej. +53 5xxxxxxx"
              maxLength={20}
              autoComplete="tel"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              className="h-11 flex-1 rounded-full"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button className="h-11 flex-1 rounded-full font-semibold" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Guardar
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

// ─── Tarjeta Mi actividad: accesos rápidos ──────────────────────────────────

const ACTIVITY_LINKS: { screen: 'saved' | 'inbox' | 'notifications'; icon: typeof Heart; label: string; hint: string }[] = [
  { screen: 'saved', icon: Heart, label: 'Guardados', hint: 'Rutas y mensajeros favoritos' },
  { screen: 'inbox', icon: MessageSquare, label: 'Mensajes', hint: 'Tus conversaciones' },
  { screen: 'notifications', icon: Bell, label: 'Notificaciones', hint: 'Novedades y preferencias' },
]

export function ActivityCard() {
  const navigate = useAppStore((s) => s.navigate)
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="px-4 pt-4">
        <h3 className="section-title">Mi actividad</h3>
      </div>
      <ul className="mt-2">
        {ACTIVITY_LINKS.map(({ screen, icon: Icon, label, hint }) => (
          <li key={screen} className="border-t border-line/60 first:border-t-0">
            <button
              type="button"
              onClick={() => navigate(screen)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 active:scale-[0.99]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue/10 text-blue">
                <Icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold leading-tight">{label}</span>
                <span className="block truncate text-[11.5px] text-muted-foreground">{hint}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ─── Tarjeta Ayuda y soporte ────────────────────────────────────────────────

export function SupportCard() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText('soporte@menrut.app')
      setCopied(true)
      toast.success('Correo copiado')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('No se pudo copiar. Escribe a soporte@menrut.app')
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
            <LifeBuoy className="h-4.5 w-4.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold leading-tight">Ayuda y soporte</span>
            <span className="block truncate text-[11.5px] text-muted-foreground">Resuelve tus dudas con el equipo</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="mx-4 max-w-[360px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Ayuda y soporte</DialogTitle>
            <DialogDescription>
              Escríbenos describiendo tu duda o problema. Respondemos en un máximo de 48 horas.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-secondary/70 px-4 py-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Correo de soporte</p>
            <p className="mt-1 font-display text-[15px] font-bold text-navy">soporte@menrut.app</p>
          </div>
          <Button className="h-11 rounded-full font-semibold" variant={copied ? 'secondary' : 'default'} onClick={copyEmail}>
            <Copy className="h-4 w-4" aria-hidden />
            {copied ? 'Copiado' : 'Copiar correo'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Tarjeta Privacidad ─────────────────────────────────────────────────────

export function PrivacyCard() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
            <ShieldCheck className="h-4.5 w-4.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold leading-tight">Privacidad</span>
            <span className="block truncate text-[11.5px] text-muted-foreground">Qué datos son públicos</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="mx-4 max-w-[360px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Tus datos</DialogTitle>
            <DialogDescription>Un resumen claro de qué se comparte.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2.5 text-[13px] leading-relaxed text-foreground">
            <li>· Tu nombre y tu foto de perfil son visibles para las personas con quienes conversas.</li>
            <li>· Tu correo y tu teléfono no se muestran en búsquedas ni en perfiles públicos.</li>
            <li>· Las conversaciones son privadas entre las partes y puedes reportar cualquier comportamiento inadecuado.</li>
            <li>· Puedes cerrar sesión en cualquier momento; tu cuenta se conserva.</li>
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Cierre de sesión ───────────────────────────────────────────────────────

export function LogoutCard() {
  const logout = useAppStore((s) => s.logout)
  const resetTo = useAppStore((s) => s.resetTo)
  const qc = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function doLogout() {
    setBusy(true)
    try {
      await signOutSupabase()
    } catch {
      // La sesión local se cierra igualmente; Supabase reintenta en segundo plano.
    }
    qc.clear()
    logout()
    resetTo('home')
    toast.success('Sesión cerrada. ¡Hasta pronto!')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-full border border-danger/30 bg-danger/10',
          'h-12 text-[14px] font-semibold text-danger transition-transform active:scale-[0.98]'
        )}
      >
        <LogOut className="h-4.5 w-4.5" aria-hidden />
        Cerrar sesión
      </button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent className="mx-4 max-w-[360px] rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              Volverás a la pantalla de inicio y deberás entrar de nuevo para acceder a tu cuenta, tus guardados y tus mensajes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="mt-0 flex-1 rounded-full" disabled={busy}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 rounded-full bg-danger font-semibold hover:bg-danger/90"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault()
                doLogout()
              }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ─── Pantalla: Perfil del cliente ───────────────────────────────────────────

function SwitchToCourierCard() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange/10 text-orange">
            <Bike className="h-4.5 w-4.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold leading-tight">Cambiar a cuenta de mensajero</span>
            <span className="block truncate text-[11.5px] text-muted-foreground">Publica rutas y recibe clientes</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </section>

      {/* Informativo y honesto: hoy no existe cambio de rol en la API. */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="mx-4 max-w-[360px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Cambiar a cuenta de mensajero</DialogTitle>
            <DialogDescription>
              El cambio de rol a mensajero estará disponible próximamente. Mientras tanto, puedes
              escribir a soporte@menrut.app y el equipo lo gestionará contigo.
            </DialogDescription>
          </DialogHeader>
          <Button className="h-11 rounded-full font-semibold" onClick={() => setOpen(false)}>
            Entendido
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}

function BusinessLinkCard() {
  const navigate = useAppStore((s) => s.navigate)
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-card">
      <button
        type="button"
        onClick={() => navigate('business-profile')}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 active:scale-[0.99]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
          <UserRound className="h-4.5 w-4.5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold leading-tight">Ver perfil del negocio</span>
          <span className="block truncate text-[11.5px] text-muted-foreground">Datos y entregas comerciales</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    </section>
  )
}

export default function ClientProfileScreen() {
  const session = useAppStore((s) => s.session)

  if (!session) return <SessionGate feature="Tu perfil" />

  return (
    <div className="pb-10">
      <TabHeader title="Mi perfil" subtitle="Tu espacio en MENRUT" />
      <div className="space-y-4 px-4 pt-4">
        <ProfileHeader session={session} />
        <AccountCard session={session} />
        <ActivityCard />
        {session.role === 'business' && <BusinessLinkCard />}
        {session.role === 'client' && <SwitchToCourierCard />}
        <SupportCard />
        <PrivacyCard />
        <div className="pt-1">
          <LogoutCard />
        </div>
        <p className="pt-1 text-center text-[10.5px] tracking-wide text-muted-foreground">
          MENRUT · Conectamos caminos.
        </p>
      </div>
    </div>
  )
}
