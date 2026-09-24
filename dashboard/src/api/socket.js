import { io } from 'socket.io-client'
import { getToken } from './client.js'

let socket = null

/** Buat (atau buat ulang) koneksi Socket.IO ke backend. */
export function connectSocket() {
  if (socket) socket.disconnect()
  // Same-origin: di-dev Vite mem-proxy '/socket.io' (ws) ke backend.
  socket = io('/', {
    auth: { token: getToken() },
    transports: ['websocket', 'polling']
  })
  return socket
}

export function getSocket() {
  return socket
}
