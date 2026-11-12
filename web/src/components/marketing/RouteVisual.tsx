// Ilustración decorativa: red de nodos y una tarjeta de búsqueda de ejemplo (no es un resultado real).
export function RouteVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <svg viewBox="0 0 400 300" className="w-full" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="ruta" x1="0" x2="1">
            <stop offset="0" stopColor="#1688f5" />
            <stop offset="1" stopColor="#22c3ee" />
          </linearGradient>
        </defs>
        <path d="M30 220 C 90 180, 120 250, 180 200 S 280 90, 370 110" fill="none" stroke="url(#ruta)" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 10" />
        <path d="M60 80 C 120 110, 150 70, 210 120 S 300 230, 350 210" fill="none" stroke="#9dc7f5" strokeWidth="3" strokeLinecap="round" />
        {[
          [30, 220], [180, 200], [370, 110], [60, 80], [210, 120], [350, 210],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r="11" fill="#fff" stroke="#1688f5" strokeWidth="3" />
            <circle cx={x} cy={y} r="4" fill="#0b2b60" />
          </g>
        ))}
      </svg>
      <div className="absolute inset-x-6 bottom-4 rounded-2xl border border-[#dbe7f7] bg-white p-4 shadow-xl sm:inset-x-10">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#5a6f91]">Ejemplo de búsqueda</p>
        <p className="mt-1 text-sm font-semibold text-[#0b2b60]">Consolación del Sur → Pinar del Río</p>
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#f3f8ff] p-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0b2b60] text-xs font-bold text-white">MS</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[#0b2b60]">Mensajero de ejemplo</p>
            <p className="truncate text-xs text-[#5a6f91]">Cobertura en tu municipio · Ruta municipal</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-[#5a6f91]">
          La disponibilidad depende de los mensajeros publicados y de la zona consultada.
        </p>
      </div>
    </div>
  )
}
