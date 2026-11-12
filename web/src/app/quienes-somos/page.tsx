import type { Metadata } from 'next'
import { PageShell, Summary } from '@/components/marketing/LegalShell'

export const metadata: Metadata = {
  title: 'Quiénes somos · MENRUT',
  description: 'Propósito y objetivos de MENRUT: conectar clientes, mensajeros y negocios con rutas y confianza verificable en Cuba.',
  alternates: { canonical: '/quienes-somos/' },
}

const OBJETIVOS = [
  { t: 'Encontrar la ruta correcta', d: 'Que cualquier persona pueda hallar un mensajero que cubra su origen y su destino.' },
  { t: 'Dar oportunidades reales', d: 'Que los mensajeros muestren su trabajo, su cobertura y sus opiniones, y reciban pedidos.' },
  { t: 'Generar confianza', d: 'Verificación de identidad, confirmación de entregas con código y opiniones con reglas claras.' },
  { t: 'Crecer por territorio', d: 'Organizar la red por municipio y provincia, para que cada zona tenga sus propios mensajeros.' },
]

export default function QuienesSomos() {
  return (
    <PageShell
      eyebrow="Empresa"
      title="Quiénes somos"
      intro="Conectamos caminos: personas, negocios y mensajeros en una misma red de rutas y confianza."
    >
      <Summary>
        <p>MENRUT es una plataforma para encontrar mensajeros que cubran tu ruta en Cuba.</p>
        <p>Está desarrollada por Studio Lexair.</p>
      </Summary>

      <h2>Nuestro propósito</h2>
      <p>
        Hacer que mover algo de un lugar a otro sea más sencillo y más seguro. Creemos que cada recorrido puede conectar una
        oportunidad: para quien necesita enviar un paquete y para quien ofrece su tiempo y su vehículo para llevarlo.
      </p>

      <h2>Nuestros objetivos</h2>
      <ul className="!mt-6 !list-none !space-y-5 !pl-0">
        {OBJETIVOS.map((o, n) => (
          <li key={o.t} className="!ml-0 !list-none flex gap-4">
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0b1f3f] text-sm font-bold text-white">
              {n + 1}
            </span>
            <span>
              <b className="block text-[#0b1f3f]">{o.t}</b>
              <span>{o.d}</span>
            </span>
          </li>
        ))}
      </ul>

      <h2>Cómo trabajamos</h2>
      <p>
        Buscar y ver mensajeros no requiere cuenta. Para contactar o contratar, sí. Publicamos lo que la aplicación hace hoy, sin
        prometer cifras ni tiempos que aún no podemos garantizar.
      </p>
    </PageShell>
  )
}
