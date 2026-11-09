// MENRUT — Capa de chat en tiempo real (stub de producción).
// La plataforma (Cloudflare Pages) no aloja WebSockets: el chat funciona por
// REST con refresco periódico. Esta pieza mantiene la interfaz que usa
// ChatScreen (on/off/emit/connected) sin intentar conectar nada, de modo que
// la pantalla use siempre su camino REST (que adjunta JWT y es la fuente de
// verdad). Si en el futuro se migra a un servicio con WebSockets, basta
// reemplazar este módulo por un cliente real con la misma superficie.
type Handler = (...args: unknown[]) => void

class InertSocket {
  readonly connected = false
  private handlers = new Map<string, Set<Handler>>()

  on(event: string, cb: Handler): void {
    let set = this.handlers.get(event)
    if (!set) {
      set = new Set()
      this.handlers.set(event, set)
    }
    set.add(cb)
  }

  off(event: string, cb: Handler): void {
    this.handlers.get(event)?.delete(cb)
  }

  // Nunca hay ack ni eventos: la pantalla aplica su fallback REST.
  emit(_event: string, ..._args: unknown[]): void {
    /* noop */
  }
}

let socket: InertSocket | null = null

export function getChatSocket(): InertSocket {
  if (!socket) socket = new InertSocket()
  return socket
}

export function disconnectChat(): void {
  socket = null
}
