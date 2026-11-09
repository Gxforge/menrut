// MENRUT — Administración · Clientes y negocios (consulta de cuentas)
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Flag, Info, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { formatDateTime, initials } from '@/lib/format'
import { AdminScreen } from '@/components/menrut/screens/admin/_AdminNav'
import { EmptyState, ListSkeleton } from '@/components/menrut/core/EmptyState'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { AdminAccountDto, Role } from '@/lib/types'

type AccountTab = 'clients' | 'business' | 'all'

const TABS: { id: AccountTab; label: string }[] = [
  { id: 'clients', label: 'Clientes' },
  { id: 'business', label: 'Negocios' },
  { id: 'all', label: 'Todos' },
]

const ROLE_META: Record<Role, { label: string; cls: string }> = {
  client: { label: 'Cliente', cls: 'bg-blue/10 text-blue' },
  business: { label: 'Negocio', cls: 'bg-cyan/10 text-cyan' },
  courier: { label: 'Mensajero', cls: 'bg-orange/10 text-orange' },
  admin: { label: 'Administrador', cls: 'bg-navy/10 text-navy' },
  owner: { label: 'Propietario', cls: 'bg-success/10 text-success' },
  moderator: { label: 'Moderador', cls: 'bg-muted text-muted-foreground' },
}

function RoleChip({ role }: { role: Role }) {
  const meta = ROLE_META[role] ?? { label: role, cls: 'bg-muted text-muted-foreground' }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold', meta.cls)}>
      {meta.label}
    </span>
  )
}

function StatusChip({ status }: { status: string }) {
  if (status === 'suspended') {
    return (
      <span className="inline-flex items-center rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">
        Suspendida
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
      Activa
    </span>
  )
}

function AccountCard({ account }: { account: AdminAccountDto }) {
  return (
    <article className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-line">
          <AvatarFallback className="bg-secondary text-[12.5px] font-bold text-navy">
            {initials(account.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate font-display text-[14px] font-bold leading-tight">
              {account.fullName}
            </h3>
            <RoleChip role={account.role} />
            <StatusChip status={account.status} />
          </div>
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{account.email}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
            <span>Registrado el {formatDateTime(account.createdAt)}</span>
            <span
              className={cn(
                'inline-flex items-center gap-1',
                account.reportsCount > 0 && 'font-semibold text-orange'
              )}
            >
              <Flag className="h-3 w-3" aria-hidden />
              {account.reportsCount} reportes
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

export default function AdminBusinessesScreen() {
  const session = useAppStore((s) => s.session)
  const [tab, setTab] = useState<AccountTab>('clients')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-accounts'],
    queryFn: () => api.adminAccounts(),
    enabled: !!session,
  })

  const accounts = data?.accounts ?? []
  const filtered = accounts.filter((a) =>
    tab === 'all' ? true : a.role === (tab === 'clients' ? 'client' : 'business')
  )
  const countFor = (t: AccountTab) =>
    t === 'all'
      ? accounts.length
      : accounts.filter((a) => a.role === (t === 'clients' ? 'client' : 'business')).length

  return (
    <AdminScreen
      active="admin-businesses"
      title="Clientes y negocios"
      subtitle="Consulta de cuentas registradas, su estado y reportes asociados."
    >
      {/* Pestañas de rol (segmentado) */}
      <div className="nice-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Tipo de cuenta">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-2 text-[12.5px] font-semibold whitespace-nowrap transition-all active:scale-95',
              tab === t.id
                ? 'border-navy bg-navy text-white'
                : 'border-line bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label} ({countFor(t.id)})
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        {isLoading ? (
          <ListSkeleton count={4} />
        ) : isError ? (
          <EmptyState
            icon={<Users className="h-8 w-8" aria-hidden />}
            title="No se pudo cargar las cuentas"
            hint="Comprueba la conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={() => refetch()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" aria-hidden />}
            title={
              tab === 'clients'
                ? 'Todavía no hay clientes registrados'
                : tab === 'business'
                  ? 'Todavía no hay negocios registrados'
                  : 'Todavía no hay cuentas registradas'
            }
            hint="Las cuentas aparecerán aquí a medida que se registren en MENRUT."
          />
        ) : (
          filtered.map((a) => <AccountCard key={a.id} account={a} />)
        )}
      </div>

      {/* Nota: sin acciones destructivas desde aquí */}
      <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-line bg-secondary/60 p-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue" aria-hidden />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Las sanciones se gestionan desde moderación, con registro en auditoría. Esta vista es de
          consulta.
        </p>
      </div>
    </AdminScreen>
  )
}
