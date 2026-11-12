// Cabecera y pie compartidos por la portada y las páginas públicas (estilo oscuro, identidad MENRUT).

export const CONTACT = {
  email: 'studio.lexair@gmail.com',
  whatsapp: 'https://whatsapp.com/channel/0029VbEIRkAGU3BTe88D9t17',
  telegram: 'https://t.me/StudioLxair',
}

export function Logo() {
  return (
    <a href="/" aria-label="MENRUT, inicio" className="inline-flex shrink-0 items-center rounded-xl bg-white px-3 py-1.5 shadow-sm">
      <img src="/menrut/logo-horizontal.png" alt="MENRUT" className="h-7 w-auto" />
    </a>
  )
}

export function SiteHeader({ home = false }: { home?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b1f3f]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <Logo />
        <nav aria-label="Principal" className="hidden items-center gap-6 text-sm font-semibold text-[#c9d8ee] lg:flex">
          {home ? (
            <>
              <a href="#como-funciona" className="hover:text-white">Cómo funciona</a>
              <a href="#seguridad" className="hover:text-white">Seguridad</a>
            </>
          ) : (
            <>
              <a href="/quienes-somos/" className="hover:text-white">Quiénes somos</a>
              <a href="/contacto/" className="hover:text-white">Contacto</a>
            </>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <a href="/app/" className="px-2 text-sm font-semibold text-[#d7e4f6] hover:text-white">Entrar</a>
          <a
            href="/app/"
            className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-bold text-[#0b1f3f] shadow-sm hover:bg-[#e8f1fd]"
          >
            Crear cuenta
          </a>
        </div>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="bg-[#0b1f3f] text-[#c9d8ee]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <img src="/menrut/landing/isotipo.png" alt="" aria-hidden="true" width={512} height={512} className="h-12 w-12 rounded-xl" />
            <Logo />
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#9db3d4]">
            Conectamos caminos: clientes, mensajeros y negocios en una misma red de rutas y confianza.
          </p>
        </div>
        <FooterCol title="Producto" links={[
          { href: '/app/', label: 'Buscar mensajeros' },
          { href: '/app/', label: 'Crear perfil de mensajero' },
          { href: '/#como-funciona', label: 'Cómo funciona' },
        ]} />
        <FooterCol title="Empresa" links={[
          { href: '/quienes-somos/', label: 'Quiénes somos' },
          { href: '/contacto/', label: 'Contacto' },
        ]} />
        <FooterCol title="Legal" links={[
          { href: '/privacidad/', label: 'Política de privacidad' },
          { href: '/terminos/', label: 'Términos de uso' },
        ]} />
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-5 py-5 text-xs text-[#9db3d4]">
          © {new Date().getFullYear()} MENRUT · Desarrollado por Studio Lexair
        </p>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-bold text-white">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} className="hover:text-white">{l.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
