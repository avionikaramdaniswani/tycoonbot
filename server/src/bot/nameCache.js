import { jidNormalizedUser } from '@vanzxy/baileys'

/**
 * Cache sederhana jid -> pushName.
 *
 * WhatsApp nggak kasih nama display lewat groupMetadata (cuma id/nomor).
 * Tapi tiap pesan masuk membawa pushName pengirimnya. Kita simpan di sini
 * supaya lobby Tic Tac Toe (dan fitur lain) bisa tampilin nama asli, bukan
 * cuma nomor. Hanya di memori — hilang saat restart, terisi lagi sendiri.
 */

const names = new Map()

export function rememberName(jid, name) {
  if (!jid || !name) return
  const key = jidNormalizedUser(jid)
  const clean = String(name).trim()
  if (clean) names.set(key, clean)
}

export function getName(jid) {
  if (!jid) return ''
  return names.get(jidNormalizedUser(jid)) || ''
}

export default { rememberName, getName }
