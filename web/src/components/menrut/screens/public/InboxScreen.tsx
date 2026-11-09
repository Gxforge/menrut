// MENRUT — Mensajes: bandeja de entrada
// Lista de conversaciones con avatar, rol del otro, último mensaje, fecha
// relativa y contador de no leídos. Refresco automático cada 30 segundos.
'use client'

import { useQuery } from '@tanstack/react-query'
import { MessageSquare, RefreshCw } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, InboxEmpty } from '@/components/menrut/core/EmptyState'
import { TabHeader } from '@/components/menrut/screens/public/ClientProfileScreen'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { initials, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ConversationDto, Role } from '@/lib/types'

const ROLE_BADGES: Record<Role, { label: string; cls: string }> = {
  courier: { label: 'Mensajero', cls: 'bg-blue/10 text-blue' },
  client: { label: 'Cliente', cls: 'bg-muted text-muted-foreground' },
  business: { label: 'Negocio', cls: 'bg-orange/10 text-orange' },
  admin: { label: 'Equipo', cls: 'bg-navy/10 text-navy' },
  owner: { label: 'Propietario', cls: 'bg-success/10 text-success' },
  moderator: { label: 'Moderación', cls: 'bg-muted text-muted-foreground' },
}

export default function InboxScreen() {
  const session = useAppStore((s) => s.session)
  const openConversation = useAppStore((s) => s.openConversation)
  const navigate = useAppStore((s) => s.navigate)

  const conversations = useQuery({
    queryKey: ['conversations', session?.id],
    queryFn: () => api.conversations(),
    enabled: !!session,
    refetchInterval: 30000,
  })

  const list = conversations.data?.conversations ?? []
  const unread = list.reduce((acc, c) => acc + c.unread, 0)

  function open(c: ConversationDto) {
    openConversation(c.id, c.otherName)
    navigate('chat')
  }

  return (
    <div className="pb-10">
      <TabHeader
        title="Mensajes"
        subtitle="Conversaciones con mensajeros y clientes"
        right={
          unread > 0 ? (
            <span
              aria-label={`${unread} mensajes sin leer`}
              className="flex h-7 min-w-7 items-center justify-center rounded-full bg-danger px-2 text-[12px] font-bold text-white"
            >
              {unread > 99 ? '99+' : unread}
            </span>
          ) : undefined
        }
      />

      <div className="px-4 pt-4">
        {!session ? (
          <EmptyState
            icon={<MessageSquare className="h-8 w-8" aria-hidden />}
            title="Inicia sesión para ver tus mensajes"
            hint="Coordina directamente con los mensajeros desde conversaciones privadas. La búsqueda sigue siendo libre, sin cuenta."
            actionLabel="Iniciar sesión"
            onAction={() => navigate('login')}
          />
        ) : conversations.isLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Cargando conversaciones">
            <ConversationSkeleton />
            <ConversationSkeleton />
            <ConversationSkeleton />
            <ConversationSkeleton />
          </div>
        ) : conversations.isError ? (
          <EmptyState
            icon={<RefreshCw className="h-8 w-8" aria-hidden />}
            title="No pudimos cargar tus mensajes"
            hint="Revisa tu conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={() => conversations.refetch()}
          />
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center">
            <InboxEmpty />
            <Button className="rounded-full px-6" onClick={() => navigate('home')}>
              <MessageSquare className="h-4 w-4" aria-hidden />
              Buscar mensajeros
            </Button>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {list.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => open(c)}
                  aria-label={`Abrir conversación con ${c.otherName}`}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl border bg-card p-3.5 text-left transition-all',
                    'hover:shadow-[0_10px_30px_rgba(20,67,130,0.08)] active:scale-[0.99]',
                    c.unread > 0 ? 'border-blue/25' : 'border-line'
                  )}
                >
                  <Avatar className="h-12 w-12 shrink-0 border border-line">
                    {c.otherAvatar ? <AvatarImage src={c.otherAvatar} alt={`Foto de ${c.otherName}`} /> : null}
                    <AvatarFallback className="bg-secondary font-display text-sm font-bold text-navy">
                      {initials(c.otherName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className={cn('truncate text-[14px] font-semibold leading-tight', c.unread > 0 && 'text-navy')}>
                          {c.otherName}
                        </span>
                        <RoleBadge role={c.otherRole} />
                      </span>
                      <span className="shrink-0 text-[10.5px] text-muted-foreground">{timeAgo(c.lastMessageAt)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className={cn('truncate text-[12.5px]', c.unread > 0 ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                        {c.lastMessage || 'Sin mensajes todavía'}
                      </p>
                      {c.unread > 0 && (
                        <span
                          aria-label={`${c.unread} sin leer`}
                          className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-danger px-1.5 text-[10.5px] font-bold text-white"
                        >
                          {c.unread > 9 ? '9+' : c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {list.length > 0 && (
          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
            Contacta de forma directa y acuerda los detalles del servicio con la otra persona.
          </p>
        )}
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: Role }) {
  const meta = ROLE_BADGES[role] ?? ROLE_BADGES.client
  return (
    <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold', meta.cls)}>
      {meta.label}
    </span>
  )
}

function ConversationSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-card p-3.5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-52" />
        </div>
        <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
      </div>
    </div>
  )
}
