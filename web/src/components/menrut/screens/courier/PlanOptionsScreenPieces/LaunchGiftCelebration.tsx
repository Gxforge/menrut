// Celebración del plan de lanzamiento: una caja de regalo que se abre en el centro
// y confeti. Se muestra UNA vez por reclamo exitoso. Solo CSS (sin librerías).
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'

const COLORS = ['#13b6ff', '#f59e0b', '#22c55e', '#f43f5e', '#a855f7', '#facc15']

interface Props {
  open: boolean
  months: number
  onClose: () => void
}

export function LaunchGiftCelebration({ open, months, onClose }: Props) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2.4 + Math.random() * 1.8,
        size: 6 + Math.random() * 6,
        color: COLORS[i % COLORS.length],
        spin: Math.random() > 0.5 ? 1 : -1,
      })),
    [open],
  )

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="launch-gift-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-6"
    >
      <style>{`
        @keyframes mr-confetti-fall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1 } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0.9 } }
        @keyframes mr-lid-open { 0% { transform: translateY(0) rotate(0deg) } 100% { transform: translateY(-46px) rotate(-38deg) } }
        @keyframes mr-pop { 0% { transform: scale(0.6); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { .mr-anim { animation: none !important } }
      `}</style>

      {pieces.map((p) => (
        <span
          key={p.id}
          aria-hidden
          className="mr-anim pointer-events-none absolute top-0 rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.4,
            background: p.color,
            animation: `mr-confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            transform: `rotate(${p.spin * 45}deg)`,
          }}
        />
      ))}

      <div
        className="mr-anim relative w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-xl"
        style={{ animation: 'mr-pop 0.35s ease-out both' }}
      >
        <div className="relative mx-auto mb-5 h-28 w-28" aria-hidden>
          {/* Base de la caja */}
          <div className="absolute bottom-0 left-1/2 h-20 w-24 -translate-x-1/2 rounded-xl bg-primary shadow-inner" />
          <div className="absolute bottom-0 left-1/2 h-20 w-3 -translate-x-1/2 bg-amber-400" />
          {/* Tapa que se abre */}
          <div
            className="mr-anim absolute left-1/2 top-4 h-7 w-28 -translate-x-1/2 rounded-md bg-primary/90"
            style={{ animation: 'mr-lid-open 0.7s ease-out 0.6s forwards', transformOrigin: 'left center' }}
          >
            <div className="absolute left-1/2 top-0 h-7 w-3 -translate-x-1/2 bg-amber-400" />
          </div>
        </div>

        <h2 id="launch-gift-title" className="font-display text-xl font-bold text-foreground">
          ¡Plan activado!
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Tu plan de lanzamiento gratis de {months === 2 ? '2 meses' : '1 mes'} ya está activo. Se activó una sola vez.
        </p>
        <Button className="mt-5 h-11 w-full rounded-xl" onClick={onClose}>
          ¡Genial!
        </Button>
      </div>
    </div>
  )
}
