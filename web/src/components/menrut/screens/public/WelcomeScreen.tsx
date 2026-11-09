// MENRUT — Bienvenida / Onboarding
// Tres láminas deslizables (scroll-snap nativo), indicadores de página,
// CTA «Comenzar», secundario «Crear cuenta» y skip discreto.
'use client'

import { useRef, useState } from 'react'
import { Route, ShieldCheck, Bike, MapPin, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

interface Slide {
  icon: React.ReactNode
  title: string
  body: string
  pills: string[]
  tone: 'blue' | 'cyan' | 'orange'
}

const SLIDES: Slide[] = [
  {
    icon: <Route className="h-10 w-10" aria-hidden />,
    title: 'Encuentra quién cubre tu ruta',
    body: 'Dinos de dónde sales y a dónde vas. Te mostramos mensajeros que recorren ese mismo camino.',
    pills: ['Origen y destino', 'Todo Cuba'],
    tone: 'blue',
  },
  {
    icon: <ShieldCheck className="h-10 w-10" aria-hidden />,
    title: 'Conecta con confianza',
    body: 'Perfiles verificados, reputación real y opiniones de entregas comprobadas. Sabes con quién hablas.',
    pills: ['Identidad verificada', 'Reputación real'],
    tone: 'cyan',
  },
  {
    icon: <Bike className="h-10 w-10" aria-hidden />,
    title: 'Publica tu ruta como mensajero',
    body: 'Si haces mensajería, publica tus rutas y tu pasaporte profesional para que te encuentren clientes.',
    pills: ['Pasaporte profesional', 'Rutas propias'],
    tone: 'orange',
  },
]

const TONE_RING: Record<Slide['tone'], string> = {
  blue: 'bg-blue/10 text-blue',
  cyan: 'bg-cyan/10 text-cyan',
  orange: 'bg-orange/10 text-orange',
}

export default function WelcomeScreen() {
  const navigate = useAppStore((s) => s.navigate)
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const scrolling = useRef(false)

  function handleScroll() {
    const el = trackRef.current
    if (!el || scrolling.current) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== index) setIndex(i)
  }

  function goToSlide(i: number) {
    const el = trackRef.current
    if (!el) return
    scrolling.current = true
    setIndex(i)
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
    window.setTimeout(() => {
      scrolling.current = false
    }, 450)
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      {/* Cabecera: logo + skip */}
      <header className="flex items-center justify-between px-4 pt-safe">
        <img
          src="/menrut/icons/logo-web.png"
          alt="MENRUT"
          width={128}
          height={43}
          loading="eager"
          className="mt-4 h-auto w-32"
        />
        <button
          type="button"
          onClick={() => navigate('login')}
          className="mt-4 rounded-full px-3 py-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground active:scale-95"
        >
          Saltar
        </button>
      </header>

      {/* Láminas deslizables */}
      <section
        aria-label="Presentación de MENRUT"
        className="mt-2 flex-1 overflow-hidden"
      >
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="nice-scroll flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain"
        >
          {SLIDES.map((slide, i) => (
            <article
              key={slide.title}
              aria-hidden={i !== index}
              className="flex h-full w-full shrink-0 snap-center flex-col items-center justify-center px-7 text-center"
            >
              {/* Ilustración ligera con CSS (sin imágenes pesadas) */}
              <div className="relative">
                <div
                  aria-hidden
                  className={cn(
                    'absolute -inset-5 rounded-[38px] opacity-60 blur-xl',
                    slide.tone === 'blue' && 'bg-blue/20',
                    slide.tone === 'cyan' && 'bg-cyan/20',
                    slide.tone === 'orange' && 'bg-orange/20'
                  )}
                />
                <div
                  className={cn(
                    'relative flex h-28 w-28 items-center justify-center rounded-[32px] border border-line bg-card shadow-[0_16px_40px_rgba(20,67,130,0.10)]',
                    TONE_RING[slide.tone]
                  )}
                >
                  {slide.icon}
                  <span
                    aria-hidden
                    className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-navy shadow-sm"
                  >
                    <MapPin className="h-4 w-4" />
                  </span>
                </div>
              </div>

              <h1 className="screen-title mt-8 max-w-[300px]">{slide.title}</h1>
              <p className="mt-3 max-w-[310px] text-[14px] leading-relaxed text-muted-foreground">
                {slide.body}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {slide.pills.map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-navy"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        {/* Indicadores de página */}
        <div className="flex items-center justify-center gap-2 py-5" role="tablist" aria-label="Láminas">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Ir a la lámina ${i + 1}: ${s.title}`}
              onClick={() => goToSlide(i)}
              className={cn(
                'h-2 rounded-full transition-all active:scale-90',
                i === index ? 'w-7 bg-blue' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
            />
          ))}
        </div>
      </section>

      {/* Acciones */}
      <footer className="px-6 pb-8 pt-2 pb-safe">
        <p className="mb-4 text-center text-[13px] font-medium text-muted-foreground">
          Conectamos caminos.
        </p>
        <Button
          className="h-12 w-full rounded-full text-[15px] font-bold"
          onClick={() => navigate('login')}
        >
          Comenzar
          <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          className="mt-2 h-12 w-full rounded-full text-[14px] font-semibold text-navy"
          onClick={() => navigate('register')}
        >
          Crear cuenta
        </Button>
      </footer>
    </div>
  )
}
