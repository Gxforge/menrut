// MENRUT — Entregas verificadas por OTP (panel del mensajero).
// Los clientes generan un código de 6 dígitos desde el pasaporte; al entregar
// el paquete te lo dictan y lo verificas aquí: acredita la entrega verificada
// (+1 en tu pasaporte) y habilita reseñas «Entrega verificada».
'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { EyeOff, PackageCheck, ShieldCheck, Clock } from 'lucide-react'
import { apiMore } from '@/lib/api-more'
import { useAppStore } from '@/lib/store'
import { formatDateTime, initials } from '@/lib/format'
import { TopBar } from '@/components/menrut/core/TopBar'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { VerifyCodeForm } from './CourierDeliveriesScreenPieces/VerifyCodeForm'
import type { DeliveryDto } from '@/lib/types'

export default function CourierDeliveriesScreen() {
  const session = useAppStore((s) => s.session)
  const back = useAppStore((s) => s.back)
  const [verificando, setVerificando] = useState<string | null>(null)

  const deliveriesQ = useQuery({
    queryKey: ['courier-deliveries'],
    queryFn: () => apiMore.courierDeliveries(),
    enabled: !!session,
    refetchInterval: 30_000,
  })

  const verifyMut = useMutation({
    mutationFn: (p: { id: string; code: string }) => apiMore.verifyDelivery(p.id, p.code),
    onSuccess: (d) => {
      toast.success(`Entrega verificada. Llevas ${d.verifiedDeliveries} entregas verificadas.`)
      void deliveriesQ.refetch()
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo verificar el código.'),
  })

  const deliveries = deliveriesQ.data?.deliveries ?? []
  const pendientes = deliveries.filter((d) => d.status === 'pending')
  const verificadas = deliveries.filter((d) => d.status !== 'pending')

  // ── Carga / error ───────────────────────────────────────────────────
  if (deliveriesQ.isLoading) {
    return (
      <div>
        <TopBar title="Entregas verificadas" onBack={back} />
        <div className="px-4 pt-4 pb-8">
          <Skeleton className="h-24 rounded-2xl" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (deliveriesQ.isError) {
    return (
      <div>
        <TopBar title="Entregas verificadas" onBack={back} />
        <div className="px-4 pt-6 pb-8">
          <EmptyState
            icon={<EyeOff className="h-8 w-8" aria-hidden />}
            title="No se pudieron cargar las entregas"
            hint="Revisa tu conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={() => void deliveriesQ.refetch()}
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar
        title="Entregas verificadas"
        subtitle="Código OTP del cliente al recibir"
        onBack={back}
      />

      <div className="px-4 pt-4 pb-8">
        <p className="rounded-2xl border border-blue/25 bg-blue/5 px-4 py-3 text-[12.5px] leading-relaxed text-navy">
          <strong>Cómo funciona:</strong> el cliente genera un código desde tu pasaporte.
          Cuando le entregues su paquete, pídeselo y verifica aquí. Cada entrega
          verificada suma <strong>+1</strong> a tu reputación.
        </p>

        {/* Pendientes */}
        <section className="mt-6" aria-labelledby="entregas-pendientes">
          <h2 id="entregas-pendientes" className="section-title mb-2.5">
            Pendientes de verificar ({pendientes.length})
          </h2>
          {pendientes.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-card/60 px-4 py-5 text-center text-[12.5px] text-muted-foreground">
              No hay códigos pendientes. Cuando un cliente genere uno, aparecerá aquí.
            </p>
          ) : (
            <div className="space-y-3">
              {pendientes.map((d) => (
                <PendingDeliveryCard
                  key={d.id}
                  delivery={d}
                  pending={verificando === d.id}
                  onCode={(code) => {
                    setVerificando(d.id)
                    verifyMut.mutate(
                      { id: d.id, code },
                      { onSettled: () => setVerificando(null) },
                    )
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Historial */}
        {verificadas.length > 0 && (
          <section className="mt-6" aria-labelledby="entregas-historial">
            <h2 id="entregas-historial" className="section-title mb-2.5">Recientes</h2>
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
              {verificadas.slice(0, 10).map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                  {d.status === 'verified' ? (
                    <ShieldCheck className="h-4 w-4 shrink-0 text-success" aria-hidden />
                  ) : (
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold leading-tight">
                      {d.clientName ?? 'Cliente'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {d.status === 'verified'
                        ? `Verificada ${d.confirmedAt ? formatDateTime(d.confirmedAt) : ''}`
                        : `Venció ${formatDateTime(d.expiresAt)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function PendingDeliveryCard({
  delivery, pending, onCode,
}: {
  delivery: DeliveryDto
  pending: boolean
  onCode: (code: string) => void
}) {
  return (
    <article className="rounded-2xl border border-line bg-card p-4">
      <header className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue/10 text-[12px] font-bold text-blue"
        >
          {initials(delivery.clientName ?? 'Cliente')}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold leading-tight">
            {delivery.clientName ?? 'Cliente'}
          </p>
          <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <PackageCheck className="h-3.5 w-3.5" aria-hidden />
            Código válido hasta {formatDateTime(delivery.expiresAt)}
          </p>
        </div>
      </header>
      <VerifyCodeForm pending={pending} onVerify={onCode} />
    </article>
  )
}
