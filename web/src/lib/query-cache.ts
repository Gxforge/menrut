// MENRUT — Persistencia de consultas en el navegador (v2.3.2). Solo cliente.
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QUERY_CACHE_KEY } from '@/lib/query-cache-policy'

/** Persistidor en localStorage; undefined en el servidor (exportación estática). */
export function createQueryPersister() {
  if (typeof window === 'undefined') return undefined
  return createSyncStoragePersister({ storage: window.localStorage, key: QUERY_CACHE_KEY })
}

/** Borra la caché persistida (al cerrar sesión: no debe quedar en el dispositivo). */
export function clearPersistedQueries(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(QUERY_CACHE_KEY)
  } catch {
    /* sin acceso a almacenamiento */
  }
}
