// MENRUT — Cliente Supabase (Auth + Storage reales)
// El anon key es público por diseño; la seguridad real está en RLS y en el
// backend, que valida el JWT con service_role (nunca expuesto al cliente).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Supabase no configurado: faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
  return client
}

// Sube un archivo a un bucket (buckets reales: courier-public, payment-proofs-private, private-documents)
export async function uploadToBucket(bucket: string, file: File, pathPrefix: string): Promise<string> {
  const supabase = getSupabase()
  const ext = file.name.split('.').pop() || 'bin'
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  // Para buckets privados el acceso real se hace con createSignedUrl en el backend;
  // aquí devolvemos la ruta pública si el bucket es público.
  return data.publicUrl
}
