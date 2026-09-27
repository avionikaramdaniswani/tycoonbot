import { renderPinterestHtml } from '../../game/pinterest/render-html.js'
import config from '../../config/index.js'

const PREFIX = config.bot.prefix

// Ubah PUBLIC_URL (http/https) jadi endpoint WebSocket + path /pin.
// Kalau PUBLIC_URL kosong -> '' -> UI tampil tapi search dinonaktifkan.
//
// PENTING: paksa wss:// untuk host non-lokal. trycloudflare (dan host publik
// apa pun) SELALU TLS, dan webview WA yang jalan di https MEMBLOKIR ws://
// (mixed-content). Jadi walau PUBLIC_URL kebetulan ke-set http://, tetap
// naikkan ke wss:// — kalau nggak, koneksi langsung error lalu closed.
function deriveWsUrl() {
  const base = config.publicUrl
  if (!base) return ''
  const host = base.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  const isLocal = /^(localhost|127\.0\.0\.1|\[?::1\]?)(:|$|\/)/i.test(host)
  return (isLocal ? 'ws://' : 'wss://') + host + '/pin'
}

// ── Kirim UI Pinterest (HTML Primitive / AIRich) ────────────────────
// Galeri jalan penuh di client dalam bubble WA. User ketik kata kunci di
// keyboard on-screen -> query dikirim via WebSocket (/pin) -> server nembak
// API pihak ketiga -> hasil gambar dirender jadi grid masonry ala Pinterest.
async function sendGallery(sock, jid, quoted) {
  const wsUrl = deriveWsUrl()
  const rawHtml = await renderPinterestHtml({ wsUrl })

  await sock.relayMessage(
    jid,
    {
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
        botMetadata: {}
      },
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: 1,
            submessages: [
              {
                messageType: 2,
                messageText:
                  '📌 *PINTEREST*\n\nKetik kata kunci di kolom pencarian, lalu jelajahi hasil gambarnya. Tap gambar buat lihat lebih besar.'
              }
            ],
            unifiedResponse: {
              data: Buffer.from(
                JSON.stringify({
                  response_id: `pin-${Date.now()}`,
                  sections: [
                    {
                      view_model: {
                        primitive: {
                          __typename: 'GenAIaeacdsnwHtmlPrimitive',
                          payload: rawHtml,
                          trusted_sources: []
                        },
                        __typename: 'GenAISingleLayoutViewModel'
                      }
                    }
                  ]
                })
              ).toString('base64')
            },
            contextInfo: {
              forwardingScore: 1,
              isForwarded: true,
              forwardedAiBotMessageInfo: {
                botJid: '867051314767696@bot'
              },
              forwardOrigin: 4
            }
          }
        }
      }
    },
    { quoted: quoted?.raw }
  )
}

async function sendText(sock, jid, heading, text, quoted) {
  await sock.sendMessage(jid, { text: `*${heading}*\n\n${text}` }, { quoted: quoted?.raw })
}

async function handleHelp(sock, msg) {
  const text = [
    '📖 CARA PAKAI:',
    '',
    `\`${PREFIX}pin\` — buka galeri Pinterest`,
    '',
    'Di dalam galeri:',
    '• Ketik kata kunci di kolom pencarian (keyboard on-screen).',
    '• Tekan cari — hasil tampil grid ala Pinterest.',
    '• Tap gambar buat lihat versi besar.',
    '',
    'Butuh PUBLIC_URL aktif (server publik) supaya pencarian jalan.'
  ].join('\n')

  await sendText(sock, msg.from, '📌 PINTEREST — Bantuan', text, msg)
}

export default {
  name: 'pin',
  aliases: ['pinterest', 'pint'],
  description: 'Cari & jelajahi gambar Pinterest (galeri interaktif di dalam bubble)',
  category: 'general',
  async execute({ sock, msg, args }) {
    const sub = (args[0] || '').toLowerCase()
    if (sub === 'help' || sub === 'bantuan') return handleHelp(sock, msg)
    return sendGallery(sock, msg.from, msg)
  }
}
