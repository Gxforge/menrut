import { EntryRedirect } from './EntryRedirect'
import { SiteHeader, SiteFooter } from './SiteChrome'
import { Hero } from './LandingHero'
import { LandingSections } from './LandingSections'

// Portada pública de MENRUT en "/". La aplicación vive en /app/.
export function Landing() {
  return (
    <div className="min-h-dvh bg-white text-[#0b1f3f]">
      <EntryRedirect />
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>
      <SiteHeader home />
      <main id="contenido">
        <Hero />
        <LandingSections />
      </main>
      <SiteFooter />
    </div>
  )
}
