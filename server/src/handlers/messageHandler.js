import config from '../config/index.js'
import { logger } from '../lib/logger.js'

/**
 * Buat fungsi handler pesan. `getCommands` dipanggil tiap pesan supaya
 * selalu memakai daftar command terbaru (mendukung reload).
 */
export function createMessageHandler(getCommands) {
  return async function handleMessage({ sock, msg }) {
    if (!msg.text) return

    const prefix = config.bot.prefix
    if (!msg.text.startsWith(prefix)) return

    const args = msg.text.slice(prefix.length).trim().split(/\s+/)
    const commandName = (args.shift() || '').toLowerCase()
    if (!commandName) return

    const commands = getCommands()
    const command = commands.get(commandName)
    if (!command) return

    if (command.ownerOnly && msg.senderNumber !== config.bot.owner) {
      await sock.sendMessage(msg.from, { text: '⛔ Perintah ini hanya untuk owner.' }, { quoted: msg.raw })
      return
    }

    try {
      await command.execute({
        sock,
        msg,
        args,
        text: args.join(' '),
        commands,
        config
      })
      logger.info(`Command .${commandName} oleh ${msg.senderNumber || 'unknown'}`)
    } catch (e) {
      logger.error(`Error pada .${commandName}: ${e.message}`)
      try {
        await sock.sendMessage(msg.from, { text: `⚠️ Terjadi error: ${e.message}` }, { quoted: msg.raw })
      } catch { /* abaikan */ }
    }
  }
}

export default createMessageHandler
