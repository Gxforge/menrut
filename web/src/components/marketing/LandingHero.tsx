import { HeroPhoto } from './Mockups'

// Hero oscuro con el mockup de pedido sobre mapa, igual que la composición de referencia.
export function Hero() {
  return (
    <section aria-labelledby="titulo" className="relative overflow-hidden bg-[#0b1f3f] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-[#1688f5]/25 blur-3xl"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-[#7cc0ff]">
            <span aria-hidden="true" className="h-px w-8 bg-[#7cc0ff]" />
            Mensajería por rutas en Cuba
          </p>
          <h1 id="titulo" className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl">
            Encuentra un mensajero
            <span className="block text-[#5fb2ff]">que cubra tu ruta.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-[#c9d8ee] md:text-lg">
            Indica de dónde sale y a dónde va. Verás a los mensajeros que cubren esa ruta o esa zona, con su
            cobertura, sus opiniones y su verificación.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="/app/"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-[#1688f5] px-7 text-base font-bold text-white shadow-lg shadow-[#1688f5]/25 hover:bg-[#0f74d4]"
            >
              Necesito un mensajero
            </a>
            <a
              href="/app/"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-white px-7 text-base font-bold text-[#0b1f3f] hover:bg-[#e8f1fd]"
            >
              Quiero ser mensajero
            </a>
          </div>
          <div className="mt-6 inline-flex flex-col rounded-xl border border-white/20 bg-white/5 px-5 py-3">
            <span className="text-sm font-bold">Ver mensajeros sin cuenta</span>
            <span className="text-xs text-[#9db3d4]">Buscar y ver perfiles no requiere registrarse</span>
          </div>
        </div>
        <HeroPhoto />
      </div>
    </section>
  )
}
