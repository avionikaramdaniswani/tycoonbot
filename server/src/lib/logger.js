import pino from 'pino'
import { EventEmitter } from 'node:events'

/**
 * Log bus: BotManager & bagian lain menembak log ke sini,
 * layer Socket.IO mem-forward-nya ke dashboard secara realtime.
 */
export const logBus = new EventEmitter()
logBus.setMaxListeners(100)

const HISTORY_LIMIT = 300
/** Ring buffer log terakhir, dikirim ke dashboard yang baru connect. */
export const logHistory = []

const base = pino({ level: process.env.LOG_LEVEL || 'info' })

function push(level, args) {
  const message = args
    .map((a) => (typeof a === 'string' ? a : safeStringify(a)))
    .join(' ')
  const entry = { level, message, time: Date.now() }

  logHistory.push(entry)
  if (logHistory.length > HISTORY_LIMIT) logHistory.shift()
  logBus.emit('log', entry)

  const pinoLevel = level === 'success' ? 'info' : level
  ;(base[pinoLevel] || base.info).call(base, message)
  return entry
}

function safeStringify(value) {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export const logger = {
  info: (...a) => push('info', a),
  warn: (...a) => push('warn', a),
  error: (...a) => push('error', a),
  debug: (...a) => push('debug', a),
  success: (...a) => push('success', a)
}

/** Logger diam khusus untuk Baileys (agar log internalnya tidak spam). */
export const waLogger = pino({ level: 'silent' })

export default logger
