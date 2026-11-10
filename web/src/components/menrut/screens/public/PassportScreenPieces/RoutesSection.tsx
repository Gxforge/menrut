// MENRUT — PassportScreen · rutas que ofrece el mensajero.
'use client'

import { RouteCard } from '@/components/menrut/core/RouteCard'
import type { CoverageType, PassportDto } from '@/lib/types'

export function RoutesSection({
  routes,
  coverageType,
}: {
  routes: PassportDto['routes']
  coverageType: CoverageType
}) {
  return (
    <section aria-labelledby="pp-routes">
      <h2 id="pp-routes" className="section-title mb-2">Rutas que ofrece</h2>
      {routes.length > 0 ? (
        <div className="space-y-3">
          {routes.map((route) => (
            <RouteCard key={route.id} route={route} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-line bg-card/60 px-4 py-5 text-center text-[12.5px] text-muted-foreground">
          {coverageType === 'zone'
            ? 'Este mensajero trabaja dentro de su municipio base: no publica rutas interterritoriales. Puedes escribirle para coordinar entregas en su zona.'
            : 'Este mensajero todavía no publica rutas concretas. Puedes escribirle para coordinar.'}
        </p>
      )}
    </section>
  )
}
