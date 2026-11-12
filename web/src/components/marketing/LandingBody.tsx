import { LandingTrust } from './LandingTrust'

// Secciones de contenido: cómo funciona, territorios, mensajeros y negocios.
export function LandingBody() {
  return (
    <>
      <section id="como-funciona" aria-labelledby="t-como" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 id="t-como" className="text-2xl font-extrabold text-[#0b2b60] md:text-3xl">Cómo funciona</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              ['Busca una ruta o servicio', 'Indica origen y destino, o tu municipio si buscas mensajeros de zona.'],
              ['Compara perfiles', 'Revisa cobertura, tarifa orientativa, valoraciones y opiniones.'],
              ['Contacta y coordina', 'Escribe al mensajero desde la app y acuerden los detalles directamente.'],
              ['Confirma la entrega', 'Cuando corresponda, la entrega se confirma con el código de 6 dígitos del cliente.'],
            ].map(([t, b], i) => (
              <li key={t} className="rounded-2xl border border-[#dbe7f7] bg-[#f8fbff] p-5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#1688f5] text-sm font-bold text-white">{i + 1}</span>
                <h3 className="mt-3 font-bold text-[#0b2b60]">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#3b5378]">{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="territorios" aria-labelledby="t-terr" className="bg-[#f3f8ff]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2 md:items-center">
          <div>
            <h2 id="t-terr" className="text-2xl font-extrabold text-[#0b2b60] md:text-3xl">Explora por territorio</h2>
            <p className="mt-4 leading-relaxed text-[#3b5378]">
              Mira las provincias y municipios con mensajeros publicados. Cuando una zona aún no tiene oferta,
              la app lo dice claramente en lugar de mostrar resultados inventados.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-[#24406b]">
              <li>• Filtros por origen, destino y tipo de servicio.</li>
              <li>• Rutas destacadas solo cuando hay rutas publicadas.</li>
              <li>• Mapa de rutas con las provincias y su estado.</li>
            </ul>
            <a href="/app/" className="mt-6 inline-flex h-11 items-center rounded-full bg-[#0b2b60] px-5 font-bold text-white hover:bg-[#081f45]">
              Ver el mapa de rutas
            </a>
          </div>
          <div className="rounded-2xl border border-[#dbe7f7] bg-white p-6">
            <p className="text-sm font-bold text-[#0b2b60]">Tipos de cobertura</p>
            <dl className="mt-4 space-y-4 text-sm">
              <div><dt className="font-bold text-[#1688f5]">Zona</dt><dd className="text-[#3b5378]">Trabaja dentro de su municipio base.</dd></div>
              <div><dt className="font-bold text-[#1688f5]">Municipal</dt><dd className="text-[#3b5378]">Viaja de municipio a municipio.</dd></div>
              <div><dt className="font-bold text-[#1688f5]">Provincial</dt><dd className="text-[#3b5378]">Cubre rutas de provincia a provincia.</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section id="mensajeros" aria-labelledby="t-men" className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2">
          <div>
            <h2 id="t-men" className="text-2xl font-extrabold text-[#0b2b60] md:text-3xl">Para mensajeros</h2>
            <p className="mt-4 leading-relaxed text-[#3b5378]">
              Tu perfil profesional te da visibilidad ante clientes de tu zona o de tus rutas.
            </p>
          </div>
          <ul className="grid gap-3 text-sm text-[#24406b] sm:grid-cols-2">
            {['Crea tu perfil profesional', 'Indica tu municipio base', 'Publica rutas y cobertura', 'Muestra tus servicios y tarifa', 'Construye tu reputación con opiniones', 'Gestiona tu visibilidad y tus herramientas'].map((x) => (
              <li key={x} className="rounded-xl border border-[#dbe7f7] bg-[#f8fbff] px-4 py-3 font-semibold">{x}</li>
            ))}
          </ul>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <a href="/app/" className="inline-flex h-12 items-center rounded-full bg-[#1688f5] px-6 font-bold text-white hover:bg-[#0f74d4]">
            Crear mi perfil de mensajero
          </a>
        </div>
      </section>

      <section id="negocios" aria-labelledby="t-neg" className="bg-[#f3f8ff]">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 id="t-neg" className="text-2xl font-extrabold text-[#0b2b60] md:text-3xl">Para negocios</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-[#3b5378]">
            Encuentra opciones de mensajería para tus envíos, compara cobertura y servicios, y guarda los
            contactos y rutas que usas con frecuencia.
          </p>
          <ul className="mt-6 grid gap-3 text-sm text-[#24406b] md:grid-cols-3">
            <li className="rounded-xl bg-white px-4 py-3 shadow-sm">Consulta cobertura y servicios antes de contratar.</li>
            <li className="rounded-xl bg-white px-4 py-3 shadow-sm">Guarda mensajeros favoritos y rutas frecuentes.</li>
            <li className="rounded-xl bg-white px-4 py-3 shadow-sm">Contacta directamente desde la app.</li>
          </ul>
          <p className="mt-6 text-sm text-[#5a6f91]">
            MENRUT no ofrece hoy integraciones con sistemas de comercio electrónico.
          </p>
        </div>
      </section>

      <LandingTrust />
    </>
  )
}
