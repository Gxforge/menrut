// MENRUT — Política de caché persistente de consultas (v2.3.2).
// Qué datos pueden guardarse en el dispositivo para mostrarlos sin red. Nunca administración ni mensajes (tienen su caché propia).

export const QUERY_CACHE_KEY = 'menrut-query-cache-v1'
export const QUERY_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000
export const QUERY_CACHE_BUSTER = 'v1'

const PERSISTED_ROOTS: ReadonlySet<string> = new Set([
  'courier-dashboard',
  'courier-wallet',
  'courier-routes',
  'courier-payments',
  'courier-tools',
  'conversations',
  'notifications',
  'saved-routes',
  'favorites',
  'plans',
  'territories',
  'launch-promo',
  'tools',
  'popular-routes',
])

export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0]
  return typeof root === 'string' && PERSISTED_ROOTS.has(root)
}
