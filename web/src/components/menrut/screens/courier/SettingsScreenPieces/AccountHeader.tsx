// MENRUT — SettingsScreen · Cabecera con la identidad del mensajero.
'use client'

import { UserRound } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { initials } from '@/lib/format'

interface AccountHeaderProps {
  nombre: string
  email: string
  avatarUrl?: string | null
}

export function AccountHeader({ nombre, email, avatarUrl }: AccountHeaderProps) {
  return (
    <section aria-label="Tu cuenta" className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4">
      <Avatar className="h-14 w-14 border border-line">
        {avatarUrl ? (
          <img src={avatarUrl} alt={`Avatar de ${nombre}`} className="h-full w-full object-cover" />
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
  )
}
