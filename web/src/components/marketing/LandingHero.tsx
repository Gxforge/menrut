import { RouteVisual } from './RouteVisual'

// Hero + selector de intención. Sin cifras de usuarios, entregas ni cobertura no verificadas.
export function LandingHero() {
  return (
    <section aria-labelledby="titulo" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-12 pt-10 md:grid-cols-2 md:pb-20 md:pt-16">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1688f5]">MENRUT · Conectamos caminos</p>
          <h1 id="titulo" className="mt-3 font-extrabold leading-[1.1] text-[#0b2b60] text-4xl md:text-5xl">
            Cada recorrido conecta una oportunidad.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#3b5378] md:text-lg">
            Encuentra mensajeros, descubre rutas y conecta personas y negocios a través de una red de
            servicios de transporte y entrega.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href="/app/"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#1688f5] px-6 text-base font-bold text-white shadow-md hover:bg-[#0f74d4]"
            >
              Explorar MENRUT
            </a>
            <a
              href="#mensajeros"
              className="inline-flex h-12 items-center justify-center rounded-full border-2 border-[#0b2b60] px-6 text-base font-bold text-[#0b2b60] hover:bg-white"
            >
              Quiero ofrecer mis servicios
            </a>
          </div>
          <p className="mt-4 text-sm text-[#5a6f91]">
            Buscar y ver mensajeros no requiere cuenta. Para contactar o contratar, sí.
          </p>
        </div>
        <RouteVisual />
      </div>
      <IntentSelector />
    </section>
  )
}

const INTENTS = [
  {
    title: 'Necesito un mensajero',
    body: 'Indica de dónde sale y a dónde va. Verás los mensajeros que cubren esa ruta o esa zona.',
    href: '/app/',
    cta: 'Buscar mensajeros',
  },
  {
    title: 'Soy mensajero',
    body: 'Crea tu perfil, indica tu municipio base y publica tu cobertura o tus rutas.',
    href: '/app/',
    cta: 'Crear mi perfil',
  },
  {
    title: 'Tengo un negocio',
    body: 'Consulta cobertura y servicios antes de contratar, y guarda los mensajeros que usas.',
    href: '#negocios',
    cta: 'Ver cómo me ayuda',
  },
]

function IntentSelector() {
  return (
    <section aria-label="Elige tu caso" className="border-t border-[#dbe7f7] bg-white">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10 md:grid-cols-3">
        {INTENTS.map((i) => (
          <article key={i.title} className="flex flex-col rounded-2xl border border-[#dbe7f7] bg-[#f8fbff] p-6">
            <h2 className="text-lg font-bold text-[#0b2b60]">{i.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-[#3b5378]">{i.body}</p>
            <a href={i.href} className="mt-4 font-bold text-[#1688f5] hover:underline">
              {i.cta} →
            </a>
          </article>
        ))}
      </div>
    </section>
  )
}
