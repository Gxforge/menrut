// MENRUT — Administración · Mensajeros y verificaciones
'use client'

import { useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { AdminScreen } from '@/components/menrut/screens/admin/_AdminNav'
import { EmptyState, ListSkeleton } from '@/components/menrut/core/EmptyState'
import { CourierCard } from '@/components/menrut/screens/admin/AdminCouriersPieces/CourierCard'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { AdminCourierDto } from '@/lib/types'

type CourierFilter = 'all' | 'verified' | 'pending' | 'rejected' | 'hidden'

const FILTERS: { id: CourierFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'verified', label: 'Verificados' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'rejected', label: 'Rechazados' },
  { id: 'hidden', label: 'Ocultos' },
]

const EMPTY_COPY: Record<CourierFilter, { title: string; hint: string }> = {
  all: {
    title: 'Aún no hay mensajeros registrados',
    hint: 'Cuando los mensajeros completen su registro aparecerán aquí para revisión.',
  },
  verified: {
    title: 'No hay mensajeros verificados',
    hint: 'Las identidades aprobadas se listarán en este filtro.',
  },
  pending: {
    title: 'No hay verificaciones pendientes',
    hint: 'Cuando un mensajero envíe su documentación aparecerá aquí para revisión.',
  },
  rejected: {
    title: 'No hay verificaciones rechazadas',
    hint: 'Los rechazos con motivo quedarán visibles en este filtro.',
  },
  hidden: {
    title: 'No hay perfiles ocultos',
    hint: 'Los mensajeros sin permanencia activa se ocultan de las búsquedas y se listan aquí.',
  },
}

export default function AdminCouriersScreen() {
  const session = useAppStore((s) => s.session)
  const navigate = useAppStore((s) => s.navigate)
  const selectCourier = useAppStore((s) => s.selectCourier)
  const qc = useQueryClient()

  const [filter, setFilter] = useState<CourierFilter>('all')
  const [review, setReview] = useState<{ courier: AdminCourierDto; decision: 'verified' | 'rejected' } | null>(null)
  const [motivo, setMotivo] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-couriers', filter],
    queryFn: () => api.adminCouriers(filter === 'all' ? undefined : filter),
    enabled: !!session,
  })

  const couriers = data?.couriers ?? []

  // T8-c: el DTO de administración no incluye coverageType (backend congelado),
  // así que el tipo se lee del pasaporte público de cada mensajero. Misma caché
  // que PassportScreen; los perfiles ocultos no exponen pasaporte y quedan con
  // el marcador «Tipo ··» hasta que el backend añada el campo.
  const passportQueries = useQueries({
    queries: couriers.map((c) => ({
      queryKey: ['passport', c.courierId] as const,
      queryFn: () => api.passport(c.courierId),
      staleTime: 60_000,
      retry: 1,
    })),
  })

  const reviewMutation = useMutation({
    mutationFn: (v: { courierId: string; courierName: string; decision: 'verified' | 'rejected'; note: string }) =>
      api.adminReviewVerification(v.courierId, v.decision, v.note),
    onSuccess: (_res, v) => {
      toast.success(
        v.decision === 'verified' ? `Verificación de ${v.courierName} aprobada` : `Verificación de ${v.courierName} rechazada`,
        { description: 'El motivo quedó registrado en la auditoría.' }
      )
      setReview(null)
      setMotivo('')
      qc.invalidateQueries({ queryKey: ['admin-couriers'] })
      qc.invalidateQueries({ queryKey: ['admin-overview'] })
    },
    onError: (err: Error) =>
      toast.error(err.message || 'No se pudo guardar la revisión. Inténtalo de nuevo.'),
  })

  const closeReview = () => {
    setReview(null)
    setMotivo('')
  }

  const viewPassport = (courierId: string) => {
    selectCourier(courierId)
    navigate('passport')
  }

  return (
    <AdminScreen
      active="admin-couriers"
      title="Mensajeros y verificaciones"
      subtitle="Aprueba o rechaza identidades con motivo obligatorio. Cada decisión queda en auditoría."
    >
      {/* Filtros por estado (chips) */}
      <div className="nice-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtrar por estado">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-2 text-[12.5px] font-semibold whitespace-nowrap transition-all active:scale-95',
              filter === f.id
                ? 'border-navy bg-navy text-white'
                : 'border-line bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        {isLoading ? (
          <ListSkeleton count={4} />
        ) : isError ? (
          <EmptyState
            icon={<Users className="h-8 w-8" aria-hidden />}
            title="No se pudo cargar la lista"
            hint="Comprueba la conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={() => refetch()}
          />
        ) : couriers.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" aria-hidden />}
            title={EMPTY_COPY[filter].title}
            hint={EMPTY_COPY[filter].hint}
          />
        ) : (
          couriers.map((c, i) => {
            const pq = passportQueries[i]
            return (
              <CourierCard
                key={c.courierId}
                courier={c}
                coverageType={pq?.data?.coverageType ?? null}
                typeLoading={pq?.isPending ?? false}
                saving={reviewMutation.isPending}
                onReview={(courier, decision) => {
                  setReview({ courier, decision })
                  setMotivo('')
                }}
                onPassport={viewPassport}
              />
            )
          })
        )}
      </div>

      {/* Diálogo de revisión con motivo obligatorio */}
      <Dialog open={review !== null} onOpenChange={(open) => !open && closeReview()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {review?.decision === 'verified' ? 'Aprobar verificación' : 'Rechazar verificación'}
            </DialogTitle>
            <DialogDescription>
              {review?.courier.fullName} · {review?.courier.email}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="motivo-verificacion">Motivo de la decisión</Label>
            <Textarea
              id="motivo-verificacion"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej.: documento legible y coincidente con el nombre declarado."
              rows={4}
              className="resize-none"
            />
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              El motivo es obligatorio (mínimo 3 caracteres) y quedará registrado en la auditoría.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={closeReview}>
              Cancelar
            </Button>
            <Button
              variant={review?.decision === 'rejected' ? 'destructive' : 'default'}
              className={cn(
                'rounded-full',
                review?.decision === 'verified' && 'bg-success text-white hover:bg-success/90'
              )}
              disabled={motivo.trim().length < 3 || reviewMutation.isPending}
              onClick={() => {
                if (!review) return
                reviewMutation.mutate({
                  courierId: review.courier.courierId,
                  courierName: review.courier.fullName,
                  decision: review.decision,
                  note: motivo.trim(),
                })
              }}
            >
              {reviewMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {review?.decision === 'verified' ? 'Aprobar' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminScreen>
  )
}
