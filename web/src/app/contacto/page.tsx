import type { Metadata } from 'next'
import { PageShell } from '@/components/marketing/LegalShell'
import { CONTACT } from '@/components/marketing/SiteChrome'

export const metadata: Metadata = {
  title: 'Contacto · MENRUT',
  description: 'Escribe a MENRUT por correo, WhatsApp o Telegram.',
  alternates: { canonical: '/contacto/' },
}

const CANALES = [
  { t: 'Correo de soporte', d: 'Para cuentas, pagos, verificación y consultas generales.', href: `mailto:${CONTACT.email}`, label: CONTACT.email, external: false },
  { t: 'Canal de WhatsApp', d: 'Novedades y avisos de MENRUT.', href: CONTACT.whatsapp, label: 'Unirme al canal', external: true },
  { t: 'Telegram', d: 'Comunidad y avisos de MENRUT.', href: CONTACT.telegram, label: '@StudioLxair', external: true },
]

export default function Contacto() {
  return (
    <PageShell eyebrow="Ayuda" title="Contacto" intro="Escríbenos por el canal que prefieras. Para temas de cuenta o pagos, el correo es el más completo.">
      <ul className="!mt-2 !list-none !space-y-4 !pl-0">
        {CANALES.map((c) => (
          <li key={c.t} className="!ml-0 !list-none rounded-2xl border border-[#dbe7f7] bg-[#f8fbff] p-6">
            <h2 className="!mt-0 !text-xl">{c.t}</h2>
            <p className="!mt-2">{c.d}</p>
            <a
              href={c.href}
              {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="!mt-4 inline-flex h-11 items-center rounded-xl bg-[#0b1f3f] px-5 font-bold !text-white !no-underline hover:bg-[#13346b]"
            >
              {c.label}{c.external && <span className="sr-only"> (se abre en una pestaña nueva)</span>}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-10 text-sm text-[#5a6f91]">
        MENRUT es desarrollado por Studio Lexair. Consulta también nuestra <a href="/privacidad/">política de privacidad</a> y los <a href="/terminos/">términos de uso</a>.
      </p>
    </PageShell>
  )
}
