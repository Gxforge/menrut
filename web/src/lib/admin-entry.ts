// Entrada de staff: https://menrut.ddns.net/admin (o ?admin). Solo decide la pantalla;
// el permiso real lo comprueba siempre el backend.
export function isAdminEntry(): boolean {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname.replace(/\/+$/, '')
  return path === '/admin' || new URLSearchParams(window.location.search).has('admin')
}
