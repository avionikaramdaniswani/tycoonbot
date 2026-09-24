import { route } from '../../game/tycoon/router.js'

/**
 * Satu command induk `.ty` untuk seluruh game Tycoon (gaya router).
 * Sub-perintah: (kosong)=dashboard, start, collect, build, shop, tax, gudang, tier, top, help.
 * Semua di bawah namespace `ty` supaya tidak bentrok dengan game lain.
 */
export default {
  name: 'ty',
  aliases: ['tycoon'],
  description: 'Game Tycoon Kota',
  category: 'game',
  async execute({ sock, msg, args }) {
    const sub = args[0] || ''
    const rest = args.slice(1)
    const { text } = await route(msg, sub, rest)
    await sock.sendMessage(msg.from, { text }, { quoted: msg.raw })
  }
}
