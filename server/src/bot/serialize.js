import { getContentType, jidNormalizedUser } from '@vanzxy/baileys'

/**
 * Ubah objek pesan mentah Baileys jadi bentuk yang enak dipakai command.
 * @returns {null | {raw,key,id,from,sender,senderNumber,isGroup,fromMe,type,text,pushName}}
 */
export function serializeMessage(sock, m) {
  if (!m?.message) return null

  const type = getContentType(m.message)
  const from = m.key.remoteJid
  const isGroup = Boolean(from?.endsWith('@g.us'))
  const sender = isGroup ? m.key.participant || m.participant || from : from
  const content = m.message[type]

  let text = ''
  if (type === 'conversation') text = m.message.conversation || ''
  else if (type === 'extendedTextMessage') text = m.message.extendedTextMessage?.text || ''
  else if (content?.caption) text = content.caption

  // Balasan tombol/list interaktif (bottom-sheet single_select, quick reply, dll):
  // ambil id yang dipilih supaya diperlakukan seperti teks perintah biasa.
  if (!text) {
    if (type === 'listResponseMessage') {
      text = content?.singleSelectReply?.selectedRowId || ''
    } else if (type === 'interactiveResponseMessage') {
      const raw = content?.nativeFlowResponseMessage?.paramsJson
      if (raw) {
        try {
          text = JSON.parse(raw)?.id || ''
        } catch {
          text = ''
        }
      }
    } else if (type === 'buttonsResponseMessage') {
      text = content?.selectedButtonId || ''
    } else if (type === 'templateButtonReplyMessage') {
      text = content?.selectedId || ''
    }
  }

  return {
    raw: m,
    key: m.key,
    id: m.key.id,
    from,
    sender,
    senderNumber: sender ? jidNormalizedUser(sender).split('@')[0] : '',
    isGroup,
    fromMe: Boolean(m.key.fromMe),
    type,
    text,
    pushName: m.pushName || ''
  }
}

export default serializeMessage
