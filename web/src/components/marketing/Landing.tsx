import { EntryRedirect } from './EntryRedirect'
import { LandingHero } from './LandingHero'
import { LandingBody } from './LandingBody'
import { LandingFooter } from './LandingFooter'

// Portada institucional de MENRUT en "/". No es la aplicación: la app está en /app/.
export function Landing() {
  return (
    <div className="min-h-dvh bg-[#f3f8ff] text-[#0b1f3f]">
      <EntryRedirect />
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido">
        <LandingHero />
        <LandingBody />
      </main>
      <LandingFooter />
    </div>
  )
}

const NAV = [
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#mensajeros', label: 'Para mensajeros' },
  { href: '#negocios', label: 'Para negocios' },
  { href: '#seguridad', label: 'Seguridad' },
  { href: '#ayuda', label: 'Ayuda' },
]

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#dbe7f7] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <a href="/" aria-label="MENRUT, inicio" className="shrink-0">
          <img src="/menrut/logo-horizontal.png" alt="MENRUT" className="h-8 w-auto" />
        </a>
        <nav aria-label="Principal" className="hidden items-center gap-5 text-sm font-semibold md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="text-[#24406b] hover:text-[#1688f5]">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <details className="relative md:hidden">
            <summary className="flex h-10 cursor-pointer list-none items-center rounded-full border border-[#c9dbf2] px-4 text-sm font-semibold text-[#0b2b60]">
              Menú
            </summary>
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#dbe7f7] bg-white p-2 shadow-lg">
              {NAV.map((n) => (
                <a key={n.href} href={n.href} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-[#24406b] hover:bg-[#f3f8ff]">
                  {n.label}
                </a>
              ))}
            </div>
          </details>
          <a
            href="/app/"
            className="inline-flex h-10 items-center rounded-full bg-[#1688f5] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#0f74d4]"
          >
            Entrar a MENRUT
          </a>
        </div>
      </div>
    </header>
  )
}
