// Promoción de lanzamiento: descuento del 20 % (temporal) y cupo gratuito de tu municipio.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Gift, Percent } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

function fechaLarga(iso: string): string {
  // El fin es exclusivo (1 de noviembre 00:00 hora de Cuba): se muestra el último día válido.
  const d = new Date(new Date(iso).getTime() - 1)
  return d.toLocaleDateString('es-CU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Havana' })
}

export function LaunchPromoCard() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['launch-promo'], queryFn: () => api.launchPromo() })
  const reclamar = useMutation({
    mutationFn: () => api.claimLaunchPromo(),
    onSuccess: (r) => {
      toast.success(
        `Plan gratis activado por ${r.months === 2 ? '2 meses' : '1 mes'}.${r.seq ? ` Cupo ${r.seq} de 10.` : ''}`,
      )
      void qc.invalidateQueries({ queryKey: ['launch-promo'] })
      void qc.invalidateQueries({ queryKey: ['courier-dashboard'] })
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'No se pudo reclamar el plan. Inténtalo de nuevo.')
      void qc.invalidateQueries({ queryKey: ['launch-promo'] })
    },
  })

  const d = q.data
  if (!d) return null
  const descuento = d.discount.active
  const sinMunicipio = !d.municipality
  const agotados = d.cupos !== null && d.cupos.remaining === 0
  const yaReclamado = d.claim !== null

  if (!descuento && !d.municipality && !d.claim) return null

  return (
    <section aria-label="Promoción de lanzamiento" className="mb-4 space-y-3">
      {descuento ? (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Percent className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-foreground">20 % de descuento en todos los planes</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Válido hasta el {fechaLarga(d.discount.endsAt)}, para todas las cuentas. Es una promoción temporal de lanzamiento.
            </p>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            <Gift className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold text-foreground">Plan de lanzamiento gratis</p>
            {yaReclamado ? (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Ya tienes tu plan de lanzamiento de {d.claim!.months === 2 ? '2 meses' : '1 mes'}
                {d.claim!.granted ? ' activo.' : ' pendiente de activar. Vuelve a intentarlo.'}
              </p>
            ) : sinMunicipio ? (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Indica tu provincia y municipio en tu ficha de mensajero para reclamar el cupo gratuito de tu municipio.
              </p>
            ) : agotados ? (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Se agotaron los 10 cupos de lanzamiento de {d.municipality!.name}.
              </p>
            ) : (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Quedan {d.cupos?.remaining ?? 0} de {d.cupos?.total ?? 10} cupos en {d.municipality!.name}. Gana el primero que
                lo reclame.
              </p>
            )}
          </div>
        </div>

        {!yaReclamado && !sinMunicipio && !agotados ? (
          <Button
            className="mt-3 h-11 w-full rounded-xl"
            onClick={() => reclamar.mutate()}
            disabled={reclamar.isPending || q.isFetching}
          >
            {reclamar.isPending ? 'Reclamando…' : 'Reclamar plan gratis'}
          </Button>
        ) : null}
      </div>
    </section>
  )
}
