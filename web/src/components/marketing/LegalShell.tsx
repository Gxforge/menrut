import { SiteHeader, SiteFooter } from './SiteChrome'

export const LAST_UPDATED = '13 de octubre de 2026'

// Plantilla de páginas informativas: cabecera y pie compartidos, texto en columna de lectura.
export function PageShell({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white text-[#0b1f3f]">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="contenido">
        <section className="bg-[#0b1f3f] text-white">
          <div className="mx-auto max-w-3xl px-5 py-16 md:py-20">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#7cc0ff]">{eyebrow}</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">{title}</h1>
            {intro && <p className="mt-5 text-lg leading-relaxed text-[#c9d8ee]">{intro}</p>}
          </div>
        </section>
        <article className="mx-auto max-w-3xl px-5 py-14 leading-relaxed text-[#2f4a70] [&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:text-[#0b1f3f] [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-[#0b1f3f] [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:space-y-2 [&_a]:font-semibold [&_a]:text-[#1688f5] [&_a]:underline">
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}

export function Summary({ children }: { children: React.ReactNode }) {
  return (
    <aside aria-label="Resumen" className="mt-2 rounded-2xl border border-[#cfe0f6] bg-[#f3f8ff] p-6 text-[#0b1f3f]">
      <p className="text-sm font-extrabold uppercase tracking-wider text-[#1688f5]">Resumen</p>
      <div className="mt-3 space-y-2 text-[15px]">{children}</div>
    </aside>
  )
}
