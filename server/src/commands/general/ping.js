export default {
  name: 'ping',
  aliases: ['p'],
  description: 'Cek apakah bot merespons',
  category: 'general',
  async execute({ sock, msg }) {
    const start = Date.now()
    await sock.sendMessage(
      msg.from,
      { text: `🏓 Pong! _${Date.now() - start} ms_` },
      { quoted: msg.raw }
    )
  }
}
