// MENRUT — Cliente socket.io para chat en tiempo real
// Regla del gateway: SIEMPRE conectar con ruta relativa + XTransformPort en query.
import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getChatSocket(): Socket {
  // Singleton REAL: crear solo la primera vez. La versión anterior
  // (`if (socket?.connected) return socket`) generaba una conexión nueva en
  // cada llamada mientras aún conectaba, dejando sockets huérfanos.
  if (!socket) {
    socket = io('/?XTransformPort=3004', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
  }
  return socket
}

export function disconnectChat(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
