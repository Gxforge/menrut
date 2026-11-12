import { Phone, Bar } from './Mockups'

// Secciones de la portada: "Pensada para Cuba", pasos, seguridad, selector de uso y descarga.
export function LandingSections() {
  return (
    <>
      <Pensada />
      <Pasos />
      <Seguridad />
      <Usos />
      <Entrega />
      <Descarga />
    </>
  )
}

function Eyebrow({ children, tone = 'text-[#1688f5]' }: { children: React.ReactNode; tone?: string }) {
  return <p className={`text-xs font-extrabold uppercase tracking-[0.2em] ${tone}`}>{children}</p>
}

function Pensada() {
  const items = [
    { t: 'Por municipio y provincia', d: 'Busca por origen y destino, o por tu zona. La cobertura se declara por municipio.' },
    { t: 'Mensajeros de tu zona', d: 'Los mensajeros con cobertura de zona en tu municipio aparecen en «De mi zona», aunque no publiquen rutas.' },
    { t: 'Rutas publicadas', d: 'Los mensajeros publican sus rutas y puedes verlas en el mapa.' },
  ]
  return (
    <section aria-labelledby="pensada" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <Eyebrow>Pensada para Cuba</Eyebrow>
          <h2 id="pensada" className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">
            Hecha para los municipios de Cuba.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#4a6185] md:text-lg">
            Una red de mensajeros organizada por territorio, para que encuentres a quien ya recorre tu camino.
          </p>
        </div>
        <img
          src="/menrut/landing/mapa-rutas.jpg"
          alt="Mapa estilizado de Cuba con rutas entre municipios"
          width={1024}
          height={576}
          loading="lazy"
          className="mt-14 block h-auto w-full rounded-3xl border border-[#dbe7f7] object-cover"
        />
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {items.map((i, n) => (
            <article key={i.t} className="rounded-3xl border border-[#dbe7f7] bg-[#f8fbff] p-8">
              <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b1f3f] text-lg font-bold text-white">
                {n + 1}
              </span>
              <h3 className="mt-6 text-xl font-bold">{i.t}</h3>
              <p className="mt-3 leading-relaxed text-[#4a6185]">{i.d}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pasos() {
  const steps = [
    {
      t: 'Indica la ruta',
      d: 'Elige el municipio de origen y el de destino, o tu zona.',
      visual: (
        <>
          <Bar w="w-2/3" tone="bg-[#0b1f3f]" />
          <Bar w="w-full" />
          <Bar w="w-5/6" />
          <div className="mt-2 h-10 rounded-xl bg-[#1688f5]" />
        </>
      ),
    },
    {
      t: 'Elige mensajero',
      d: 'Compara cobertura, opiniones y entregas antes de escribirle.',
      visual: (
        <>
          {[0, 1, 2].map((k) => (
            <div key={k} className="flex items-center gap-2 rounded-xl bg-white p-2">
              <span className="h-7 w-7 rounded-full bg-[#cfe0f6]" />
              <span className="flex-1 space-y-1.5"><Bar w="w-full" /><Bar w="w-1/2" /></span>
            </div>
          ))}
        </>
      ),
    },
    {
      t: 'Coordina el chat',
      d: 'Acuerda recogida y entrega dentro de la aplicación.',
      visual: (
        <>
          <div className="self-start rounded-2xl rounded-bl-sm bg-white px-3 py-2"><Bar w="w-20" /></div>
          <div className="self-end rounded-2xl rounded-br-sm bg-[#1688f5] px-3 py-2"><span className="block h-2.5 w-24 rounded-full bg-white/80" /></div>
          <div className="self-start rounded-2xl rounded-bl-sm bg-white px-3 py-2"><Bar w="w-16" /></div>
        </>
      ),
    },
    {
      t: 'Confirma con código',
      d: 'Al entregar, el código de 6 dígitos confirma el pedido.',
      visual: (
        <>
          <p className="text-center text-xs font-bold text-[#4a6185]">Código de entrega</p>
          <div className="flex justify-center gap-1.5">
            {[4, 8, 2, 7, 3, 1].map((d, k) => (
              <span key={k} className="flex h-9 w-7 items-center justify-center rounded-lg bg-white text-sm font-extrabold text-[#0b1f3f] shadow-sm">{d}</span>
            ))}
          </div>
          <div className="mt-2 rounded-xl bg-[#0b1f3f] py-2 text-center text-xs font-bold text-white">Entrega confirmada</div>
        </>
      ),
    },
  ]
  return (
    <section id="como-funciona" aria-labelledby="pasos" className="scroll-mt-20 bg-[#0b1f3f] py-20 text-white md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <Eyebrow tone="text-[#7cc0ff]">Cómo funciona</Eyebrow>
          <h2 id="pasos" className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">
            Pide una entrega en cuatro pasos.
          </h2>
        </div>
        <ol className="mt-16 grid gap-10 md:grid-cols-4">
          {steps.map((s, n) => (
            <li key={s.t} className="text-center">
              <Phone>{s.visual}</Phone>
              <p className="mt-7 text-sm font-bold text-[#7cc0ff]">Paso {n + 1}</p>
              <h3 className="mt-1 text-lg font-bold">{s.t}</h3>
              <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-[#c9d8ee]">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Seguridad() {
  return (
    <section id="seguridad" aria-labelledby="seguridad-titulo" className="scroll-mt-20 bg-[#f3f8ff] py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <Eyebrow tone="text-[#d64545]">Seguridad del pedido</Eyebrow>
          <h2 id="seguridad-titulo" className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">
            Tu paquete, protegido de principio a fin.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#4a6185] md:text-lg">
            Controles claros en cada etapa, sin fingir garantías que no damos.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <Card
            title="Mensajeros verificados"
            body="Los mensajeros envían un documento de identidad y el equipo de MENRUT lo revisa. Hasta entonces, el perfil figura como no verificado."
            visual={
              <div className="flex h-full items-center justify-center">
                <div className="w-56 rounded-2xl border border-[#cfe0f6] bg-white p-4 shadow-md" aria-hidden="true">
                  <div className="flex items-center gap-3">
                    <span className="h-14 w-12 rounded-lg bg-[#cfe0f6]" />
                    <span className="flex-1 space-y-2"><Bar w="w-full" /><Bar w="w-2/3" /></span>
                  </div>
                  <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">✓ Verificado</span>
                </div>
              </div>
            }
          />
          <Card
            title="Códigos de confirmación"
            body="Cada entrega se confirma con un código de 6 dígitos. Caduca y tiene un número máximo de intentos. Lo introduce el mensajero al entregar."
            visual={
              <div className="flex h-full items-center justify-center gap-3" aria-hidden="true">
                <span className="grid h-20 w-20 grid-cols-4 gap-1 rounded-xl bg-white p-2 shadow-sm">
                  {Array.from({ length: 16 }).map((_, k) => (
                    <span key={k} className={`rounded-[2px] ${[0,1,4,6,8,10,12,15,3,9].includes(k) ? 'bg-[#0b1f3f]' : 'bg-[#cfe0f6]'}`} />
                  ))}
                </span>
                <span className="text-2xl font-extrabold tracking-[0.2em] text-[#0b2b60]">318 524</span>
              </div>
            }
          />
          <Card
            title="Opiniones y reportes"
            body="Tras la entrega puedes opinar en 120 caracteres, una vez por mensajero. Si algo no es correcto, puedes reportarlo."
            visual={
              <div className="flex h-full flex-col justify-center gap-3 px-2" aria-hidden="true">
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <span className="text-sm text-[#f5a524]">★★★★★</span>
                  <span className="mt-1 block"><Bar w="w-full" /></span>
                </div>
                <div className="ml-6 rounded-xl bg-white p-3 shadow-sm">
                  <span className="text-sm text-[#f5a524]">★★★★☆</span>
                  <span className="mt-1 block"><Bar w="w-3/4" /></span>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </section>
  )
}

function Card({ title, body, visual }: { title: string; body: string; visual: React.ReactNode }) {
  return (
    <article className="flex flex-col rounded-3xl border border-[#dbe7f7] bg-white p-7">
      <div className="flex h-44 items-stretch rounded-2xl bg-[#eef4fc] p-4">{visual}</div>
      <h3 className="mt-6 text-center text-xl font-bold">{title}</h3>
      <p className="mt-2 text-center leading-relaxed text-[#4a6185]">{body}</p>
    </article>
  )
}

function Usos() {
  const intents = [
    { t: 'Necesito un mensajero', d: 'Indica tu ruta y revisa quién la cubre.', href: '/app/', cta: 'Buscar mensajeros' },
    { t: 'Soy mensajero', d: 'Crea tu perfil, indica tu municipio base y publica tu cobertura o tus rutas.', href: '/app/', cta: 'Crear mi perfil' },
    { t: 'Tengo un negocio', d: 'Consulta cobertura y servicios antes de contratar, y guarda los mensajeros que usas.', href: '/app/', cta: 'Empezar' },
  ]
  return (
    <section aria-labelledby="usos" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <Eyebrow>Empieza hoy</Eyebrow>
          <h2 id="usos" className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">Elige cómo usar MENRUT</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {intents.map((i) => (
            <article key={i.t} className="flex flex-col rounded-3xl border border-[#dbe7f7] bg-[#f8fbff] p-8">
              <h3 className="text-xl font-bold">{i.t}</h3>
              <p className="mt-3 flex-1 leading-relaxed text-[#4a6185]">{i.d}</p>
              <a href={i.href} className="mt-6 inline-flex items-center gap-2 font-bold text-[#1688f5] hover:underline">
                {i.cta} <span aria-hidden="true">→</span>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Entrega() {
  return (
    <section aria-labelledby="entrega" className="bg-[#f3f8ff] py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 md:grid-cols-2">
        <img
          src="/menrut/landing/entrega-movil.jpg"
          alt="Persona recibiendo un paquete en la puerta de su casa"
          width={1280}
          height={1024}
          loading="lazy"
          className="block h-auto w-full rounded-3xl object-cover shadow-xl"
        />
        <div>
          <Eyebrow>Entrega confirmada</Eyebrow>
          <h2 id="entrega" className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
            Recibes tu paquete y lo confirmas con un código.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#4a6185] md:text-lg">
            Cuando el mensajero llega, te pide el código de 6 dígitos. Al introducirlo, la entrega queda registrada en tu pedido.
          </p>
          <a href="/app/" className="mt-7 inline-flex h-12 items-center rounded-xl bg-[#0b1f3f] px-6 font-bold text-white hover:bg-[#13346b]">
            Pedir una entrega
          </a>
        </div>
      </div>
    </section>
  )
}

function Descarga() {
  return (
    <section aria-labelledby="descarga" className="px-5 pb-20">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 rounded-[2rem] bg-[#0b1f3f] px-8 py-14 text-center text-white md:flex-row md:justify-between md:text-left">
        <div>
          <h2 id="descarga" className="text-3xl font-extrabold tracking-tight md:text-4xl">Lleva MENRUT en tu teléfono</h2>
          <p className="mt-3 max-w-xl text-[#c9d8ee]">
            Es una aplicación web instalable: se abre desde el navegador y puedes añadirla a la pantalla de inicio. Sin tienda de aplicaciones.
          </p>
        </div>
        <a href="/app/" className="inline-flex h-14 shrink-0 items-center rounded-xl bg-white px-8 text-base font-bold text-[#0b1f3f] hover:bg-[#e8f1fd]">
          Abrir MENRUT <span aria-hidden="true" className="ml-2">→</span>
        </a>
      </div>
    </section>
  )
}
