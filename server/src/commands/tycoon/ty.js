import { NativeFlow } from '@vanzxy/baileys'
import { route } from '../../game/tycoon/router.js'

/**
 * Satu command induk `.ty` untuk seluruh game Tycoon (gaya router).
 * Sub-perintah: (kosong)=dashboard, start, collect, build, upgrade, shop, tax,
 * gudang, proyek, tier, repair, event, daily, quest, ach, top, help.
 *
 * route() mengembalikan { text, footer?, buttons? }. Tiap tombol:
 *   { kind:'reply', text, id }        -> quick_reply (1 tap = 1 aksi)
 *   { kind:'select', text, sections } -> bottom-sheet single_select
 * Tanpa `buttons` = kirim teks biasa. id tiap tombol adalah perintah lengkap,
 * jadi ketukan diperlakukan sama seperti user mengetik perintah itu.
 */
export default {
  name: 'ty',
  aliases: ['tycoon'],
  description: 'Game Tycoon Kota',
  category: 'game',
  async execute({ sock, msg, args }) {
    const sub = args[0] || ''
    const rest = args.slice(1)
    const res = await route(msg, sub, rest)

    if (res.buttons && res.buttons.length) {
      await sendInteractive(sock, msg, res)
      return
    }
    await sock.sendMessage(msg.from, { text: res.text }, { quoted: msg.raw })
  }
}

// Kirim pesan interaktif (quick_reply + single_select). Kalau render tidak
// didukung di sesi tertentu, jatuh ke daftar teks yang tetap bisa diketik.
async function sendInteractive(sock, msg, res) {
  try {
    const nf = new NativeFlow(sock).setText(res.text)
    if (res.footer) nf.setFooter(res.footer)
    for (const b of res.buttons) {
      if (b.kind === 'select') nf.addSingleSelect(b.text, b.sections)
      else nf.addQuickReply(b.text, b.id)
    }
    await nf.send(msg.from, { quoted: msg.raw })
  } catch {
    await sock.sendMessage(msg.from, { text: fallbackText(res) }, { quoted: msg.raw })
  }
}

// Teks cadangan: tampilkan tiap aksi + perintah yang bisa diketik manual.
function fallbackText(res) {
  const lines = []
  for (const b of res.buttons) {
    if (b.kind === 'select') {
      for (const s of b.sections) {
        for (const r of s.rows) lines.push(`• ${r.title} — ketik: ${r.id}`)
      }
    } else {
      lines.push(`• ${b.text} — ketik: ${b.id}`)
    }
  }
  const parts = [res.text]
  if (lines.length) parts.push('', ...lines)
  if (res.footer) parts.push('', res.footer)
  return parts.join('\n')
}
