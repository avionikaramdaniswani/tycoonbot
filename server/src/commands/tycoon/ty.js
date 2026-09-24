import { NativeFlow } from '@vanzxy/baileys'
import { route } from '../../game/tycoon/router.js'

/**
 * Satu command induk `.ty` untuk seluruh game Tycoon (gaya router).
 * Sub-perintah: (kosong)=dashboard, start, collect, build, shop, tax, gudang, tier, top, help.
 * Semua di bawah namespace `ty` supaya tidak bentrok dengan game lain.
 *
 * route() bisa mengembalikan { text } (kirim teks biasa) atau { menu } untuk
 * pesan interaktif bottom-sheet (single_select), mis. `.ty build` tanpa argumen.
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

    if (res.menu) {
      await sendMenu(sock, msg, res.menu)
      return
    }
    await sock.sendMessage(msg.from, { text: res.text }, { quoted: msg.raw })
  }
}

// Kirim bottom-sheet single_select. Kalau pesan interaktif gagal (render tidak
// didukung di sesi tertentu), jatuh ke daftar teks yang tetap bisa diketik.
async function sendMenu(sock, msg, menu) {
  try {
    const nf = new NativeFlow(sock).setText(menu.text)
    if (menu.footer) nf.setFooter(menu.footer)
    nf.addSingleSelect(menu.button, menu.sections)
    await nf.send(msg.from, { quoted: msg.raw })
  } catch {
    const rows = menu.sections.flatMap((s) => s.rows)
    const lines = rows.map((r) => `• ${r.title} — ketik: ${r.id}`)
    const text = [menu.text, '', ...lines].join('\n')
    await sock.sendMessage(msg.from, { text }, { quoted: msg.raw })
  }
}
