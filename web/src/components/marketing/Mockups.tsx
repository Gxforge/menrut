// Imágenes y mockups ilustrativos (no son capturas reales).

// Foto del hero con la tarjeta de pedido superpuesta (tarjeta ilustrativa, no datos reales).
export function HeroPhoto() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0f2a52] shadow-2xl">
        <img
          src="/menrut/landing/hero-mensajero.jpg"
          alt="Mensajero en moto con un paquete en una calle de un pueblo cubano"
          width={1376}
          height={768}
          className="block h-auto w-full object-cover"
        />
      </div>
      <div aria-hidden="true" className="absolute left-4 top-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-[#0b1f3f] shadow-xl">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1688f5] text-sm font-bold text-white">M</span>
        <span className="text-left">
          <span className="block text-sm font-bold">Mensajero en camino</span>
          <span className="block text-xs text-[#5a6f91]">Llega en 12 min</span>
        </span>
      </div>
      <div aria-hidden="true" className="absolute bottom-4 left-4 w-64 rounded-2xl bg-white p-5 text-[#0b1f3f] shadow-xl">
        <span className="inline-flex rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-bold text-[#1d4fa0]">En reparto</span>
        <p className="mt-3 text-lg font-extrabold">Pedido de ejemplo</p>
        <ol className="mt-3 space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#1688f5]" />
            <span><b className="block">Recogida</b><span className="text-[#5a6f91]">Santa Clara · Centro</span></span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#ef4444]" />
            <span><b className="block">Entrega</b><span className="text-[#5a6f91]">Consolación del Sur</span></span>
          </li>
        </ol>
      </div>
    </div>
  )
}

// Teléfono con interfaz simplificada para los pasos del pedido.
export function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-[200px] rounded-[2.2rem] border-[7px] border-[#0b1f3f] bg-white p-3 shadow-xl">
      <div className="flex h-[300px] flex-col gap-2.5 overflow-hidden rounded-[1.4rem] bg-[#f3f8ff] p-3">{children}</div>
    </div>
  )
}

export function Bar({ w = 'w-full', tone = 'bg-[#cfe0f6]' }: { w?: string; tone?: string }) {
  return <div className={`h-2.5 rounded-full ${w} ${tone}`} />
}
