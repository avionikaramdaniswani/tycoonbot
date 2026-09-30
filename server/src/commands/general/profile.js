import { renderProfileHtml } from '../../game/profile/render-html.js'

async function sendProfile(sock, msg) {
  const jid = msg.mentionedJid?.[0] || msg.sender || msg.from
  const isSelf = jid === (msg.sender || msg.from)
  let photo = ''
  let name = isSelf ? msg.pushName : ''
  try {
    photo = await sock.profilePictureUrl(jid, 'image') || ''
  } catch {
    photo = ''
  }
  if (!name) {
    try {
      name = await sock.getName(jid)
    } catch {
      name = ''
    }
  }
  const number = jid.split('@')[0].split(':')[0]
  const rawHtml = renderProfileHtml({ name: name || 'Pengguna WhatsApp', number, photo })
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
