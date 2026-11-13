// MENRUT — Caché del chat en el dispositivo.
// Política (decisión 2026-11-12): el servidor guarda los mensajes 24 h; el dispositivo
// conserva 2 días más (3 días en total desde el envío) y luego se borran.
// Se guarda en localStorage por conversación. Al cerrar sesión se borra todo.
import type { MessageDto } from '@/lib/types'

const KEY = 'menrut-chat-cache-v1'
export const DEVICE_RETENTION_MS = 3 * 24 * 60 * 60 * 1000
const MAX_PER_CONVERSATION = 300

type Store = Record<string, MessageDto[]>

const ms = (m: MessageDto) => new Date(m.createdAt).getTime()
const byCreated = (a: MessageDto, b: MessageDto) => ms(a) - ms(b)
const fresh = (list: MessageDto[], now: number) => list.filter((m) => now - ms(m) < DEVICE_RETENTION_MS)

function load(): Store {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Store) : {}
  } catch {
    return {}
  }
}

function save(store: Store): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // Sin espacio o almacenamiento bloqueado: el chat sigue funcionando desde el servidor.
  }
}

/** Une listas de mensajes sin duplicados; si un id aparece dos veces gana la última (la del servidor). */
export function mergeById(...lists: MessageDto[][]): MessageDto[] {
  const byId = new Map<string, MessageDto>()
  for (const list of lists) for (const m of list) byId.set(m.id, m)
  return [...byId.values()].sort(byCreated)
}

/** Mensajes de una conversación que siguen dentro de la ventana de 3 días. */
export function readChatCache(conversationId: string, now = Date.now()): MessageDto[] {
  return fresh(load()[conversationId] ?? [], now).sort(byCreated)
}

/** Añade mensajes a la caché de la conversación y aplica la retención. */
export function writeChatCache(conversationId: string, incoming: MessageDto[], now = Date.now()): void {
  if (incoming.length === 0) return
  const store = load()
  const merged = mergeById(fresh(store[conversationId] ?? [], now), incoming)
  store[conversationId] = merged.slice(-MAX_PER_CONVERSATION)
  purgeStore(store, now)
  save(store)
}

/** Borra mensajes vencidos de todas las conversaciones y elimina las conversaciones vacías. */
export function purgeChatCache(now = Date.now()): void {
  const store = load()
  purgeStore(store, now)
  save(store)
}

function purgeStore(store: Store, now: number): void {
  for (const id of Object.keys(store)) {
    store[id] = fresh(store[id] ?? [], now)
    if (store[id].length === 0) delete store[id]
  }
}

/** Cierre de sesión: nada de la conversación queda en este dispositivo. */
export function clearChatCache(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // Nada que borrar si el almacenamiento no está disponible.
  }
}
