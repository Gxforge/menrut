// Confianza, preguntas frecuentes y llamada final. Las respuestas siguen las reglas reales del producto.
const SECURITY = [
  ['Entrega verificada', 'Se confirma con un código de 6 dígitos que da el cliente al mensajero. El código caduca y tiene un número limitado de intentos.'],
  ['Opiniones', 'Opinar requiere una cuenta. Las opiniones tienen un máximo de 120 caracteres. Si la opinión se basa en una entrega verificada, se indica.'],
  ['Reportes', 'Si una opinión incumple las normas, puedes reportarla desde su detalle. Un equipo de moderación revisa los reportes.'],
  ['Tus datos', 'Usamos tus datos para operar el servicio. El directorio público muestra los datos del perfil profesional que publica el mensajero.'],
]

const FAQ = [
  ['¿MENRUT realiza directamente las entregas?', 'MENRUT muestra mensajeros y rutas y ayuda a coordinarlos. Los detalles del servicio se acuerdan y se realizan entre el cliente y el mensajero.'],
  ['¿Necesito una cuenta para buscar?', 'No. Puedes buscar y ver mensajeros sin registrarte. Para contactar o contratar necesitas una cuenta.'],
  ['¿Cómo se registra un mensajero?', 'Creas tu cuenta, completas tu perfil, indicas tu provincia y tu municipio base, y eliges tu tipo de cobertura.'],
  ['¿Cómo se verifica una entrega?', 'El mensajero pide el código de 6 dígitos al cliente y lo introduce en la app. Si el código es correcto, la entrega queda verificada.'],
  ['¿Qué hago si tengo un problema?', 'Si una opinión incumple las normas, repórtala desde su detalle. Los reportes los revisa el equipo de moderación.'],
  ['¿Cómo se gestionan los datos personales?', 'Los datos se usan para operar la cuenta y el servicio. La política de privacidad completa se publicará junto con los términos de uso.'],
]

export function LandingTrust() {
  return (
    <>
      <section id="seguridad" aria-labelledby="t-seg" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 id="t-seg" className="text-2xl font-extrabold text-[#0b2b60] md:text-3xl">Seguridad y confianza</h2>
          <p className="mt-4 max-w-2xl text-[#3b5378]">Estas son las reglas que aplica la plataforma hoy.</p>
          <dl className="mt-8 grid gap-4 md:grid-cols-2">
            {SECURITY.map(([t, b]) => (
              <div key={t} className="rounded-2xl border border-[#dbe7f7] p-5">
                <dt className="font-bold text-[#0b2b60]">{t}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-[#3b5378]">{b}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="ayuda" aria-labelledby="t-ayuda" className="bg-[#f3f8ff]">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <h2 id="t-ayuda" className="text-2xl font-extrabold text-[#0b2b60] md:text-3xl">Preguntas frecuentes</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-2xl border border-[#dbe7f7] bg-white p-5 open:shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-[#0b2b60]">
                  {q}
                  <span aria-hidden className="text-[#1688f5] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[#3b5378]">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="t-final" className="bg-[#0b2b60] text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="t-final" className="text-2xl font-extrabold md:text-3xl">Cada recorrido conecta una oportunidad.</h2>
            <p className="mt-2 max-w-xl text-[#c9dbf2]">Explora la red o crea tu perfil de mensajero.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href="/app/" className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 font-bold text-[#0b2b60] hover:bg-[#e9f2ff]">
              Explorar MENRUT
            </a>
            <a href="/app/" className="inline-flex h-12 items-center justify-center rounded-full border-2 border-white px-6 font-bold text-white hover:bg-white/10">
              Crear perfil
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
