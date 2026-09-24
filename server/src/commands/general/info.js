import os from 'node:os'

export default {
  name: 'info',
  aliases: ['botinfo'],
  description: 'Informasi tentang bot',
  category: 'general',
  async execute({ sock, msg, config }) {
    const up = Math.floor(process.uptime())
    const text =
      `🤖 *${config.bot.name}*\n\n` +
      `• Runtime  : Node ${process.version}\n` +
      `• Platform : ${os.platform()} ${os.arch()}\n` +
      `• Memori   : ${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)} MB\n` +
      `• Uptime   : ${up}s\n` +
      `• Prefix   : ${config.bot.prefix}`
    await sock.sendMessage(msg.from, { text }, { quoted: msg.raw })
  }
}
