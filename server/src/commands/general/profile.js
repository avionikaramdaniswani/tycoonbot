import { renderProfileHtml } from '../../game/profile/render-html.js'
import { getName as getCachedName } from '../../bot/nameCache.js'

async function sendProfile(sock, msg) {
  let jid = msg.mentionedJid?.[0] || msg.quotedJid
  
  if (!jid && msg.text && msg.text.includes('@')) {
    const matched = msg.text.match(/@(\d+)/)
    if (matched) {
      jid = `${matched[1]}@s.whatsapp.net`
    }
  }
  
  jid = jid || msg.sender || msg.from

  // Hilangkan device id (misal :24) untuk perbandingan
  const targetNumber = jid.split('@')[0].split(':')[0]
  const senderNumber = (msg.sender || msg.from).split('@')[0].split(':')[0]
  
  const isSelf = targetNumber === senderNumber
  let photo = ''
  let name = isSelf ? msg.pushName : ''
  
  // Pastikan jid dalam format yang benar untuk Baileys fetch
  const cleanJid = `${targetNumber}@s.whatsapp.net`

  try {
    photo = await sock.profilePictureUrl(cleanJid, 'image') || ''
  } catch {
    photo = ''
  }
  
  if (!name) {
    name = getCachedName(cleanJid) || ''
  }
  
  const rawHtml = renderProfileHtml({ name: name || `+${targetNumber}`, number: targetNumber, photo })
  const data = Buffer.from(JSON.stringify({
    response_id: `profile-${Date.now()}`,
    sections: [{ view_model: { primitive: { __typename: 'GenAIaeacdsnwHtmlPrimitive', payload: rawHtml, trusted_sources: [] }, __typename: 'GenAISingleLayoutViewModel' } }]
  })).toString('base64')

  await sock.relayMessage(msg.from, {
    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2, botMetadata: {} },
    botForwardedMessage: { message: { richResponseMessage: {
      messageType: 1,
      submessages: [{ messageType: 2, messageText: isSelf ? '👤 *PROFILE KAMU*\n\nKartu profil WhatsApp kamu.' : '👤 *PROFILE WHATSAPP*\n\nKartu profil pengguna yang ditandai.' }],
      unifiedResponse: { data },
      contextInfo: { forwardingScore: 1, isForwarded: true, forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' }, forwardOrigin: 4 }
    } } }
  }, { quoted: msg.raw })
}

export default {
  name: 'profile',
  aliases: ['profil', 'me'],
  description: 'Tampilkan kartu profil WhatsApp kamu',
  category: 'general',
  async execute({ sock, msg }) {
    return sendProfile(sock, msg)
  }
}
