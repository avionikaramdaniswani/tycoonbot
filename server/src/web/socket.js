import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import { bot } from '../bot/BotManager.js'
import { logBus, logHistory } from '../lib/logger.js'

/** Pasang Socket.IO di atas HTTP server & forward event bot -> dashboard. */
export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.corsOrigin, credentials: true }
  })

  // Autentikasi socket pakai token JWT yang sama dengan REST.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('unauthorized'))
    try {
      socket.data.user = jwt.verify(token, config.auth.jwtSecret)
      next()
    } catch {
      next(new Error('unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    // Kirim snapshot terkini + histori log ke client yang baru terhubung.
    socket.emit('status', bot.getState())
    socket.emit('log:history', logHistory)
    if (bot.qr) socket.emit('qr', bot.qr)
    if (bot.pairingCode) socket.emit('pairing', bot.pairingCode)
  })

  // Relay event dari BotManager & log bus ke semua client.
  bot.on('status', (s) => io.emit('status', s))
  bot.on('qr', (qr) => io.emit('qr', qr))
  bot.on('pairing', (code) => io.emit('pairing', code))
  bot.on('ready', (user) => io.emit('ready', user))
  logBus.on('log', (entry) => io.emit('log', entry))

  return io
}

export default initSocket
