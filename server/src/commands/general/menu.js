export default {
  name: 'menu',
  aliases: ['help', 'list'],
  description: 'Tampilkan daftar perintah',
  category: 'general',
  async execute({ sock, msg, commands, config }) {
    const unique = [...new Set(commands.values())]
    const byCat = {}
    for (const c of unique) {
      const cat = c.category || 'lainnya'
      ;(byCat[cat] ||= []).push(c)
    }

    let text = `╭──「 *${config.bot.name}* 」\n│ Prefix: *${config.bot.prefix}*\n│ Total: ${unique.length} perintah\n╰──────\n`
    for (const [cat, cmds] of Object.entries(byCat)) {
      text += `\n▧ *${cat.toUpperCase()}*\n`
      for (const c of cmds) {
        text += `  • ${config.bot.prefix}${c.name}${c.description ? ` — ${c.description}` : ''}\n`
      }
    }
    await sock.sendMessage(msg.from, { text: text.trim() }, { quoted: msg.raw })
  }
}
