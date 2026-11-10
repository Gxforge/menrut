// MENRUT — ClientProfileScreen · cabecera con avatar (subida real a Supabase, WebP).
'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { Camera, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RoleBadge } from '@/components/menrut/screens/admin/_AdminNav'
import { api } from '@/lib/api'
import { uploadToBucket } from '@/lib/supabase'
import { compressImage } from '@/lib/image-compress'
import { useAppStore } from '@/lib/store'
import { initials } from '@/lib/format'
import type { Role, SessionUser } from '@/lib/types'

// ─── Conversión a WebP (el bucket courier-public solo acepta WebP) ───────────
// Usa el método compartido de compresión: máx. 512 px y ≤ 60 KB por avatar.

async function toWebp(file: File, maxSide = 512): Promise<File> {
  return compressImage(file, { maxSide, targetKb: 60, fileName: 'avatar' })
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
