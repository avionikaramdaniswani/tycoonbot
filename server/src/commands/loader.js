import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { logger } from '../lib/logger.js'

/**
 * Muat semua command dari folder `commands/` secara rekursif.
 * Setiap file meng-export default sebuah objek command:
 *   { name, aliases?, description?, category?, ownerOnly?, execute(ctx) }
 * @returns {Promise<Map<string, object>>} peta name/alias -> command
 */
export async function loadCommands(dir) {
  const commands = new Map()
  const files = walk(dir).filter(
    (f) => f.endsWith('.js') && path.basename(f) !== 'loader.js'
  )

  for (const file of files) {
    try {
      // cache-bust supaya reload (hot) mengambil versi terbaru
      const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`)
      const cmd = mod.default
      if (!cmd?.name || typeof cmd.execute !== 'function') {
        logger.warn(`Lewati ${path.basename(file)}: bukan command valid.`)
        continue
      }
      commands.set(cmd.name.toLowerCase(), cmd)
      for (const alias of cmd.aliases || []) commands.set(String(alias).toLowerCase(), cmd)
    } catch (e) {
      logger.error(`Gagal memuat command ${path.basename(file)}: ${e.message}`)
    }
  }
  return commands
}

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

export default loadCommands
