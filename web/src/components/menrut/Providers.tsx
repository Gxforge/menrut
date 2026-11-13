// MENRUT — Proveedores globales (TanStack Query) con caché persistente en el dispositivo (v2.3.2).
'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createQueryPersister } from '@/lib/query-cache'
import {
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_MAX_AGE_MS,
  shouldPersistQuery,
} from '@/lib/query-cache-policy'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: QUERY_CACHE_MAX_AGE_MS,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  )
  const [persister] = useState(() => createQueryPersister())
  if (!persister) return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: QUERY_CACHE_MAX_AGE_MS,
        buster: QUERY_CACHE_BUSTER,
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => q.state.status === 'success' && shouldPersistQuery(q.queryKey),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
