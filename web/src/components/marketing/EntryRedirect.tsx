'use client'

import { useEffect } from 'react'

// La portada vive en "/". Estas entradas son de la aplicación y se envían a /app/:
//  · enlaces de Supabase (recuperación, confirmación, invitación) con tokens en el #hash o ?code;
//  · el acceso del staff (/?admin);
//  · la PWA instalada, que antes arrancaba en la raíz y ahora arranca en /app/.
const AUTH_HASH = /(^|[#&])(access_token|refresh_token|type|error|error_code)=/
const APP_QUERY = /(^|[?&])(code|admin)(=|&|$)/

export function EntryRedirect() {
  useEffect(() => {
    const { search, hash } = window.location
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches
    const toApp = AUTH_HASH.test(hash) || APP_QUERY.test(search) || standalone
    if (toApp) window.location.replace('/app/' + search + hash)
  }, [])

  return null
}
