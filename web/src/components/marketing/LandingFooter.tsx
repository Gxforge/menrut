// Pie de página de la portada. Privacidad y términos se añadirán cuando el titular los confirme.
export function LandingFooter() {
  return (
    <footer className="border-t border-[#dbe7f7] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
        <div>
          <img src="/menrut/logo-horizontal.png" alt="MENRUT" className="h-7 w-auto" />
          <p className="mt-3 max-w-xs text-sm text-[#5a6f91]">Conectamos caminos: personas, negocios y mensajeros en una misma red.</p>
        </div>
        <nav aria-label="Pie de página" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm font-semibold text-[#24406b]">
          <a href="/app/" className="hover:text-[#1688f5]">Explorar</a>
          <a href="/app/" className="hover:text-[#1688f5]">Crear perfil</a>
          <a href="#como-funciona" className="hover:text-[#1688f5]">Cómo funciona</a>
          <a href="#seguridad" className="hover:text-[#1688f5]">Seguridad</a>
          <a href="#ayuda" className="hover:text-[#1688f5]">Ayuda</a>
          <a href="#negocios" className="hover:text-[#1688f5]">Para negocios</a>
        </nav>
      </div>
      <p className="border-t border-[#eef4fc] px-4 py-4 text-center text-xs text-[#5a6f91]">
        © {new Date().getFullYear()} MENRUT · Privacidad y términos: próximamente.
      </p>
    </footer>
  )
}
